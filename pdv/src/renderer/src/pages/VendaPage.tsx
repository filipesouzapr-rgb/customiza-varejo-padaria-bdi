import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { SupervisorModal } from '../components/SupervisorModal'
import { SeletorModal } from '../components/SeletorModal'
import { DescontoModal } from '../components/DescontoModal'
import { PagamentoModal } from '../components/PagamentoModal'
import { PainelIdentificacao } from '../components/PainelIdentificacao'
import { MovimentoCaixaModal } from '../components/MovimentoCaixaModal'
import type { TipoMovimento } from '../components/MovimentoCaixaModal'
import { FecharCaixaModal } from '../components/FecharCaixaModal'
import { Cupom } from '../components/Cupom'
import type {
  CaixaSessao,
  FormaPagamento,
  ItemCarrinho,
  Operador,
  Pagamento,
  Produto,
} from '../types'

const rotuloForma: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  cartao_debito: 'Cartão débito',
  cartao_credito: 'Cartão crédito',
  pix: 'Pix',
  fiado: 'Outros',
}

interface Props {
  operador: Operador
  caixaSessao: CaixaSessao
  onCaixaFechado: () => void
}

interface ClienteResumo {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
}

interface VendaCancelavel {
  id: string
  total: number
  finalizada_em: string
}

type Modo =
  | null
  | 'busca-produto'
  | 'desconto'
  | 'supervisor'
  | 'cliente'
  | 'pagamento'
  | 'movimento-caixa'
  | 'cancelar-venda'
  | 'fechar-caixa'

type ContextoSupervisor =
  | { tipo: 'desconto'; valor: number }
  | { tipo: 'movimento'; movTipo: TipoMovimento; valor: number; motivo: string }
  | { tipo: 'cancelar-venda'; vendaId: string }

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function VendaPage({ operador, caixaSessao, onCaixaFechado }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [codigo, setCodigo] = useState('')
  const [erroCodigo, setErroCodigo] = useState<string | null>(null)
  const [produtoPesoPendente, setProdutoPesoPendente] = useState<Produto | null>(null)
  const [peso, setPeso] = useState('')

  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [cliente, setCliente] = useState<ClienteResumo | null>(null)
  const [clienteResultados, setClienteResultados] = useState<ClienteResumo[]>([])

  const [buscaProdutoQuery, setBuscaProdutoQuery] = useState('')

  const [desconto, setDesconto] = useState(0)
  const [descontoAutorizadoPor, setDescontoAutorizadoPor] = useState<string | null>(null)

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])

  const [modo, setModo] = useState<Modo>(null)
  const [contextoSupervisor, setContextoSupervisor] = useState<ContextoSupervisor | null>(null)
  const [vendasCancelaveis, setVendasCancelaveis] = useState<VendaCancelavel[]>([])
  const [erroAcaoCaixa, setErroAcaoCaixa] = useState<string | null>(null)

  const [finalizando, setFinalizando] = useState(false)
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null)
  const [vendaConcluida, setVendaConcluida] = useState<{
    itens: ItemCarrinho[]
    pagamentos: Pagamento[]
    subtotal: number
    desconto: number
    total: number
  } | null>(null)

  const inputCodigoRef = useRef<HTMLInputElement>(null)

  function carregarProdutos() {
    supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .then(({ data }) => setProdutos((data as Produto[]) ?? []))
  }

  useEffect(() => {
    carregarProdutos()
  }, [])

  useEffect(() => {
    if (modo === null && !produtoPesoPendente) inputCodigoRef.current?.focus()
  }, [modo, produtoPesoPendente])

  const subtotal = itens.reduce((soma, item) => soma + item.quantidade * item.produto.preco, 0)
  const total = Math.max(0, subtotal - desconto)
  const totalPago = pagamentos.reduce((soma, p) => soma + p.valor, 0)
  const restante = Math.round((total - totalPago) * 100) / 100

  // Atalhos de teclado: as ações secundárias (produto sem código, desconto,
  // cliente, pagamento) nao usam mouse - o operador nao tira a mao do
  // teclado/leitor durante o atendimento.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (vendaConcluida) return

      if (modo !== null) {
        if (event.key === 'Escape') {
          event.preventDefault()
          if (modo === 'pagamento') cancelarCheckout()
          else {
            setContextoSupervisor(null)
            setModo(null)
          }
        }
        return
      }

      if (event.key === 'F2') {
        event.preventDefault()
        setBuscaProdutoQuery('')
        setModo('busca-produto')
      } else if (event.key === 'F3') {
        event.preventDefault()
        if (itens.length > 0) setModo('desconto')
      } else if (event.key === 'F4') {
        event.preventDefault()
        setClienteResultados([])
        setModo('cliente')
      } else if (event.key === 'F5') {
        event.preventDefault()
        setErroAcaoCaixa(null)
        setModo('movimento-caixa')
      } else if (event.key === 'F7') {
        event.preventDefault()
        abrirCancelarVenda()
      } else if (event.key === 'F8') {
        event.preventDefault()
        setModo('fechar-caixa')
      } else if (event.key === 'F9') {
        event.preventDefault()
        iniciarCheckout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, itens, finalizando, vendaConcluida])

  function adicionarItem(produto: Produto, quantidade: number) {
    setItens((atual) => {
      if (produto.unidade === 'unidade') {
        const existente = atual.find((i) => i.produto.id === produto.id)
        if (existente) {
          return atual.map((i) =>
            i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade } : i,
          )
        }
      }
      return [...atual, { produto, quantidade }]
    })
  }

  function selecionarProduto(produto: Produto) {
    if (produto.unidade === 'kg') {
      setProdutoPesoPendente(produto)
    } else {
      adicionarItem(produto, 1)
    }
    setModo(null)
  }

  function handleCodigoSubmit(event: FormEvent) {
    event.preventDefault()
    setErroCodigo(null)
    const valor = codigo.trim()
    if (!valor) return

    // Aceita "5x<codigo>" ou "5*<codigo>" pra lançar varias unidades de
    // uma vez, sem precisar escanear o mesmo item repetidas vezes.
    const match = valor.match(/^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(.+)$/)
    const quantidadeInformada = match ? Number(match[1].replace(',', '.')) : null
    const codigoBuscado = match ? match[2].trim() : valor

    const produto = produtos.find(
      (p) => p.codigo_barras === codigoBuscado || p.codigo_interno === codigoBuscado,
    )

    if (!produto) {
      setErroCodigo('Produto não encontrado. F2 para buscar por nome.')
      setCodigo('')
      return
    }

    setCodigo('')

    if (quantidadeInformada && quantidadeInformada > 0) {
      adicionarItem(produto, quantidadeInformada)
      return
    }

    selecionarProduto(produto)
  }

  function confirmarPeso(event: FormEvent) {
    event.preventDefault()
    if (!produtoPesoPendente) return
    const quantidade = Number(peso)
    if (!quantidade || quantidade <= 0) return

    adicionarItem(produtoPesoPendente, quantidade)
    setProdutoPesoPendente(null)
    setPeso('')
  }

  function removerItem(index: number) {
    setItens((atual) => atual.filter((_, i) => i !== index))
  }

  async function buscarClientes(query: string) {
    if (query.trim().length < 2) {
      setClienteResultados([])
      return
    }
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, cpf, telefone')
      .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%`)
      .eq('ativo', true)
      .limit(8)
    setClienteResultados((data as ClienteResumo[]) ?? [])
  }

  function selecionarCliente(id: string) {
    const encontrado = clienteResultados.find((c) => c.id === id)
    if (encontrado) setCliente(encontrado)
    setModo(null)
  }

  function validarForma(forma: FormaPagamento): string | null {
    if (forma === 'fiado' && !cliente) return 'Pagamento "Outros" exige um cliente selecionado (F4).'
    return null
  }

  function iniciarCheckout() {
    if (itens.length === 0 || finalizando) return
    setErroFinalizar(null)
    if (total <= 0) {
      finalizarVenda([])
      return
    }
    setModo('pagamento')
  }

  function cancelarCheckout() {
    setPagamentos([])
    setModo(null)
  }

  function confirmarPagamento(forma: FormaPagamento, valor: number) {
    const novosPagamentos = [...pagamentos, { forma, valor }]
    setPagamentos(novosPagamentos)

    const novoTotalPago = novosPagamentos.reduce((soma, p) => soma + p.valor, 0)
    const restanteAtual = Math.round((total - novoTotalPago) * 100) / 100

    if (restanteAtual <= 0) {
      setModo(null)
      finalizarVenda(novosPagamentos)
    }
    // se ainda falta, o modal de pagamento continua aberto (troca de key
    // reinicia pro passo de escolher a forma) mostrando quanto falta
  }

  function removerPagamento(index: number) {
    setPagamentos((atual) => atual.filter((_, i) => i !== index))
  }

  async function abrirCancelarVenda() {
    setErroAcaoCaixa(null)
    const limite = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('vendas')
      .select('id, total, finalizada_em')
      .eq('caixa_sessao_id', caixaSessao.id)
      .eq('status', 'finalizada')
      .gte('finalizada_em', limite)
      .order('finalizada_em', { ascending: false })

    if (error) {
      setErroAcaoCaixa(error.message)
      return
    }

    setVendasCancelaveis((data as VendaCancelavel[]) ?? [])
    setModo('cancelar-venda')
  }

  function selecionarVendaParaCancelar(vendaId: string) {
    setContextoSupervisor({ tipo: 'cancelar-venda', vendaId })
    setModo('supervisor')
  }

  function confirmarMovimentoCaixa(movTipo: TipoMovimento, valor: number, motivo: string) {
    setContextoSupervisor({ tipo: 'movimento', movTipo, valor, motivo })
    setModo('supervisor')
  }

  async function autorizarSupervisor(supervisorId: string) {
    if (!contextoSupervisor) {
      setModo(null)
      return
    }

    if (contextoSupervisor.tipo === 'desconto') {
      setDesconto(contextoSupervisor.valor)
      setDescontoAutorizadoPor(supervisorId)
      setModo(null)
    } else if (contextoSupervisor.tipo === 'movimento') {
      const { error } = await supabase.from('caixa_movimentos').insert({
        caixa_sessao_id: caixaSessao.id,
        tipo: contextoSupervisor.movTipo,
        valor: contextoSupervisor.valor,
        motivo: contextoSupervisor.motivo || null,
      })
      if (error) setErroAcaoCaixa(error.message)
      setModo(null)
    } else if (contextoSupervisor.tipo === 'cancelar-venda') {
      const { error } = await supabase.rpc('cancelar_venda', {
        p_venda_id: contextoSupervisor.vendaId,
        p_cancelado_por: supervisorId,
      })
      if (error) setErroAcaoCaixa(error.message)
      else carregarProdutos()
      setModo(null)
    }

    setContextoSupervisor(null)
  }

  async function finalizarVenda(pagamentosFinal: Pagamento[]) {
    setErroFinalizar(null)
    setFinalizando(true)

    const { error } = await supabase.rpc('finalizar_venda', {
      p_caixa_sessao_id: caixaSessao.id,
      p_operador_id: operador.id,
      p_cliente_id: cliente?.id ?? null,
      p_itens: itens.map((i) => ({
        produto_id: i.produto.id,
        quantidade: i.quantidade,
        preco_unitario: i.produto.preco,
      })),
      p_pagamentos: pagamentosFinal,
      p_desconto: desconto,
      p_desconto_autorizado_por: descontoAutorizadoPor,
    })

    setFinalizando(false)

    if (error) {
      setErroFinalizar(error.message)
      return
    }

    setVendaConcluida({ itens, pagamentos: pagamentosFinal, subtotal, desconto, total })
  }

  function novaVenda() {
    setItens([])
    setCliente(null)
    setDesconto(0)
    setDescontoAutorizadoPor(null)
    setPagamentos([])
    setVendaConcluida(null)
    setModo(null)
    carregarProdutos()
  }

  if (vendaConcluida) {
    return <Cupom {...vendaConcluida} onFechar={novaVenda} />
  }

  const produtosFiltrados = produtos
    .filter((p) => {
      const q = buscaProdutoQuery.trim().toLowerCase()
      if (!q) return true
      return (
        p.nome.toLowerCase().includes(q) ||
        p.codigo_interno.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').toLowerCase().includes(q)
      )
    })
    .slice(0, 8)

  return (
    <div className="venda-page">
      <div className="venda-principal">
        <form onSubmit={handleCodigoSubmit} className="venda-scan">
          <input
            ref={inputCodigoRef}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código de barras / interno — ou 5x<código> para quantidade"
            autoFocus
            disabled={modo !== null || !!produtoPesoPendente}
          />
        </form>
        {erroCodigo && <p className="erro">{erroCodigo}</p>}

        {produtoPesoPendente && (
          <form onSubmit={confirmarPeso} className="venda-peso">
            <span>{produtoPesoPendente.nome} — informe o peso (kg)</span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              autoFocus
              required
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setProdutoPesoPendente(null)
                  setPeso('')
                }
              }}
            />
            <button type="submit">Adicionar</button>
            <button type="button" onClick={() => setProdutoPesoPendente(null)}>
              Cancelar (Esc)
            </button>
          </form>
        )}

        <table className="venda-itens">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Preço</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i}>
                <td>{item.produto.nome}</td>
                <td>
                  {item.quantidade}
                  {item.produto.unidade === 'kg' ? 'kg' : ''}
                </td>
                <td>{moeda(item.produto.preco)}</td>
                <td>{moeda(item.quantidade * item.produto.preco)}</td>
                <td>
                  <button type="button" onClick={() => removerItem(i)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum item ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <aside className="venda-lateral">
        {cliente ? (
          <div className="venda-cliente-selecionado">
            <span>Cliente: {cliente.nome}</span>
            <button type="button" onClick={() => setCliente(null)}>
              Remover
            </button>
          </div>
        ) : (
          <p className="venda-cliente-vazio">Sem cliente (F4 para selecionar)</p>
        )}

        <div className="venda-totais">
          <div>
            <span>Subtotal</span>
            <span>{moeda(subtotal)}</span>
          </div>
          <div>
            <span>Desconto</span>
            <span>{moeda(desconto)}</span>
          </div>
          <div className="venda-total-final">
            <span>Total</span>
            <span>{moeda(total)}</span>
          </div>
        </div>

        <h3>Pagamento</h3>
        <ul className="venda-pagamentos-lista">
          {pagamentos.map((pagamento, i) => (
            <li key={i}>
              <span>{rotuloForma[pagamento.forma]}</span>
              <span>{moeda(pagamento.valor)}</span>
              <button type="button" onClick={() => removerPagamento(i)}>
                x
              </button>
            </li>
          ))}
        </ul>

        <p>Restante: {moeda(Math.max(0, restante))}</p>
        {erroFinalizar && <p className="erro">{erroFinalizar}</p>}

        <button type="button" onClick={iniciarCheckout} disabled={itens.length === 0 || finalizando}>
          {finalizando ? 'Finalizando...' : 'Finalizar venda (F9)'}
        </button>

        <PainelIdentificacao operadorNome={operador.nome} />
      </aside>

      <footer className="venda-atalhos">
        <span>F2 Buscar produto</span>
        <span>F3 Desconto</span>
        <span>F4 Cliente</span>
        <span>F5 Sangria/Suprimento</span>
        <span>F7 Cancelar venda</span>
        <span>F8 Fechar caixa</span>
        <span>F9 Pagamento/Finalizar</span>
        <span>Esc Cancelar</span>
      </footer>

      {modo === 'busca-produto' && (
        <SeletorModal
          titulo="Buscar produto por nome"
          placeholder="Digite o nome do produto"
          itens={produtosFiltrados.map((p) => ({
            id: p.id,
            label: p.nome,
            sublabel: `${p.unidade === 'kg' ? 'kg' : 'un'} · ${moeda(p.preco)}`,
          }))}
          onQueryChange={setBuscaProdutoQuery}
          onSelecionar={(id) => {
            const produto = produtos.find((p) => p.id === id)
            if (produto) selecionarProduto(produto)
          }}
          onFechar={() => setModo(null)}
        />
      )}

      {modo === 'cliente' && (
        <SeletorModal
          titulo="Selecionar cliente"
          placeholder="Nome ou CPF (mín. 2 letras)"
          itens={clienteResultados.map((c) => ({
            id: c.id,
            label: c.nome,
            sublabel: c.cpf ?? undefined,
          }))}
          onQueryChange={buscarClientes}
          onSelecionar={selecionarCliente}
          onFechar={() => setModo(null)}
        />
      )}

      {modo === 'desconto' && (
        <DescontoModal
          subtotal={subtotal}
          onFechar={() => setModo(null)}
          onConfirmar={(valor) => {
            setContextoSupervisor({ tipo: 'desconto', valor })
            setModo('supervisor')
          }}
        />
      )}

      {modo === 'movimento-caixa' && (
        <MovimentoCaixaModal onFechar={() => setModo(null)} onConfirmar={confirmarMovimentoCaixa} />
      )}

      {modo === 'cancelar-venda' && (
        <SeletorModal
          titulo="Cancelar venda (últimos 30 min)"
          comBusca={false}
          itens={vendasCancelaveis.map((v) => ({
            id: v.id,
            label: new Date(v.finalizada_em).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            sublabel: moeda(v.total),
          }))}
          onSelecionar={selecionarVendaParaCancelar}
          onFechar={() => setModo(null)}
          rodape="↑↓ navegar · Enter selecionar · Esc cancelar"
        />
      )}

      {modo === 'fechar-caixa' && (
        <FecharCaixaModal
          caixaSessao={caixaSessao}
          onFechar={() => setModo(null)}
          onFechada={() => {
            setModo(null)
            onCaixaFechado()
          }}
        />
      )}

      {modo === 'supervisor' && (
        <SupervisorModal
          titulo={
            contextoSupervisor?.tipo === 'desconto'
              ? 'Autorizar desconto'
              : contextoSupervisor?.tipo === 'movimento'
                ? `Autorizar ${contextoSupervisor.movTipo === 'sangria' ? 'sangria' : 'suprimento'}`
                : 'Autorizar cancelamento de venda'
          }
          onCancelar={() => {
            setContextoSupervisor(null)
            setModo(null)
          }}
          onAutorizado={autorizarSupervisor}
        />
      )}

      {erroAcaoCaixa && <p className="erro venda-erro-flutuante">{erroAcaoCaixa}</p>}

      {modo === 'pagamento' && (
        <PagamentoModal
          key={pagamentos.length}
          restante={Math.max(0, restante)}
          mensagemTopo={pagamentos.length > 0 ? `Falta ${moeda(Math.max(0, restante))} — escolha a forma de pagamento` : undefined}
          validarForma={validarForma}
          onFechar={cancelarCheckout}
          onConfirmar={confirmarPagamento}
        />
      )}
    </div>
  )
}

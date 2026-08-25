import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { SupervisorModal } from '../components/SupervisorModal'
import { SeletorCliente } from '../components/SeletorCliente'
import { Cupom } from '../components/Cupom'
import type { CaixaSessao, FormaPagamento, ItemCarrinho, Operador, Pagamento, Produto } from '../types'

const rotuloForma: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  cartao_debito: 'Cartão débito',
  cartao_credito: 'Cartão crédito',
  pix: 'Pix',
  fiado: 'Fiado',
}

interface Props {
  operador: Operador
  caixaSessao: CaixaSessao
}

interface ClienteResumo {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function VendaPage({ operador, caixaSessao }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [codigo, setCodigo] = useState('')
  const [erroCodigo, setErroCodigo] = useState<string | null>(null)
  const [produtoPesoPendente, setProdutoPesoPendente] = useState<Produto | null>(null)
  const [peso, setPeso] = useState('')

  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [cliente, setCliente] = useState<ClienteResumo | null>(null)

  const [desconto, setDesconto] = useState(0)
  const [descontoAutorizadoPor, setDescontoAutorizadoPor] = useState<string | null>(null)
  const [pedindoDescontoValor, setPedindoDescontoValor] = useState(false)
  const [valorDescontoInput, setValorDescontoInput] = useState('')
  const [mostrarModalSupervisor, setMostrarModalSupervisor] = useState(false)

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [formaAtual, setFormaAtual] = useState<FormaPagamento>('dinheiro')
  const [valorPagamentoInput, setValorPagamentoInput] = useState('')

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

  useEffect(() => {
    supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .then(({ data }) => setProdutos((data as Produto[]) ?? []))
  }, [])

  useEffect(() => {
    inputCodigoRef.current?.focus()
  })

  const subtotal = itens.reduce((soma, item) => soma + item.quantidade * item.produto.preco, 0)
  const total = Math.max(0, subtotal - desconto)
  const totalPago = pagamentos.reduce((soma, p) => soma + p.valor, 0)
  const restante = Math.round((total - totalPago) * 100) / 100

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

  function handleCodigoSubmit(event: FormEvent) {
    event.preventDefault()
    setErroCodigo(null)
    const valor = codigo.trim()
    if (!valor) return

    const produto = produtos.find((p) => p.codigo_barras === valor || p.codigo_interno === valor)

    if (!produto) {
      setErroCodigo('Produto não encontrado.')
      setCodigo('')
      return
    }

    if (produto.unidade === 'kg') {
      setProdutoPesoPendente(produto)
      setCodigo('')
      return
    }

    adicionarItem(produto, 1)
    setCodigo('')
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

  function iniciarDesconto(event: FormEvent) {
    event.preventDefault()
    const valor = Number(valorDescontoInput)
    if (!valor || valor <= 0 || valor > subtotal) return
    setMostrarModalSupervisor(true)
  }

  function adicionarPagamento(event: FormEvent) {
    event.preventDefault()
    const valor = Number(valorPagamentoInput)
    if (!valor || valor <= 0) return
    if (formaAtual === 'fiado' && !cliente) {
      setErroFinalizar('Pagamento fiado exige um cliente selecionado.')
      return
    }
    setErroFinalizar(null)
    setPagamentos((atual) => [...atual, { forma: formaAtual, valor }])
    setValorPagamentoInput('')
  }

  function removerPagamento(index: number) {
    setPagamentos((atual) => atual.filter((_, i) => i !== index))
  }

  async function finalizarVenda() {
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
      p_pagamentos: pagamentos,
      p_desconto: desconto,
      p_desconto_autorizado_por: descontoAutorizadoPor,
    })

    setFinalizando(false)

    if (error) {
      setErroFinalizar(error.message)
      return
    }

    setVendaConcluida({ itens, pagamentos, subtotal, desconto, total })
  }

  function novaVenda() {
    setItens([])
    setCliente(null)
    setDesconto(0)
    setDescontoAutorizadoPor(null)
    setValorDescontoInput('')
    setPagamentos([])
    setValorPagamentoInput('')
    setVendaConcluida(null)
    // recarrega catalogo para refletir estoque atualizado pela venda anterior
    supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .then(({ data }) => setProdutos((data as Produto[]) ?? []))
  }

  if (vendaConcluida) {
    return <Cupom {...vendaConcluida} onFechar={novaVenda} />
  }

  return (
    <div className="venda-page">
      <div className="venda-principal">
        <form onSubmit={handleCodigoSubmit} className="venda-scan">
          <input
            ref={inputCodigoRef}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código de barras / código interno"
            autoFocus
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
            />
            <button type="submit">Adicionar</button>
            <button type="button" onClick={() => setProdutoPesoPendente(null)}>
              Cancelar
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
        <SeletorCliente clienteSelecionado={cliente} onSelecionar={setCliente} />

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

        {!pedindoDescontoValor ? (
          <button type="button" onClick={() => setPedindoDescontoValor(true)} disabled={itens.length === 0}>
            Aplicar desconto
          </button>
        ) : (
          <form onSubmit={iniciarDesconto} className="venda-desconto-form">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor do desconto"
              value={valorDescontoInput}
              onChange={(e) => setValorDescontoInput(e.target.value)}
              autoFocus
            />
            <button type="submit">Confirmar</button>
            <button type="button" onClick={() => setPedindoDescontoValor(false)}>
              Cancelar
            </button>
          </form>
        )}

        <h3>Pagamento</h3>
        <form onSubmit={adicionarPagamento} className="venda-pagamento-form">
          <select value={formaAtual} onChange={(e) => setFormaAtual(e.target.value as FormaPagamento)}>
            {Object.entries(rotuloForma).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor"
            value={valorPagamentoInput}
            onChange={(e) => setValorPagamentoInput(e.target.value)}
          />
          <button type="submit">Adicionar pagamento</button>
        </form>

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

        <button
          type="button"
          onClick={finalizarVenda}
          disabled={itens.length === 0 || restante !== 0 || finalizando}
        >
          {finalizando ? 'Finalizando...' : 'Finalizar venda'}
        </button>
      </aside>

      {mostrarModalSupervisor && (
        <SupervisorModal
          titulo="Autorizar desconto"
          onCancelar={() => setMostrarModalSupervisor(false)}
          onAutorizado={(supervisorId) => {
            setDesconto(Number(valorDescontoInput))
            setDescontoAutorizadoPor(supervisorId)
            setMostrarModalSupervisor(false)
            setPedindoDescontoValor(false)
          }}
        />
      )}
    </div>
  )
}

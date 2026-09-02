import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'

const formVazio = {
  id: null as string | null,
  nome: '',
  cpf: '',
  telefone: '',
  limite_fiado_sugerido: '',
  dia_vencimento_fiado: '',
}

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')

  async function carregarClientes() {
    setCarregando(true)
    const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true })

    if (error) setErro(error.message)
    else setClientes(data as Cliente[])
    setCarregando(false)
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  function editar(cliente: Cliente) {
    setForm({
      id: cliente.id,
      nome: cliente.nome,
      cpf: cliente.cpf ?? '',
      telefone: cliente.telefone ?? '',
      limite_fiado_sugerido: cliente.limite_fiado_sugerido ? String(cliente.limite_fiado_sugerido) : '',
      dia_vencimento_fiado: cliente.dia_vencimento_fiado ? String(cliente.dia_vencimento_fiado) : '',
    })
  }

  async function alternarAtivo(cliente: Cliente) {
    const { error } = await supabase.from('clientes').update({ ativo: !cliente.ativo }).eq('id', cliente.id)

    if (error) setErro(error.message)
    else carregarClientes()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)
    setSalvando(true)

    const payload = {
      nome: form.nome,
      cpf: form.cpf.trim() === '' ? null : form.cpf.trim(),
      telefone: form.telefone.trim() === '' ? null : form.telefone.trim(),
      limite_fiado_sugerido:
        form.limite_fiado_sugerido.trim() === '' ? null : Number(form.limite_fiado_sugerido),
      dia_vencimento_fiado:
        form.dia_vencimento_fiado.trim() === '' ? null : Number(form.dia_vencimento_fiado),
    }

    const { error } = form.id
      ? await supabase.from('clientes').update(payload).eq('id', form.id)
      : await supabase.from('clientes').insert(payload)

    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }

    setForm(formVazio)
    carregarClientes()
  }

  const clientesFiltrados = clientes.filter((c) => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return c.nome.toLowerCase().includes(q) || (c.cpf ?? '').includes(q) || (c.telefone ?? '').includes(q)
  })

  return (
    <div className="produtos-page">
      <section className="produtos-form">
        <h2>{form.id ? 'Editar cliente' : 'Novo cliente'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </label>
          <label>
            CPF (opcional)
            <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </label>
          <label>
            Telefone (opcional)
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </label>
          <label>
            Limite de fiado sugerido (opcional)
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.limite_fiado_sugerido}
              onChange={(e) => setForm({ ...form, limite_fiado_sugerido: e.target.value })}
              placeholder="só um alerta, não bloqueia a venda"
            />
          </label>
          <label>
            Dia de vencimento do fiado (opcional)
            <input
              type="number"
              min="1"
              max="31"
              value={form.dia_vencimento_fiado}
              onChange={(e) => setForm({ ...form, dia_vencimento_fiado: e.target.value })}
            />
          </label>
          <div className="produtos-form-acoes">
            <button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Adicionar cliente'}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm(formVazio)}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="produtos-lista">
        <h2>Clientes cadastrados</h2>
        <input
          placeholder="Buscar por nome, CPF ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ marginBottom: 12, width: '100%' }}
        />
        {erro && <p className="erro">{erro}</p>}
        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Limite fiado</th>
                <th>Vencimento</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className={cliente.ativo ? '' : 'inativo'}>
                  <td>{cliente.nome}</td>
                  <td>{cliente.cpf ?? '—'}</td>
                  <td>{cliente.telefone ?? '—'}</td>
                  <td>
                    {cliente.limite_fiado_sugerido
                      ? cliente.limite_fiado_sugerido.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      : '—'}
                  </td>
                  <td>{cliente.dia_vencimento_fiado ? `dia ${cliente.dia_vencimento_fiado}` : '—'}</td>
                  <td>{cliente.ativo ? 'Sim' : 'Não'}</td>
                  <td className="produtos-lista-acoes">
                    <button type="button" onClick={() => editar(cliente)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => alternarAtivo(cliente)}>
                      {cliente.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhum cliente cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

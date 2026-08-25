import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface ClienteResumo {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
}

interface Props {
  clienteSelecionado: ClienteResumo | null
  onSelecionar: (cliente: ClienteResumo | null) => void
}

export function SeletorCliente({ clienteSelecionado, onSelecionar }: Props) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ClienteResumo[]>([])

  async function buscar(valor: string) {
    setBusca(valor)
    if (valor.trim().length < 2) {
      setResultados([])
      return
    }

    const { data } = await supabase
      .from('clientes')
      .select('id, nome, cpf, telefone')
      .or(`nome.ilike.%${valor}%,cpf.ilike.%${valor}%`)
      .eq('ativo', true)
      .limit(5)

    setResultados((data as ClienteResumo[]) ?? [])
  }

  if (clienteSelecionado) {
    return (
      <div className="seletor-cliente-selecionado">
        <span>Cliente: {clienteSelecionado.nome}</span>
        <button type="button" onClick={() => onSelecionar(null)}>
          Remover
        </button>
      </div>
    )
  }

  return (
    <div className="seletor-cliente">
      <input
        placeholder="Buscar cliente por nome ou CPF (opcional)"
        value={busca}
        onChange={(e) => buscar(e.target.value)}
      />
      {resultados.length > 0 && (
        <ul className="seletor-cliente-resultados">
          {resultados.map((cliente) => (
            <li key={cliente.id}>
              <button
                type="button"
                onClick={() => {
                  onSelecionar(cliente)
                  setBusca('')
                  setResultados([])
                }}
              >
                {cliente.nome} {cliente.cpf ? `— ${cliente.cpf}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

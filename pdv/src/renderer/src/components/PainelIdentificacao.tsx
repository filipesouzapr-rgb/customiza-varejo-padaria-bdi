import logoCustomiza from '../assets/logo-customiza.png'
import { useRelogio } from '../lib/useRelogio'

const NOME_ESTABELECIMENTO = 'Padaria BDI'

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarData(data: Date) {
  const dia = diasSemana[data.getDay()]
  const dd = String(data.getDate()).padStart(2, '0')
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  return `${dia}, ${dd}/${mm}/${data.getFullYear()}`
}

function formatarHora(data: Date) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface Props {
  operadorNome: string
}

export function PainelIdentificacao({ operadorNome }: Props) {
  const agora = useRelogio()

  return (
    <div className="painel-identificacao">
      <div className="painel-identificacao-logo">
        <img src={logoCustomiza} alt="Customiza Sistemas" />
      </div>
      <span className="painel-identificacao-estabelecimento">{NOME_ESTABELECIMENTO}</span>
      <span className="painel-identificacao-operador">Operador: {operadorNome}</span>
      <div className="painel-identificacao-relogio">
        <span className="painel-identificacao-hora">{formatarHora(agora)}</span>
        <span className="painel-identificacao-data">{formatarData(agora)}</span>
      </div>
    </div>
  )
}

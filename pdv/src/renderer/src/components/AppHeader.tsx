import logoCustomiza from '../assets/logo-customiza.png'
import { NOME_ESTABELECIMENTO } from '../lib/config'

interface Props {
  operadorNome?: string
}

export function AppHeader({ operadorNome }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-logo">
        <img src={logoCustomiza} alt="Customiza Sistemas" />
      </div>
      <span className="app-header-estabelecimento">{NOME_ESTABELECIMENTO}</span>
      {operadorNome && <span className="app-header-operador">{operadorNome}</span>}
    </header>
  )
}

import logoCustomiza from '../assets/logo-customiza.png'

const NOME_ESTABELECIMENTO = 'Padaria BDI'

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

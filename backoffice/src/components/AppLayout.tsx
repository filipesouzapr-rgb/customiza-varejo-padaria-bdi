import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { NOME_ESTABELECIMENTO } from '../lib/config'

const CHAVE_ULTIMOS_FILTROS = 'ultimosFiltros'

function lerUltimosFiltros(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_ULTIMOS_FILTROS) ?? '{}')
  } catch {
    return {}
  }
}

export function AppLayout() {
  const location = useLocation()

  // Guarda o ultimo ?filtros de cada tela, pra o menu voltar nela do jeito
  // que estava (so vale enquanto a aba do navegador estiver aberta).
  useEffect(() => {
    const mapa = lerUltimosFiltros()
    mapa[location.pathname] = location.search
    try {
      sessionStorage.setItem(CHAVE_ULTIMOS_FILTROS, JSON.stringify(mapa))
    } catch {
      // sessionStorage indisponivel (ex: navegacao privada) - so perde a lembranca
    }
  }, [location.pathname, location.search])

  const linkComFiltros = (path: string) => `${path}${lerUltimosFiltros()[path] ?? ''}`

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-titulo">{NOME_ESTABELECIMENTO}</span>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to={linkComFiltros('/produtos')}>Produtos</NavLink>
          <NavLink to={linkComFiltros('/clientes')}>Clientes</NavLink>
          <NavLink to={linkComFiltros('/fiado')}>Fiado</NavLink>
        </nav>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

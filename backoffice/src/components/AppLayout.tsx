import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-titulo">Padaria BDI</span>
        <nav>
          <NavLink to="/produtos">Produtos</NavLink>
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

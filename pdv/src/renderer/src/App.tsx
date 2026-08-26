import { useEffect, useState } from 'react'
import { useSession } from './lib/useSession'
import { useOperador } from './lib/useOperador'
import { supabase } from './lib/supabase'
import { AppHeader } from './components/AppHeader'
import { LoginPage } from './pages/LoginPage'
import { AbrirCaixaPage } from './pages/AbrirCaixaPage'
import { VendaPage } from './pages/VendaPage'
import type { CaixaSessao } from './types'

function App(): React.JSX.Element | null {
  const { session, loading: carregandoSessao } = useSession()
  const { operador, loading: carregandoOperador } = useOperador(session)
  const [caixaSessao, setCaixaSessao] = useState<CaixaSessao | null>(null)
  const [carregandoCaixa, setCarregandoCaixa] = useState(true)

  useEffect(() => {
    if (!session) {
      setCarregandoCaixa(false)
      return
    }

    setCarregandoCaixa(true)
    supabase
      .from('caixa_sessoes')
      .select('*')
      .is('fechado_em', null)
      .order('aberto_em', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setCaixaSessao(data as CaixaSessao | null)
        setCarregandoCaixa(false)
      })
  }, [session])

  if (carregandoSessao || carregandoOperador || carregandoCaixa) return null

  let conteudo: React.JSX.Element

  if (!session) {
    conteudo = <LoginPage />
  } else if (!operador) {
    conteudo = (
      <div className="tela-central">
        <p>Este usuário não tem um perfil de operador cadastrado. Fale com o dono.</p>
      </div>
    )
  } else if (!caixaSessao) {
    conteudo = <AbrirCaixaPage operadorId={operador.id} onAberta={setCaixaSessao} />
  } else {
    conteudo = <VendaPage operador={operador} caixaSessao={caixaSessao} />
  }

  return (
    <>
      <AppHeader operadorNome={operador?.nome} />
      {conteudo}
    </>
  )
}

export default App

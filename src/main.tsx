import { StrictMode, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Login from './pages/Login'
import Groups from './pages/Groups'
import GroupPage from './pages/GroupPage'
import Join from './pages/Join'
import './styles.css'

function Gate({ children }: { children: ReactElement }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="wrap mute">Loading…</div>
  if (!user) return <Login />
  return children
}

// A new deploy installs a new service worker; reload once when it takes over so users never keep seeing the old version.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => hadController && location.reload())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Gate><Groups /></Gate>} />
          <Route path="/g/:gid" element={<Gate><GroupPage /></Gate>} />
          <Route path="/join/:gid" element={<Gate><Join /></Gate>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

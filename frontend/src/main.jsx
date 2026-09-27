import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import SimulatorPage from './pages/SimulatorPage'
import NotFoundPage from './pages/NotFoundPage'

// The app is mounted at "/" and selects its view from the Zustand store, so "/"
// is the only real route. Previously "*" also rendered the app, which meant a
// mistyped or stale URL silently showed the landing page instead of saying the
// address was wrong.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SimulatorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/theme.css'
import './styles/layout.css'
import './styles/matches.css'
import './styles/live.css'
import './styles/files.css'
import './styles/print.css'
import './styles/yearplan.css'
import './styles/trainingsplan.css'
import './styles/beispiele.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

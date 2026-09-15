import '../assets/main.css'
import '@xterm/xterm/css/xterm.css'
import './shell.css'
import { createRoot } from 'react-dom/client'
import { RelayShell } from './shell'
for (const key of Object.keys(localStorage)) {
  if (key.startsWith('magi.') && localStorage.getItem(key.replace(/^magi\./, 'relay.')) === null) {
    localStorage.setItem(key.replace(/^magi\./, 'relay.'), localStorage.getItem(key) || '')
  }
}
createRoot(document.getElementById('root')!).render(<RelayShell />)

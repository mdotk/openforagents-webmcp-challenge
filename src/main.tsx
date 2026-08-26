import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FittingRoomApp from './FittingRoomApp.tsx'

const experience = new URLSearchParams(window.location.search).get('experience')

createRoot(document.getElementById('root')!).render(
  experience === 'fitting-room' ? <FittingRoomApp /> : <App />,
)

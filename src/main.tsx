import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FittingRoomApp from './FittingRoomApp.tsx'
import RackRescueApp from './RackRescueApp.tsx'

const experience = new URLSearchParams(window.location.search).get('experience')

createRoot(document.getElementById('root')!).render(
  experience === 'rack-rescue' ? (
    <RackRescueApp />
  ) : experience === 'fitting-room' ? (
    <FittingRoomApp />
  ) : (
    <App />
  ),
)

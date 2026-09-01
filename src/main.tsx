import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FittingRoomApp from './FittingRoomApp.tsx'
import RackRescueApp from './RackRescueApp.tsx'
import ShoppingApp from './ShoppingApp.tsx'

const experience = new URLSearchParams(window.location.search).get('experience')

createRoot(document.getElementById('root')!).render(
  experience === 'rack-rescue' ? (
    <RackRescueApp />
  ) : experience === 'shopping' ? (
    <ShoppingApp />
  ) : experience === 'fitting-room' ? (
    <FittingRoomApp />
  ) : (
    <App />
  ),
)

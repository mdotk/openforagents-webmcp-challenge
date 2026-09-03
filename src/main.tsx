import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FittingRoomApp from './FittingRoomApp.tsx'
import RackRescueApp from './RackRescueApp.tsx'
import ShoppingApp from './ShoppingApp.tsx'
import WorldlineApp from './WorldlineApp.tsx'
import { resolveExperience } from './experience.ts'

const experience = resolveExperience(window.location.search)

createRoot(document.getElementById('root')!).render(
  experience === 'worldline' ? (
    <WorldlineApp />
  ) : experience === 'rack-rescue' ? (
    <RackRescueApp />
  ) : experience === 'fitting-room' ? (
    <FittingRoomApp />
  ) : experience === 'launch-window' ? (
    <App />
  ) : (
    <ShoppingApp />
  ),
)

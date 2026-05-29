import { Routes, Route, useLocation } from 'react-router-dom'
import CanvasContainer from './components/CanvasContainer'
import LandingPage from './pages/LandingPage'
import PortalSelection from './pages/PortalSelection'

export default function App() {
  const location = useLocation()
  const isPortals = location.pathname === '/portals'

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-white">
      {/* Persistent morphing 3D background */}
      <CanvasContainer isPortals={isPortals} />

      {/* Page Routing */}
      <div className="relative z-10 w-full min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/portals" element={<PortalSelection />} />
        </Routes>
      </div>
    </div>
  )
}



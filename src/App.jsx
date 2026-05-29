import { Routes, Route, useLocation } from 'react-router-dom'
import CanvasContainer from './components/CanvasContainer'
import LandingPage from './pages/LandingPage'
import PortalSelection from './pages/PortalSelection'
import VendorAuth from './pages/VendorAuth'
import VendorDashboard from './pages/VendorDashboard'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  const location = useLocation()
  const isPortals = location.pathname === '/portals'
  const isAuth = location.pathname === '/vendor-auth'
  const isDashboard = location.pathname === '/vendor-dashboard'

  return (
    <AuthProvider>
      <div className="relative w-full min-h-screen overflow-x-hidden bg-white">
        {/* Persistent morphing 3D background */}
        <CanvasContainer isPortals={isPortals} isAuth={isAuth || isDashboard} />

        {/* Page Routing */}
        <div className="relative z-10 w-full min-h-screen">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/portals" element={<PortalSelection />} />
            <Route path="/vendor-auth" element={<VendorAuth />} />
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}



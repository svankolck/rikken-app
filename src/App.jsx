import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiFetch from './utils/api';
import Home from './pages/Home';
import Spelers from './pages/Spelers';
import Locaties from './pages/Locaties';
import SpelSettings from './pages/SpelSettings';
import PuntenSettings from './pages/PuntenSettings';
import NieuweAvond from './pages/NieuweAvond';
import Spelavond from './pages/Spelavond';
import Analytics from './pages/Analytics';
import Eindstand from './pages/Eindstand';
import SpelerDetail from './pages/SpelerDetail';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Account from './pages/Account';

// Protected route component
function ProtectedRoute({ children, isAuthenticated, user, requiredRole = null }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState({});

  // Check if user is already logged in on mount
  useEffect(() => {
    const loadApp = async () => {
      // Load feature flags (try multiple times in case of timing issues)
      let featuresLoaded = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Loading features, attempt ${attempt}...`);
          const featuresData = await apiFetch('/api/spelavond/features');

          setFeatures(featuresData);
          window.FEATURE_MEERDERE = featuresData.FEATURE_MEERDERE;
          console.log('Features loaded successfully:', featuresData);
          featuresLoaded = true;
          break;
        } catch (error) {
          console.log(`Features load attempt ${attempt} failed:`, error);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        }
      }

      if (!featuresLoaded) {
        console.log('Could not load features after 3 attempts, using fallback');
        // Fallback: assume feature is enabled if server is running with FEATURE_MEERDERE
        window.FEATURE_MEERDERE = true; // Default to enabled for development
        console.log('Using fallback FEATURE_MEERDERE:', window.FEATURE_MEERDERE);
      }

      // Check for existing token
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        setIsAuthenticated(true);
        setUser(JSON.parse(savedUser));
      }

      setLoading(false);
    };

    loadApp();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎲</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {isAuthenticated ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
          {/* Decorative background blobs */}
          <div className="blob-1" />
          <div className="blob-2" />

          {/* Main content with higher z-index */}
          <div className="relative z-10">
            <Routes>
              <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
              <Route path="/admin" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user} requiredRole="admin">
                  <AdminPanel user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/account" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <Account user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/spelers" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <Spelers user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/locaties" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <Locaties user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/spel-settings" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <SpelSettings user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/punten-settings" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <PuntenSettings user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/nieuwe-avond" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <NieuweAvond user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/spelavond/:id" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <Spelavond user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/eindstand/:id" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <Eindstand user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <Analytics user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/speler-detail/:naam" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                  <SpelerDetail user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;

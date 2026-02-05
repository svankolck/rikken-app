import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
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
import ManageUsers from './pages/ManageUsers';

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

  // Check for existing Supabase session on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user && mounted) {
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, approved, speler_id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) console.warn('Profile fetch error:', profileError);

          const isSV = session.user.email === 'svankolck@gmail.com';
          setIsAuthenticated(true);
          setUser({
            id: session.user.id,
            email: session.user.email,
            role: isSV ? 'admin' : (profile?.role || 'display'),
            approved: isSV ? true : (profile?.approved || false),
            speler_id: profile?.speler_id
          });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        try {
          // Fetch profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, approved, speler_id')
            .eq('id', session.user.id)
            .maybeSingle();

          const isSV = session.user.email === 'svankolck@gmail.com';
          setIsAuthenticated(true);
          setUser({
            id: session.user.id,
            email: session.user.email,
            role: isSV ? 'admin' : (profile?.role || 'display'),
            approved: isSV ? true : (profile?.approved || false),
            speler_id: profile?.speler_id
          });
        } catch (err) {
          console.error('Auth state change error:', err);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }

      // Safety: always ensure loading is false after state change if we are still loading
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎲</div>
          <p className="text-gray-600">Laden...</p>
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
              <Route path="/manage-users" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} user={user} requiredRole="admin">
                  <ManageUsers user={user} onLogout={handleLogout} />
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

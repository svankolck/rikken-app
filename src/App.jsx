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
    let fetchingId = null; // Track if we're already fetching for this user

    const updateUserState = async (session, event = 'INITIAL') => {
      if (!mounted) return;

      if (!session?.user) {
        console.log(`App: No session (${event})`);
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      const userEmail = session.user.email;
      const isSV = userEmail === 'svankolck@gmail.com';

      // OPTIMISTIC UPDATE: If it's the admin, set state immediately
      if (isSV) {
        console.log(`App: Optimistic Admin detected (${event})`);
        setIsAuthenticated(true);
        setUser({
          id: session.user.id,
          email: userEmail,
          role: 'admin',
          approved: true,
          speler_id: null // Will be updated if profile loads, but admin works without it
        });
        // We still fetch profile in background to get speler_id, but we stop loading NOW
        setLoading(false);
      }

      // Avoid redundant fetches for the same user ID in a short window
      if (fetchingId === session.user.id) {
        console.log(`App: Already fetching for ${session.user.id}, skipping redundant call`);
        return;
      }
      fetchingId = session.user.id;

      try {
        console.log(`App: Fetching profile for ${userEmail} (${event})`);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, approved, speler_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (mounted) {
          setIsAuthenticated(true);
          setUser({
            id: session.user.id,
            email: userEmail,
            role: isSV ? 'admin' : (profile?.role || 'display'),
            approved: isSV ? true : (profile?.approved || false),
            speler_id: profile?.speler_id
          });
          console.log(`App: User state fully initialized (${event})`);
        }
      } catch (err) {
        console.warn(`App: Profile fetch issue (${event}), using defaults:`, err.message);
        // If profile fetch fails, we still have the session, so keep isAuthenticated
        if (mounted && !isSV) {
          setIsAuthenticated(true);
          setUser({
            id: session.user.id,
            email: userEmail,
            role: 'display',
            approved: false,
            speler_id: null
          });
        }
      } finally {
        if (mounted) setLoading(false);
        fetchingId = null;
      }
    };

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) updateUserState(session, 'GET_SESSION');
      else {
        // If no session from getSession, onAuthStateChange will still fire with INITIAL_SESSION
        // but we can proactively stop loading if we're sure
      }
    });

    // 2. Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('App: Auth event:', event);
      updateUserState(session, event);
    });

    // Safety timeout: Always stop loading after 4 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('App: Safety timeout reached');
        setLoading(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
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

import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const [actiefAvond, setActiefAvond] = useState(null);

  useEffect(() => {
    // Check for active game night
    const checkActief = async () => {
      try {
        const { data, error } = await supabase
          .from('spelavonden')
          .select('*')
          .eq('status', 'actief')
          .limit(1)
          .single();

        if (data && !error) {
          setActiefAvond(data);
        }
      } catch (err) {
        // No active game night, that's fine
        console.log('Geen actieve avond gevonden');
      }
    };

    checkActief();
  }, []);

  const handleNieuweAvond = () => {
    if (actiefAvond) {
      const confirm = window.confirm('Er is al een actieve spelavond. Doorgaan naar die avond?');
      if (confirm) {
        navigate(`/spelavond/${actiefAvond.id}`);
      }
    } else {
      navigate('/nieuwe-avond');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen page-container">
      {/* Modern Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ width: '40px', flexShrink: 0 }}></div>

        <h1 className="text-2xl font-bold flex items-center justify-center gap-3 flex-1">
          <span className="text-2xl">♠♥</span>
          <span>Rikken</span>
          <span className="text-2xl">♦♣</span>
        </h1>

        {/* User menu - SIMPEL */}
        <div style={{ minWidth: '100px', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            onClick={() => user?.role === 'admin' && navigate('/admin')}
            disabled={user?.role !== 'admin'}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'white',
              color: user?.role === 'admin' ? '#1B5E7E' : '#999',
              borderRadius: '50%',
              fontSize: '20px',
              border: '2px solid white',
              cursor: user?.role === 'admin' ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              opacity: user?.role === 'admin' ? 1 : 0.5
            }}
            title={user?.role === 'admin' ? 'Admin Panel' : 'Geen admin toegang'}
          >
            ⚙️
          </button>
          <button
            onClick={() => navigate('/account')}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'white',
              color: '#1B5E7E',
              borderRadius: '50%',
              fontSize: '20px',
              border: '2px solid white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            title="Account"
          >
            👤
          </button>
        </div>
      </div>

      {/* Active avond banner */}
      {actiefAvond && (
        <div className="mb-6 p-5 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-3xl shadow-soft animate-pulse">
          <p className="text-center font-semibold text-gray-800 mb-3">
            🎯 Er is een actieve spelavond!
          </p>
          <button
            onClick={() => navigate(`/spelavond/${actiefAvond.id}`)}
            className="btn-primary w-full"
          >
            Ga naar actieve avond
          </button>
        </div>
      )}

      {/* Modern Grid met knoppen */}
      <div className="grid grid-cols-2 gap-5">
        <button
          onClick={() => navigate('/spelers')}
          className="btn-primary h-32 text-xl flex flex-col items-center justify-center gap-2"
        >
          <span className="text-3xl">👥</span>
          <span>Spelers</span>
        </button>

        <button
          onClick={() => navigate('/locaties')}
          className="btn-primary h-32 text-xl flex flex-col items-center justify-center gap-2"
        >
          <span className="text-3xl">📍</span>
          <span>Locaties</span>
        </button>

        <button
          onClick={() => navigate('/spel-settings')}
          className="btn-primary h-32 text-xl flex flex-col items-center justify-center gap-2"
        >
          <span className="text-3xl">⚙️</span>
          <span>Spel Settings</span>
        </button>

        <button
          onClick={() => navigate('/punten-settings')}
          className="btn-primary h-32 text-xl flex flex-col items-center justify-center gap-2"
        >
          <span className="text-3xl">🎯</span>
          <span>Punten Settings</span>
        </button>

        <button
          onClick={handleNieuweAvond}
          className="btn-danger h-32 text-xl col-span-1 flex flex-col items-center justify-center gap-2"
        >
          <span className="text-3xl">🎲</span>
          <span>Nieuwe Avond</span>
        </button>

        <button
          onClick={() => navigate('/analytics')}
          className="btn-primary h-32 text-xl flex flex-col items-center justify-center gap-2"
        >
          <span className="text-3xl">📊</span>
          <span>Analytics</span>
        </button>
      </div>
    </div>
  );
}

export default Home;

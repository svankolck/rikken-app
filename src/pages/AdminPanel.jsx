import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../utils/api';

function AdminPanel({ user, onLogout }) {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        apiFetch('/api/auth/admin/pending'),
        apiFetch('/api/auth/admin/users')
      ]);

      setPendingUsers(pendingRes);
      setAllUsers(allRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, email) => {
    try {
      await apiFetch(`/api/auth/admin/approve/${userId}`, { method: 'POST' });
      await loadUsers();
      alert(`✅ ${email} is geactiveerd!`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (userId, email) => {
    if (window.confirm(`Wil je ${email} verwijderen?`)) {
      try {
        await apiFetch(`/api/auth/admin/users/${userId}`, { method: 'DELETE' });
        await loadUsers();
        alert(`🗑️ ${email} is verwijderd!`);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm('Wil je uitloggen?')) {
      onLogout();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 min-h-screen">
        <p className="text-center text-gray-600">Laden...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">⚙️ Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
        >
          Uitloggen
        </button>
      </div>

      <button
        onClick={() => navigate('/')}
        className="mb-6 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
      >
        ← Terug naar Home
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'pending'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          ⏳ In afwachting ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'all'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          👥 Alle gebruikers ({allUsers.length})
        </button>
      </div>

      {activeTab === 'pending' && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Accounts te Goedkeuren</h2>
          {pendingUsers.length === 0 ? (
            <div className="p-6 bg-green-100 border border-green-400 rounded-lg text-green-700">
              ✅ Geen in afwachting accounts!
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map(user => (
                <div key={user.id} className="p-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg text-gray-800">{user.email}</p>
                      <p className="text-sm text-gray-600">
                        Geregistreerd: {new Date(user.created_at).toLocaleDateString('nl-NL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(user.id, user.email)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
                      >
                        ✓ Goedkeuren
                      </button>
                      <button
                        onClick={() => handleReject(user.id, user.email)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                      >
                        ✕ Weigeren
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Alle Gebruikers</h2>
          {allUsers.length === 0 ? (
            <div className="p-6 bg-gray-100 border border-gray-400 rounded-lg text-gray-700">
              Geen gebruikers gevonden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 p-3 text-left font-semibold">Email</th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">Rol</th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">Status</th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">Geregistreerd</th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3">{user.email}</td>
                      <td className="border border-gray-300 p-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          user.role === 'admin'
                            ? 'bg-purple-200 text-purple-800'
                            : 'bg-blue-200 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? '🔐 Admin' : '👁️ Display'}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          user.activated ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {user.activated ? '✅ Actief' : '⏳ In afwachting'}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3 text-sm">
                        {new Date(user.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {!user.activated && (
                          <button
                            onClick={() => handleApprove(user.id, user.email)}
                            className="text-green-600 hover:text-green-800 font-semibold"
                          >
                            Goedkeuren
                          </button>
                        )}
                        {user.email !== 'svankolck@gmail.com' && (
                          <button
                            onClick={() => handleReject(user.id, user.email)}
                            className="text-red-600 hover:text-red-800 font-semibold ml-2"
                          >
                            Verwijderen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;





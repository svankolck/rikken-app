import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../utils/api';

function Account({ user, onLogout }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userData = await apiFetch('/api/auth/me');
      setCurrentUser(userData);
    } catch (err) {
      console.error('Fout bij ophalen account info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!changePasswordData.currentPassword || !changePasswordData.newPassword || !changePasswordData.confirmPassword) {
      setError('Vul alle velden in');
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setError('Nieuw wachtwoord komt niet overeen met bevestiging');
      return;
    }

    if (changePasswordData.newPassword.length < 6) {
      setError('Nieuw wachtwoord moet minimaal 6 tekens zijn');
      return;
    }

    try {
      const result = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: changePasswordData.currentPassword,
          newPassword: changePasswordData.newPassword
        })
      });

      setSuccess(result.message || 'Wachtwoord succesvol gewijzigd');
      setChangePasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRequestReset = async () => {
    setError('');
    setSuccess('');

    try {
      const result = await apiFetch('/api/auth/request-reset', {
        method: 'POST'
      });

      setSuccess(result.message || 'Reset-aanvraag verzonden');
    } catch (err) {
      setError(err.message);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <p className="text-gray-600">Accountgegevens laden...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 min-h-screen page-container">
      <div className="page-header justify-between items-center">
        <button onClick={() => navigate(-1)} className="btn-secondary px-4 py-2 text-sm">
          ← Terug
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">👤</span>
          <span className="text-2xl font-bold">Mijn Account</span>
        </div>
        <button onClick={handleLogout} className="btn-danger px-4 py-2 text-sm">
          Uitloggen
        </button>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Accountinformatie</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span>Email</span>
            <span className="font-semibold">{currentUser?.email || user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Rol</span>
            <span className="font-semibold">
              {currentUser?.role === 'admin' ? '🔐 Admin' : '👁️ Display'}
            </span>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Wachtwoord wijzigen</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Huidig wachtwoord
            </label>
            <input
              type="password"
              value={changePasswordData.currentPassword}
              onChange={(e) => setChangePasswordData(prev => ({
                ...prev,
                currentPassword: e.target.value
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nieuw wachtwoord
            </label>
            <input
              type="password"
              value={changePasswordData.newPassword}
              onChange={(e) => setChangePasswordData(prev => ({
                ...prev,
                newPassword: e.target.value
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Minimaal 6 tekens"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bevestig nieuw wachtwoord
            </label>
            <input
              type="password"
              value={changePasswordData.confirmPassword}
              onChange={(e) => setChangePasswordData(prev => ({
                ...prev,
                confirmPassword: e.target.value
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Herhaal nieuw wachtwoord"
            />
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-2 font-semibold"
          >
            Wachtwoord wijzigen
          </button>
        </form>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Reset-aanvraag</h2>
        <p className="text-sm text-gray-600 mb-4">
          Kun je je wachtwoord niet veranderen? Vraag een reset aan zodat de admin je kan helpen.
        </p>
        <button
          onClick={handleRequestReset}
          className="btn-secondary w-full py-2 font-semibold"
        >
          Reset-aanvraag versturen
        </button>
      </div>
    </div>
  );
}

export default Account;





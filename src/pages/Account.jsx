import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Account({ user, onLogout }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [changePasswordData, setChangePasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!changePasswordData.newPassword || !changePasswordData.confirmPassword) {
      setError('Vul alle velden in');
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (changePasswordData.newPassword.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: changePasswordData.newPassword
      });

      if (error) throw error;

      setSuccess('Wachtwoord succesvol gewijzigd');
      setChangePasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Wil je uitloggen?')) {
      await supabase.auth.signOut();
      onLogout();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen page-container">
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
            <span className="font-semibold">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Rol</span>
            <span className="font-semibold">
              {user?.role === 'admin' ? '🔐 Admin' : '👁️ Display'}
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
              Bevestig wachtwoord
            </label>
            <input
              type="password"
              value={changePasswordData.confirmPassword}
              onChange={(e) => setChangePasswordData(prev => ({
                ...prev,
                confirmPassword: e.target.value
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Herhaal wachtwoord"
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
    </div>
  );
}

export default Account;

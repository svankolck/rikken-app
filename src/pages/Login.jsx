import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    first_name: '' // Added for player linking
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      // Create user object for app state
      const isSV = data.user.email === 'svankolck@gmail.com';
      const user = {
        id: data.user.id,
        email: data.user.email,
        role: isSV ? 'admin' : (data.user.user_metadata?.role || 'display')
      };

      onLogin(user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.passwordConfirm) {
      setError('Wachtwoorden komen niet overeen');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            role: 'display' // Default role for new users
          }
        }
      });

      if (authError) throw authError;

      setSuccess('Registratie gelukt! De admin zal je account beoordelen en koppelen aan je spelersnaam.');
      setFormData({ email: '', password: '', passwordConfirm: '', first_name: '' });
      setTimeout(() => {
        setIsRegistering(false);
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">🎲 Rikken</h1>
        <p className="text-center text-gray-600 mb-8">
          {isRegistering ? 'Maak een account' : 'Log in om door te gaan'}
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jouw@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voornaam</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Je echte voornaam"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500 italic">* Gebruik je voornaam zoals die in de spelerslijst moet komen.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wachtwoord</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bevestig Wachtwoord</label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white py-2 rounded-lg font-semibold hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 transition"
          >
            {loading ? 'Even geduld...' : (isRegistering ? 'Registreren' : 'Inloggen')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isRegistering ? 'Heb je al een account?' : 'Nog geen account?'}{' '}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setFormData({ email: '', password: '', passwordConfirm: '', first_name: '' });
                setError('');
              }}
              className="text-cyan-600 hover:text-cyan-700 font-semibold"
            >
              {isRegistering ? 'Inloggen' : 'Registreren'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
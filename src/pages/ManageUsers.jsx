import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ManageUsers({ user }) {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [availableSpelers, setAvailableSpelers] = useState([]);
    const [selectedSpelerForProfile, setSelectedSpelerForProfile] = useState({}); // {profileId: spelerId}
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Fetch profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;
            setProfiles(profileData || []);

            // 2. Fetch all players
            const { data: spelerData, error: spelerError } = await supabase
                .from('spelers')
                .select(`
                    id, 
                    naam,
                    profiles(id)
                `)
                .order('naam');

            if (spelerError) throw spelerError;

            // 3. Filter for guest players (those who don't have a profile linked)
            const guests = spelerData.filter(s => !s.profiles || s.profiles.length === 0);
            setAvailableSpelers(guests);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (profile) => {
        try {
            setError('');
            const selectedId = selectedSpelerForProfile[profile.id];

            let spelerId;

            if (selectedId === 'NEW') {
                // Create new player
                const { data: newSpeler, error: createError } = await supabase
                    .from('spelers')
                    .insert([{ naam: profile.first_name }])
                    .select()
                    .single();

                if (createError) throw createError;
                spelerId = newSpeler.id;
            } else if (selectedId) {
                // Use selected existing guest
                spelerId = selectedId;
            } else {
                throw new Error('Selecteer een speler of kies "Nieuwe speler aanmaken"');
            }

            // 2. Update profile with approved status and speler_id
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    approved: true,
                    speler_id: spelerId
                })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            // 3. Refresh list
            await loadData();
            alert(`✅ ${profile.email} is goedgekeurd!`);
        } catch (err) {
            setError(`Fout bij goedkeuren: ${err.message}`);
        }
    };

    const handleReject = async (profileId) => {
        if (!window.confirm('Weet je zeker dat je dit account wilt verwijderen?')) return;

        try {
            // Note: Deleting auth user requires admin privileges which we might not have directly here
            // But we can delete the profile if RLS allows (the policy I wrote allows admin to update/select, I should add delete)
            // For now, let's just mark it as rejected or delete profile if possible
            const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', profileId);

            if (deleteError) throw deleteError;
            await loadProfiles();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading && profiles.length === 0) {
        return <div className="p-8 text-center text-gray-600">Laden...</div>;
    }

    const pending = profiles.filter(p => !p.approved);
    const approved = profiles.filter(p => p.approved);

    return (
        <div className="max-w-md mx-auto p-4 min-h-screen pb-24 page-container">
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="back-button">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold">👥 Gebruikersbeheer</h1>
            </div>

            {error && (
                <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                    {error}
                </div>
            )}

            {/* Pending Users */}
            <h2 className="mt-8 mb-4 text-xl font-bold text-gray-800">⏳ Nieuwe Aanmeldingen ({pending.length})</h2>
            <div className="space-y-4">
                {pending.length === 0 ? (
                    <p className="text-gray-500 italic">Geen nieuwe aanmeldingen.</p>
                ) : (
                    pending.map(p => (
                        <div key={p.id} className="card border-l-4 border-yellow-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-800">{p.first_name}</p>
                                    <p className="text-sm text-gray-500 mb-3">{p.email}</p>

                                    <div className="mt-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Koppel aan:</label>
                                        <select
                                            className="w-full mt-1 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                                            value={selectedSpelerForProfile[p.id] || ''}
                                            onChange={(e) => setSelectedSpelerForProfile(prev => ({
                                                ...prev,
                                                [p.id]: e.target.value
                                            }))}
                                        >
                                            <option value="">-- Maak een keuze --</option>
                                            <option value="NEW">✨ Nieuwe speler aanmaken</option>
                                            <optgroup label="Bestaande Gasten">
                                                {availableSpelers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.naam}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleApprove(p)}
                                        className="p-3 bg-green-500 text-white rounded-xl shadow-button hover:bg-green-600 transition flex items-center justify-center"
                                        title="Goedkeuren"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleReject(p.id)}
                                        className="p-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition"
                                        title="Weigeren"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Approved Users */}
            <h2 className="mt-12 mb-4 text-xl font-bold text-gray-800">✅ Goedgekeurde Gebruikers ({approved.length})</h2>
            <div className="space-y-2">
                {approved.map(p => (
                    <div key={p.id} className="card py-3 flex items-center justify-between opacity-80">
                        <div>
                            <p className="font-semibold text-gray-700">{p.first_name}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {p.role}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

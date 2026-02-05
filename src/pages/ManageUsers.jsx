import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ManageUsers({ user }) {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setProfiles(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (profile) => {
        try {
            setError('');

            // 1. Check if player exists with this name (case-insensitive-ish)
            const { data: existingSpelers, error: spelerError } = await supabase
                .from('spelers')
                .select('id')
                .ilike('naam', profile.first_name)
                .limit(1);

            if (spelerError) throw spelerError;

            let spelerId;

            if (existingSpelers && existingSpelers.length > 0) {
                // Link to existing player
                spelerId = existingSpelers[0].id;
            } else {
                // Create new player
                const { data: newSpeler, error: createError } = await supabase
                    .from('spelers')
                    .insert([{ naam: profile.first_name }])
                    .select()
                    .single();

                if (createError) throw createError;
                spelerId = newSpeler.id;
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
            await loadProfiles();
            alert(`✅ ${profile.email} is goedgekeurd en gekoppeld aan speler ${profile.first_name}!`);
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
                                    <p className="text-sm text-gray-500">{p.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(p)}
                                        className="p-2 bg-green-500 text-white rounded-lg shadow-sm hover:bg-green-600 transition"
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

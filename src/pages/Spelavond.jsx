/**
 * =============================================================================
 * SPELAVOND COMPONENT - Refactored & Clean
 * =============================================================================
 *
 * Van 2016 regels → 250 regels door modulaire componenten
 *
 * @component
 * @version 2.0.0 - Refactored
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Custom Hooks
import { useSpelavond } from '../hooks/useSpelavond';
import { useDecisionTree } from '../hooks/useDecisionTree';

// Components
import {
  Scoreboard,
  DecisionTree,
  RoundHistory,
  PlayerInfo,
  SettingsModal
} from '../components/spelavond';

// Utils
import { formatDatum } from '../utils/validators';
import { getCurrentDealer, getStilzitters } from '../utils/dealerRotation';

export default function Spelavond() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State from custom hooks
  const { avond, settings, allePlayers, scorebord, loading, error, reload } = useSpelavond(id);
  const decisionTree = useDecisionTree(avond, reload);

  // Local UI state
  const [showSettings, setShowSettings] = useState(false);

  // Loading & Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎲</div>
          <p className="text-gray-600">Spelavond laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-4">
        <div className="glass-card p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Fout bij laden</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-play w-full mt-4"
          >
            Terug naar home
          </button>
        </div>
      </div>
    );
  }

  if (!avond) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <p>Spelavond niet gevonden</p>
      </div>
    );
  }

  // Computed values
  const actieveSpelers = avond.spelers.filter(s => s.actief);
  const rondeNummer = (avond.rondes?.length || 0) + 1;
  const avondSpelerIds = actieveSpelers.map(s => s.avond_speler_id);
  const stilzitters = getStilzitters(avond.start_deler, avondSpelerIds, rondeNummer);
  const heeftGeenDeler = !avond.start_deler && actieveSpelers.length > 0;

  // Database actions
  const handleAddPlayer = async (spelerId) => {
    try {
      const newVolgorde = (avond.spelers?.length || 0) + 1;
      const { error } = await supabase
        .from('avond_spelers')
        .insert({
          spelavond_id: avond.id,
          speler_id: spelerId,
          volgorde: newVolgorde,
          actief: true
        });

      if (error) throw error;
      reload();
    } catch (err) {
      console.error('Error adding player:', err);
      alert('Fout bij toevoegen speler');
    }
  };

  const handleToggleSpelerActief = async (avondSpelerId, actief) => {
    try {
      const { error } = await supabase
        .from('avond_spelers')
        .update({ actief: !actief })
        .eq('id', avondSpelerId);

      if (error) throw error;
      reload();
    } catch (err) {
      console.error('Error toggling player:', err);
      alert('Fout bij wijzigen speler');
    }
  };

  const handleSetStartDeler = async (avondSpelerId) => {
    try {
      const { error } = await supabase
        .from('spelavonden')
        .update({ start_deler: avondSpelerId })
        .eq('id', avond.id);

      if (error) throw error;
      reload();
    } catch (err) {
      console.error('Error setting dealer:', err);
      alert('Fout bij instellen dealer');
    }
  };

  const handleKlaar = () => {
    // Check if Schoppen Mie has been played
    const heeftSchoppenMie = avond.rondes?.some(r => r.spel_naam === 'Schoppen Mie');

    if (heeftSchoppenMie) {
      // Navigate to eindstand
      navigate(`/eindstand/${avond.id}`);
    } else {
      alert('Speel eerst Schoppen Mie om de avond af te sluiten');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob-1" />
      <div className="blob-2" />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              ← Terug
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              🎲 Rikken Avond
            </h1>
            <p className="text-gray-600">{formatDatum(avond.datum)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-toggle px-4 py-2"
            >
              ⚙️ Instellingen
            </button>
            <button
              onClick={handleKlaar}
              className="btn btn-on px-4 py-2"
            >
              ✓ Klaar
            </button>
          </div>
        </div>

        {/* Warning: No dealer */}
        {heeftGeenDeler && (
          <div className="glass-card p-4 mb-6 bg-orange-50 border-l-4 border-orange-400">
            <p className="text-orange-800 font-semibold">
              ⚠️ Stel eerst een dealer in via instellingen!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Decision Tree + Round History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Info */}
            <PlayerInfo avond={avond} currentRound={rondeNummer} />

            {/* Decision Tree */}
            {!heeftGeenDeler && (
              <div className="glass-card p-6">
                <DecisionTree
                  stap={decisionTree.stap}
                  data={decisionTree.data}
                  spelers={actieveSpelers}
                  settings={settings}
                  stilzitters={stilzitters}
                  onSelectSpeler={decisionTree.selectSpeler}
                  onSelectSpelvorm={decisionTree.selectSpelvorm}
                  onSelectMaat={decisionTree.selectMaat}
                  onSelectSlagen={decisionTree.selectSlagen}
                  onSelectGemaakt={decisionTree.selectGemaakt}
                  onSelectVerdubbelen={decisionTree.selectVerdubbelen}
                  onSelectWieVerdubbeld={decisionTree.selectWieVerdubbeld}
                  onSelectSchoppenMieVrouw={decisionTree.selectSchoppenMieVrouw}
                  onSelectSchoppenMieLaatste={decisionTree.selectSchoppenMieLaatste}
                />
              </div>
            )}

            {/* Round History */}
            {avond.rondes && avond.rondes.length > 0 && (
              <RoundHistory
                rondes={avond.rondes}
                spelers={avond.spelers}
                maxRounds={5}
              />
            )}
          </div>

          {/* Right Column: Scoreboard */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <h2 className="text-xl font-bold mb-4">📊 Scorebord</h2>
              <Scoreboard
                scorebord={scorebord}
                spelers={avond.spelers}
                currentRound={rondeNummer}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        avond={avond}
        allePlayers={allePlayers}
        onAddPlayer={handleAddPlayer}
        onTogglePlayerActive={handleToggleSpelerActief}
        onSetStartDealer={handleSetStartDeler}
      />
    </div>
  );
}

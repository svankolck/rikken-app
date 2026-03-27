/**
 * Player Info Component
 * Shows current dealer and sitting out players
 */
import { getCurrentDealer, getStilzitters } from '../../utils/dealerRotation';

export default function PlayerInfo({ avond, currentRound }) {
  if (!avond || !avond.start_deler) {
    return (
      <div className="glass-card p-4 bg-orange-50 border-l-4 border-orange-400">
        <p className="text-sm text-orange-800">
          ⚠️ Stel eerst een dealer in via instellingen
        </p>
      </div>
    );
  }

  const actieveSpelers = avond.spelers.filter(s => s.actief);
  const avondSpelerIds = actieveSpelers.map(s => s.avond_speler_id);

  const huidigeDeler = getCurrentDealer(avond.start_deler, avondSpelerIds, currentRound);
  const stilzitters = getStilzitters(avond.start_deler, avondSpelerIds, currentRound);

  const delerNaam = actieveSpelers.find(s => s.avond_speler_id === huidigeDeler)?.naam;
  const stilzittersNamen = stilzitters
    .map(id => actieveSpelers.find(s => s.avond_speler_id === id)?.naam)
    .filter(Boolean);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-600">Ronde</span>
          <div className="text-2xl font-bold text-cyan-600">#{currentRound}</div>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-600">Dealer</span>
          <div className="text-lg font-semibold">{delerNaam || '-'}</div>
        </div>
      </div>

      {stilzittersNamen.length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">Stilzitters: </span>
          <span className="font-medium text-gray-800">
            {stilzittersNamen.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}

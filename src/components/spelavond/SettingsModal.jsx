/**
 * Settings Modal Component
 * Modal voor het beheren van spelers, dealer en volgorde
 */

export default function SettingsModal({
  show,
  onClose,
  avond,
  allePlayers,
  onAddPlayer,
  onTogglePlayerActive,
  onSetStartDealer
}) {
  if (!show || !avond) return null;

  const actieveSpelers = avond.spelers.filter(s => s.actief);
  const inactieveSpelers = avond.spelers.filter(s => !s.actief);
  const beschikbareSpelers = allePlayers.filter(
    p => !avond.spelers.some(as => as.speler_id === p.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">⚙️ Instellingen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Actieve Spelers */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Actieve Spelers</h3>
            <div className="space-y-2">
              {actieveSpelers.map(speler => (
                <div
                  key={speler.avond_speler_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{speler.naam}</span>
                    {speler.verdubbelaar === 1 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        Verdubbelaar
                      </span>
                    )}
                    {avond.start_deler === speler.avond_speler_id && (
                      <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded">
                        Start Dealer
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSetStartDealer(speler.avond_speler_id)}
                      className="btn btn-play py-1 px-3 text-sm"
                      disabled={avond.start_deler === speler.avond_speler_id}
                    >
                      Maak Dealer
                    </button>
                    <button
                      onClick={() => onTogglePlayerActive(speler.avond_speler_id, true)}
                      className="btn btn-off py-1 px-3 text-sm"
                    >
                      Deactiveer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inactieve Spelers */}
          {inactieveSpelers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Inactieve Spelers</h3>
              <div className="space-y-2">
                {inactieveSpelers.map(speler => (
                  <div
                    key={speler.avond_speler_id}
                    className="flex items-center justify-between p-3 bg-gray-100 rounded-lg opacity-60"
                  >
                    <span className="font-medium line-through">{speler.naam}</span>
                    <button
                      onClick={() => onTogglePlayerActive(speler.avond_speler_id, false)}
                      className="btn btn-on py-1 px-3 text-sm"
                    >
                      Activeer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spelers Toevoegen */}
          {beschikbareSpelers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Speler Toevoegen</h3>
              <div className="space-y-2">
                {beschikbareSpelers.map(speler => (
                  <div
                    key={speler.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <span className="font-medium">{speler.naam}</span>
                    <button
                      onClick={() => onAddPlayer(speler.id)}
                      className="btn btn-on py-1 px-3 text-sm"
                    >
                      + Toevoegen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <button
            onClick={onClose}
            className="btn btn-play w-full py-3"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}

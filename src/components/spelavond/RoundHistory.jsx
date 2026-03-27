/**
 * Round History Component
 * Shows the last played rounds
 */

export default function RoundHistory({ rondes, spelers, maxRounds = 5 }) {
  if (!rondes || rondes.length === 0) {
    return null;
  }

  const getSpelerNaam = (avondSpelerId) => {
    const speler = spelers?.find(s => s.avond_speler_id === avondSpelerId);
    return speler?.naam || 'Onbekend';
  };

  const laatsteRondes = [...rondes].reverse().slice(0, maxRounds);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-600">Laatste rondes:</h3>
      {laatsteRondes.map(ronde => {
        const uitdagerNaam = getSpelerNaam(ronde.uitdager_id);
        const maatNaam = ronde.maat_id ? getSpelerNaam(ronde.maat_id) : null;

        return (
          <div key={ronde.id} className="glass-card p-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold">R{ronde.ronde_nummer}</span>
                <span className="mx-2">·</span>
                <span className="text-cyan-600">{ronde.spel_naam}</span>
              </div>
              <div className="flex items-center gap-2">
                {ronde.verdubbeld && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">2x</span>
                )}
                {ronde.gemaakt ? (
                  <span className="text-green-600 font-semibold">✓ Gemaakt</span>
                ) : (
                  <span className="text-red-600 font-semibold">✗ Nat</span>
                )}
              </div>
            </div>

            <div className="mt-1 text-gray-600">
              {ronde.spel_naam === 'Schoppen Mie' ? (
                <>
                  <span>♠️ Vrouw: {getSpelerNaam(ronde.schoppen_vrouw_id)}</span>
                  <span className="mx-2">·</span>
                  <span>🏆 Laatste: {getSpelerNaam(ronde.laatste_slag_id)}</span>
                </>
              ) : (
                <>
                  <span>{uitdagerNaam}</span>
                  {maatNaam && (
                    <>
                      <span className="mx-1">+</span>
                      <span>{maatNaam}</span>
                    </>
                  )}
                  {ronde.slagen_gehaald !== undefined && (
                    <>
                      <span className="mx-2">·</span>
                      <span>{ronde.slagen_gehaald} slagen</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

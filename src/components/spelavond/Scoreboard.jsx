/**
 * Scoreboard Component
 * Toont de live scores per speler per ronde
 */

export default function Scoreboard({ scorebord, spelers, currentRound }) {
  if (!scorebord || Object.keys(scorebord).length === 0) {
    return (
      <div className="glass-card p-4 text-center text-gray-500">
        <p>Nog geen scores...</p>
      </div>
    );
  }

  // Get alle ronde nummers
  const rondeNummers = new Set();
  Object.values(scorebord).forEach(spelerScore => {
    Object.keys(spelerScore.rondes || {}).forEach(ronde => {
      const nr = parseInt(ronde.replace('ronde_', ''));
      rondeNummers.add(nr);
    });
  });
  const sortedRondes = Array.from(rondeNummers).sort((a, b) => a - b);

  // Sorteer spelers op totaalscore (hoogste eerst)
  const sortedSpelers = Object.entries(scorebord).sort((a, b) => {
    return b[1].totaal - a[1].totaal;
  });

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-2 sticky left-0 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800 z-10">
              Speler
            </th>
            {sortedRondes.map(nr => (
              <th key={nr} className="text-center py-3 px-2 min-w-[50px]">
                R{nr}
              </th>
            ))}
            <th className="text-center py-3 px-3 font-bold sticky right-0 bg-gradient-to-l from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800">
              Totaal
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSpelers.map(([avondSpelerId, scoreData], idx) => {
            // Find speler info
            const speler = spelers?.find(s => s.avond_speler_id === parseInt(avondSpelerId));
            const isLeader = idx === 0;

            return (
              <tr
                key={avondSpelerId}
                className={`border-b border-white/5 ${isLeader ? 'bg-yellow-50/20 dark:bg-yellow-900/10' : ''}`}
              >
                <td className="py-2 px-2 font-semibold sticky left-0 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800">
                  <div className="flex items-center gap-2">
                    {isLeader && <span className="text-yellow-500">👑</span>}
                    <span className={!speler?.actief ? 'text-gray-400 line-through' : ''}>
                      {scoreData.naam}
                    </span>
                    {speler?.verdubbelaar === 1 && (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1 py-0.5 rounded">
                        2x
                      </span>
                    )}
                  </div>
                </td>
                {sortedRondes.map(nr => {
                  const rondeKey = `ronde_${nr}`;
                  const score = scoreData.rondes?.[rondeKey] || 0;
                  return (
                    <td
                      key={nr}
                      className={`text-center py-2 px-2 ${score > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-400'}`}
                    >
                      {score > 0 ? score : '-'}
                    </td>
                  );
                })}
                <td className="text-center py-2 px-3 font-bold text-lg sticky right-0 bg-gradient-to-l from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800">
                  {scoreData.totaal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

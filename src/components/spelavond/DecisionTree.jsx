/**
 * Decision Tree Component
 * Handles step-by-step game input flow
 */

export default function DecisionTree({
  stap,
  data,
  spelers,
  settings,
  stilzitters,
  onSelectSpeler,
  onSelectSpelvorm,
  onSelectMaat,
  onSelectSlagen,
  onSelectGemaakt,
  onSelectVerdubbelen,
  onSelectWieVerdubbeld,
  onSelectSchoppenMieVrouw,
  onSelectSchoppenMieLaatste
}) {
  const spelendeSpelers = spelers.filter(s => !stilzitters.includes(s.avond_speler_id));

  // Stap 1: Speler selectie
  if (stap === 'speler') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🎯 Wie speelt?</h3>
        <div className="grid grid-cols-2 gap-3">
          {spelendeSpelers.map(speler => (
            <button
              key={speler.avond_speler_id}
              onClick={() => onSelectSpeler(speler.avond_speler_id)}
              className="btn btn-play py-4"
            >
              {speler.naam}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Stap 2: Spelvorm selectie
  if (stap === 'spelvorm') {
    const uitdager = spelers.find(s => s.avond_speler_id === data.uitdager_id);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🎲 Wat speelt {uitdager?.naam}?</h3>
        <div className="grid grid-cols-2 gap-3">
          {settings.map(spel => (
            <button
              key={spel.id}
              onClick={() => onSelectSpelvorm(spel)}
              className="btn btn-play py-4"
            >
              {spel.naam}
              {spel.met_maat && <span className="text-xs block">Met maat</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Stap 3: Maat selectie
  if (stap === 'maat') {
    const uitdager = spelers.find(s => s.avond_speler_id === data.uitdager_id);
    const beschikbareMaten = spelendeSpelers.filter(s => s.avond_speler_id !== data.uitdager_id);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🤝 Wie is de maat van {uitdager?.naam}?</h3>
        <div className="grid grid-cols-2 gap-3">
          {beschikbareMaten.map(speler => (
            <button
              key={speler.avond_speler_id}
              onClick={() => onSelectMaat(speler.avond_speler_id)}
              className="btn btn-play py-4"
            >
              {speler.naam}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Stap 4: Slagen selectie
  if (stap === 'slagen') {
    const minimaalSlagen = data.spel?.minimaal_slagen || 0;
    const slagenOpties = Array.from({ length: 14 }, (_, i) => i); // 0-13

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          🃏 Hoeveel slagen?
          {minimaalSlagen > 0 && <span className="text-sm text-gray-500 ml-2">(min. {minimaalSlagen})</span>}
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {slagenOpties.map(slagen => (
            <button
              key={slagen}
              onClick={() => onSelectSlagen(slagen)}
              className={`btn py-3 ${slagen < minimaalSlagen ? 'opacity-50' : 'btn-play'}`}
            >
              {slagen}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Stap 5: Gemaakt/Nat selectie
  if (stap === 'gemaakt') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">✅ Gemaakt of Nat?</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelectGemaakt(true)}
            className="btn btn-on py-6 text-lg"
          >
            ✅ Gemaakt
          </button>
          <button
            onClick={() => onSelectGemaakt(false)}
            className="btn btn-off py-6 text-lg"
          >
            ❌ Nat
          </button>
        </div>
      </div>
    );
  }

  // Stap 6: Verdubbelen
  if (stap === 'verdubbelen') {
    const spelersMetVerdubbelaar = spelers.filter(s => s.verdubbelaar === 1);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          🎲 Verdubbelen?
          {spelersMetVerdubbelaar.length > 0 && (
            <span className="text-sm text-orange-600 ml-2">
              ({spelersMetVerdubbelaar.length}x beschikbaar)
            </span>
          )}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelectVerdubbelen(true)}
            className="btn btn-toggle py-6 text-lg"
            disabled={spelersMetVerdubbelaar.length === 0}
          >
            🎲 Ja, verdubbelen
          </button>
          <button
            onClick={() => onSelectVerdubbelen(false)}
            className="btn btn-play py-6 text-lg"
          >
            Nee
          </button>
        </div>
      </div>
    );
  }

  // Stap 7: Wie verdubbeld
  if (stap === 'wie_verdubbeld') {
    const spelersMetVerdubbelaar = spelers.filter(s => s.verdubbelaar === 1);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🎯 Wie gebruikt de verdubbelaar?</h3>
        <div className="grid grid-cols-2 gap-3">
          {spelersMetVerdubbelaar.map(speler => (
            <button
              key={speler.avond_speler_id}
              onClick={() => onSelectWieVerdubbeld(speler.avond_speler_id)}
              className="btn btn-toggle py-4"
            >
              {speler.naam}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Stap 8: Schoppen Mie Vrouw
  if (stap === 'schoppen_mie_vrouw') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">♠️ Wie heeft de Schoppen Vrouw?</h3>
        <div className="grid grid-cols-2 gap-3">
          {spelendeSpelers.map(speler => (
            <button
              key={speler.avond_speler_id}
              onClick={() => onSelectSchoppenMieVrouw(speler.avond_speler_id)}
              className="btn btn-play py-4"
            >
              {speler.naam}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Stap 9: Schoppen Mie Laatste Slag
  if (stap === 'schoppen_mie_laatste') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🏆 Wie heeft de laatste slag?</h3>
        <div className="grid grid-cols-2 gap-3">
          {spelendeSpelers.map(speler => (
            <button
              key={speler.avond_speler_id}
              onClick={() => onSelectSchoppenMieLaatste(speler.avond_speler_id)}
              className="btn btn-play py-4"
            >
              {speler.naam}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

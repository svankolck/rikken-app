/**
 * Dealer Rotation - Logic voor dealer en stilzitters
 */

/**
 * Krijg de huidige dealer voor een ronde
 */
export function getCurrentDealer(startDelerId, avondSpelerIds, rondeNummer) {
  if (!startDelerId || !avondSpelerIds || avondSpelerIds.length === 0) {
    return null;
  }

  const numSpelers = avondSpelerIds.length;
  const startIndex = avondSpelerIds.indexOf(startDelerId);

  if (startIndex === -1) return null;

  const delerIndex = (startIndex + (rondeNummer - 1)) % numSpelers;
  return avondSpelerIds[delerIndex];
}

/**
 * Krijg stilzitters voor een ronde
 * - Bij 4 spelers: geen stilzitters
 * - Bij 5 spelers: dealer zit stil
 * - Bij 6 spelers: dealer + tegenover speler zitten stil
 */
export function getStilzitters(startDelerId, avondSpelerIds, rondeNummer) {
  if (!startDelerId || !avondSpelerIds || avondSpelerIds.length < 5) {
    return [];
  }

  const numSpelers = avondSpelerIds.length;
  const startIndex = avondSpelerIds.indexOf(startDelerId);

  if (startIndex === -1) return [];

  const delerIndex = (startIndex + (rondeNummer - 1)) % numSpelers;
  const delerId = avondSpelerIds[delerIndex];

  if (numSpelers === 5) {
    return [delerId];
  }

  if (numSpelers === 6) {
    const tegenoverIndex = (delerIndex + 3) % numSpelers;
    return [delerId, avondSpelerIds[tegenoverIndex]];
  }

  return [];
}

/**
 * Krijg actieve spelers (niet stil) voor een ronde
 */
export function getActivePlayersForRound(avondSpelers, startDelerId, rondeNummer) {
  const actieveSpelers = avondSpelers.filter(s => s.actief);
  const avondSpelerIds = actieveSpelers.map(s => s.avond_speler_id);
  const stilzitters = getStilzitters(startDelerId, avondSpelerIds, rondeNummer);

  return actieveSpelers.filter(s => !stilzitters.includes(s.avond_speler_id));
}

/**
 * Check of een speler de dealer is
 */
export function isDealer(spelerId, startDelerId, avondSpelerIds, rondeNummer) {
  const currentDealer = getCurrentDealer(startDelerId, avondSpelerIds, rondeNummer);
  return spelerId === currentDealer;
}

/**
 * Check of een speler stilzit
 */
export function isSittingOut(spelerId, startDelerId, avondSpelerIds, rondeNummer) {
  const stilzitters = getStilzitters(startDelerId, avondSpelerIds, rondeNummer);
  return stilzitters.includes(spelerId);
}

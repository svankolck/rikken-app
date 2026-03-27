/**
 * Validators - Input validatie voor Rikken game
 */

/**
 * Valideer of er genoeg spelers actief zijn
 */
export function validateMinimumPlayers(actieveSpelers, minimum = 4) {
  return actieveSpelers.length >= minimum;
}

/**
 * Valideer of een spelvorm geldig is voor aantal spelers
 */
export function validateGameTypeForPlayers(gameType, numPlayers) {
  // Alle spelvormen zijn geldig voor 4-6 spelers
  if (numPlayers < 4 || numPlayers > 6) {
    return false;
  }
  return true;
}

/**
 * Valideer slagen aantal
 */
export function validateSlagenCount(slagen, minimaalSlagen = 0) {
  if (slagen < 0) return false;
  if (slagen > 13) return false; // Max 13 slagen in een kaartspel
  return true;
}

/**
 * Valideer of een maat gekozen mag worden
 */
export function validateMaatSelection(uitdagerId, maatId, actieveSpelers) {
  // Maat mag niet dezelfde zijn als uitdager
  if (uitdagerId === maatId) {
    return { valid: false, error: 'Maat kan niet dezelfde speler zijn als uitdager' };
  }

  // Maat moet actief zijn
  const maat = actieveSpelers.find(s => s.avond_speler_id === maatId);
  if (!maat) {
    return { valid: false, error: 'Maat is niet actief' };
  }

  return { valid: true };
}

/**
 * Valideer of beslisboom compleet is
 */
export function validateDecisionTreeComplete(beslisboomData, spelSettings) {
  const required = ['uitdager_id'];

  if (spelSettings?.met_maat) {
    required.push('maat_id');
  }

  if (spelSettings?.naam !== 'Schoppen Mie') {
    required.push('slagen_gehaald', 'gemaakt');
  }

  for (const field of required) {
    if (beslisboomData[field] === undefined || beslisboomData[field] === null) {
      return { valid: false, missing: field };
    }
  }

  return { valid: true };
}

/**
 * Valideer Schoppen Mie data
 */
export function validateSchoppenMie(schoppenVrouwId, laatsteSlagId) {
  if (!schoppenVrouwId) {
    return { valid: false, error: 'Geen Schoppen Vrouw geselecteerd' };
  }
  if (!laatsteSlagId) {
    return { valid: false, error: 'Geen laatste slag geselecteerd' };
  }
  return { valid: true };
}

/**
 * Format datum voor weergave
 */
export function formatDatum(datum) {
  if (!datum) return '';
  const d = new Date(datum);
  const opties = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('nl-NL', opties);
}

/**
 * Sorteer spelers op volgorde
 */
export function sortPlayersByVolgorde(spelers) {
  return [...spelers].sort((a, b) => a.volgorde - b.volgorde);
}

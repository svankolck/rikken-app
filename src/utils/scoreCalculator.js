/**
 * Score Calculator - Pure functions voor Rikken score berekening
 * Geen side effects, volledig testbaar
 */

/**
 * Bereken punten voor een gemaakte ronde
 */
export function calculateMadePoints(puntenConfig, slagenGehaald, minimaalSlagen, multiplier = 1) {
  let base = puntenConfig.gemaakt || 5;

  // Add overslag points
  if (minimaalSlagen && slagenGehaald > minimaalSlagen) {
    const overslag = slagenGehaald - minimaalSlagen;
    base += (puntenConfig.overslag || 1) * overslag;
  }

  return Math.round(base * multiplier);
}

/**
 * Bereken punten voor een niet-gemaakte ronde (nat)
 */
export function calculateFailedPoints(puntenConfig, slagenGehaald, minimaalSlagen, isSolo, multiplier = 1) {
  let base = Math.abs(puntenConfig.nat || 10);

  // Add onderslag penalty
  if (minimaalSlagen && slagenGehaald < minimaalSlagen) {
    const tekort = minimaalSlagen - slagenGehaald;
    base += Math.abs(puntenConfig.onderslag || 1) * tekort;
  }

  // Solo games get 3x points when failed
  const soloFactor = isSolo ? 3 : 1;

  return Math.round(base * soloFactor * multiplier);
}

/**
 * Bereken Schoppen Mie punten
 */
export function calculateSchoppenMiePoints(puntenConfig, vrouwId, laatsteId, multiplier = 1) {
  const basis = puntenConfig.gemaakt || 5;
  const scores = [];

  // Als dezelfde speler beide heeft: 4x basis
  if (vrouwId && vrouwId === laatsteId) {
    scores.push({ avond_speler_id: vrouwId, punten: basis * 4 * multiplier });
  } else {
    // Anders: elk apart 1x basis
    if (vrouwId) {
      scores.push({ avond_speler_id: vrouwId, punten: basis * multiplier });
    }
    if (laatsteId) {
      scores.push({ avond_speler_id: laatsteId, punten: basis * multiplier });
    }
  }

  return scores;
}

/**
 * Bereken scores voor een complete ronde
 */
export function calculateRoundScores(ronde, actieveSpelers, rondeNummer) {
  const scores = [];
  const multiplier = ronde.verdubbeld ? 2 : 1;
  const puntenConfig = ronde.punten;

  // Schoppen Mie is een special case
  if (ronde.spel_naam === 'Schoppen Mie') {
    return calculateSchoppenMiePoints(
      puntenConfig,
      ronde.schoppen_vrouw_id,
      ronde.laatste_slag_id,
      multiplier
    ).map(s => ({ ...s, ronde_nummer: rondeNummer }));
  }

  // Bepaal uitdagers en tegenspelers
  const isMetMaat = ronde.met_maat;
  const uitdagers = [ronde.uitdager_id];
  if (ronde.maat_id) uitdagers.push(ronde.maat_id);
  const tegenspelers = actieveSpelers.filter(id => !uitdagers.includes(id));

  const isSolo = !isMetMaat && !ronde.maat_id;

  if (ronde.gemaakt) {
    // Game made: tegenspelers krijgen punten
    const points = calculateMadePoints(
      puntenConfig,
      ronde.slagen_gehaald,
      ronde.minimaal_slagen,
      multiplier
    );
    tegenspelers.forEach(id => {
      scores.push({ avond_speler_id: id, ronde_nummer: rondeNummer, punten: points });
    });
  } else {
    // Game failed (nat): uitdagers krijgen punten
    const points = calculateFailedPoints(
      puntenConfig,
      ronde.slagen_gehaald,
      ronde.minimaal_slagen,
      isSolo,
      multiplier
    );
    uitdagers.forEach(id => {
      scores.push({ avond_speler_id: id, ronde_nummer: rondeNummer, punten: points });
    });
  }

  return scores;
}

/**
 * Bereken scores voor Meerdere ronde (bijv. Allemaal Rik)
 */
export function calculateMeerdereRoundScores(rondes, actieveSpelers, rondeNummer) {
  const scores = [];

  rondes.forEach(ronde => {
    const multiplier = ronde.verdubbeld ? 2 : 1;
    const puntenConfig = ronde.punten;

    if (ronde.gemaakt) {
      // Participant maakte het: anderen krijgen punten
      const anderen = actieveSpelers.filter(id => id !== ronde.uitdager_id);
      const points = Math.round((puntenConfig.gemaakt || 5) * multiplier);
      anderen.forEach(id => {
        scores.push({ avond_speler_id: id, ronde_nummer: rondeNummer, punten: points });
      });
    } else {
      // Participant maakte het niet: hij/zij krijgt 3x punten
      const points = Math.round((puntenConfig.gemaakt || 5) * 3 * multiplier);
      scores.push({ avond_speler_id: ronde.uitdager_id, ronde_nummer: rondeNummer, punten: points });
    }
  });

  return scores;
}

/**
 * Bereken totale scorebord vanuit alle rondes
 */
export function calculateScoreboard(avondSpelers, allScores) {
  const scorebord = {};

  // Initialize scoreboard
  avondSpelers.forEach(speler => {
    scorebord[speler.avond_speler_id] = {
      naam: speler.naam,
      rondes: {},
      totaal: 0
    };
  });

  // Add scores per round
  allScores.forEach(score => {
    if (scorebord[score.avond_speler_id]) {
      const rondeKey = `ronde_${score.ronde_nummer}`;
      if (!scorebord[score.avond_speler_id].rondes[rondeKey]) {
        scorebord[score.avond_speler_id].rondes[rondeKey] = 0;
      }
      scorebord[score.avond_speler_id].rondes[rondeKey] += score.punten;
      scorebord[score.avond_speler_id].totaal += score.punten;
    }
  });

  return scorebord;
}

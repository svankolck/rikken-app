import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculateRoundScores, calculateMeerdereRoundScores, calculateScoreboard } from '../utils/scoreCalculator';
import { getStilzitters } from '../utils/dealerRotation';

/**
 * Custom hook voor Spelavond data management
 * Handles all data loading and state for a spelavond
 */
export function useSpelavond(spelavondId) {
  const [avond, setAvond] = useState(null);
  const [settings, setSettings] = useState([]);
  const [allePlayers, setAllePlyers] = useState([]);
  const [scorebord, setScoreboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load spelavond data
  const loadAvond = async () => {
    if (!spelavondId) return;

    try {
      setLoading(true);
      setError(null);

      // Get spelavond
      const { data: spelavondData, error: spelavondError } = await supabase
        .from('spelavonden')
        .select('*')
        .eq('id', parseInt(spelavondId))
        .single();

      if (spelavondError) throw spelavondError;
      if (!spelavondData) throw new Error('Spelavond niet gevonden');

      // Get avond_spelers
      const { data: avondSpelersData, error: avondSpelersError } = await supabase
        .from('avond_spelers')
        .select('*')
        .eq('spelavond_id', spelavondData.id)
        .order('volgorde');

      if (avondSpelersError) throw avondSpelersError;

      // Get all spelers for name mapping
      const { data: allSpelersData } = await supabase
        .from('spelers')
        .select('*');

      const spelersMap = {};
      (allSpelersData || []).forEach(s => {
        spelersMap[s.id] = s.naam;
      });

      // Get rondes with settings
      const { data: rondesData, error: rondesError } = await supabase
        .from('rondes')
        .select('*, spel_settings(id, naam, met_maat, minimaal_slagen, punten_settings(gemaakt, overslag, nat, onderslag))')
        .eq('spelavond_id', spelavondData.id)
        .order('ronde_nummer');

      if (rondesError) throw rondesError;

      // Format rondes
      const formattedRondes = (rondesData || []).map(r => ({
        id: r.id,
        ronde_nummer: r.ronde_nummer,
        spel_naam: r.spel_settings?.naam,
        met_maat: r.spel_settings?.met_maat,
        minimaal_slagen: r.spel_settings?.minimaal_slagen,
        punten: r.spel_settings?.punten_settings?.[0] || { gemaakt: 5, overslag: 1, nat: -10, onderslag: -1 },
        uitdager_id: r.uitdager_id,
        maat_id: r.maat_id,
        schoppen_vrouw_id: r.schoppen_vrouw_id,
        laatste_slag_id: r.laatste_slag_id,
        verdubbelaar_speler_id: r.verdubbelaar_speler_id,
        slagen_gehaald: r.slagen_gehaald,
        gemaakt: r.gemaakt,
        verdubbeld: r.verdubbeld
      }));

      // Calculate scores
      const scores = [];
      const avondSpelerIds = (avondSpelersData || []).map(as => as.id);

      // Group rounds by number (for Meerdere support)
      const roundsByNr = {};
      formattedRondes.forEach(r => {
        if (!roundsByNr[r.ronde_nummer]) roundsByNr[r.ronde_nummer] = [];
        roundsByNr[r.ronde_nummer].push(r);
      });

      // Process each round
      Object.keys(roundsByNr).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rondeNrStr => {
        const rondeNr = parseInt(rondeNrStr);
        const rows = roundsByNr[rondeNr];

        const currentStilzitters = getStilzitters(
          spelavondData.start_deler,
          avondSpelerIds,
          rondeNr
        );
        const actieveSpelersInRonde = avondSpelerIds.filter(id => !currentStilzitters.includes(id));

        if (rows.length === 1) {
          // Single game
          const roundScores = calculateRoundScores(rows[0], actieveSpelersInRonde, rondeNr);
          scores.push(...roundScores);
        } else {
          // Meerdere
          const roundScores = calculateMeerdereRoundScores(rows, actieveSpelersInRonde, rondeNr);
          scores.push(...roundScores);
        }
      });

      // Format spelers
      const formattedSpelers = (avondSpelersData || []).map(as => ({
        avond_speler_id: as.id,
        speler_id: as.speler_id,
        naam: spelersMap[as.speler_id] || 'Onbekend',
        volgorde: as.volgorde,
        actief: as.actief,
        verdubbelaar: as.verdubbelaar === true || as.verdubbelaar === 1 ? 1 : 0
      }));

      const avondObj = {
        id: spelavondData.id,
        datum: spelavondData.datum,
        status: spelavondData.status,
        start_deler: spelavondData.start_deler,
        spelers: formattedSpelers,
        rondes: formattedRondes,
        scores: scores
      };

      setAvond(avondObj);

      // Calculate scoreboard
      const newScoreboard = calculateScoreboard(formattedSpelers, scores);
      setScoreboard(newScoreboard);

      setLoading(false);
    } catch (err) {
      console.error('Error loading spelavond:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Load settings
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('spel_settings')
        .select('*')
        .order('naam');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  // Load all players
  const loadAllePlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('spelers')
        .select('*')
        .order('naam');

      if (error) throw error;
      setAllePlyers(data || []);
    } catch (err) {
      console.error('Error loading players:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadAvond();
    loadSettings();
    loadAllePlayers();
  }, [spelavondId]);

  // Reload function
  const reload = () => {
    loadAvond();
  };

  return {
    avond,
    settings,
    allePlayers,
    scorebord,
    loading,
    error,
    reload
  };
}

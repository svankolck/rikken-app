import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook voor beslisboom logic
 * Manages the step-by-step game input flow
 */
export function useDecisionTree(avond, onRoundComplete) {
  const [stap, setStap] = useState('speler');
  const [data, setData] = useState({});

  // Reset beslisboom
  const reset = () => {
    setStap('speler');
    setData({});
  };

  // Handle speler selectie
  const selectSpeler = (avondSpelerId) => {
    setData(prev => ({ ...prev, uitdager_id: avondSpelerId }));
    setStap('spelvorm');
  };

  // Handle spelvorm selectie
  const selectSpelvorm = (spel) => {
    const newData = { ...data, spel_id: spel.id, spel };

    if (spel.naam === 'Schoppen Mie') {
      setData(newData);
      setStap('schoppen_mie_vrouw');
    } else if (spel.met_maat) {
      setData(newData);
      setStap('maat');
    } else {
      setData(newData);
      setStap('slagen');
    }
  };

  // Handle maat selectie
  const selectMaat = (avondSpelerId) => {
    setData(prev => ({ ...prev, maat_id: avondSpelerId }));
    setStap('slagen');
  };

  // Handle slagen selectie
  const selectSlagen = (slagen) => {
    setData(prev => ({ ...prev, slagen_gehaald: slagen }));
    setStap('gemaakt');
  };

  // Handle gemaakt/nat selectie
  const selectGemaakt = (gemaakt) => {
    setData(prev => ({ ...prev, gemaakt }));
    setStap('verdubbelen');
  };

  // Handle verdubbelen selectie
  const selectVerdubbelen = async (verdubbeld) => {
    if (verdubbeld) {
      setData(prev => ({ ...prev, verdubbeld: true }));
      setStap('wie_verdubbeld');
    } else {
      await saveRound(false, null);
    }
  };

  // Handle wie verdubbeld selectie
  const selectWieVerdubbeld = async (avondSpelerId) => {
    await saveRound(true, avondSpelerId);
  };

  // Handle Schoppen Mie vrouw
  const selectSchoppenMieVrouw = (avondSpelerId) => {
    setData(prev => ({ ...prev, schoppen_vrouw_id: avondSpelerId }));
    setStap('schoppen_mie_laatste');
  };

  // Handle Schoppen Mie laatste slag
  const selectSchoppenMieLaatste = async (avondSpelerId) => {
    const finalData = { ...data, laatste_slag_id: avondSpelerId };
    setData(finalData);

    // Save Schoppen Mie round
    await saveSchoppenMieRound(finalData);
  };

  // Save regular round
  const saveRound = async (verdubbeld, verdubbelaar_speler_id) => {
    if (!avond?.id) return;

    try {
      const rondeNummer = (avond.rondes?.length || 0) + 1;

      const rondeData = {
        spelavond_id: avond.id,
        ronde_nummer: rondeNummer,
        spel_id: data.spel_id,
        uitdager_id: data.uitdager_id,
        maat_id: data.maat_id || null,
        slagen_gehaald: data.slagen_gehaald,
        gemaakt: data.gemaakt,
        verdubbeld: verdubbeld || false,
        verdubbelaar_speler_id: verdubbelaar_speler_id || null
      };

      const { error } = await supabase
        .from('rondes')
        .insert(rondeData);

      if (error) throw error;

      // Handle verdubbelaar
      if (verdubbeld && verdubbelaar_speler_id) {
        await returnVerdubbelaar(verdubbelaar_speler_id);
      }

      reset();
      if (onRoundComplete) onRoundComplete();
    } catch (err) {
      console.error('Error saving round:', err);
      alert(`Fout bij opslaan ronde: ${err.message}`);
    }
  };

  // Save Schoppen Mie round
  const saveSchoppenMieRound = async (finalData) => {
    if (!avond?.id) return;

    try {
      const rondeNummer = (avond.rondes?.length || 0) + 1;

      const rondeData = {
        spelavond_id: avond.id,
        ronde_nummer: rondeNummer,
        spel_id: finalData.spel_id,
        uitdager_id: null, // No uitdager in Schoppen Mie
        schoppen_vrouw_id: finalData.schoppen_vrouw_id,
        laatste_slag_id: finalData.laatste_slag_id,
        gemaakt: true, // Always "gemaakt" for Schoppen Mie
        verdubbeld: false
      };

      const { error } = await supabase
        .from('rondes')
        .insert(rondeData);

      if (error) throw error;

      reset();
      if (onRoundComplete) onRoundComplete();
    } catch (err) {
      console.error('Error saving Schoppen Mie round:', err);
      alert(`Fout bij opslaan Schoppen Mie ronde: ${err.message}`);
    }
  };

  // Return verdubbelaar to player
  const returnVerdubbelaar = async (avondSpelerId) => {
    try {
      const { error } = await supabase
        .from('avond_spelers')
        .update({ verdubbelaar: true })
        .eq('id', avondSpelerId);

      if (error) throw error;
    } catch (err) {
      console.error('Error returning verdubbelaar:', err);
    }
  };

  return {
    stap,
    data,
    reset,
    selectSpeler,
    selectSpelvorm,
    selectMaat,
    selectSlagen,
    selectGemaakt,
    selectVerdubbelen,
    selectWieVerdubbeld,
    selectSchoppenMieVrouw,
    selectSchoppenMieLaatste
  };
}

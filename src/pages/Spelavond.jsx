/**
 * =============================================================================
 * SPELAVOND COMPONENT - Hoofd speelsessie pagina
 * =============================================================================
 * 
 * Dit is het belangrijkste component van de app. Het beheert de volledige flow
 * van een spelavond van start tot finish.
 * 
 * HOOFDFUNCTIES:
 * --------------
 * 1. Live Scorebord: Real-time scores per speler met totalen
 * 2. Beslisboom: Stap-voor-stap invoer van rondes
 * 3. Dealer Rotatie: Automatische dealer wisseling na elke ronde
 * 4. Stilzitters: Visuele indicatie wie stil zit bij 5/6 spelers
 * 5. Verdubbelaar: Tracking en terugkrijgen van verdubbelaars
 * 6. Settings: Wijzigen van spelers, dealer en volgorde
 * 7. Edit Mode: Rondes achteraf bewerken of verwijderen
 * 8. Schoppen Mie: Speciale afsluitronde met navigatie naar eindstand
 * 
 * STATE MANAGEMENT:
 * -----------------
 * - avond: Hoofd avond object met alle spelers en configuratie
 * - scorebord: Object met scores per speler per ronde
 * - beslisboom: Huidige stap en data in de invoer flow
 * - settings: Alle beschikbare spelvormen
 * - allePlelers: Alle beschikbare spelers in het systeem
 * 
 * BESLISBOOM FLOW:
 * ----------------
 * 1. 'speler': Kies welke speler speelt
 * 2. 'spelvorm': Kies spelvorm (Rik, Piek, etc.)
 * 3. 'maat': Kies maat (alleen bij Rik/Rik2/Rik3)
 * 4. 'slagen': Aantal slagen + gemaakt/nat
 * 5. 'allemaal_piek': Speciale flow voor Allemaal Piek
 * 6. 'verdubbelen': Verdubbelaar inzetten of niet
 * 7. 'schoppen_mie_vrouw': Wie heeft Schoppen Vrouw? (afsluitronde)
 * 8. 'schoppen_mie_laatste': Wie heeft laatste slag? (afsluitronde)
 * 
 * @component
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Spelavond() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [avond, setAvond] = useState(null);
  const [settings, setSettings] = useState([]);
  const [beslisboom, setBeslisboom] = useState({ stap: 'speler', data: {} });
  const [scorebord, setScoreboard] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('spelers'); // 'spelers', 'deler', 'volgorde'
  const [allePlelers, setAllePlelers] = useState([]);
  const [allemaalPiekResultaten, setAllemaalPiekResultaten] = useState({});
  const [showEditMode, setShowEditMode] = useState(false);
  const [rondesDetails, setRondesDetails] = useState([]);
  const [meerdereState, setMeerdereState] = useState({
    deelnemers: [],
    spel: null,
    resultaten: {}
  });
  const isMeerdereFeatureEnabled = typeof window !== 'undefined' && Boolean(window.FEATURE_MEERDERE);

  useEffect(() => {
    loadAvond();
    loadSettings();
    loadAllePlelers();
  }, [id]);

  useEffect(() => {
    if (showEditMode && avond) {
      loadRondesDetails();
    }
  }, [showEditMode, avond]);

  const loadAvond = async () => {
    try {
      // Get active spelavond with all related data
      const { data: spelavondData, error: spelavondError } = await supabase
        .from('spelavonden')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (spelavondError) throw spelavondError;
      if (!spelavondData) return;

      // Get avond_spelers with speler names
      const { data: avondSpelersData, error: spelersError } = await supabase
        .from('avond_spelers')
        .select(`
          id,
          speler_id,
          volgorde,
          actief,
          spelers(naam)
        `)
        .eq('spelavond_id', spelavondData.id)
        .order('volgorde');

      if (spelersError) throw spelersError;

      // Transform data to match expected format
      const formattedSpelers = (avondSpelersData || []).map(as => ({
        avond_speler_id: as.id,
        speler_id: as.speler_id,
        naam: as.spelers?.naam || 'Onbekend',
        volgorde: as.volgorde,
        actief: as.actief,
        verdubbelaar: 1 // Default for now
      }));

      const avondObj = {
        id: spelavondData.id,
        datum: spelavondData.datum,
        status: spelavondData.status,
        start_deler: spelavondData.start_deler,
        spelers: formattedSpelers,
        rondes: [],
        scores: []
      };

      setAvond(avondObj);
      berekenScoreboard(avondObj);
    } catch (err) {
      console.error('Fout bij laden avond:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('spel_settings')
        .select('*')
        .order('naam');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error('Fout bij laden settings:', err);
    }
  };

  const loadAllePlelers = async () => {
    try {
      const { data, error } = await supabase
        .from('spelers')
        .select('*')
        .order('naam');

      if (error) throw error;
      setAllePlelers(data || []);
    } catch (err) {
      console.error('Fout bij laden spelers:', err);
    }
  };

  const loadRondesDetails = async () => {
    if (!avond?.id) return;
    // For now, set empty - we'll implement full ronde loading later
    setRondesDetails([]);
  };

  const handleDeleteRonde = async (rondeId) => {
    if (!confirm('Weet je zeker dat je deze ronde wilt verwijderen?')) return;
    try {
      await apiFetch(`/api/spelavond/ronde/${rondeId}`, {
        method: 'DELETE'
      });
      loadAvond();
      loadRondesDetails();
    } catch (err) {
      console.error('Fout bij verwijderen ronde:', err);
      alert(`Fout bij verwijderen ronde: ${err.message || 'Onbekende fout'}`);
    }
  };

  const handleAddPlayer = async (spelerId) => {
    if (!avond?.id) return;
    try {
      await apiFetch(`/api/spelavond/${avond.id}/speler`, {
        method: 'POST',
        body: JSON.stringify({ speler_id: spelerId })
      });
      loadAvond();
    } catch (err) {
      console.error('Fout bij toevoegen speler:', err);
    }
  };

  const handleToggleSpelerActief = async (avondSpelerId, actief) => {
    if (!avond?.id) return;
    try {
      await apiFetch(`/api/spelavond/${avond.id}/speler/${avondSpelerId}/actief`, {
        method: 'PUT',
        body: JSON.stringify({ actief: !actief })
      });
      loadAvond();
    } catch (err) {
      console.error('Fout bij toggle speler actief:', err);
    }
  };

  const handleSetStartDeler = async (avondSpelerId) => {
    if (!avond?.id) return;
    try {
      await apiFetch(`/api/spelavond/${avond.id}/deler`, {
        method: 'PUT',
        body: JSON.stringify({ start_deler: avondSpelerId })
      });
      loadAvond();
    } catch (err) {
      console.error('Fout bij instellen deler:', err);
      alert(`Fout bij instellen deler: ${err.message || 'Onbekende fout'}`);
    }
  };

  const handleVolgorde = async (newOrder) => {
    if (!avond?.id) return;
    try {
      await apiFetch(`/api/spelavond/${avond.id}/volgorde`, {
        method: 'PUT',
        body: JSON.stringify({
          volgorde: newOrder.map((s, i) => ({
            avond_speler_id: s.avond_speler_id,
            volgorde: i + 1
          }))
        })
      });
      loadAvond();
    } catch (err) {
      console.error('Fout bij aanpassen volgorde:', err);
    }
  };

  const moveSpelerUp = (index) => {
    const actieveSpelers = avond.spelers.filter(s => s.actief);
    if (index === 0) return;
    const newOrder = [...actieveSpelers];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    handleVolgorde(newOrder);
  };

  const moveSpelerDown = (index) => {
    const actieveSpelers = avond.spelers.filter(s => s.actief);
    if (index === actieveSpelers.length - 1) return;
    const newOrder = [...actieveSpelers];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    handleVolgorde(newOrder);
  };

  const berekenScoreboard = (avondData) => {
    const board = {};
    avondData.spelers.forEach(speler => {
      board[speler.avond_speler_id] = {};
    });

    // Groepeer scores per ronde
    avondData.scores.forEach(score => {
      if (!board[score.avond_speler_id][score.ronde_nummer]) {
        board[score.avond_speler_id][score.ronde_nummer] = 0;
      }
      board[score.avond_speler_id][score.ronde_nummer] += score.punten;
    });

    // Bereken cumulatief
    avondData.spelers.forEach(speler => {
      let totaal = 0;
      for (let ronde = 1; ronde <= (avondData.rondes.length || 0); ronde++) {
        const rondePunten = board[speler.avond_speler_id][ronde] || 0;
        totaal += rondePunten;
        board[speler.avond_speler_id][ronde] = totaal;
      }
    });

    setScoreboard(board);
  };

  const handleSpelerKlik = (avondSpelerId) => {
    setBeslisboom({
      stap: 'spelvorm',
      data: { uitdager_id: avondSpelerId }
    });
  };

  const handleSpelvormKlik = (spel) => {
    if (spel.met_maat) {
      // Met maat spellen (Rik, Rik 2, Rik 3)
      setBeslisboom({
        ...beslisboom,
        stap: 'maat',
        data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel }
      });
    } else if (spel.naam.includes('alleen')) {
      // Alleen spellen (8 alleen t/m 13 alleen) → SLAGEN
      setBeslisboom({
        ...beslisboom,
        stap: 'slagen',
        data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel, maat_id: null }
      });
    } else if (spel.naam === 'Allemaal Piek') {
      // Allemaal Piek speciale flow
      const initieleResultaten = {};
      spelendeSpelers.forEach(speler => {
        initieleResultaten[speler.avond_speler_id] = null; // null = nog niet gekozen
      });
      setAllemaalPiekResultaten(initieleResultaten);
      setBeslisboom({
        ...beslisboom,
        stap: 'allemaal_piek',
        data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel, maat_id: null }
      });
    } else {
      // Andere speciale spelvormen (Piek, Misere, Open varianten, Schoppen Mie) → GEMAAKT
      setBeslisboom({
        ...beslisboom,
        stap: 'gemaakt',
        data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel, maat_id: null }
      });
    }
  };

  const handleMaatKlik = (avondSpelerId) => {
    const spelInfo = beslisboom.data.spelInfo;
    setBeslisboom({
      ...beslisboom,
      stap: 'slagen',
      data: { ...beslisboom.data, maat_id: avondSpelerId }
    });
  };

  const handleSlagenKlik = (slagen) => {
    setBeslisboom({
      ...beslisboom,
      stap: 'verdubbelen',
      data: { ...beslisboom.data, slagen_gehaald: slagen }
    });
  };

  const handleGemaaktKlik = (gemaakt) => {
    setBeslisboom({
      ...beslisboom,
      stap: 'verdubbelen',
      data: { ...beslisboom.data, slagen_gehaald: gemaakt ? 1 : 0 }
    });
  };

  const handleVerdubbelenKlik = async (verdubbeld) => {
    if (verdubbeld) {
      // Ga naar wie heeft verdubbeld scherm
      setBeslisboom({
        ...beslisboom,
        stap: 'wie_verdubbeld',
        data: { ...beslisboom.data, verdubbeld: true }
      });
    } else {
      // Sla direct op zonder verdubbelaar
      await slaRondeOp(false, null);
    }
  };

  const handleWieVerdubbeldKlik = async (avondSpelerId) => {
    // Sla ronde op met verdubbelaar info
    await slaRondeOp(true, avondSpelerId);
  };

  const slaRondeOp = async (verdubbeld, verdubbelaar_speler_id) => {
    // Sla ronde op
    const rondeNummer = (avond.rondes.length || 0) + 1;

    try {
      const body = {
        spelavond_id: avond.id,
        ronde_nummer: rondeNummer,
        spel_setting_id: beslisboom.data.spel_setting_id,
        uitdager_id: beslisboom.data.uitdager_id,
        maat_id: beslisboom.data.maat_id,
        slagen_gehaald: beslisboom.data.slagen_gehaald,
        verdubbeld,
        verdubbelaar_speler_id
      };

      // Als het Allemaal Piek is, voeg individuele resultaten toe
      if (beslisboom.data.spelInfo?.naam === 'Allemaal Piek') {
        body.allemaal_piek_resultaten = allemaalPiekResultaten;
      }

      // Als het Schoppen Mie is, voeg extra data toe
      if (beslisboom.data.spelInfo?.naam === 'Schoppen Mie') {
        body.schoppen_vrouw_id = beslisboom.data.schoppen_vrouw_id;
        body.laatste_slag_id = beslisboom.data.laatste_slag_id;
      }

      await apiFetch('/api/spelavond/ronde', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      // Als het de laatste ronde is (Schoppen Mie), sluit de avond af en ga naar eindstand
      console.log('Ronde opgeslagen. is_laatste_ronde:', beslisboom.data.is_laatste_ronde);
      if (beslisboom.data.is_laatste_ronde) {
        console.log('Laatste ronde! Naar eindstand...');
        await apiFetch(`/api/spelavond/afsluiten/${avond.id}`, {
          method: 'PUT'
        });
        navigate(`/eindstand/${avond.id}`);
      } else {
        // Reset beslisboom
        setBeslisboom({ stap: 'speler', data: {} });
        setAllemaalPiekResultaten({});
        // Herlaad avond
        loadAvond();
      }
    } catch (err) {
      console.error('Fout bij opslaan ronde:', err);
      alert(`Fout bij opslaan ronde: ${err.message || 'Onbekende fout'}`);
    }
  };

  const handleAllemaalPiekResultaat = (avondSpelerId, gemaakt) => {
    setAllemaalPiekResultaten({
      ...allemaalPiekResultaten,
      [avondSpelerId]: gemaakt
    });
  };

  const handleAllemaalPiekVolgende = () => {
    // Controleer of alle spelers een keuze hebben
    const alleKeuzeGemaakt = Object.values(allemaalPiekResultaten).every(val => val !== null);
    if (!alleKeuzeGemaakt) {
      alert('Kies voor alle spelers of ze gemaakt of nat zijn gegaan');
      return;
    }

    // Ga naar verdubbelen
    setBeslisboom({
      ...beslisboom,
      stap: 'verdubbelen',
      data: { ...beslisboom.data, slagen_gehaald: 1 } // dummy waarde
    });
  };

  const resetMeerdereState = () => {
    setMeerdereState({ deelnemers: [], spel: null, resultaten: {} });
  };

  const startMeerdereFlow = () => {
    resetMeerdereState();
    setBeslisboom({ stap: 'meerdere_selectie', data: {} });
  };

  const toggleMeerdereDeelnemer = (avondSpelerId) => {
    setMeerdereState(prev => {
      const isGeselecteerd = prev.deelnemers.includes(avondSpelerId);
      let nieuweDeelnemers = prev.deelnemers;

      if (isGeselecteerd) {
        nieuweDeelnemers = prev.deelnemers.filter(id => id !== avondSpelerId);
      } else if (prev.deelnemers.length < 4) {
        nieuweDeelnemers = [...prev.deelnemers, avondSpelerId];
      }

      const nieuweResultaten = { ...prev.resultaten };
      if (!nieuweDeelnemers.includes(avondSpelerId)) {
        delete nieuweResultaten[avondSpelerId];
      }

      return { ...prev, deelnemers: nieuweDeelnemers, resultaten: nieuweResultaten };
    });
  };

  const handleMeerdereSpelSelect = (spel) => {
    setMeerdereState(prev => ({ ...prev, spel }));
    setBeslisboom({ stap: 'meerdere_resultaten', data: {} });
  };

  const handleMeerdereResultaat = (avondSpelerId, gemaakt) => {
    setMeerdereState(prev => ({
      ...prev,
      resultaten: {
        ...prev.resultaten,
        [avondSpelerId]: gemaakt
      }
    }));
  };

  const handleMeerdereResultatenVolgende = () => {
    const volledig = meerdereState.deelnemers.length >= 2 &&
      meerdereState.deelnemers.every(id => typeof meerdereState.resultaten[id] === 'boolean');

    if (!volledig) {
      alert('Selecteer voor alle deelnemers of ze gemaakt of nat zijn gegaan');
      return;
    }

    setBeslisboom({ stap: 'meerdere_verdubbelen', data: {} });
  };

  const handleMeerdereVerdubbelen = (verdubbeld) => {
    if (verdubbeld) {
      setBeslisboom({ stap: 'meerdere_wie_verdubbeld', data: {} });
    } else {
      slaMeerdereRondeOp(false, null);
    }
  };

  const handleMeerdereVerdubbelaarSelect = (avondSpelerId) => {
    slaMeerdereRondeOp(true, avondSpelerId);
  };

  const slaMeerdereRondeOp = async (verdubbeld, verdubbelaar_speler_id) => {
    if (!avond || !meerdereState.spel || meerdereState.deelnemers.length < 2) {
      alert('Meerdere spelvorm is niet compleet ingevuld');
      return;
    }

    const deelnamePayload = meerdereState.deelnemers.map(id => ({
      avond_speler_id: id,
      is_gemaakt: Boolean(meerdereState.resultaten[id])
    }));

    const body = {
      spelavond_id: avond.id,
      ronde_nummer: rondeNummer,
      spel_setting_id: meerdereState.spel.id,
      deelnemers: deelnamePayload,
      verdubbeld,
      verdubbelaar_speler_id
    };

    try {
      await apiFetch('/api/spelavond/ronde-meerdere', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      resetMeerdereState();
      setBeslisboom({ stap: 'speler', data: {} });
      loadAvond();
    } catch (err) {
      console.error('Fout bij opslaan Meerdere ronde:', err);
      alert(`Fout bij opslaan Meerdere ronde: ${err.message || 'Onbekende fout'}`);
    }
  };


  const handleSchoppenMieVrouw = (avondSpelerId) => {
    console.log('Schoppen Mie Vrouw geselecteerd. beslisboom.data:', beslisboom.data);
    setBeslisboom({
      ...beslisboom,
      stap: 'schoppen_mie_laatste',
      data: { ...beslisboom.data, schoppen_vrouw_id: avondSpelerId }
    });
  };

  const handleSchoppenMieLaatste = (avondSpelerId) => {
    console.log('Laatste slag geselecteerd. beslisboom.data:', beslisboom.data);
    setBeslisboom({
      ...beslisboom,
      stap: 'verdubbelen',
      data: { ...beslisboom.data, laatste_slag_id: avondSpelerId, slagen_gehaald: 1 }
    });
  };

  const formatDatum = (datum) => {
    if (!datum) return '';
    const date = new Date(datum);
    const maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    return `${date.getDate()} ${maanden[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleKlaar = () => {
    // Confirmatie
    if (!confirm('Weet je het zeker? De avond wordt afgesloten met de Schoppen Mie ronde.')) {
      return;
    }

    // Start Schoppen Mie als laatste ronde
    const schoppenMie = settings.find(s => s.naam === 'Schoppen Mie');
    if (!schoppenMie) {
      alert('Schoppen Mie spelvorm niet gevonden');
      return;
    }

    // Gebruik de eerste spelende speler als dummy uitdager_id (database vereist)
    const dummyUitdagerId = spelendeSpelers.length > 0 ? spelendeSpelers[0].avond_speler_id : null;

    // Start Schoppen Mie beslisboom
    setBeslisboom({
      stap: 'schoppen_mie_vrouw',
      data: {
        spel_setting_id: schoppenMie.id,
        spelInfo: schoppenMie,
        uitdager_id: dummyUitdagerId, // Database vereist een uitdager_id
        maat_id: null,
        is_laatste_ronde: true
      }
    });
  };

  if (!avond) {
    return <div className="text-center p-8">Laden...</div>;
  }

  const actieveSpelers = avond.spelers.filter(s => s.actief);
  const alleSpelers = avond.spelers; // Inclusief inactieve spelers voor weergave
  const rondeNummer = (avond.rondes.length || 0) + 1;
  const laatsteRondes = [...(avond.rondes || [])].reverse();

  // Bereken huidige deler (roteert per ronde, alleen actieve spelers)
  const getHuidigeDeler = () => {
    if (!avond || !avond.start_deler) return null;
    // Tel alleen actieve spelers vanaf het begin
    const startDelerIndex = actieveSpelers.findIndex(s => s.avond_speler_id === avond.start_deler);
    if (startDelerIndex === -1) return null;
    const huidigeRonde = rondeNummer - 1;
    const delerIndex = (startDelerIndex + huidigeRonde) % actieveSpelers.length;
    return actieveSpelers[delerIndex]?.avond_speler_id;
  };

  // Bereken stilzitters (bij 5 spelers: alleen deler, bij 6 spelers: deler + speler 3 posities verder)
  const getStilzitters = () => {
    if (actieveSpelers.length < 5 || actieveSpelers.length > 6) return [];
    if (!avond || !avond.start_deler) return [];

    // Vind de positie van de startdeler in de actieve spelers lijst
    const startDelerIndex = actieveSpelers.findIndex(s => s.avond_speler_id === avond.start_deler);
    if (startDelerIndex === -1) return [];

    // Bereken welke ronde het is (0-based)
    const huidigeRonde = rondeNummer - 1;

    // Deler roteert per ronde
    const aantalSpelers = actieveSpelers.length;
    const delerIndex = (startDelerIndex + huidigeRonde) % aantalSpelers;

    if (actieveSpelers.length === 5) {
      // Bij 5 spelers: alleen de deler zit stil
      return [actieveSpelers[delerIndex]?.avond_speler_id].filter(Boolean);
    } else {
      // Bij 6 spelers: deler + speler 3 posities verder (aan de overkant van de tafel)
      const tweedeStilzitterIndex = (delerIndex + 3) % 6;
      return [
        actieveSpelers[delerIndex]?.avond_speler_id,
        actieveSpelers[tweedeStilzitterIndex]?.avond_speler_id
      ].filter(Boolean);
    }
  };

  const huidigeDeler = getHuidigeDeler();
  const stilzitters = getStilzitters();

  // Spelende spelers (actief EN niet stilzittend)
  const spelendeSpelers = actieveSpelers.filter(s => !stilzitters.includes(s.avond_speler_id));
  const meerdereSpelvormen = settings.filter(s => s.naam?.startsWith('Meerdere'));


  // Check of een speler al Allemaal Piek heeft gedaan
  const heeftAllemaalPiekGedaan = (avondSpelerId) => {
    if (!avond || !avond.rondes) return false;
    return avond.rondes.some(ronde =>
      ronde.spel_naam === 'Allemaal Piek' && ronde.uitdager_id === avondSpelerId
    );
  };

  // Bereken stilzitters voor een specifieke ronde (bij 5 spelers: alleen deler, bij 6 spelers: deler + overkant)
  const getStilzittersVoorRonde = (rondeNummer) => {
    // Haal de spelers op zoals ze waren tijdens die ronde
    const spelersInRonde = avond.spelers.filter(s => {
      const startRonde = s.start_ronde || 1;
      const eindRonde = s.eind_ronde || 9999;
      return s.actief && rondeNummer >= startRonde && rondeNummer <= eindRonde;
    });

    if (spelersInRonde.length < 5 || spelersInRonde.length > 6) return [];
    if (!avond || !avond.start_deler) return [];

    // Vind de positie van de startdeler
    const startDelerIndex = spelersInRonde.findIndex(s => s.avond_speler_id === avond.start_deler);
    if (startDelerIndex === -1) return [];

    // Bereken deler voor deze specifieke ronde
    const aantalSpelers = spelersInRonde.length;
    const delerIndex = (startDelerIndex + rondeNummer - 1) % aantalSpelers;

    if (spelersInRonde.length === 5) {
      // Bij 5 spelers: alleen de deler zit stil
      return [spelersInRonde[delerIndex]?.avond_speler_id].filter(Boolean);
    } else {
      // Bij 6 spelers: deler + speler 3 posities verder
      const tweedeStilzitterIndex = (delerIndex + 3) % 6;
      return [
        spelersInRonde[delerIndex]?.avond_speler_id,
        spelersInRonde[tweedeStilzitterIndex]?.avond_speler_id
      ].filter(Boolean);
    }
  };

  const getSpelerNaam = (avondSpelerId) => {
    const speler = avond.spelers.find(s => s.avond_speler_id === avondSpelerId);
    return speler ? speler.naam : 'Onbekend';
  };

  // Bepaal slagen opties voor Alleen spelvormen
  const getSlagenOpties = () => {
    const spelInfo = beslisboom.data.spelInfo;
    if (!spelInfo || !spelInfo.minimaal_slagen) return [];

    const min = Math.max(spelInfo.minimaal_slagen - 5, 0);
    const max = Math.min(spelInfo.minimaal_slagen + 5, 13);

    const opties = [];
    for (let i = min; i <= max; i++) {
      opties.push(i);
    }
    return opties;
  };

  // Check of deler moet worden ingesteld (verplicht voor alle aantallen spelers)
  const heeftGeenDeler = !avond.start_deler && actieveSpelers.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-8 page-container">
      {/* Verplichte deler selectie modal */}
      {heeftGeenDeler && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-main rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🎴</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Wie deelt eerst?</h2>
              <p className="text-gray-600 text-sm">
                Kies wie er begint met delen voordat het spel kan starten.
              </p>
            </div>

            <div className="space-y-2">
              {actieveSpelers.map(speler => (
                <button
                  key={speler.avond_speler_id}
                  onClick={() => handleSetStartDeler(speler.avond_speler_id)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                >
                  {speler.naam}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">{formatDatum(avond.datum)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-full bg-white text-gray-800 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
            title="Instellingen"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <button
            onClick={() => setShowEditMode(!showEditMode)}
            className="w-10 h-10 rounded-full bg-white text-gray-800 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
            title="Bewerken"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={handleKlaar}
            className="w-10 h-10 rounded-full bg-white text-gray-800 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-200 text-xl font-bold"
            title="Klaar"
          >
            ✓
          </button>
        </div>
      </div>

      {/* Scorebord */}
      <div className="mt-3 card">
        {/* Speler namen met totaal scores */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-6 flex-shrink-0"></div>
          <div className="grid gap-2 flex-1" style={{ gridTemplateColumns: `repeat(${alleSpelers.length}, 1fr)` }}>
            {alleSpelers.map((speler) => {
              const laatsteScore = scorebord[speler.avond_speler_id]?.[rondeNummer - 1] || 0;
              const displayNaam = alleSpelers.length > 4
                ? speler.naam.split(' ').map(n => n[0]).join('').toUpperCase()
                : speler.naam;
              const isStilzitter = stilzitters.includes(speler.avond_speler_id);
              const isDeler = huidigeDeler === speler.avond_speler_id;
              const isInactief = !speler.actief;
              const heeftVerdubbelaar = speler.verdubbelaar === 1;
              return (
                <div
                  key={speler.avond_speler_id}
                  className={`text-center ${isInactief ? 'opacity-50' : ''}`}
                >
                  <div className={`font-bold p-2 rounded-xl text-sm shadow-sm mb-2 ${isInactief
                      ? 'bg-gray-400 text-gray-200'
                      : isStilzitter
                        ? 'bg-orange-400 text-white'
                        : 'bg-gradient-card text-white'
                    } ${heeftVerdubbelaar && !isInactief ? 'ring-2 ring-red-500' : ''}`}>
                    <span className={isDeler && !isInactief ? 'text-black font-extrabold' : ''}>{displayNaam}</span>
                  </div>
                  <div className={`text-xl font-bold ${isInactief ? 'text-gray-400' : 'text-gray-800'}`}>
                    {laatsteScore}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="mb-4 card bg-white border-2 border-rikken-accent">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-semibold text-gray-800">Instellingen</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                ×
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b pb-2 flex-wrap">
              <button
                onClick={() => setSettingsTab('spelers')}
                className={`px-3 py-1 text-sm rounded-lg ${settingsTab === 'spelers' ? 'bg-gradient-main text-white' : 'text-gray-600'}`}
              >
                Spelers
              </button>
              <button
                onClick={() => setSettingsTab('deler')}
                className={`px-3 py-1 text-sm rounded-lg ${settingsTab === 'deler' ? 'bg-gradient-main text-white' : 'text-gray-600'}`}
              >
                Deler
              </button>
              <button
                onClick={() => setSettingsTab('volgorde')}
                className={`px-3 py-1 text-sm rounded-lg ${settingsTab === 'volgorde' ? 'bg-gradient-main text-white' : 'text-gray-600'}`}
              >
                Volgorde
              </button>
            </div>

            {/* Spelers Tab */}
            {settingsTab === 'spelers' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-2 text-gray-700">Actieve spelers:</p>
                  {avond.spelers.map(speler => (
                    <div key={speler.avond_speler_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2">
                      <span className="text-sm">{speler.naam}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleSpelerActief(speler.avond_speler_id, speler.actief);
                        }}
                        className={`px-3 py-1 text-xs rounded-lg ${speler.actief ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}
                      >
                        {speler.actief ? 'Actief' : 'Inactief'}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-semibold mb-2 text-gray-700">Speler toevoegen:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {allePlelers
                      .filter(p => !avond.spelers.find(as => as.speler_id === p.id))
                      .map(speler => (
                        <button
                          key={speler.id}
                          onClick={() => handleAddPlayer(speler.id)}
                          className="btn-secondary text-sm py-2"
                        >
                          + {speler.naam}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Deler Tab */}
            {settingsTab === 'deler' && (
              <div>
                <p className="text-sm font-semibold mb-2 text-gray-700">Wie is gestart met delen?</p>
                {actieveSpelers.length === 5 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Bij 5 spelers: de deler is altijd stilzitter (oranje).
                  </p>
                )}
                {actieveSpelers.length === 6 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Bij 6 spelers: de deler + speler aan de overkant zijn altijd stilzitters (oranje).
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {actieveSpelers.map(speler => (
                    <button
                      type="button"
                      key={speler.avond_speler_id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSetStartDeler(speler.avond_speler_id);
                      }}
                      className={`py-2 text-sm rounded-lg ${avond.start_deler === speler.avond_speler_id
                          ? 'bg-gradient-main text-white font-bold'
                          : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {speler.naam}
                    </button>
                  ))}
                </div>
                {avond.start_deler && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 text-center">
                      Huidige deler: <strong>{actieveSpelers.find(s => s.avond_speler_id === huidigeDeler)?.naam || '-'}</strong>
                    </p>
                    {actieveSpelers.length === 5 && stilzitters.length === 1 && (
                      <p className="text-xs text-orange-600 text-center mt-1">
                        Stilzitter: <strong>{actieveSpelers.find(s => s.avond_speler_id === stilzitters[0])?.naam}</strong>
                      </p>
                    )}
                    {actieveSpelers.length === 6 && stilzitters.length === 2 && (
                      <p className="text-xs text-orange-600 text-center mt-1">
                        Stilzitters: <strong>{actieveSpelers.find(s => s.avond_speler_id === stilzitters[0])?.naam}</strong> en <strong>{actieveSpelers.find(s => s.avond_speler_id === stilzitters[1])?.naam}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Volgorde Tab */}
            {settingsTab === 'volgorde' && (
              <div>
                <p className="text-sm font-semibold mb-2 text-gray-700">Pas volgorde aan:</p>
                {actieveSpelers.map((speler, index) => (
                  <div key={speler.avond_speler_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2">
                    <span className="text-sm font-medium">{index + 1}. {speler.naam}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          moveSpelerUp(index);
                        }}
                        disabled={index === 0}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === 0 ? 'bg-gray-200 text-gray-400' : 'bg-gradient-main text-white'
                          }`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          moveSpelerDown(index);
                        }}
                        disabled={index === actieveSpelers.length - 1}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === actieveSpelers.length - 1 ? 'bg-gray-200 text-gray-400' : 'bg-gradient-main text-white'
                          }`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {showEditMode && (
          <div className="mb-4 card bg-white border-2 border-red-400">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-semibold text-gray-800">Rondes bewerken</h3>
              <button
                onClick={() => setShowEditMode(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                ×
              </button>
            </div>

            {rondesDetails.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nog geen rondes gespeeld</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rondesDetails.map(ronde => (
                  <div key={ronde.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-700 mb-1">
                          Ronde {ronde.ronde_nummer}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Spelvorm:</strong> {ronde.spelvorm}</div>
                          <div><strong>Uitdager:</strong> {ronde.uitdager_naam}</div>
                          {ronde.maat_naam && (
                            <div><strong>Maat:</strong> {ronde.maat_naam}</div>
                          )}
                          <div><strong>Slagen:</strong> {ronde.slagen_gehaald} / {ronde.slagen_nodig}</div>
                          <div className={ronde.gemaakt ? 'text-green-600' : 'text-red-600'}>
                            <strong>{ronde.gemaakt ? '✓ Gehaald' : '✗ Niet gehaald'}</strong>
                          </div>
                          {ronde.verdubbeld === 1 && (
                            <div className="text-purple-600"><strong>⚡ Verdubbelaar ingezet</strong></div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRonde(ronde.id)}
                        className="ml-3 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                        title="Ronde verwijderen"
                      >
                        🗑️ Verwijder
                      </button>
                    </div>

                    {/* Scores per speler */}
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Scores:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {ronde.scores.map(score => (
                          <div key={score.avond_speler_id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{score.speler_naam}:</span>
                            <span className={`font-semibold ${score.punten > 0 ? 'text-red-600' : score.punten < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                              {score.punten > 0 ? '+' : ''}{score.punten}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rondes geschiedenis */}
        <div className="max-h-48 overflow-y-auto border-t pt-3">
          {laatsteRondes.map(ronde => {
            const stilzittersRonde = getStilzittersVoorRonde(ronde.ronde_nummer);
            const isVerdubbeld = ronde.verdubbeld === 1;
            return (
              <div key={ronde.ronde_nummer} className="flex items-center gap-3 mb-2">
                <div className={`w-6 text-center font-semibold text-gray-600 flex-shrink-0 rounded-lg ${isVerdubbeld ? 'border border-red-500 bg-red-50' : ''}`}>
                  {ronde.ronde_nummer}
                </div>
                <div className="grid gap-2 flex-1" style={{ gridTemplateColumns: `repeat(${alleSpelers.length}, 1fr)` }}>
                  {alleSpelers.map(speler => {
                    const isInactief = !speler.actief;
                    const wasStilzitter = stilzittersRonde.includes(speler.avond_speler_id);
                    return (
                      <div
                        key={`${ronde.ronde_nummer}-${speler.avond_speler_id}`}
                        className={`text-center p-1 rounded-lg text-xs ${isInactief
                            ? 'text-gray-400'
                            : wasStilzitter
                              ? 'bg-gray-100 text-gray-500'
                              : 'text-gray-700'
                          }`}
                      >
                        {scorebord[speler.avond_speler_id]?.[ronde.ronde_nummer] || 0}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Beslisboom interface */}
      <div className="mt-6 card">
        {beslisboom.stap === 'speler' && (
          <div>
            <div className="flex items-center mb-4">
              <div className="back-button invisible"></div>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Wie speelt?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {spelendeSpelers.map(speler => (
                <button
                  key={speler.avond_speler_id}
                  onClick={() => handleSpelerKlik(speler.avond_speler_id)}
                  className="btn-primary h-16"
                >
                  {speler.naam}
                </button>
              ))}
              {isMeerdereFeatureEnabled && (
                <button
                  onClick={startMeerdereFlow}
                  className="btn-primary h-16 col-span-2"
                >
                  Meerdere
                </button>
              )}
            </div>
          </div>
        )}

        {beslisboom.stap === 'meerdere_selectie' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => { resetMeerdereState(); setBeslisboom({ stap: 'speler', data: {} }); }}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Meerdere: kies spelers</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => {
                const isSelected = meerdereState.deelnemers.includes(speler.avond_speler_id);
                const isDisabled = !isSelected && meerdereState.deelnemers.length >= 4;
                return (
                  <button
                    key={speler.avond_speler_id}
                    onClick={() => toggleMeerdereDeelnemer(speler.avond_speler_id)}
                    disabled={isDisabled}
                    className={`h-16 rounded-xl font-semibold transition ${isSelected ? 'btn-primary' : 'btn-secondary'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {speler.naam}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-gray-500">Selecteer 2 tot 4 spelers die samen Meerdere spelen.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { resetMeerdereState(); setBeslisboom({ stap: 'speler', data: {} }); }}
                className="btn-secondary flex-1"
              >
                Annuleer
              </button>
              <button
                onClick={() => setBeslisboom({ stap: 'meerdere_spelvorm', data: {} })}
                disabled={meerdereState.deelnemers.length < 2}
                className={`btn-primary flex-1 ${meerdereState.deelnemers.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Volgende
              </button>
            </div>
          </div>
        )}

        {beslisboom.stap === 'meerdere_spelvorm' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'meerdere_selectie', data: {} })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Meerdere: kies spelvorm</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {meerdereSpelvormen.map(spel => (
                <button
                  key={spel.id}
                  onClick={() => handleMeerdereSpelSelect(spel)}
                  className="btn-primary h-16"
                >
                  {spel.naam.replace('Meerdere - ', '')}
                </button>
              ))}
            </div>
            {meerdereSpelvormen.length === 0 && (
              <p className="text-sm text-red-500">Geen Meerdere spelvormen gevonden in de instellingen.</p>
            )}
          </div>
        )}

        {beslisboom.stap === 'meerdere_resultaten' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'meerdere_spelvorm', data: {} })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Meerdere: resultaten</p>
            </div>
            <div className="space-y-3">
              {meerdereState.deelnemers.map(id => {
                const naam = getSpelerNaam(id);
                const keuze = meerdereState.resultaten[id];
                return (
                  <div key={id} className="p-3 rounded-xl bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{naam}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMeerdereResultaat(id, true)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${keuze === true ? 'bg-green-500 text-white shadow-soft' : 'btn-secondary'}`}
                      >
                        Gemaakt
                      </button>
                      <button
                        onClick={() => handleMeerdereResultaat(id, false)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${keuze === false ? 'bg-red-500 text-white shadow-soft' : 'btn-secondary'}`}
                      >
                        Nat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBeslisboom({ stap: 'meerdere_spelvorm', data: {} })}
                className="btn-secondary flex-1"
              >
                Terug
              </button>
              <button
                onClick={handleMeerdereResultatenVolgende}
                className="btn-primary flex-1"
              >
                Volgende
              </button>
            </div>
          </div>
        )}

        {beslisboom.stap === 'meerdere_verdubbelen' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'meerdere_resultaten', data: {} })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Verdubbelen?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleMeerdereVerdubbelen(true)}
                className="btn-danger h-16"
              >
                Ja ×2
              </button>
              <button
                onClick={() => handleMeerdereVerdubbelen(false)}
                className="btn-primary h-16"
              >
                Nee
              </button>
            </div>
          </div>
        )}

        {beslisboom.stap === 'meerdere_wie_verdubbeld' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'meerdere_verdubbelen', data: {} })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Wie heeft verdubbeld?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {spelendeSpelers.map(speler => {
                const heeftVerdubbelaar = speler.verdubbelaar === 1;
                return (
                  <button
                    key={speler.avond_speler_id}
                    onClick={() => handleMeerdereVerdubbelaarSelect(speler.avond_speler_id)}
                    className={`btn-primary h-16 ${heeftVerdubbelaar ? 'ring-2 ring-red-500' : ''}`}
                    disabled={!heeftVerdubbelaar}
                    style={!heeftVerdubbelaar ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {speler.naam}
                  </button>
                );
              })}
            </div>
            {spelendeSpelers.filter(s => s.verdubbelaar === 1).length === 0 && (
              <p className="text-sm text-red-500">Niemand heeft momenteel een verdubbelaar beschikbaar.</p>
            )}
          </div>
        )}

        {beslisboom.stap === 'spelvorm' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'speler', data: {} })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Kies spelvorm</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['Rik', 'Rik 2', 'Rik 3'].map(naam => {
                const spel = settings.find(s => s.naam === naam);
                return spel ? (
                  <button
                    key={spel.id}
                    onClick={() => handleSpelvormKlik(spel)}
                    className="btn-primary h-16"
                  >
                    {spel.naam}
                  </button>
                ) : null;
              })}
              <button
                onClick={() => {
                  // Toon alle Alleen opties
                  setBeslisboom({ ...beslisboom, stap: 'alleen' });
                }}
                className="btn-primary h-16"
              >
                Alleen
              </button>
            </div>
          </div>
        )}

        {beslisboom.stap === 'alleen' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Alleen - kies variant</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {settings.filter(s => s.naam.includes('alleen')).map(spel => (
                <button
                  key={spel.id}
                  onClick={() => handleSpelvormKlik(spel)}
                  className="btn-primary h-16"
                >
                  {spel.naam}
                </button>
              ))}
              {settings.filter(s => !s.naam.includes('Rik') && !s.naam.includes('alleen') && s.naam !== 'Schoppen Mie' && !s.naam.startsWith('Meerdere')).map(spel => {
                const isAllemaalPiek = spel.naam === 'Allemaal Piek';
                const uitdagerId = beslisboom.data.uitdager_id;
                const heeftAlPiek = isAllemaalPiek && uitdagerId && heeftAllemaalPiekGedaan(uitdagerId);
                return (
                  <button
                    key={spel.id}
                    onClick={() => !heeftAlPiek && handleSpelvormKlik(spel)}
                    className={`h-16 text-xs leading-tight ${heeftAlPiek
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'btn-primary'
                      }`}
                    disabled={heeftAlPiek}
                    title={heeftAlPiek ? 'Deze speler heeft al Allemaal Piek gedaan' : ''}
                  >
                    {spel.naam}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {beslisboom.stap === 'maat' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Kies maat</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {spelendeSpelers
                .filter(s => s.avond_speler_id !== beslisboom.data.uitdager_id)
                .map(speler => (
                  <button
                    key={speler.avond_speler_id}
                    onClick={() => handleMaatKlik(speler.avond_speler_id)}
                    className="btn-primary h-16"
                  >
                    {speler.naam}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {beslisboom.stap === 'slagen' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => {
                  if (beslisboom.data.maat_id) {
                    // Kwam van maat stap (met maat spellen)
                    setBeslisboom({
                      stap: 'maat',
                      data: {
                        uitdager_id: beslisboom.data.uitdager_id,
                        spel_setting_id: beslisboom.data.spel_setting_id,
                        spelInfo: beslisboom.data.spelInfo
                      }
                    });
                  } else {
                    // Kwam van alleen stap (alleen spellen)
                    setBeslisboom({
                      stap: 'alleen',
                      data: { uitdager_id: beslisboom.data.uitdager_id }
                    });
                  }
                }}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Hoeveel slagen?</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {getSlagenOpties().map(slag => (
                <button
                  key={slag}
                  onClick={() => handleSlagenKlik(slag)}
                  className="btn-primary h-16"
                >
                  {slag}
                </button>
              ))}
            </div>
          </div>
        )}

        {beslisboom.stap === 'gemaakt' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Resultaat</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleGemaaktKlik(true)}
                className="btn-primary h-16"
              >
                ✓ Gemaakt
              </button>
              <button
                onClick={() => handleGemaaktKlik(false)}
                className="btn-danger h-16"
              >
                ✗ Nat
              </button>
            </div>
          </div>
        )}

        {beslisboom.stap === 'allemaal_piek' && (
          <div className="space-y-3">
            <div className="flex items-center mb-3">
              <button
                onClick={() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Allemaal Piek</p>
            </div>
            <div className="space-y-2">
              {spelendeSpelers.map(speler => {
                const resultaat = allemaalPiekResultaten[speler.avond_speler_id];
                return (
                  <div key={speler.avond_speler_id} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">{speler.naam}</span>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <button
                        onClick={() => handleAllemaalPiekResultaat(speler.avond_speler_id, true)}
                        className={`py-1.5 text-xs rounded-lg transition-all ${resultaat === true
                            ? 'bg-green-500 text-white font-bold'
                            : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                      >
                        ✓ Gemaakt
                      </button>
                      <button
                        onClick={() => handleAllemaalPiekResultaat(speler.avond_speler_id, false)}
                        className={`py-1.5 text-xs rounded-lg transition-all ${resultaat === false
                            ? 'bg-red-500 text-white font-bold'
                            : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                      >
                        ✗ Nat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleAllemaalPiekVolgende}
              className="btn-primary w-full h-12 mt-3"
            >
              Volgende →
            </button>
          </div>
        )}

        {beslisboom.stap === 'verdubbelen' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => {
                  const spelInfo = beslisboom.data.spelInfo;

                  if (spelInfo?.met_maat || spelInfo?.naam?.includes('alleen')) {
                    // Kwam van slagen stap (met maat of alleen spellen)
                    setBeslisboom({
                      stap: 'slagen',
                      data: {
                        uitdager_id: beslisboom.data.uitdager_id,
                        spel_setting_id: beslisboom.data.spel_setting_id,
                        spelInfo: beslisboom.data.spelInfo,
                        maat_id: beslisboom.data.maat_id
                      }
                    });
                  } else if (spelInfo?.naam === 'Allemaal Piek') {
                    // Kwam van allemaal piek stap
                    setBeslisboom({
                      stap: 'allemaal_piek',
                      data: {
                        uitdager_id: beslisboom.data.uitdager_id,
                        spel_setting_id: beslisboom.data.spel_setting_id,
                        spelInfo: beslisboom.data.spelInfo
                      }
                    });
                  } else if (spelInfo?.naam === 'Schoppen Mie') {
                    // Kwam van schoppen mie laatste stap
                    setBeslisboom({
                      stap: 'schoppen_mie_laatste',
                      data: { ...beslisboom.data }
                    });
                  } else {
                    // Kwam van gemaakt stap (andere speciale spellen)
                    setBeslisboom({
                      stap: 'gemaakt',
                      data: {
                        uitdager_id: beslisboom.data.uitdager_id,
                        spel_setting_id: beslisboom.data.spel_setting_id,
                        spelInfo: beslisboom.data.spelInfo
                      }
                    });
                  }
                }}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Verdubbelen?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleVerdubbelenKlik(true)}
                className="btn-danger h-16"
              >
                Ja ×2
              </button>
              <button
                onClick={() => handleVerdubbelenKlik(false)}
                className="btn-primary h-16"
              >
                Nee
              </button>
            </div>
          </div>
        )}

        {beslisboom.stap === 'wie_verdubbeld' && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({
                  stap: 'verdubbelen',
                  data: beslisboom.data
                })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Wie heeft verdubbeld?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {spelendeSpelers.map(speler => {
                const heeftVerdubbelaar = speler.verdubbelaar === 1;
                return (
                  <button
                    key={speler.avond_speler_id}
                    onClick={() => handleWieVerdubbeldKlik(speler.avond_speler_id)}
                    className={`btn-primary h-16 ${heeftVerdubbelaar ? 'ring-2 ring-red-500' : ''}`}
                    disabled={!heeftVerdubbelaar}
                    style={!heeftVerdubbelaar ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {speler.naam}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Schoppen Mie - Wie heeft de Schoppen Vrouw? */}
        {beslisboom.stap === 'schoppen_mie_vrouw' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">🂭 Schoppen Mie</h2>
              <p className="text-gray-600">Laatste ronde van de avond!</p>
            </div>
            <p className="font-semibold text-gray-700 text-center mb-4">Wie heeft de Schoppen Vrouw?</p>
            <div className="grid grid-cols-2 gap-4">
              {spelendeSpelers.map(speler => (
                <button
                  key={speler.avond_speler_id}
                  onClick={() => handleSchoppenMieVrouw(speler.avond_speler_id)}
                  className="btn-primary h-16"
                >
                  {speler.naam}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schoppen Mie - Wie heeft de laatste slag? */}
        {beslisboom.stap === 'schoppen_mie_laatste' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">🂭 Schoppen Mie</h2>
              <p className="text-gray-600">Laatste ronde van de avond!</p>
            </div>
            <div className="flex items-center mb-4">
              <button
                onClick={() => setBeslisboom({ stap: 'schoppen_mie_vrouw', data: { ...beslisboom.data } })}
                className="back-button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="font-semibold text-gray-700 flex-1 text-center mr-8">Wie heeft de laatste slag?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {spelendeSpelers.map(speler => (
                <button
                  key={speler.avond_speler_id}
                  onClick={() => handleSchoppenMieLaatste(speler.avond_speler_id)}
                  className="btn-primary h-16"
                >
                  {speler.naam}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Spelavond;


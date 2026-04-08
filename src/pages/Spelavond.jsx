import { useState, useEffect, useCallback } from 'react';
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
  const [settingsTab, setSettingsTab] = useState('spelers');
  const [allePlelers, setAllePlelers] = useState([]);
  const [allemaalPiekResultaten, setAllemaalPiekResultaten] = useState({});
  const [showEditMode, setShowEditMode] = useState(false);
  const [rondesDetails, setRondesDetails] = useState([]);
  const [meerdereState, setMeerdereState] = useState({ deelnemers: [], spel: null, resultaten: {} });
  const [loading, setLoading] = useState(true);

  const berekenScoreboard = useCallback((avondData) => {
    const board = {};
    avondData.spelers.forEach(speler => { board[speler.avond_speler_id] = {}; });

    avondData.scores.forEach(score => {
      if (!board[score.avond_speler_id]) board[score.avond_speler_id] = {};
      if (!board[score.avond_speler_id][score.ronde_nummer]) board[score.avond_speler_id][score.ronde_nummer] = 0;
      board[score.avond_speler_id][score.ronde_nummer] += score.punten;
    });

    // Bereken cumulatief — gebruik hoogste ronde_nummer uit scores, niet array.length
    // (Meerdere rondes hebben meerdere rijen met hetzelfde ronde_nummer)
    const uniekeNrs = [...new Set(avondData.scores.map(s => s.ronde_nummer))];
    const maxRonde = uniekeNrs.length > 0 ? Math.max(...uniekeNrs) : 0;
    avondData.spelers.forEach(speler => {
      let totaal = 0;
      for (let ronde = 1; ronde <= maxRonde; ronde++) {
        const rondePunten = board[speler.avond_speler_id]?.[ronde] || 0;
        totaal += rondePunten;
        if (!board[speler.avond_speler_id]) board[speler.avond_speler_id] = {};
        board[speler.avond_speler_id][ronde] = totaal;
      }
    });

    setScoreboard(board);
  }, []);

  const loadAvond = useCallback(async () => {
    if (!id) return;
    try {
      const { data: spelavondData, error: spelavondError } = await supabase
        .from('spelavonden').select('*').eq('id', parseInt(id)).single();
      if (spelavondError || !spelavondData) { setLoading(false); return; }

      const { data: avondSpelersData } = await supabase
        .from('avond_spelers').select('*').eq('spelavond_id', spelavondData.id).order('volgorde');

      const { data: allSpelersData } = await supabase.from('spelers').select('*');
      const spelersMap = {};
      (allSpelersData || []).forEach(s => { spelersMap[s.id] = s.naam; });

      const { data: rondesData } = await supabase
        .from('rondes')
        .select('*, spel_settings(id, naam, met_maat, minimaal_slagen, punten_settings(gemaakt, overslag, nat, onderslag))')
        .eq('spelavond_id', spelavondData.id)
        .order('ronde_nummer');

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

      const avondSpelerIds = (avondSpelersData || []).map(as => as.id);
      const scores = [];

      const getStilzittersVoorRonde = (rondeNr) => {
        if (!spelavondData.start_deler) return [];
        const numSpelers = avondSpelerIds.length;
        if (numSpelers < 5) return [];
        const startIndex = avondSpelerIds.indexOf(spelavondData.start_deler);
        const delerIndex = (startIndex + (rondeNr - 1)) % numSpelers;
        if (numSpelers === 5) return [avondSpelerIds[delerIndex]];
        if (numSpelers === 6) {
          const tegenoverIndex = (delerIndex + 3) % numSpelers;
          return [avondSpelerIds[delerIndex], avondSpelerIds[tegenoverIndex]];
        }
        return [];
      };

      const roundsByNr = {};
      formattedRondes.forEach(r => {
        if (!roundsByNr[r.ronde_nummer]) roundsByNr[r.ronde_nummer] = [];
        roundsByNr[r.ronde_nummer].push(r);
      });

      Object.keys(roundsByNr).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rondeNrStr => {
        const rondeNr = parseInt(rondeNrStr);
        const rows = roundsByNr[rondeNr];
        const currentStilzitters = getStilzittersVoorRonde(rondeNr);
        const actieveSpelersInRonde = avondSpelerIds.filter(sid => !currentStilzitters.includes(sid));

        if (rows.length === 1) {
          const ronde = rows[0];
          const uitdagers = [ronde.uitdager_id];
          if (ronde.maat_id) uitdagers.push(ronde.maat_id);
          const tegenspelers = actieveSpelersInRonde.filter(sid => !uitdagers.includes(sid));
          const multiplier = ronde.verdubbeld ? 2 : 1;
          const puntenConfig = ronde.punten;

          if (ronde.spel_naam === 'Schoppen Mie') {
            const vrouwId = ronde.schoppen_vrouw_id;
            const laatsteId = ronde.laatste_slag_id;
            const basis = puntenConfig.gemaakt || 5;
            if (vrouwId && vrouwId === laatsteId) {
              scores.push({ avond_speler_id: vrouwId, ronde_nummer: rondeNr, punten: basis * 4 * multiplier });
            } else {
              if (vrouwId) scores.push({ avond_speler_id: vrouwId, ronde_nummer: rondeNr, punten: basis * multiplier });
              if (laatsteId) scores.push({ avond_speler_id: laatsteId, ronde_nummer: rondeNr, punten: basis * multiplier });
            }
          } else if (ronde.gemaakt) {
            let base = puntenConfig.gemaakt || 5;
            if (ronde.minimaal_slagen && ronde.slagen_gehaald > ronde.minimaal_slagen) {
              base += (puntenConfig.overslag || 1) * (ronde.slagen_gehaald - ronde.minimaal_slagen);
            }
            const finalPoints = Math.round(base * multiplier);
            tegenspelers.forEach(sid => scores.push({ avond_speler_id: sid, ronde_nummer: rondeNr, punten: finalPoints }));
          } else {
            let base = Math.abs(puntenConfig.nat || 10);
            if (ronde.minimaal_slagen && ronde.slagen_gehaald < ronde.minimaal_slagen) {
              base += Math.abs(puntenConfig.onderslag || 1) * (ronde.minimaal_slagen - ronde.slagen_gehaald);
            }
            const soloFactor = (!ronde.met_maat && !ronde.maat_id) ? 3 : 1;
            const finalPoints = Math.round(base * soloFactor * multiplier);
            uitdagers.forEach(sid => scores.push({ avond_speler_id: sid, ronde_nummer: rondeNr, punten: finalPoints }));
          }
        } else {
          // Meerdere ronde: pot-gebaseerde berekening
          // Pot = X * 3 * Y, waarbij X = aantal deelnemers, Y = puntenConfig.gemaakt
          const X = rows.length;
          const Y = rows[0].punten.gemaakt || 5;
          const multiplier = rows[0].verdubbeld ? 2 : 1;
          const pot = X * 3 * Y;

          const deelnemerIds = rows.map(r => r.uitdager_id);
          const natIds = rows.filter(r => !r.gemaakt).map(r => r.uitdager_id);
          const natCount = natIds.length;

          const resterend = pot - (natCount * 3 * Y);

          // Niet-gemaakt spelers = nat deelnemers + niet-deelnemers (ontvangen aandeel resterende pot)
          const nietGemaaktSpelers = actieveSpelersInRonde.filter(sid =>
            !deelnemerIds.includes(sid) || natIds.includes(sid)
          );
          const aandeelPerSpeler = nietGemaaktSpelers.length > 0
            ? Math.round(resterend / nietGemaaktSpelers.length)
            : 0;

          // Nat deelnemers: nat straf (3 * Y)
          natIds.forEach(sid => {
            scores.push({ avond_speler_id: sid, ronde_nummer: rondeNr, punten: Math.round(3 * Y * multiplier) });
          });
          // Niet-gemaakt spelers (nat + niet-deelnemers): aandeel van resterende pot
          nietGemaaktSpelers.forEach(sid => {
            scores.push({ avond_speler_id: sid, ronde_nummer: rondeNr, punten: Math.round(aandeelPerSpeler * multiplier) });
          });
          // Gemaakt deelnemers: 0 punten (niks pushen)
        }
      });

      const formattedSpelers = (avondSpelersData || []).map(as => ({
        avond_speler_id: as.id,
        speler_id: as.speler_id,
        naam: spelersMap[as.speler_id] || 'Onbekend',
        volgorde: as.volgorde,
        actief: as.actief,
        verdubbelaar: as.verdubbelaar === true || as.verdubbelaar === 1 ? 1 : 0
      }));

      // Aantal unieke rondes (Meerdere heeft meerdere rijen per ronde_nummer)
      const aantalRondes = new Set(formattedRondes.map(r => r.ronde_nummer)).size;

      const avondObj = {
        id: spelavondData.id,
        datum: spelavondData.datum,
        status: spelavondData.status,
        start_deler: spelavondData.start_deler,
        spelers: formattedSpelers,
        rondes: formattedRondes,
        aantalRondes,
        scores
      };

      setAvond(avondObj);
      berekenScoreboard(avondObj);
      setLoading(false);
    } catch (err) {
      console.error('Fout bij laden avond:', err);
      setLoading(false);
    }
  }, [id, berekenScoreboard]);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from('spel_settings').select('*').order('naam');
      setSettings(data || []);
    } catch (err) { console.error('Fout bij laden settings:', err); }
  }, []);

  const loadAllePlelers = useCallback(async () => {
    try {
      const { data } = await supabase.from('spelers').select('*').order('naam');
      setAllePlelers(data || []);
    } catch (err) { console.error('Fout bij laden spelers:', err); }
  }, []);

  useEffect(() => {
    loadAvond();
    loadSettings();
    loadAllePlelers();
  }, [loadAvond, loadSettings, loadAllePlelers]);

  useEffect(() => {
    if (showEditMode && avond) { loadRondesDetails(); }
  }, [showEditMode]);

  const loadRondesDetails = async () => {
    if (!avond?.id) return;
    try {
      const { data } = await supabase
        .from('rondes')
        .select('*, spel_settings(naam, minimaal_slagen)')
        .eq('spelavond_id', avond.id)
        .order('ronde_nummer', { ascending: false });

      const spelerMap = {};
      avond.spelers?.forEach(s => { spelerMap[s.avond_speler_id] = s.naam; });

      const details = (data || []).map(r => ({
        id: r.id,
        ronde_nummer: r.ronde_nummer,
        spelvorm: r.spel_settings?.naam || 'Onbekend',
        uitdager_naam: spelerMap[r.uitdager_id] || '-',
        maat_naam: r.maat_id ? spelerMap[r.maat_id] : null,
        slagen_gehaald: r.slagen_gehaald || 0,
        slagen_nodig: r.spel_settings?.minimaal_slagen || 0,
        gemaakt: r.gemaakt,
        verdubbeld: r.verdubbeld ? 1 : 0,
        verdubbelaar_naam: r.verdubbelaar_speler_id ? spelerMap[r.verdubbelaar_speler_id] : null,
      }));
      setRondesDetails(details);
    } catch (err) {
      console.error('Fout bij laden ronde details:', err);
      setRondesDetails([]);
    }
  };

  const handleAddPlayer = async (spelerId) => {
    if (!avond?.id) return;
    try {
      const newVolgorde = (avond.spelers?.length || 0) + 1;
      const { error } = await supabase.from('avond_spelers').insert({
        spelavond_id: avond.id, speler_id: spelerId, volgorde: newVolgorde, actief: true
      });
      if (error) throw error;
      loadAvond();
    } catch (err) { console.error('Fout bij toevoegen speler:', err); }
  };

  const handleToggleSpelerActief = async (avondSpelerId, actief) => {
    try {
      const { error } = await supabase.from('avond_spelers').update({ actief: !actief }).eq('id', avondSpelerId);
      if (error) throw error;
      loadAvond();
    } catch (err) { console.error('Fout bij toggle speler:', err); }
  };

  const handleSetStartDeler = async (avondSpelerId) => {
    if (!avond?.id) return;
    try {
      const { error } = await supabase.from('spelavonden').update({ start_deler: avondSpelerId }).eq('id', avond.id);
      if (error) throw error;
      loadAvond();
    } catch (err) { console.error('Fout bij instellen deler:', err); alert(`Fout: ${err.message}`); }
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

  const handleVolgorde = async (newOrder) => {
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase.from('avond_spelers').update({ volgorde: i + 1 }).eq('id', newOrder[i].avond_speler_id);
      }
      loadAvond();
    } catch (err) { console.error('Fout bij volgorde:', err); }
  };

  const handleDeleteRonde = async (rondeId) => {
    if (!confirm('Weet je zeker dat je deze ronde wilt verwijderen?')) return;
    try {
      const { error } = await supabase.from('rondes').delete().eq('id', rondeId);
      if (error) throw error;
      loadAvond();
      loadRondesDetails();
    } catch (err) { alert(`Fout bij verwijderen: ${err.message}`); }
  };

  const slaRondeOp = async (verdubbeld, verdubbelaar_speler_id) => {
    const spelInfo = beslisboom.data.spelInfo;
    let gemaakt = true;
    if (spelInfo?.minimaal_slagen) {
      gemaakt = beslisboom.data.slagen_gehaald >= spelInfo.minimaal_slagen;
    } else {
      gemaakt = beslisboom.data.slagen_gehaald > 0;
    }

    try {
      const { data: maxData } = await supabase
        .from('rondes').select('ronde_nummer').eq('spelavond_id', avond.id)
        .order('ronde_nummer', { ascending: false }).limit(1);
      const rondeNummer = (maxData?.[0]?.ronde_nummer || 0) + 1;

      if (spelInfo?.naam === 'Allemaal Piek') {
        const rows = Object.entries(allemaalPiekResultaten).map(([spelerId, isGemaakt]) => ({
          spelavond_id: avond.id, ronde_nummer: rondeNummer,
          spel_setting_id: beslisboom.data.spel_setting_id,
          uitdager_id: parseInt(spelerId),
          verdubbelaar_speler_id: verdubbelaar_speler_id || null,
          slagen_gehaald: isGemaakt ? 1 : 0,
          verdubbeld: verdubbeld || false, gemaakt: isGemaakt
        }));
        const { error } = await supabase.from('rondes').insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rondes').insert({
          spelavond_id: avond.id, ronde_nummer: rondeNummer,
          spel_setting_id: beslisboom.data.spel_setting_id,
          uitdager_id: beslisboom.data.uitdager_id,
          maat_id: beslisboom.data.maat_id || null,
          schoppen_vrouw_id: beslisboom.data.schoppen_vrouw_id || null,
          laatste_slag_id: beslisboom.data.laatste_slag_id || null,
          verdubbelaar_speler_id: verdubbelaar_speler_id || null,
          slagen_gehaald: beslisboom.data.slagen_gehaald || 0,
          verdubbeld: verdubbeld || false, gemaakt
        });
        if (error) throw error;
      }

      // Verdubbelaar logica
      const geeftVerdubbelaarTerug = spelInfo?.geeft_verdubbelaar_terug === true;
      if (verdubbeld && verdubbelaar_speler_id) {
        const behoud = geeftVerdubbelaarTerug && gemaakt;
        await supabase.from('avond_spelers').update({ verdubbelaar: behoud }).eq('id', verdubbelaar_speler_id);
      }
      if (!verdubbeld && geeftVerdubbelaarTerug && gemaakt && beslisboom.data.uitdager_id) {
        await supabase.from('avond_spelers').update({ verdubbelaar: true }).eq('id', beslisboom.data.uitdager_id);
      }

      if (beslisboom.data.is_laatste_ronde) {
        await supabase.from('spelavonden').update({ status: 'afgelopen' }).eq('id', avond.id);
        navigate(`/eindstand/${avond.id}`);
      } else {
        setBeslisboom({ stap: 'speler', data: {} });
        setAllemaalPiekResultaten({});
        loadAvond();
      }
    } catch (err) {
      console.error('Fout bij opslaan ronde:', err);
      alert(`Fout bij opslaan ronde: ${err.message}`);
    }
  };

  const slaMeerdereRondeOp = async (verdubbeld, verdubbelaar_speler_id) => {
    if (!avond || !meerdereState.spel || meerdereState.deelnemers.length < 2) return;
    try {
      const { data: maxData } = await supabase
        .from('rondes').select('ronde_nummer').eq('spelavond_id', avond.id)
        .order('ronde_nummer', { ascending: false }).limit(1);
      const rondeNr = (maxData?.[0]?.ronde_nummer || 0) + 1;

      for (const deelnemer of meerdereState.deelnemers) {
        const gemaakt = Boolean(meerdereState.resultaten[deelnemer]);
        const { error } = await supabase.from('rondes').insert({
          spelavond_id: avond.id, ronde_nummer: rondeNr,
          spel_setting_id: meerdereState.spel.id,
          uitdager_id: deelnemer, maat_id: null,
          verdubbelaar_speler_id: verdubbelaar_speler_id || null,
          slagen_gehaald: gemaakt ? 1 : 0,
          verdubbeld: verdubbeld || false, gemaakt
        });
        if (error) throw error;
      }

      setMeerdereState({ deelnemers: [], spel: null, resultaten: {} });
      setBeslisboom({ stap: 'speler', data: {} });
      loadAvond();
    } catch (err) {
      console.error('Fout bij opslaan Meerdere ronde:', err);
      alert(`Fout: ${err.message}`);
    }
  };

  const handleKlaar = () => {
    if (!confirm('Weet je het zeker? De avond wordt afgesloten met de Schoppen Mie ronde.')) return;
    const schoppenMie = settings.find(s => s.naam === 'Schoppen Mie');
    if (!schoppenMie) { alert('Schoppen Mie spelvorm niet gevonden'); return; }
    const dummyUitdagerId = spelendeSpelers.length > 0 ? spelendeSpelers[0].avond_speler_id : null;
    setBeslisboom({
      stap: 'schoppen_mie_vrouw',
      data: { spel_setting_id: schoppenMie.id, spelInfo: schoppenMie, uitdager_id: dummyUitdagerId, maat_id: null, is_laatste_ronde: true }
    });
  };

  const formatDatum = (datum) => {
    if (!datum) return '';
    const date = new Date(datum);
    const maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    return `${date.getDate()} ${maanden[date.getMonth()]} ${date.getFullYear()}`;
  };

  const backBtn = (onClick) => (
    <button onClick={onClick} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-primary text-4xl" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
          <p className="mt-4 text-on-surface-variant font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  if (!avond) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-error text-4xl">error</span>
          <p className="mt-4 text-on-surface-variant">Spelavond niet gevonden.</p>
        </div>
      </div>
    );
  }

  const actieveSpelers = avond.spelers.filter(s => s.actief);
  const alleSpelers = avond.spelers;
  const rondeNummer = (avond.aantalRondes || 0) + 1;
  // Dedupliceer op ronde_nummer — Meerdere heeft meerdere rijen per ronde
  const uniekeRondes = (avond.rondes || []).filter((r, i, arr) =>
    arr.findIndex(x => x.ronde_nummer === r.ronde_nummer) === i
  );
  const laatsteRondes = [...uniekeRondes].reverse();

  // Dealer berekening
  const getHuidigeDeler = () => {
    if (!avond.start_deler) return null;
    const startIndex = actieveSpelers.findIndex(s => s.avond_speler_id === avond.start_deler);
    if (startIndex === -1) return null;
    const delerIndex = (startIndex + (rondeNummer - 1)) % actieveSpelers.length;
    return actieveSpelers[delerIndex]?.avond_speler_id;
  };

  const getStilzitters = () => {
    if (actieveSpelers.length < 5 || !avond.start_deler) return [];
    const startIndex = actieveSpelers.findIndex(s => s.avond_speler_id === avond.start_deler);
    if (startIndex === -1) return [];
    const n = actieveSpelers.length;
    const delerIndex = (startIndex + (rondeNummer - 1)) % n;
    if (n === 5) return [actieveSpelers[delerIndex]?.avond_speler_id].filter(Boolean);
    if (n === 6) {
      return [actieveSpelers[delerIndex]?.avond_speler_id, actieveSpelers[(delerIndex + 3) % 6]?.avond_speler_id].filter(Boolean);
    }
    return [];
  };

  const getStilzittersVoorRonde = (rondeNr) => {
    if (actieveSpelers.length < 5 || !avond.start_deler) return [];
    const startIndex = actieveSpelers.findIndex(s => s.avond_speler_id === avond.start_deler);
    if (startIndex === -1) return [];
    const n = actieveSpelers.length;
    const delerIndex = (startIndex + (rondeNr - 1)) % n;
    if (n === 5) return [actieveSpelers[delerIndex]?.avond_speler_id].filter(Boolean);
    if (n === 6) return [actieveSpelers[delerIndex]?.avond_speler_id, actieveSpelers[(delerIndex + 3) % 6]?.avond_speler_id].filter(Boolean);
    return [];
  };

  const getSlagenOpties = () => {
    const spelInfo = beslisboom.data.spelInfo;
    if (!spelInfo?.minimaal_slagen) return [];
    const min = Math.max(spelInfo.minimaal_slagen - 5, 0);
    const max = Math.min(spelInfo.minimaal_slagen + 5, 13);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  };

  const heeftAllemaalPiekGedaan = (avondSpelerId) => {
    return avond.rondes.some(r => r.spel_naam === 'Allemaal Piek' && r.uitdager_id === avondSpelerId);
  };

  const getSpelerNaam = (avondSpelerId) => {
    return avond.spelers.find(s => s.avond_speler_id === avondSpelerId)?.naam || 'Onbekend';
  };

  const isAfgelopen = avond.status === 'afgelopen';
  const huidigeDeler = getHuidigeDeler();
  const stilzitters = getStilzitters();
  const spelendeSpelers = actieveSpelers.filter(s => !stilzitters.includes(s.avond_speler_id));
  const heeftGeenDeler = !avond.start_deler && actieveSpelers.length > 0;
  const meerdereSpelvormen = settings.filter(s =>
    s.naam?.startsWith('Meerdere') || ['Misere', 'Piek', 'Open Misère', 'Open Piek', 'Schoppen Mie'].includes(s.naam)
  );

  return (
    <div className="min-h-screen pb-8 text-on-surface">

      {/* Modal: Deler kiezen */}
      {heeftGeenDeler && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card-strong rounded-xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
                <span className="material-symbols-outlined text-white text-3xl">style</span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-2">Wie deelt eerst?</h2>
              <p className="text-on-surface-variant text-sm">Kies wie er begint met delen.</p>
            </div>
            <div className="space-y-3">
              {actieveSpelers.map(speler => (
                <button key={speler.avond_speler_id}
                  onClick={() => handleSetStartDeler(speler.avond_speler_id)}
                  className="btn-primary w-full">
                  {speler.naam}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-base font-bold text-on-surface">{formatDatum(avond.datum)}</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings(!showSettings)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-700 hover:bg-indigo-50 transition">
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
          <button onClick={() => setShowEditMode(!showEditMode)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-700 hover:bg-indigo-50 transition">
            <span className="material-symbols-outlined text-xl">edit</span>
          </button>
          {!isAfgelopen && (
            <button onClick={handleKlaar}
              className="w-9 h-9 rounded-full flex items-center justify-center text-indigo-700 hover:bg-indigo-50 transition">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </button>
          )}
        </div>
      </header>
      <div className="pt-20 px-4 max-w-[428px] mx-auto">

      {/* Scorebord */}
      <div className="mt-3 glass-card rounded-xl p-4 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
        {/* Speler bolletjes + totaal scores */}
        <div className="flex items-start gap-2 mb-3">
          <div className="w-7 flex-shrink-0"></div>
          <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${alleSpelers.length}, 1fr)` }}>
            {alleSpelers.map((speler) => {
              const laatsteScore = scorebord[speler.avond_speler_id]?.[rondeNummer - 1] || 0;
              const displayNaam = alleSpelers.length > 4
                ? speler.naam.charAt(0).toUpperCase()
                : speler.naam.split(' ')[0];
              const isStilzitter = stilzitters.includes(speler.avond_speler_id);
              const isDeler = huidigeDeler === speler.avond_speler_id;
              const isInactief = !speler.actief;
              const heeftVerdubbelaar = speler.verdubbelaar === 1;

              return (
                <div key={speler.avond_speler_id} className={`text-center ${isInactief ? 'opacity-40' : ''}`}>
                  <div className={`
                    font-bold py-2 px-1 rounded-xl text-sm shadow-sm mb-1 mx-0.5
                    ${isInactief ? 'bg-gray-300 text-white' :
                      isStilzitter ? 'bg-orange-400 text-white' :
                      'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'}
                    ${heeftVerdubbelaar && !isInactief ? 'ring-2 ring-red-500' : ''}
                  `}>
                    <span className={isDeler && !isInactief ? 'font-extrabold underline' : ''}>{displayNaam}</span>
                  </div>
                  <div className={`text-lg font-bold ${isInactief ? 'text-gray-400' : 'text-gray-900'}`}>
                    {laatsteScore}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rondes geschiedenis */}
        <div className="max-h-44 overflow-y-auto border-t pt-2 space-y-1">
          {laatsteRondes.map(ronde => {
            const stilzittersRonde = getStilzittersVoorRonde(ronde.ronde_nummer);
            const isVerdubbeld = ronde.verdubbeld === true || ronde.verdubbeld === 1;
            return (
              <div key={ronde.ronde_nummer} className="flex items-center gap-2">
                <div className={`w-7 text-center text-xs font-semibold text-gray-600 flex-shrink-0 rounded-lg py-0.5 ${isVerdubbeld ? 'ring-2 ring-red-400 bg-red-50 text-red-600' : ''}`}>
                  {ronde.ronde_nummer}
                </div>
                <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${alleSpelers.length}, 1fr)` }}>
                  {alleSpelers.map(speler => {
                    const wasStilzitter = stilzittersRonde.includes(speler.avond_speler_id);
                    return (
                      <div key={`${ronde.ronde_nummer}-${speler.avond_speler_id}`}
                        className={`text-center text-xs rounded py-0.5 ${!speler.actief ? 'text-gray-300' : wasStilzitter ? 'bg-gray-100 text-gray-400' : 'text-gray-700'}`}>
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

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-3 glass-card rounded-xl p-4 shadow-[0_12px_40px_rgba(57,83,189,0.06)] border border-primary/20">
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <h3 className="font-semibold text-gray-800">Instellingen</h3>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="flex gap-2 mb-3">
            {['spelers', 'deler', 'volgorde'].map(tab => (
              <button key={tab} onClick={() => setSettingsTab(tab)}
                className={`px-3 py-1 text-sm rounded-lg capitalize ${settingsTab === tab ? 'gradient-primary text-white' : 'text-gray-600 bg-gray-100'}`}>
                {tab}
              </button>
            ))}
          </div>

          {settingsTab === 'spelers' && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold mb-2 text-gray-700">Actieve spelers:</p>
                {avond.spelers.map(speler => (
                  <div key={speler.avond_speler_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-1">
                    <span className="text-sm">{speler.naam}</span>
                    <button onClick={() => handleToggleSpelerActief(speler.avond_speler_id, speler.actief)}
                      className={`px-3 py-1 text-xs rounded-lg ${speler.actief ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {speler.actief ? 'Actief' : 'Inactief'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2 text-gray-700">Speler toevoegen:</p>
                <div className="grid grid-cols-2 gap-2">
                  {allePlelers.filter(p => !avond.spelers.find(as => as.speler_id === p.id)).map(speler => (
                    <button key={speler.id} onClick={() => handleAddPlayer(speler.id)} className="btn-secondary text-sm py-2">
                      + {speler.naam}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'deler' && (
            <div>
              <p className="text-sm font-semibold mb-2 text-gray-700">Wie is gestart met delen?</p>
              <div className="grid grid-cols-2 gap-2">
                {actieveSpelers.map(speler => (
                  <button key={speler.avond_speler_id}
                    onClick={() => handleSetStartDeler(speler.avond_speler_id)}
                    className={`py-2 text-sm rounded-lg ${avond.start_deler === speler.avond_speler_id ? 'gradient-primary text-white font-bold' : 'bg-gray-100 text-gray-700'}`}>
                    {speler.naam}
                  </button>
                ))}
              </div>
              {avond.start_deler && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 text-center">
                  Huidige deler: <strong>{actieveSpelers.find(s => s.avond_speler_id === huidigeDeler)?.naam || '-'}</strong>
                  {stilzitters.length > 0 && (
                    <span className="block text-orange-600 mt-1">
                      Stilzitter(s): <strong>{stilzitters.map(id => getSpelerNaam(id)).join(', ')}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {settingsTab === 'volgorde' && (
            <div>
              <p className="text-sm font-semibold mb-2 text-gray-700">Pas volgorde aan:</p>
              {actieveSpelers.map((speler, index) => (
                <div key={speler.avond_speler_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-1">
                  <span className="text-sm font-medium">{index + 1}. {speler.naam}</span>
                  <div className="flex gap-1">
                    <button onClick={() => moveSpelerUp(index)} disabled={index === 0}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === 0 ? 'bg-gray-200 text-gray-400' : 'gradient-primary text-white'}`}>↑</button>
                    <button onClick={() => moveSpelerDown(index)} disabled={index === actieveSpelers.length - 1}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === actieveSpelers.length - 1 ? 'bg-gray-200 text-gray-400' : 'gradient-primary text-white'}`}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit panel */}
      {showEditMode && (
        <div className="mt-3 glass-card rounded-xl p-4 shadow-[0_12px_40px_rgba(57,83,189,0.06)] border border-error/30">
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <h3 className="font-semibold text-gray-800">Rondes bewerken</h3>
            <button onClick={() => setShowEditMode(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          {rondesDetails.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">Nog geen rondes gespeeld</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {rondesDetails.map(ronde => (
                <div key={ronde.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-gray-700 space-y-0.5">
                      <div className="font-semibold">Ronde {ronde.ronde_nummer} · {ronde.spelvorm}</div>
                      <div>Uitdager: {ronde.uitdager_naam}{ronde.maat_naam ? ` + ${ronde.maat_naam}` : ''}</div>
                      <div>Slagen: {ronde.slagen_gehaald}/{ronde.slagen_nodig}</div>
                      <div className={ronde.gemaakt ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {ronde.gemaakt ? '✓ Gemaakt' : '✗ Nat'}{ronde.verdubbeld ? ' · ⚡ Verdubbeld' : ''}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteRonde(ronde.id)}
                      className="ml-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Beslisboom — alleen zichtbaar als avond actief is */}
      <div className="mt-4 glass-card rounded-xl p-4 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
      {isAfgelopen ? (
        <div className="flex items-center gap-3 py-2">
          <span className="material-symbols-outlined text-gray-400 text-2xl">lock</span>
          <div>
            <p className="font-semibold text-gray-600 text-sm">Avond afgesloten</p>
            <p className="text-xs text-gray-400">Deze avond is beëindigd en kan niet meer worden bewerkt.</p>
          </div>
        </div>
      ) : (<>

        {/* Stap: Speler kiezen */}
        {beslisboom.stap === 'speler' && (
          <div>
            <p className="font-semibold text-gray-700 text-center mb-4">Wie speelt?</p>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => (
                <button key={speler.avond_speler_id}
                  onClick={() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: speler.avond_speler_id } })}
                  className="btn-primary h-16 text-white shadow-lg">
                  {speler.naam}
                </button>
              ))}
              <button onClick={() => { setMeerdereState({ deelnemers: [], spel: null, resultaten: {} }); setBeslisboom({ stap: 'meerdere_selectie', data: {} }); }}
                className="btn-primary h-16 col-span-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl">
                🃏 Meerdere Spelvormen
              </button>
            </div>
          </div>
        )}

        {/* Stap: Spelvorm kiezen */}
        {beslisboom.stap === 'spelvorm' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'speler', data: {} }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Kies spelvorm</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Rik', 'Rik 2', 'Rik 3'].map(naam => {
                const spel = settings.find(s => s.naam === naam);
                return spel ? (
                  <button key={spel.id}
                    onClick={() => setBeslisboom({ ...beslisboom, stap: 'maat', data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel } })}
                    className="btn-primary h-16">{spel.naam}</button>
                ) : null;
              })}
              <button onClick={() => setBeslisboom({ ...beslisboom, stap: 'alleen' })} className="btn-primary h-16">Alleen</button>
            </div>
          </div>
        )}

        {/* Stap: Alleen variant */}
        {beslisboom.stap === 'alleen' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Alleen - kies variant</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {settings.filter(s => s.naam.includes('alleen')).map(spel => (
                <button key={spel.id}
                  onClick={() => setBeslisboom({ ...beslisboom, stap: 'slagen', data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel, maat_id: null } })}
                  className="btn-primary h-16">{spel.naam}</button>
              ))}
              {settings.filter(s => !s.naam.includes('Rik') && !s.naam.includes('alleen') && s.naam !== 'Schoppen Mie' && !s.naam.startsWith('Meerdere')).map(spel => {
                const isAllemaalPiek = spel.naam === 'Allemaal Piek';
                const heeftAlPiek = isAllemaalPiek && heeftAllemaalPiekGedaan(beslisboom.data.uitdager_id);
                return (
                  <button key={spel.id} disabled={heeftAlPiek}
                    onClick={() => {
                      if (heeftAlPiek) return;
                      if (isAllemaalPiek) {
                        const init = {};
                        spelendeSpelers.forEach(s => { init[s.avond_speler_id] = null; });
                        setAllemaalPiekResultaten(init);
                        setBeslisboom({ ...beslisboom, stap: 'allemaal_piek', data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel, maat_id: null } });
                      } else {
                        setBeslisboom({ ...beslisboom, stap: 'gemaakt', data: { ...beslisboom.data, spel_setting_id: spel.id, spelInfo: spel, maat_id: null } });
                      }
                    }}
                    className={`h-16 text-xs leading-tight ${heeftAlPiek ? 'bg-gray-200 text-gray-400 cursor-not-allowed rounded-xl' : 'btn-primary'}`}>
                    {spel.naam}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stap: Maat kiezen */}
        {beslisboom.stap === 'maat' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Kies maat</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.filter(s => s.avond_speler_id !== beslisboom.data.uitdager_id).map(speler => (
                <button key={speler.avond_speler_id}
                  onClick={() => setBeslisboom({ ...beslisboom, stap: 'slagen', data: { ...beslisboom.data, maat_id: speler.avond_speler_id } })}
                  className="btn-primary h-16">{speler.naam}</button>
              ))}
            </div>
          </div>
        )}

        {/* Stap: Slagen */}
        {beslisboom.stap === 'slagen' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => {
                if (beslisboom.data.maat_id) {
                  setBeslisboom({ stap: 'maat', data: { uitdager_id: beslisboom.data.uitdager_id, spel_setting_id: beslisboom.data.spel_setting_id, spelInfo: beslisboom.data.spelInfo } });
                } else {
                  setBeslisboom({ stap: 'alleen', data: { uitdager_id: beslisboom.data.uitdager_id } });
                }
              })}
              <p className="font-semibold text-gray-700 flex-1 text-center">Hoeveel slagen?</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {getSlagenOpties().map(slag => (
                <button key={slag}
                  onClick={() => setBeslisboom({ ...beslisboom, stap: 'verdubbelen', data: { ...beslisboom.data, slagen_gehaald: slag } })}
                  className="btn-primary h-14 text-lg">{slag}</button>
              ))}
            </div>
          </div>
        )}

        {/* Stap: Gemaakt/Nat */}
        {beslisboom.stap === 'gemaakt' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'spelvorm', data: { uitdager_id: beslisboom.data.uitdager_id } }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Resultaat</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setBeslisboom({ ...beslisboom, stap: 'verdubbelen', data: { ...beslisboom.data, slagen_gehaald: 1 } })}
                className="btn-primary h-16">✓ Gemaakt</button>
              <button onClick={() => setBeslisboom({ ...beslisboom, stap: 'verdubbelen', data: { ...beslisboom.data, slagen_gehaald: 0 } })}
                className="btn-danger h-16">✗ Nat</button>
            </div>
          </div>
        )}

        {/* Stap: Allemaal Piek */}
        {beslisboom.stap === 'allemaal_piek' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'alleen', data: { uitdager_id: beslisboom.data.uitdager_id } }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Allemaal Piek</p>
              <div className="w-8" />
            </div>
            {spelendeSpelers.map(speler => {
              const resultaat = allemaalPiekResultaten[speler.avond_speler_id];
              return (
                <div key={speler.avond_speler_id} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-20 flex-shrink-0">{speler.naam}</span>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <button onClick={() => setAllemaalPiekResultaten({ ...allemaalPiekResultaten, [speler.avond_speler_id]: true })}
                      className={`py-2 text-xs rounded-lg ${resultaat === true ? 'bg-green-500 text-white font-bold' : 'bg-white text-gray-700 border border-gray-300'}`}>
                      ✓ Gemaakt
                    </button>
                    <button onClick={() => setAllemaalPiekResultaten({ ...allemaalPiekResultaten, [speler.avond_speler_id]: false })}
                      className={`py-2 text-xs rounded-lg ${resultaat === false ? 'bg-red-500 text-white font-bold' : 'bg-white text-gray-700 border border-gray-300'}`}>
                      ✗ Nat
                    </button>
                  </div>
                </div>
              );
            })}
            <button onClick={() => {
              const alleKeuzeGemaakt = Object.values(allemaalPiekResultaten).every(val => val !== null);
              if (!alleKeuzeGemaakt) { alert('Kies voor alle spelers of ze gemaakt of nat zijn'); return; }
              setBeslisboom({ ...beslisboom, stap: 'verdubbelen', data: { ...beslisboom.data, slagen_gehaald: 1 } });
            }} className="btn-primary w-full h-12 mt-2">Volgende →</button>
          </div>
        )}

        {/* Stap: Verdubbelen */}
        {beslisboom.stap === 'verdubbelen' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => {
                const spelInfo = beslisboom.data.spelInfo;
                if (spelInfo?.met_maat || spelInfo?.naam?.includes('alleen')) {
                  setBeslisboom({ stap: 'slagen', data: { ...beslisboom.data } });
                } else if (spelInfo?.naam === 'Allemaal Piek') {
                  setBeslisboom({ stap: 'allemaal_piek', data: { ...beslisboom.data } });
                } else if (spelInfo?.naam === 'Schoppen Mie') {
                  setBeslisboom({ stap: 'schoppen_mie_laatste', data: { ...beslisboom.data } });
                } else {
                  setBeslisboom({ stap: 'gemaakt', data: { ...beslisboom.data } });
                }
              })}
              <p className="font-semibold text-gray-700 flex-1 text-center">Verdubbelen?</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setBeslisboom({ ...beslisboom, stap: 'wie_verdubbeld', data: { ...beslisboom.data, verdubbeld: true } })}
                className="btn-danger h-16">Ja ×2</button>
              <button onClick={() => slaRondeOp(false, null)} className="btn-primary h-16">Nee</button>
            </div>
          </div>
        )}

        {/* Stap: Wie verdubbeld */}
        {beslisboom.stap === 'wie_verdubbeld' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'verdubbelen', data: beslisboom.data }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Wie heeft verdubbeld?</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => {
                const heeftVerdubbelaar = speler.verdubbelaar === 1;
                return (
                  <button key={speler.avond_speler_id}
                    onClick={() => slaRondeOp(true, speler.avond_speler_id)}
                    disabled={!heeftVerdubbelaar}
                    className={`btn-primary h-16 ${heeftVerdubbelaar ? 'ring-2 ring-red-500' : 'opacity-40 cursor-not-allowed'}`}>
                    {speler.naam}
                  </button>
                );
              })}
            </div>
            {spelendeSpelers.filter(s => s.verdubbelaar === 1).length === 0 && (
              <p className="text-sm text-red-500 text-center">Niemand heeft een verdubbelaar beschikbaar.</p>
            )}
          </div>
        )}

        {/* Stap: Meerdere - spelers selecteren */}
        {beslisboom.stap === 'meerdere_selectie' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => { setMeerdereState({ deelnemers: [], spel: null, resultaten: {} }); setBeslisboom({ stap: 'speler', data: {} }); })}
              <p className="font-semibold text-gray-700 flex-1 text-center">Meerdere: kies spelers</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => {
                const isSelected = meerdereState.deelnemers.includes(speler.avond_speler_id);
                const isDisabled = !isSelected && meerdereState.deelnemers.length >= 4;
                return (
                  <button key={speler.avond_speler_id}
                    onClick={() => {
                      setMeerdereState(prev => {
                        const isGeselecteerd = prev.deelnemers.includes(speler.avond_speler_id);
                        if (isGeselecteerd) return { ...prev, deelnemers: prev.deelnemers.filter(id => id !== speler.avond_speler_id) };
                        if (prev.deelnemers.length >= 4) return prev;
                        return { ...prev, deelnemers: [...prev.deelnemers, speler.avond_speler_id] };
                      });
                    }}
                    disabled={isDisabled}
                    className={`h-14 rounded-xl font-semibold transition ${isSelected ? 'btn-primary' : 'btn-secondary'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {speler.naam}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 text-center">Selecteer 2 tot 4 spelers</p>
            <button onClick={() => setBeslisboom({ stap: 'meerdere_spelvorm', data: {} })}
              disabled={meerdereState.deelnemers.length < 2}
              className={`btn-primary w-full h-12 ${meerdereState.deelnemers.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Volgende →
            </button>
          </div>
        )}

        {/* Stap: Meerdere - spelvorm */}
        {beslisboom.stap === 'meerdere_spelvorm' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'meerdere_selectie', data: {} }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Meerdere: kies spelvorm</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {meerdereSpelvormen.map(spel => (
                <button key={spel.id}
                  onClick={() => { setMeerdereState(prev => ({ ...prev, spel })); setBeslisboom({ stap: 'meerdere_resultaten', data: {} }); }}
                  className="btn-primary h-14">{spel.naam.replace('Meerdere - ', '')}</button>
              ))}
            </div>
          </div>
        )}

        {/* Stap: Meerdere - resultaten */}
        {beslisboom.stap === 'meerdere_resultaten' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'meerdere_spelvorm', data: {} }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Meerdere: resultaten</p>
              <div className="w-8" />
            </div>
            <div className="space-y-2">
              {meerdereState.deelnemers.map(sid => {
                const keuze = meerdereState.resultaten[sid];
                return (
                  <div key={sid} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-sm text-gray-700">{getSpelerNaam(sid)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setMeerdereState(prev => ({ ...prev, resultaten: { ...prev.resultaten, [sid]: true } }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${keuze === true ? 'bg-green-500 text-white' : 'btn-secondary'}`}>Gemaakt</button>
                      <button onClick={() => setMeerdereState(prev => ({ ...prev, resultaten: { ...prev.resultaten, [sid]: false } }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${keuze === false ? 'bg-red-500 text-white' : 'btn-secondary'}`}>Nat</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => {
              const volledig = meerdereState.deelnemers.every(sid => typeof meerdereState.resultaten[sid] === 'boolean');
              if (!volledig) { alert('Selecteer voor alle deelnemers een resultaat'); return; }
              setBeslisboom({ stap: 'meerdere_verdubbelen', data: {} });
            }} className="btn-primary w-full h-12">Volgende →</button>
          </div>
        )}

        {/* Stap: Meerdere - verdubbelen */}
        {beslisboom.stap === 'meerdere_verdubbelen' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'meerdere_resultaten', data: {} }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Verdubbelen?</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setBeslisboom({ stap: 'meerdere_wie_verdubbeld', data: {} })} className="btn-danger h-16">Ja ×2</button>
              <button onClick={() => slaMeerdereRondeOp(false, null)} className="btn-primary h-16">Nee</button>
            </div>
          </div>
        )}

        {/* Stap: Meerdere - wie verdubbeld */}
        {beslisboom.stap === 'meerdere_wie_verdubbeld' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'meerdere_verdubbelen', data: {} }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Wie heeft verdubbeld?</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => {
                const heeftVerdubbelaar = speler.verdubbelaar === 1;
                return (
                  <button key={speler.avond_speler_id}
                    onClick={() => slaMeerdereRondeOp(true, speler.avond_speler_id)}
                    disabled={!heeftVerdubbelaar}
                    className={`btn-primary h-16 ${heeftVerdubbelaar ? 'ring-2 ring-red-500' : 'opacity-40 cursor-not-allowed'}`}>
                    {speler.naam}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stap: Schoppen Mie - vrouw */}
        {beslisboom.stap === 'schoppen_mie_vrouw' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold text-gray-800">🂭 Schoppen Mie</h2>
              <p className="text-gray-500 text-sm">Laatste ronde van de avond!</p>
            </div>
            <p className="font-semibold text-gray-700 text-center">Wie heeft de Schoppen Vrouw?</p>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => (
                <button key={speler.avond_speler_id}
                  onClick={() => setBeslisboom({ ...beslisboom, stap: 'schoppen_mie_laatste', data: { ...beslisboom.data, schoppen_vrouw_id: speler.avond_speler_id } })}
                  className="btn-primary h-16">{speler.naam}</button>
              ))}
            </div>
          </div>
        )}

        {/* Stap: Schoppen Mie - laatste slag */}
        {beslisboom.stap === 'schoppen_mie_laatste' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold text-gray-800">🂭 Schoppen Mie</h2>
              <p className="text-gray-500 text-sm">Laatste ronde van de avond!</p>
            </div>
            <div className="flex items-center gap-3">
              {backBtn(() => setBeslisboom({ stap: 'schoppen_mie_vrouw', data: { ...beslisboom.data } }))}
              <p className="font-semibold text-gray-700 flex-1 text-center">Wie heeft de laatste slag?</p>
              <div className="w-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {spelendeSpelers.map(speler => (
                <button key={speler.avond_speler_id}
                  onClick={() => setBeslisboom({ ...beslisboom, stap: 'verdubbelen', data: { ...beslisboom.data, laatste_slag_id: speler.avond_speler_id, slagen_gehaald: 1 } })}
                  className="btn-primary h-16">{speler.naam}</button>
              ))}
            </div>
          </div>
        )}
      </>)}{/* einde isAfgelopen ? ... : ... */}
      </div>{/* einde beslisboom card */}
      </div> {/* pt-20 wrapper */}
    </div>
  );
}

export default Spelavond;

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';

function Eindstand() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eindstand, setEindstand] = useState([]);
  const [datum, setDatum] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const resultaatRef = useRef(null);

  useEffect(() => {
    loadEindstand();
  }, [id]);

  const loadEindstand = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: spelavondData, error: spelavondError } = await supabase
        .from('spelavonden').select('*').eq('id', parseInt(id)).single();
      if (spelavondError) throw spelavondError;
      setDatum(spelavondData.datum);

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

      const avondSpelerIds = (avondSpelersData || []).map(as => as.id);
      const getStilzitters = (rondeNr) => {
        if (!spelavondData.start_deler) return [];
        const numSpelers = avondSpelerIds.length;
        if (numSpelers < 5) return [];
        const startIndex = avondSpelerIds.indexOf(spelavondData.start_deler);
        const delerIndex = (startIndex + (rondeNr - 1)) % numSpelers;
        if (numSpelers === 5) return [avondSpelerIds[delerIndex]];
        if (numSpelers === 6) return [avondSpelerIds[delerIndex], avondSpelerIds[(delerIndex + 3) % numSpelers]];
        return [];
      };

      const spelerTotalen = {};
      (avondSpelersData || []).forEach(as => { spelerTotalen[as.id] = 0; });

      const roundsByNr = {};
      (rondesData || []).forEach(r => {
        if (!roundsByNr[r.ronde_nummer]) roundsByNr[r.ronde_nummer] = [];
        roundsByNr[r.ronde_nummer].push(r);
      });

      Object.keys(roundsByNr).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rondeNrStr => {
        const rondeNr = parseInt(rondeNrStr);
        const rows = roundsByNr[rondeNr];
        const currentStilzitters = getStilzitters(rondeNr);
        const actieveSpelersInRonde = avondSpelerIds.filter(sid => !currentStilzitters.includes(sid));

        rows.forEach(r => {
          const isMetMaat = r.spel_settings?.met_maat;
          const puntenConfig = r.spel_settings?.punten_settings?.[0] || { gemaakt: 5, overslag: 1, nat: -10, onderslag: -1 };
          const multiplier = r.verdubbeld ? 2 : 1;
          const rondeScores = [];

          if (rows.length === 1) {
            if (r.spel_settings?.naam === 'Schoppen Mie') {
              const vrouwId = r.schoppen_vrouw_id;
              const laatsteId = r.laatste_slag_id;
              const basis = puntenConfig.gemaakt || 5;
              if (vrouwId && vrouwId === laatsteId) {
                rondeScores.push({ id: vrouwId, p: basis * 4 * multiplier });
              } else {
                if (vrouwId) rondeScores.push({ id: vrouwId, p: basis * multiplier });
                if (laatsteId) rondeScores.push({ id: laatsteId, p: basis * multiplier });
              }
            } else if (r.gemaakt) {
              const uitdagers = [r.uitdager_id];
              if (r.maat_id) uitdagers.push(r.maat_id);
              const tegenspelers = actieveSpelersInRonde.filter(sid => !uitdagers.includes(sid));
              let base = puntenConfig.gemaakt || 5;
              if (r.minimaal_slagen && r.slagen_gehaald > r.minimaal_slagen) {
                base += (puntenConfig.overslag || 1) * (r.slagen_gehaald - r.minimaal_slagen);
              }
              const finalPoints = Math.round(base * multiplier);
              tegenspelers.forEach(sid => rondeScores.push({ id: sid, p: finalPoints }));
            } else {
              const uitdagers = [r.uitdager_id];
              if (r.maat_id) uitdagers.push(r.maat_id);
              let base = Math.abs(puntenConfig.nat || 10);
              if (r.minimaal_slagen && r.slagen_gehaald < r.minimaal_slagen) {
                base += Math.abs(puntenConfig.onderslag || 1) * (r.minimaal_slagen - r.slagen_gehaald);
              }
              const soloFactor = (!isMetMaat && !r.maat_id) ? 3 : 1;
              const finalPoints = Math.round(base * soloFactor * multiplier);
              uitdagers.forEach(sid => rondeScores.push({ id: sid, p: finalPoints }));
            }
          } else {
            if (r.gemaakt) {
              const anderen = actieveSpelersInRonde.filter(sid => sid !== r.uitdager_id);
              const finalPoints = Math.round((puntenConfig.gemaakt || 5) * multiplier);
              anderen.forEach(sid => rondeScores.push({ id: sid, p: finalPoints }));
            } else {
              const finalPoints = Math.round((puntenConfig.gemaakt || 5) * 3 * multiplier);
              rondeScores.push({ id: r.uitdager_id, p: finalPoints });
            }
          }

          rondeScores.forEach(rs => {
            if (rs.id in spelerTotalen) spelerTotalen[rs.id] += rs.p;
          });
        });
      });

      const eindstandArr = (avondSpelersData || []).map(as => ({
        avond_speler_id: as.id,
        naam: spelersMap[as.speler_id] || 'Onbekend',
        totaal_punten: spelerTotalen[as.id] || 0
      })).sort((a, b) => a.totaal_punten - b.totaal_punten);

      setEindstand(eindstandArr);
    } catch (err) {
      console.error('Fout bij laden eindstand:', err);
      setError(err.message || 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getInitials = (naam) => naam.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleDelen = async () => {
    if (!resultaatRef.current) return;
    try {
      const canvas = await html2canvas(resultaatRef.current, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'rikken-eindstand.png', { type: 'image/png' });
        if (navigator.share) {
          try { await navigator.share({ files: [file], title: 'Rikken Eindstand', text: 'Bekijk de eindstand!' }); }
          catch { /* geannuleerd */ }
        } else {
          const link = document.createElement('a');
          link.download = 'rikken-eindstand.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      });
    } catch (err) {
      alert('Fout bij delen: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">refresh</span>
          <p className="mt-4 text-on-surface-variant font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card rounded-xl p-8 text-center max-w-sm w-full">
          <span className="material-symbols-outlined text-error text-4xl">error</span>
          <p className="mt-4 font-semibold text-on-surface">Fout bij laden</p>
          <p className="text-sm text-on-surface-variant mt-2 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">Terug naar Home</button>
        </div>
      </div>
    );
  }

  const winner = eindstand[0];
  const second = eindstand[1];
  const third = eindstand[2];

  return (
    <div className="min-h-screen pb-32 text-on-surface" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2f1 50%, #e0f7fa 100%)' }}>
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Rikken Score
        </h1>
        <div className="w-6"></div>
      </header>

      <main className="mt-24 px-6 max-w-[428px] mx-auto" ref={resultaatRef}>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 rounded-full shadow-xl mb-4"
            style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Eindstand</h2>
          <p className="text-on-surface-variant text-sm mt-1 font-medium opacity-70">{formatDatum(datum)}</p>
        </div>

        {/* Podium */}
        {eindstand.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-12 h-64">
            {/* 2nd */}
            {second && (
              <div className="flex flex-col items-center w-24">
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full border-4 border-surface-container-high shadow-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-slate-400 to-slate-600">
                    {getInitials(second.naam)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-surface-container-highest text-on-surface-variant w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                </div>
                <div className="glass-card w-full h-32 rounded-t-xl flex flex-col items-center justify-start pt-4 shadow-[0_12px_40px_rgba(57,83,189,0.04)]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate px-2">{second.naam}</span>
                  <span className="text-xl font-bold text-secondary mt-1">{second.totaal_punten}</span>
                </div>
              </div>
            )}

            {/* 1st */}
            {winner && (
              <div className="flex flex-col items-center w-28 scale-110">
                <div className="relative mb-3">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <span className="material-symbols-outlined text-yellow-500 animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  </div>
                  <div className="w-20 h-20 rounded-full border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-400/20 flex items-center justify-center text-white font-bold text-xl"
                    style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
                    {getInitials(winner.naam)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-on-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md">1</div>
                </div>
                <div className="w-full h-40 rounded-t-2xl flex flex-col items-center justify-start pt-6 shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 truncate px-2">{winner.naam}</span>
                  <span className="text-3xl font-bold text-white mt-1">{winner.totaal_punten}</span>
                </div>
              </div>
            )}

            {/* 3rd */}
            {third && (
              <div className="flex flex-col items-center w-24">
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full border-4 border-surface-container-high shadow-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-orange-400 to-orange-600">
                    {getInitials(third.naam)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-surface-container-low text-on-surface-variant w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
                </div>
                <div className="glass-card w-full h-24 rounded-t-xl flex flex-col items-center justify-start pt-4 shadow-[0_12px_40px_rgba(57,83,189,0.04)]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate px-2">{third.naam}</span>
                  <span className="text-xl font-bold text-secondary mt-1">{third.totaal_punten}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scoreboard Table */}
        <section className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)] mb-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-xs">format_list_numbered</span>
            Volledige Uitslag
          </h3>
          <div className="space-y-3">
            {eindstand.map((speler, index) => (
              <div
                key={speler.avond_speler_id}
                className={`flex items-center justify-between p-3 rounded-md ${index === 0 ? 'bg-primary-fixed/30' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold w-4 ${index === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {index + 1}
                  </span>
                  <span className={`font-${index === 0 ? 'semibold' : 'medium'} text-on-surface`}>{speler.naam}</span>
                </div>
                <span className={`text-lg font-bold ${index === 0 ? 'text-primary' : 'text-on-surface'}`}>
                  {speler.totaal_punten}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Action Buttons */}
      <div className="px-6 max-w-[428px] mx-auto flex flex-col gap-4 mb-12">
        <button
          onClick={() => navigate('/nieuwe-avond')}
          className="btn-primary text-lg shadow-xl"
        >
          <span className="material-symbols-outlined">refresh</span>
          Nieuwe Avond
        </button>
        <button onClick={handleDelen} className="btn-secondary text-lg">
          <span className="material-symbols-outlined">share</span>
          Delen
        </button>
      </div>

      {/* BottomNavBar */}
      <nav className="bottom-nav">
        <div className="nav-item-active">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Scoreboard</span>
        </div>
        <div className="nav-item cursor-pointer" onClick={() => navigate('/analytics')}>
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">History</span>
        </div>
        <div className="nav-item cursor-pointer" onClick={() => navigate('/spel-settings')}>
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Settings</span>
        </div>
      </nav>
    </div>
  );
}

export default Eindstand;

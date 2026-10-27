import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const { user, profile } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNoteInput, setRequestNoteInput] = useState('');
  // Stav formuláře
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [playersCount, setPlayersCount] = useState('');
  const [duration, setDuration] = useState('');
  const [preparation, setPreparation] = useState('Bez přípravy');
  const [environment, setEnvironment] = useState([]);
  const [equipment, setEquipment] = useState('');
  const [requiredItems, setRequiredItems] = useState('');
  const [minAge, setMinAge] = useState(3);
  const [maxAge, setMaxAge] = useState(10);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  // Dynamická pole
  const [customFields, setCustomFields] = useState([]);
  const [customData, setCustomData] = useState({});

  const [msg, setMsg] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // 1. Řízení načítání profilu a dat
  useEffect(() => {
    if (profile && profile.role !== 'unassigned') {
      fetchGames();
      fetchCustomFields();
    } else if (!useAuth().loading) {
      setLoading(false);
    }
  }, [profile]);

  // 2. Přesměrování nepřihlášeného uživatele na přihlášení
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const fetchGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) setGames(data);
    setLoading(false);
  };

  const fetchCustomFields = async () => {
    const { data } = await supabase.from('custom_game_fields').select('*').order('created_at', { ascending: true });
    if (data) setCustomFields(data);
  };

  const handleCustomDataChange = (fieldName, value) => {
    setCustomData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    setMsg('');

    const { error } = await supabase.from('games').insert([
      {
        title,
        players_count: playersCount,
        duration,
        preparation,
        environment,
        equipment,
        required_items: requiredItems,
        min_age: Number(minAge),
        max_age: maxAge ? Number(maxAge) : null,
        description,
        note,
        custom_data: customData,
        created_by: user.id,
        status: 'pending',
      },
    ]);

    if (error) {
      setMsg('Chyba při ukládání: ' + error.message);
    } else {
      setMsg('Hra byla úspěšně odeslána ke schválení moderátorům a administrátorovi!');
      resetForm();
      setShowForm(false);
      fetchGames();
    }
  };

  const resetForm = () => {
    setTitle('');
    setPlayersCount('');
    setDuration('');
    setPreparation('Bez přípravy');
    setEnvironment([]);
    setEquipment('');
    setRequiredItems('');
    setMinAge(3);
    setMaxAge(10);
    setDescription('');
    setNote('');
    setCustomData({});
  };

  const toggleEnvironment = (option) => {
    if (environment.includes(option)) {
      setEnvironment(environment.filter((item) => item !== option));
    } else {
      setEnvironment([...environment, option]);
    }
  };

  // Odeslání žádosti s vyskakovacím oknem pro poznámku
  const handleRoleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_requested: true, request_note: requestNoteInput })
        .eq('id', user.id);

      if (!error) {
        setRequestSent(true);
        setShowRequestModal(false);
        alert('Žádost byla úspěšně odeslána administrátorovi.');
      } else {
        alert('Chyba při odesílání žádosti: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

   const isUnassigned = user && profile?.role === 'unassigned';

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: '#f87171' };
      case 'moderator':
        return { label: 'Moderátor', color: '#60a5fa' };
      case 'reader':
      case 'ctenar':
        return { label: 'Čtenář', color: '#ffffff' };
      default:
        return { label: 'NEZAŘAZEN !!!', color: '#ef4444', unassigned: true };
    }
  };

  const roleInfo = getRoleInfo(profile?.role);

  const filteredGames = games.filter((game) => {
    if (filterType === 'all') return true;
    if (filterType === 'night') return game.environment?.includes('Noc');
    if (filterType === 'outdoor') return game.environment?.includes('Venku');
    return true;
  });

  return (
    <div 
      style={{
        backgroundImage: `url('/background.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
        color: 'white',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}></div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '32px 16px', boxSizing: 'border-box' }}>
        
        {/* Horní lišta */}
        {user && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
              {profile?.username || 'Uživatel'}{' '}
              <span style={{ color: roleInfo.color, fontWeight: 'bold' }}>
                ({roleInfo.label})
              </span>
            </span>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {(profile?.role === 'moderator' || profile?.role === 'admin') && (
                <Link
                  to="/admin"
                  style={{ backgroundColor: '#b45309', color: 'white', fontWeight: 'bold', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  Admin
                </Link>
              )}

              <button
                onClick={() => navigate('/settings')}
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 'bold' }}
              >
                Nastavení
              </button>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/login');
                }}
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 'bold' }}
              >
                Odhlásit
              </button>
            </div>
          </div>
        )}

        {/* JESTLIŽE JE UŽIVATEL NEZAŘAZENÝ: Sytě červený text a tlačítko */}
        {isUnassigned ? (
          <div style={{ textAlign: 'center', marginTop: '60px', padding: '20px' }}>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff1a1a', marginBottom: '20px', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
              Tvůj účet dosud nebyl schválen. Kliknutím na tlačítko odeslat žádost požádejte o schválení.
            </p>
            <button
              onClick={() => setShowRequestModal(true)}
              disabled={requestSent}
              style={{ backgroundColor: '#e60000', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 10px rgba(0,0,0,0.7)' }}
            >
              {requestSent ? 'Žádost odeslána' : 'Odeslat žádost'}
            </button>

            {/* VLASTNÍ STYLOVÉ MODÁLNÍ OKNO PRO VZKAZ ADMINOVI */}
            {showRequestModal && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(245, 158, 11, 0.5)', padding: '28px', borderRadius: '16px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.8)', textAlign: 'center' }}>
                  
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fde047', marginBottom: '12px', textAlign: 'center' }}>
                    Vzkaz administrátorovi
                  </h3>
                  <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '18px', textAlign: 'center' }}>
                    Napište administrátorovi krátkou zprávu, aby věděl, komu přístup schvaluje.
                  </p>

                  <form onSubmit={handleRoleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <textarea
                      required
                      rows="3"
                      value={requestNoteInput}
                      onChange={(e) => setRequestNoteInput(e.target.value)}
                      placeholder="Ahoj jsem Pepa z rysu"
                      style={{ width: '100%', padding: '12px', backgroundColor: '#000000', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowRequestModal(false)}
                        style={{ backgroundColor: '#374151', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                      >
                        Zrušit
                      </button>
                      <button
                        type="submit"
                        style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                      >
                        Odeslat
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          
          <>
            {/* HLAVNÍ KATALOG PRO SCHVÁLENÉ UŽIVATELE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fde047', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
                Katalog her
              </h1>

              <button
                onClick={() => setShowForm(!showForm)}
                style={{ backgroundColor: '#d97706', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {showForm ? 'Zavřít formulář' : '+ Přidat novou hru'}
              </button>
            </div>

            {msg && (
              <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.9)', color: '#a7f3d0', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
                {msg}
              </div>
            )}

            {/* FORMULÁŘ PRO VKLÁDÁNÍ */}
            {showForm && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.92)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.5)', marginBottom: '32px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.7)' }}>
                
                <button
                  onClick={() => setShowForm(false)}
                  style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  ✕ Zavřít
                </button>

                <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fde047', marginBottom: '20px' }}>Navrhni novou hru</h2>
                
                <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Název hry</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="např. Pašeráci v lese"
                      style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Počet hráčů</label>
                      <input
                        type="text"
                        value={playersCount}
                        onChange={(e) => setPlayersCount(e.target.value)}
                        placeholder="např. 10 - 30"
                        style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Délka hry</label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="např. 45 min"
                        style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Pomůcky</label>
                      <input
                        type="text"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        placeholder="např. lano, stopky"
                        style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Každý hráč musí mít s sebou</label>
                      <input
                        type="text"
                        value={requiredItems}
                        onChange={(e) => setRequiredItems(e.target.value)}
                        placeholder="např. baterka, šátek"
                        style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {customFields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>{field.field_name}</label>
                          <input
                            type="text"
                            value={customData[field.field_name] || ''}
                            onChange={(e) => handleCustomDataChange(field.field_name, e.target.value)}
                            placeholder={`Zadej ${field.field_name.toLowerCase()}...`}
                            style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Příprava</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {['Bez přípravy', 'Lehká', 'Složitá'].map((option) => (
                        <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                          <input
                            type="radio"
                            name="preparation"
                            value={option}
                            checked={preparation === option}
                            onChange={(e) => setPreparation(e.target.value)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Vhodné prostředí</label>
                    <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                      {['Venku', 'Dovnitř', 'Den', 'Noc'].map((envOption) => (
                        <label key={envOption} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151' }}>
                          <input
                            type="checkbox"
                            checked={environment.includes(envOption)}
                            onChange={() => toggleEnvironment(envOption)}
                          />
                          {envOption}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Min. věk</label>
                      <input
                        type="number"
                        min="1"
                        value={minAge}
                        onChange={(e) => setMinAge(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Max. věk</label>
                      <input
                        type="number"
                        min="1"
                        value={maxAge}
                        onChange={(e) => setMaxAge(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Pravidla a popis hry</label>
                    <textarea
                      required
                      rows="4"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Popiš kompletní pravidla hry..."
                      style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>Poznámka / Úkol pro administrátora</label>
                    <textarea
                      rows="2"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Chybí tu možnost prostředí nebo typ přípravy? Napiš to sem..."
                      style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{ width: '100%', backgroundColor: '#059669', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '15px', marginTop: '8px' }}
                  >
                    Uložit hru ke schválení
                  </button>
                </form>
              </div>
            )}

            {/* FILTR */}
            {!showForm && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.75)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fde047' }}>Filtr her:</span>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ padding: '6px 12px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px', outline: 'none', color: 'white', fontFamily: 'inherit', fontSize: '13px' }}
                >
                  <option value="all">Všechny hry</option>
                  <option value="night">Noční hry</option>
                  <option value="outdoor">Venkovní hry</option>
                </select>
              </div>
            )}

            {/* SOUPIS HER */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#d1d5db' }}>Načítám hry...</div>
            ) : filteredGames.length === 0 ? (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: '32px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#d1d5db', margin: 0 }}>Zatím nebyly schváleny žádné hry.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', paddingBottom: '48px' }}>
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    style={{ backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fde047', margin: 0 }}>{game.title}</h3>
                        <span style={{ backgroundColor: 'rgba(146, 64, 14, 0.6)', color: '#fde047', fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
                          {game.min_age} - {game.max_age || '∞'} let
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {game.players_count && <span>👥 {game.players_count}</span>}
                        {game.duration && <span>⏱️ {game.duration}</span>}
                        {game.preparation && <span>🛠️ {game.preparation}</span>}
                        {game.environment?.length > 0 && <span>📍 {game.environment.join(', ')}</span>}
                        {game.equipment && <span>🎒 Pomůcky: {game.equipment}</span>}
                        {game.required_items && <span>🎒 S sebou: {game.required_items}</span>}

                        {game.custom_data && Object.keys(game.custom_data).length > 0 && (
                          Object.entries(game.custom_data).map(([key, val]) => (
                            val ? <span key={key}>🏷️ {key}: {val}</span> : null
                          ))
                        )}
                      </div>

                      <p style={{ color: '#d1d5db', fontSize: '14px', whiteSpace: 'pre-line', lineHeight: '1.5', margin: 0 }}>
                        {game.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
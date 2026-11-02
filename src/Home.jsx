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
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState(null); // Obrázek hry
  const [editImageFile, setEditImageFile] = useState(null);

  // Dynamická pole
  const [customFields, setCustomFields] = useState([]);
  const [customData, setCustomData] = useState({});

  const [msg, setMsg] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]); 
  const [selectedGame, setSelectedGame] = useState(null); 
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [editGameForm, setEditGameForm] = useState({});
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorite_games');
    return saved ? JSON.parse(saved) : [];
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState('current'); // 'current', 'total-games' nebo 'history'
  const [leaderboardHistory, setLeaderboardHistory] = useState([]);
  const [activeLeaderboardInfo, setActiveLeaderboardInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // 1. Řízení načítání profilu a dat
  useEffect(() => {
    if (profile && profile.role !== 'unassigned') {
      fetchGames();
      fetchCustomFields();
    } else {
      setLoading(false);
    }
  }, [profile]);

  // Automatické otevření modálního okna pro změnu hesla při příchodu z e-mailu
  useEffect(() => {
    const isResetMode = sessionStorage.getItem('reset_password_mode');
    if (isResetMode === 'true') {
      setShowSettingsModal(true);
      sessionStorage.removeItem('reset_password_mode');
    }
  }, []);

  const fetchLeaderboard = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false });

    const { data: activeData } = await supabase
      .from('active_leaderboard')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (activeData) {
      setActiveLeaderboardInfo(activeData);
    }

    const { data: allApprovedGames } = await supabase
      .from('games')
      .select('created_by, created_at, status')
      .eq('status', 'approved');

    if (profilesData) {
      const usersWithCounts = profilesData.map(u => {
        const totalUserGames = allApprovedGames 
          ? allApprovedGames.filter(g => String(g.created_by) === String(u.id)).length 
          : 0;

        const periodUserGames = allApprovedGames ? allApprovedGames.filter(g => {
          const isUser = String(g.created_by) === String(u.id);
          if (!isUser) return false;
          if (activeData?.created_at) {
            return new Date(g.created_at) >= new Date(activeData.created_at);
          }
          return true;
        }).length : 0;

        return { 
          ...u, 
          totalGames: totalUserGames,
          periodGames: periodUserGames
        };
      });

      setLeaderboardUsers(usersWithCounts);
    }

    const { data: historyData } = await supabase
      .from('leaderboard_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (historyData) {
      setLeaderboardHistory(historyData);
    }
  };

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const cleanFavorites = async () => {
      if (favorites.length > 0) {
        const { data: allGames } = await supabase.from('games').select('id');
        if (allGames) {
          const existingIds = allGames.map(g => g.id);
          const validFavorites = favorites.filter(id => existingIds.includes(id));
          
          if (validFavorites.length !== favorites.length) {
            setFavorites(validFavorites);
            localStorage.setItem('favorite_games', JSON.stringify(validFavorites));
          }
        }
      }
    };
    cleanFavorites();
  }, [games]);

  useEffect(() => {
    if (!activeLeaderboardInfo?.ends_at) return;

    const targetTime = new Date(activeLeaderboardInfo.ends_at).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('Kolo skončilo');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeLeaderboardInfo]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowSettingsModal(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile?.role && profile.role !== 'unassigned' && profile.role !== 'reader' && profile.role !== 'ctenar') {
      const checkPending = async () => {
        const { count: gamesCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        let usersCount = 0;
        if (profile.role === 'admin') {
          const { count: uCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .or('role_requested.eq.true,role.eq.unassigned');
          usersCount = uCount || 0;
        }

        setPendingCount((gamesCount || 0) + usersCount);
      };

      checkPending();
    }
  }, [profile]);

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
      .eq('status', 'approved');

    if (!error && data) {
      const sortedData = data.sort((a, b) => 
        (a.title || '').localeCompare(b.title || '', 'cs', { sensitivity: 'base' })
      );
      setGames(sortedData);
    }
    setLoading(false);
  };

  const fetchCustomFields = async () => {
    const { data } = await supabase.from('custom_game_fields').select('*').order('created_at', { ascending: true });
    if (data) setCustomFields(data);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    setSettingsError('');

    if (!newPassword || !confirmPassword) {
      setSettingsError('⚠️ Vyplň prosím obě kolenky.');
      return;
    }

    if (newPassword.length < 6) {
      setSettingsError('⚠️ Heslo musí mít alespoň 6 znaků.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSettingsError('❌ Zadaná hesla se neshodují.');
      return;
    }

    setSettingsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSettingsLoading(false);

    if (error) {
      setSettingsError('Chyba při změně hesla: ' + error.message);
    } else {
      setSettingsMsg('✅ Heslo bylo úspěšně změněno!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleCustomDataChange = (fieldName, value) => {
    setCustomData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleFilterToggle = (option) => {
    if (selectedFilters.includes(option)) {
      setSelectedFilters(selectedFilters.filter((item) => item !== option));
    } else {
      setSelectedFilters([...selectedFilters, option]);
    }
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    setMsg('');

    const normalizedNewTitle = title.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const { data: existingGames } = await supabase.from('games').select('id, title');
    
    const isDuplicate = existingGames?.some(game => {
      const normExisting = (game.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normExisting === normalizedNewTitle;
    });

    if (isDuplicate) {
      setMsg('❌ Hra s tímto názvem již v katalogu existuje!');
      return;
    }

    let imageUrl = '';

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('game-image')
        .upload(filePath, imageFile);

      if (uploadError) {
        setMsg('Chyba při nahrávání obrázku: ' + uploadError.message);
        return;
      }

      const { data: publicURLData } = supabase.storage
        .from('game-image')
        .getPublicUrl(filePath);

      imageUrl = publicURLData.publicUrl;
    }

    const { error } = await supabase.from('games').insert([
      {
        title: title.trim(),
        players_count: playersCount,
        duration,
        preparation,
        environment: environment,
        equipment,
        required_items: requiredItems,
        description,
        note,
        custom_data: customData,
        image_url: imageUrl,
        created_by: user.id,
        status: 'pending',
      },
    ]);

    if (error) {
      setMsg('Chyba při ukládání: ' + error.message);
    } else {
      const currentPoints = profile?.points || 0;
      await supabase
        .from('profiles')
        .update({ points: currentPoints + 10 })
        .eq('id', user.id);

      setMsg('Hra byla úspěšně odeslána ke schválení! Získáváš +10 bodů.');
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
    setDescription('');
    setNote('');
    setImageFile(null);
    setCustomData({});
  };

  const toggleEnvironment = (option) => {
    if (environment.includes(option)) {
      setEnvironment(environment.filter((item) => item !== option));
    } else {
      setEnvironment([...environment, option]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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

  const toggleFavorite = (gameId, e) => {
    e.stopPropagation(); 
    setFavorites((prev) => {
      const updated = prev.includes(gameId) 
        ? prev.filter(id => id !== gameId) 
        : [...prev, gameId];
      localStorage.setItem('favorite_games', JSON.stringify(updated));
      return updated;
    });
  };

  const isUnassigned = user && profile?.role === 'unassigned';

  const filteredGames = games.filter((game) => {
    const normalizedTitle = (game.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedSearch = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const matchesSearch = normalizedTitle.includes(normalizedSearch);
    if (!matchesSearch) return false;

    if (selectedFilters.length === 0) return true;

    return selectedFilters.every((filter) => {
      if (['Venku', 'Běhací', 'Dovnitř', 'Den', 'Noc'].includes(filter)) {
        return game.environment?.includes(filter);
      }
      if (['Bez přípravy', 'Lehká', 'Složitá'].includes(filter)) {
        return game.preparation === filter;
      }
      return true;
    });
  });

  const gamesToDisplay = showOnlyFavorites 
    ? filteredGames.filter(game => favorites.includes(game.id))
    : filteredGames;

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

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '10px 16px', boxSizing: 'border-box' }}>
        
        {/* Horní lišta s tlačítky */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
          
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fde047', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.9)', textAlign: 'center' }}>
            Katalog her
          </h1>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap', width: '100%' }}>
            
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              style={{
                backgroundColor: 'transparent',
                color: showOnlyFavorites ? '#fde047' : 'white',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 'bold',
                fontSize: '11px',
                padding: '2px 4px',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
              title="Oblíbené hry"
            >
              ⭐({favorites.length})
            </button>

            <button
              onClick={() => {
                setShowLeaderboardModal(true);
                fetchLeaderboard();
              }}
              style={{ 
                backgroundColor: 'transparent', 
                color: '#fde047', 
                border: 'none', 
                background: 'none',
                cursor: 'pointer', 
                fontFamily: 'inherit', 
                fontWeight: 'bold', 
                fontSize: '12px',
                padding: '2px 4px',
                outline: 'none'
              }}
              title="Žebříček"
            >
              🏆
            </button>

            <button
              onClick={() => {
                setShowSettingsModal(true);
                setSettingsMsg('');
                setSettingsError('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={{ 
                backgroundColor: 'transparent', 
                color: 'white', 
                border: 'none', 
                background: 'none',
                cursor: 'pointer', 
                fontFamily: 'inherit', 
                fontWeight: 'bold', 
                fontSize: '12px',
                padding: '2px 4px',
                outline: 'none'
              }}
              title="Nastavení"
            >
              ⚙️
            </button>

            {profile?.role && profile.role !== 'unassigned' && profile.role !== 'reader' && profile.role !== 'ctenar' && (
              <>
                <style>{`
                  @keyframes pulseRed {
                    0% { background-color: #dc2626; opacity: 1; }
                    50% { background-color: #7f1d1d; opacity: 0.6; }
                    100% { background-color: #dc2626; opacity: 1; }
                  }
                `}</style>
                <button
                  onClick={() => navigate('/admin')}
                  style={{ 
                    backgroundColor: pendingCount > 0 ? '#dc2626' : '#d97706', 
                    color: 'white', 
                    border: 'none', 
                    padding: '5px 8px', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontFamily: 'inherit', 
                    fontWeight: 'bold', 
                    fontSize: '11px',
                    animation: pendingCount > 0 ? 'pulseRed 1.5s infinite' : 'none', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Admin {pendingCount > 0 && `(${pendingCount})`}
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              style={{ 
                backgroundColor: 'rgba(153, 27, 27, 0.9)', 
                color: 'white', 
                border: 'none', 
                padding: '5px 8px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontFamily: 'inherit', 
                fontWeight: 'bold', 
                fontSize: '11px',
                whiteSpace: 'nowrap'
              }}
            >
              Odhlásit
            </button>
          </div>
        </div>
        

        {/* NEZAŘAZENÝ UŽIVATEL */}
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
            {/* TLAČÍTKO PRO PŘIDÁNÍ NOVÉ HRY */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{ backgroundColor: '#d97706', color: 'white', fontWeight: 'bold', padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {showForm ? 'Zavřít formulář' : '+ Přidat novou hru'}
              </button>
            </div>

            {msg && (
              <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.9)', color: '#a7f3d0', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
                {msg}
              </div>
            )}

            {/* FORMULÁŘ PRO VKLÁDÁNÍ HRY */}
            {showForm && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.92)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.5)', marginBottom: '24px', position: 'relative', boxShadow: '0 15px 20px -5px rgba(0,0,0,0.7)' }}>
                
                <button
                  onClick={() => setShowForm(false)}
                  style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                >
                  ✕ Zavřít
                </button>

                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fde047', marginBottom: '14px' }}>Navrhni novou hru</h2>
                
                <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Název hry</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="např. Pašeráci v lese"
                      style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                    />
                  </div>

                  {/* VÝBĚR OBRÁZKU */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Obrázek hry (nepovinné)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Počet hráčů</label>
                      <input
                        type="text"
                        value={playersCount}
                        onChange={(e) => setPlayersCount(e.target.value)}
                        placeholder="např. 10 - 30"
                        style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Délka hry</label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="např. 45 min"
                        style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Pomůcky</label>
                      <input
                        type="text"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        placeholder="např. lano, stopky"
                        style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Každý hráč musí mít s sebou</label>
                      <input
                        type="text"
                        value={requiredItems}
                        onChange={(e) => setRequiredItems(e.target.value)}
                        placeholder="např. baterka, šátek"
                        style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {customFields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>{field.field_name}</label>
                          <input
                            type="text"
                            value={customData[field.field_name] || ''}
                            onChange={(e) => handleCustomDataChange(field.field_name, e.target.value)}
                            placeholder={`Zadej ${field.field_name.toLowerCase()}...`}
                            style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Příprava</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {['Bez přípravy', 'Lehká', 'Složitá'].map((option) => (
                        <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
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
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Vhodné prostředí</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {['Venku','Běhací', 'Dovnitř', 'Den', 'Noc'].map((envOption) => (
                        <label key={envOption} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151' }}>
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

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Pravidla a popis hry</label>
                    <textarea
                      required
                      rows="3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Popiš kompletní pravidla hry..."
                      style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Poznámka / Úkol pro administrátora</label>
                    <textarea
                      rows="2"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Chybí ti nějaká možnost? Napiš to sem..."
                      style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '12px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{ width: '100%', backgroundColor: '#059669', color: 'white', fontWeight: 'bold', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', marginTop: '4px' }}
                  >
                    Uložit hru ke schválení
                  </button>
                </form>
              </div>
            )}

            {/* VYHLEDÁVÁNÍ A TLAČÍTKO FILTRU */}
            {!showForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Hledat hru..."
                    style={{ flexGrow: 1, padding: '5px 10px', backgroundColor: 'rgba(0,0,0,0.75)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px', outline: 'none', color: 'white', fontFamily: 'inherit', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  />

                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#fde047', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    {showFilter ? 'Filtrovat ✕' : 'Filtr'}
                  </button>
                </div>

                {showFilter && (
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                    
                    {/* Sekce: Příprava */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fde047' }}>Příprava:</span>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {['Bez přípravy', 'Lehká', 'Složitá'].map((opt) => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'white' }}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.includes(opt)}
                              onChange={() => handleFilterToggle(opt)}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Sekce: Prostředí */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fde047' }}>Prostředí:</span>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {['Den', 'Dovnitř', 'Noc', 'Venku'].map((opt) => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'white' }}>
                            <input
                              type="checkbox"
                              checked={selectedFilters.includes(opt)}
                              onChange={() => handleFilterToggle(opt)}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* SOUPIS HER */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#d1d5db' }}>Načítám hry...</div>
            ) : gamesToDisplay.length === 0 ? (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: '32px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#d1d5db', margin: 0 }}>
                  {showOnlyFavorites ? 'Nemáš zatím uloženy žádné oblíbené hry.' : 'Zatím nebyly schváleny žádné hry.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '48px' }}>
                {gamesToDisplay.map((game) => {
                  const isFav = favorites.includes(game.id);
                  return (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGame(game)}
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.85)', 
                        borderRadius: '10px', 
                        padding: '8px 16px', 
                        border: '1px solid rgba(245, 158, 11, 0.3)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4)',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.8)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fde047', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {game.title}
                        </h3>

                        <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 }}>
                          {game.preparation && <span>Příprava: {game.preparation}</span>}
                          {game.environment && (
                            <span>
                              Prostředí: {typeof game.environment === 'string' ? game.environment.replace(/[\[\]"]/g, '') : game.environment}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => toggleFavorite(game.id, e)}
                        title={isFav ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '4px',
                          outline: 'none',
                          flexShrink: 0
                        }}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODÁLNÍ OKNO: ŽEBŘÍČEK A HISTORIE */}
            {showLeaderboardModal && (
              <div 
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}
                onClick={() => setShowLeaderboardModal(false)}
              >
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', border: '1px solid rgba(245, 158, 11, 0.5)', padding: '32px', borderRadius: '14px', maxWidth: '550px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.9)', position: 'relative', maxHeight: '85vh', overflowY: 'auto', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}
                >
                  <button
                    onClick={() => setShowLeaderboardModal(false)}
                    style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                  >
                    ✕ Zavřít
                  </button>

                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047', textAlign: 'center', marginBottom: '8px' }}>
                    🏆 {activeLeaderboardInfo?.title || 'Žebříček autorů'}
                  </h2>

                  {/* Přepínání záložek */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', paddingBottom: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setLeaderboardTab('current')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: leaderboardTab === 'current' ? '#fde047' : '#9ca3af', fontFamily: 'inherit' }}
                    >
                      🔥 Aktuální
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('total-games')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: leaderboardTab === 'total-games' ? '#fde047' : '#9ca3af', fontFamily: 'inherit' }}
                    >
                      📊 Celkem her
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('history')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: leaderboardTab === 'history' ? '#fde047' : '#9ca3af', fontFamily: 'inherit' }}
                    >
                      📜 Historie ({leaderboardHistory.length})
                    </button>
                  </div>

                  {/* ZÁLOŽKA: AKTUÁLNÍ ŽEBŘÍČEK S ODPOČTEM */}
                  {leaderboardTab === 'current' && (
                    <div>
                      <div style={{ textAlign: 'center', marginBottom: '16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '8px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#fef3c7' }}>⏱️ Do konce kola zbývá: <strong style={{ color: '#fde047' }}>{timeLeft || 'Načítám...'}</strong></span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {leaderboardUsers.map((u, index) => {
                          let rankColor = 'white';
                          if (index === 0) rankColor = '#fde047'; 
                          else if (index === 1) rankColor = '#9ca3af'; 
                          else if (index === 2) rankColor = '#b45309'; 

                          return (
                            <div 
                              key={u.id} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                backgroundColor: 'transparent',
                                padding: '10px 4px', 
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 'bold', color: rankColor, width: '24px', fontSize: '16px' }}>
                                  {index + 1}.
                                </span>
                                <span style={{ fontWeight: 'bold', color: rankColor, fontSize: '15px' }}>
                                  {u.username || 'Neznámý'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                                <span style={{ color: '#9ca3af' }}>her v kole: <strong style={{ color: 'white' }}>{u.periodGames || 0}</strong></span>
                                <span style={{ color: rankColor }}><strong>{u.points || 0}</strong> bodů</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ZÁLOŽKA: CELKOVÝ POČET HER ZA CELOU DOBU */}
                  {leaderboardTab === 'total-games' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginBottom: '10px' }}>
                        Celkový přehled všech schválených her napsaných autory napříč všemi sezónami.
                      </p>

                      {[...leaderboardUsers]
                        .sort((a, b) => (b.totalGames || 0) - (a.totalGames || 0))
                        .map((u, index) => {
                          let rankColor = 'white';
                          if (index === 0) rankColor = '#fde047'; 
                          else if (index === 1) rankColor = '#9ca3af'; 
                          else if (index === 2) rankColor = '#b45309'; 

                          return (
                            <div 
                              key={u.id} 
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(17, 24, 39, 0.5)', padding: '10px 12px', borderRadius: '8px', border: '1px solid #374151' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 'bold', color: rankColor, width: '24px', fontSize: '16px' }}>{index + 1}.</span>
                                <span style={{ fontWeight: 'bold', color: 'white', fontSize: '15px' }}>{u.username || 'Neznámý'}</span>
                              </div>
                              <div style={{ fontSize: '14px' }}>
                                <span style={{ color: '#fde047' }}><strong> celkem: {u.totalGames || 0}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* ZÁLOŽKA: HISTORIE */}
                  {leaderboardTab === 'history' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {leaderboardHistory.length === 0 ? (
                        <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '14px', fontStyle: 'italic' }}>Zatím žádná historie.</p>
                      ) : (
                        leaderboardHistory.map((item) => (
                          <div key={item.id} style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid #374151' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fde047', margin: '0 0 4px 0' }}>{item.title}</h4>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 10px 0' }}>Ukončeno: {new Date(item.created_at).toLocaleDateString('cs-CZ')}</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {Array.isArray(item.results) && item.results.map((res, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                                  <span>{idx + 1}. {res.username || 'Neznámý'}</span>
                                  <span style={{ color: '#fde047' }}>{res.points || 0} b.</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* MODÁLNÍ OKNO: NASTAVENÍ / ZMĚNA HESLA */}
            {showSettingsModal && (
              <div 
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}
                onClick={() => setShowSettingsModal(false)}
              >
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', border: '1px solid rgba(245, 158, 11, 0.5)', padding: '32px', borderRadius: '14px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.9)', position: 'relative', fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}
                >
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                  >
                    ✕ Zavřít
                  </button>

                  <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fde047', marginBottom: '16px', textAlign: 'center' }}>
                    ⚙️ Změna hesla
                  </h2>

                  {settingsMsg && (
                    <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.9)', color: '#a7f3d0', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                      {settingsMsg}
                    </div>
                  )}

                  {settingsError && (
                    <div style={{ backgroundColor: 'rgba(153, 27, 27, 0.9)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                      {settingsError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>
                        Nové heslo
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Zadej nové heslo..."
                        style={{ width: '100%', padding: '10px 12px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '6px' }}>
                        Potvrzení nového hesla
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Zadej heslo znovu..."
                        style={{ width: '100%', padding: '10px 12px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={settingsLoading}
                      style={{ backgroundColor: '#059669', color: 'white', fontWeight: 'bold', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', marginTop: '8px' }}
                    >
                      {settingsLoading ? 'Ukládám...' : '💾 Uložit nové heslo'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* MODÁLNÍ OKNO PRO DETAIL HRY */}
            {selectedGame && (
              <div 
                style={{ 
                  position: 'fixed', 
                  inset: 0, 
                  backgroundColor: 'rgba(0,0,0,0.85)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 100, 
                  padding: '16px' 
                }}
                onClick={() => { setSelectedGame(null); setIsEditingGame(false); }}
              >
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.95)', 
                    border: '1px solid rgba(245, 158, 11, 0.5)', 
                    padding: '32px', 
                    borderRadius: '14px', 
                    maxWidth: '650px', 
                    width: '100%', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.9)', 
                    position: 'relative', 
                    maxHeight: '85vh', 
                    overflowY: 'auto',
                    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif"
                  }}
                >
                  <button
                    onClick={() => { setSelectedGame(null); setIsEditingGame(false); }}
                    style={{ 
                      position: 'absolute', 
                      top: '16px', 
                      right: '16px', 
                      backgroundColor: '#dc2626', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      padding: '6px 12px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '12px',
                      fontFamily: 'inherit'
                    }}
                  >
                    ✕ Zavřít
                  </button>

                  {isEditingGame ? (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Název hry</label>
                      <input
                        type="text"
                        value={editGameForm.title ?? selectedGame.title}
                        onChange={(e) => setEditGameForm({ ...editGameForm, title: e.target.value })}
                        style={{ width: '100%', fontSize: '20px', fontWeight: 'bold', backgroundColor: '#111827', border: '1px solid #fde047', borderRadius: '6px', color: '#fde047', padding: '8px 12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                  ) : (
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047', textAlign: 'center', marginBottom: '20px', paddingRight: '20px', paddingLeft: '20px' }}>
                      {selectedGame.title}
                    </h2>
                  )}

                  {/* ZOBRAZENÍ OBRÁZKU HRY V DETAILU */}
                  {!isEditingGame && selectedGame.image_url && (
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                      <img 
                        src={selectedGame.image_url} 
                        alt={selectedGame.title} 
                        style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.4)', objectFit: 'cover' }} 
                      />
                    </div>
                  )}

                  {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
                      {!isEditingGame ? (
                        <>
                          <button
                            onClick={() => {
                              setIsEditingGame(true);
                              setEditGameForm(selectedGame);
                              setEditImageFile(null);
                            }}
                            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}
                          >
                            ✏️ Upravit hru
                          </button>

                          {profile?.role === 'admin' && (
                            <button
                              onClick={async () => {
                                if (confirm(`Opravdu chceš hru "${selectedGame.title}" trvale smazat?`)) {
                                  const { error } = await supabase
                                    .from('games')
                                    .delete()
                                    .eq('id', selectedGame.id);

                                  if (!error) {
                                    setSelectedGame(null);
                                    setIsEditingGame(false);
                                    fetchGames();
                                  } else {
                                    alert('Chyba při mazání hry: ' + error.message);
                                  }
                                }
                              }}
                              style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}
                            >
                              🗑️ Smazat hru
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => { setIsEditingGame(false); setEditImageFile(null); }}
                          style={{ backgroundColor: '#374151', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}
                        >
                          Zrušit úpravy
                        </button>
                      )}
                    </div>
                  )}

                  {isEditingGame ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', backgroundColor: 'rgba(17, 24, 39, 0.6)', padding: '16px', borderRadius: '10px', border: '1px solid #374151' }}>
                      
                      {/* ÚPRAVA OBRÁZKU V EDITACI */}
                      <div>
                        <label style={{ fontSize: '12px', color: '#fde047', display: 'block', marginBottom: '4px' }}>
                          Obrázek hry
                        </label>
                        
                        {(editGameForm.image_url ?? selectedGame.image_url) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <img 
                              src={editGameForm.image_url ?? selectedGame.image_url} 
                              alt="Náhled" 
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #374151' }} 
                            />
                            <button
                              type="button"
                              onClick={() => setEditGameForm({ ...editGameForm, image_url: '' })}
                              style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              🗑️ Smazat obrázek
                            </button>
                          </div>
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditImageFile(e.target.files[0])}
                          style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Počet hráčů</label>
                          <input
                            type="text"
                            value={editGameForm.players_count ?? selectedGame.players_count ?? ''}
                            onChange={(e) => setEditGameForm({ ...editGameForm, players_count: e.target.value })}
                            style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Délka hry</label>
                          <input
                            type="text"
                            value={editGameForm.duration ?? selectedGame.duration ?? ''}
                            onChange={(e) => setEditGameForm({ ...editGameForm, duration: e.target.value })}
                            style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Pomůcky</label>
                          <input
                            type="text"
                            value={editGameForm.equipment ?? selectedGame.equipment ?? ''}
                            onChange={(e) => setEditGameForm({ ...editGameForm, equipment: e.target.value })}
                            style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>S sebou</label>
                          <input
                            type="text"
                            value={editGameForm.required_items ?? selectedGame.required_items ?? ''}
                            onChange={(e) => setEditGameForm({ ...editGameForm, required_items: e.target.value })}
                            style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#fde047', display: 'block', marginBottom: '6px' }}>Příprava</label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          {['Bez přípravy', 'Lehká', 'Složitá'].map((opt) => (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'white' }}>
                              <input
                                type="radio"
                                name="edit_preparation"
                                value={opt}
                                checked={(editGameForm.preparation ?? selectedGame.preparation) === opt}
                                onChange={(e) => setEditGameForm({ ...editGameForm, preparation: e.target.value })}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#fde047', display: 'block', marginBottom: '6px' }}>Vhodné prostředí</label>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {['Venku', 'Běhací', 'Dovnitř', 'Den', 'Noc'].map((envOpt) => {
                            const currentEnv = editGameForm.environment ?? selectedGame.environment ?? [];
                            const isChecked = Array.isArray(currentEnv) ? currentEnv.includes(envOpt) : String(currentEnv).includes(envOpt);
                            
                            return (
                              <label key={envOpt} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #374151', color: 'white' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    let updatedEnv = Array.isArray(currentEnv) ? [...currentEnv] : [currentEnv];
                                    if (isChecked) {
                                      updatedEnv = updatedEnv.filter(item => item !== envOpt);
                                    } else {
                                      updatedEnv.push(envOpt);
                                    }
                                    setEditGameForm({ ...editGameForm, environment: updatedEnv });
                                  }}
                                />
                                {envOpt}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#fde047', display: 'block', marginBottom: '4px' }}>💬 Poznámka / Vzkaz pro admina (např. požadavek na nové pole)</label>
                        <textarea
                          rows="2"
                          value={editGameForm.note ?? selectedGame.note ?? ''}
                          onChange={(e) => setEditGameForm({ ...editGameForm, note: e.target.value })}
                          placeholder="Napiš administrátorovi, co je potřeba upravit nebo přidat..."
                          style={{ width: '100%', padding: '8px 10px', backgroundColor: '#000', border: '1px solid #fde047', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px 16px', borderBottom: '1px solid rgba(245, 158, 11, 0.25)', paddingBottom: '16px' }}>
                      {selectedGame.players_count && <span>👥 <strong>Hráči:</strong> {selectedGame.players_count}</span>}
                      {selectedGame.duration && <span>⏱️ <strong>Délka:</strong> {selectedGame.duration}</span>}
                      {selectedGame.preparation && <span>🛠️ <strong>Příprava:</strong> {selectedGame.preparation}</span>}
                      {selectedGame.environment && (
                        <span>
                          📍 <strong>Prostředí:</strong> {typeof selectedGame.environment === 'string' ? selectedGame.environment.replace(/[\[\]"]/g, '') : selectedGame.environment}
                        </span>
                      )}
                      {selectedGame.equipment && <span>🎒 <strong>Pomůcky:</strong> {selectedGame.equipment}</span>}
                      {selectedGame.required_items && <span>🎒 <strong>S sebou:</strong> {selectedGame.required_items}</span>}

                      {selectedGame.custom_data && Object.keys(selectedGame.custom_data).length > 0 && (
                        Object.entries(selectedGame.custom_data).map(([key, val]) => (
                          val ? <span key={key}>🏷️ <strong>{key}:</strong> {val}</span> : null
                        ))
                      )}
                    </div>
                  )}
                  

                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fde047', marginBottom: '8px' }}>
                    Pravidla a popis hry:
                  </h4>
                  {isEditingGame ? (
                    <div style={{ marginBottom: '20px' }}>
                      <textarea
                        rows="6"
                        value={editGameForm.description ?? selectedGame.description}
                        onChange={(e) => setEditGameForm({ ...editGameForm, description: e.target.value })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px', color: 'white', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5' }}
                      />
                      <button
                        onClick={async () => {
                          const newTitleToCheck = editGameForm.title ?? selectedGame.title;
                          const normalizedEditTitle = newTitleToCheck.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

                          const { data: allGames } = await supabase.from('games').select('id, title');
                          const duplicate = allGames?.some(g => {
                            if (g.id === selectedGame.id) return false;
                            const norm = (g.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                            return norm === normalizedEditTitle;
                          });

                          if (duplicate) {
                            alert('⚠️ Hra s tímto názvem již v databázi existuje! Zvol prosím jiný název.');
                            return;
                          }

                          let updatedImageUrl = editGameForm.image_url ?? selectedGame.image_url ?? '';

                          if (editImageFile) {
                            const fileExt = editImageFile.name.split('.').pop();
                            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                            const filePath = `${fileName}`;

                            const { error: uploadError } = await supabase.storage
                              .from('game-image')
                              .upload(filePath, editImageFile);

                            if (uploadError) {
                              alert('Chyba při nahrávání obrázku: ' + uploadError.message);
                              return;
                            }

                            const { data: publicURLData } = supabase.storage
                              .from('game-image')
                              .getPublicUrl(filePath);

                            updatedImageUrl = publicURLData.publicUrl;
                          }

                          const updatePayload = {
                            ...editGameForm,
                            title: newTitleToCheck.trim(),
                            image_url: updatedImageUrl
                          };

                          const { error } = await supabase
                            .from('games')
                            .update(updatePayload)
                            .eq('id', selectedGame.id);

                          if (!error) {
                            setSelectedGame({ ...selectedGame, ...updatePayload });
                            setIsEditingGame(false);
                            setEditImageFile(null);
                            fetchGames();
                          } else {
                            alert('Chyba při ukládání: ' + error.message);
                          }
                        }}
                        style={{ marginTop: '10px', backgroundColor: '#059669', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', width: '100%' }}
                      >
                        💾 Uložit změny
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: '#d1d5db', fontSize: '14px', whiteSpace: 'pre-line', lineHeight: '1.6', margin: 0 }}>
                      {selectedGame.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
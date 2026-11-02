import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [pendingGames, setPendingGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [activeTab, setActiveTab] = useState('games');
  const [editingGameId, setEditingGameId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Stavy pro správu aktivního žebříčku a historie
  const [leaderboardTitle, setLeaderboardTitle] = useState('Podzim 2026');
  const [leaderboardEndsAt, setLeaderboardEndsAt] = useState('');
  const [activeLeaderboard, setActiveLeaderboard] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [pointInputs, setPointInputs] = useState({});

  useEffect(() => {
    fetchPendingGames();
    fetchCustomFields();
    fetchActiveLeaderboard();
    fetchHistory();
    if (profile?.role === 'admin') fetchUsers();
  }, [profile]);

  const fetchPendingGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setPendingGames(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role_requested', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const fetchCustomFields = async () => {
    const { data } = await supabase.from('custom_game_fields').select('*').order('created_at', { ascending: true });
    if (data) setCustomFields(data);
  };

  const fetchActiveLeaderboard = async () => {
    const { data } = await supabase
      .from('active_leaderboard')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveLeaderboard(data);
      setLeaderboardTitle(data.title || '');
      if (data.ends_at) {
        // Převedení ISO formátu na format pro datetime-local input
        const d = new Date(data.ends_at);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setLeaderboardEndsAt(d.toISOString().slice(0, 16));
      }
    }
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('leaderboard_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setHistoryList(data);
  };

  const handleApproveGame = async (gameId, newStatus) => {
    await supabase.from('games').update({ status: newStatus }).eq('id', gameId);
    fetchPendingGames();
  };

  const handleChangeRole = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole, role_requested: false }).eq('id', userId);
    fetchUsers();
  };

  const handleToggleBlock = async (userId, currentBlocked) => {
    await supabase.from('profiles').update({ is_blocked: !currentBlocked }).eq('id', userId);
    fetchUsers();
  };

  const handleUpdatePoints = async (userId, currentPoints, delta) => {
    const newPoints = Math.max(0, (currentPoints || 0) + delta);
    const { error } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
    } else {
      alert('Chyba při změně bodů: ' + error.message);
    }
  };

  const handleSaveAdminNote = async (userId, noteValue) => {
    await supabase.from('profiles').update({ admin_note: noteValue }).eq('id', userId);
    fetchUsers();
  };

  const handleSaveEditedGame = async (gameId) => {
    const { error } = await supabase
      .from('games')
      .update(editForm)
      .eq('id', gameId);

    if (!error) {
      setEditingGameId(null);
      fetchPendingGames();
    } else {
      alert('Chyba při ukládání úprav: ' + error.message);
    }
  };

  const handleAddCustomField = async (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const { error } = await supabase.from('custom_game_fields').insert([{ field_name: newFieldName.trim() }]);
    if (!error) {
      setNewFieldName('');
      fetchCustomFields();
    } else {
      alert('Chyba při přidávání pole: ' + error.message);
    }
  };

  const handleDeleteCustomField = async (id) => {
    if (!confirm('Opravdu chceš smazat toto pole?')) return;
    const { error } = await supabase.from('custom_game_fields').delete().eq('id', id);
    if (!error) fetchCustomFields();
  };

  // Uložení / Spuštění odpočtu pro aktuální kolo
  const handleSaveActiveLeaderboard = async () => {
    if (!leaderboardEndsAt) {
      alert('⚠️ Zvol prosím datum a čas ukončení.');
      return;
    }

    // Převedeme hodnotu z inputu (která je v lokálním čase) na standardní ISO řetězec správně
    const localDate = new Date(leaderboardEndsAt);

    await supabase.from('active_leaderboard').delete().neq('id', 0);

    const { error } = await supabase.from('active_leaderboard').insert([
      {
        title: leaderboardTitle || 'Sezónní žebříček',
        ends_at: localDate.toISOString(),
      },
    ]);

    if (!error) {
      alert('✅ Odpočet byl úspěšně spuštěn a uložen!');
      fetchActiveLeaderboard();
    } else {
      alert('Chyba při ukládání odpočtu: ' + error.message);
    }
  };

  // Uzavření žebříčku, uložení do historie, reset bodů a spuštění/aktualizace
  const handleCloseLeaderboard = async () => {
    if (!confirm(`Opravdu chceš uzavřít žebříček "${leaderboardTitle}", uložit výsledky do historie a VYNULOVAT BODY všem hráčům?`)) return;

    // 1. Načtení aktuálních uživatelů a jejich bodů pro snapshot
    const { data: currentUsers } = await supabase
      .from('profiles')
      .select('id, username, points')
      .order('points', { ascending: false });

    if (!currentUsers) return;

    // 2. Uložení aktuálních výsledků do historie
    const { error: historyError } = await supabase.from('leaderboard_history').insert([
      {
        title: leaderboardTitle || 'Ukončený žebříček',
        ends_at: leaderboardEndsAt || new Date().toISOString(),
        results: currentUsers,
      },
    ]);

    if (historyError) {
      alert('Chyba při ukládání historie: ' + historyError.message);
      return;
    }

    // 3. Vynulování bodů všem uživatelům v profiles
    const { error: resetError } = await supabase
      .from('profiles')
      .update({ points: 0 })
      .gte('points', 0);

    if (resetError) {
      alert('Chyba při vynulování bodů hráčů: ' + resetError.message);
      return;
    }

    alert('🎉 Žebříček byl uzavřen, výsledky uloženy do historie a body všem hráčům byly vynulovány na 0!');
    fetchHistory();
    fetchActiveLeaderboard();
    if (profile?.role === 'admin') fetchUsers();
  };

  const handleDeleteHistoryItem = async (id) => {
    if (!confirm('Opravdu chceš smazat tento záznam z historie?')) return;
    const { error } = await supabase.from('leaderboard_history').delete().eq('id', id);
    if (!error) fetchHistory();
  };

  const requestedUsersCount = users.filter((u) => u.role_requested || u.role === 'unassigned').length;

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
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', pointerEvents: 'none' }}></div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '32px 16px', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fde047', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
            Administrace & Moderace
          </h1>

          <button
            onClick={() => navigate('/')}
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(245, 158, 11, 0.5)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '13px' }}
          >
            ← Zpět na katalog
          </button>
        </div>

        {/* Záložky */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('games')}
            style={{
              paddingBottom: '10px',
              fontWeight: 'bold',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: activeTab === 'games' ? '#fde047' : '#9ca3af',
              borderBottom: activeTab === 'games' ? '2px solid #fde047' : '2px solid transparent'
            }}
          >
            Schvalování her ({pendingGames.length})
          </button>

          {profile?.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                style={{
                  paddingBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: activeTab === 'users' ? '#fde047' : '#9ca3af',
                  borderBottom: activeTab === 'users' ? '2px solid #fde047' : '2px solid transparent'
                }}
              >
                Správa uživatelů {requestedUsersCount > 0 && <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 6px', borderRadius: '9999px', fontSize: '11px', marginLeft: '4px' }}>{requestedUsersCount}</span>}
              </button>

              <button
                onClick={() => setActiveTab('points')}
                style={{
                  paddingBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: activeTab === 'points' ? '#fde047' : '#9ca3af',
                  borderBottom: activeTab === 'points' ? '2px solid #fde047' : '2px solid transparent'
                }}
              >
                Správa bodů
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                style={{
                  paddingBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: activeTab === 'leaderboard' ? '#fde047' : '#9ca3af',
                  borderBottom: activeTab === 'leaderboard' ? '2px solid #fde047' : '2px solid transparent'
                }}
              >
                Správa žebříčku
              </button>

              <button
                onClick={() => setActiveTab('fields')}
                style={{
                  paddingBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: activeTab === 'fields' ? '#fde047' : '#9ca3af',
                  borderBottom: activeTab === 'fields' ? '2px solid #fde047' : '2px solid transparent'
                }}
              >
                Políčka formuláře ({customFields.length})
              </button>
            </>
          )}
        </div>

        {/* 1. ZÁLOŽKA: Schvalování her */}
        {activeTab === 'games' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pendingGames.length === 0 ? (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: '32px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#d1d5db', margin: 0 }}>Žádné hry nečekají na schválení.</p>
              </div>
            ) : (
              pendingGames.map((game) => {
                const isEditing = editingGameId === game.id;
                return (
                  <div key={game.id} style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.title ?? game.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          style={{ fontSize: '18px', fontWeight: 'bold', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #fde047', borderRadius: '6px', color: 'white', padding: '6px 10px', width: '100%', maxWidth: '400px', fontFamily: 'inherit' }}
                        />
                      ) : (
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fde047', margin: 0 }}>{game.title}</h3>
                      )}

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(146, 64, 14, 0.8)', color: '#fde047', fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
                          Čeká na schválení
                        </span>

                        {!isEditing ? (
                          <button
                            onClick={() => {
                              setEditingGameId(game.id);
                              setEditForm(game);
                            }}
                            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}
                          >
                            ✏️ Upravit texty
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingGameId(null)}
                            style={{ backgroundColor: '#374151', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'inherit' }}
                          >
                            Zrušit úpravy
                          </button>
                        )}
                      </div>
                    </div>

                    {game.note && (
                      <div style={{ backgroundColor: 'rgba(180, 83, 9, 0.25)', border: '1px solid rgba(245, 158, 11, 0.7)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', color: '#fef3c7' }}>
                        <strong style={{ color: '#fde047' }}>💡 Vzkaz / Požadavek:</strong> {game.note}
                      </div>
                    )}

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', backgroundColor: 'rgba(17, 24, 39, 0.6)', padding: '16px', borderRadius: '10px', border: '1px solid #374151' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Počet hráčů</label>
                            <input
                              type="text"
                              value={editForm.players_count ?? game.players_count ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, players_count: e.target.value })}
                              style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Délka hry</label>
                            <input
                              type="text"
                              value={editForm.duration ?? game.duration ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                              style={{ width: '100%', padding: '6px 10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', fontFamily: 'inherit' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {game.players_count && <span>👥 {game.players_count}</span>}
                        {game.duration && <span>⏱️ {game.duration}</span>}
                        {game.preparation && <span>🛠️ {game.preparation}</span>}
                        {game.environment && (
                          <span>
                            📍 Prostředí: {typeof game.environment === 'string' ? game.environment.replace(/[\[\]"]/g, '') : game.environment}
                          </span>
                        )}
                        {game.equipment && <span>🎒 Pomůcky: {game.equipment}</span>}
                        {game.required_items && <span>🎒 S sebou: {game.required_items}</span>}
                      </div>
                    )}

                    {isEditing ? (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Pravidla a popis hry</label>
                        <textarea
                          rows="6"
                          value={editForm.description ?? game.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          style={{ width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px', color: 'white', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: '1.5' }}
                        />
                      </div>
                    ) : (
                      <p style={{ color: '#d1d5db', fontSize: '14px', whiteSpace: 'pre-line', lineHeight: '1.6', marginBottom: '20px' }}>
                        {game.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveEditedGame(game.id)}
                          style={{ backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                        >
                          💾 Uložit změny v textu
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleApproveGame(game.id, 'approved')}
                            style={{ backgroundColor: '#059669', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                          >
                            Schválit a publikovat
                          </button>
                          <button
                            onClick={() => handleApproveGame(game.id, 'rejected')}
                            style={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                          >
                            Zamítnout
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. ZÁLOŽKA: Správa uživatelů */}
        {activeTab === 'users' && profile?.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {users.map((u) => {
              let roleColor = '#ffffff';
              let borderColor = 'rgba(255, 255, 255, 0.3)';
              
              if (u.role === 'admin') {
                roleColor = '#22c55e';
                borderColor = '#22c55e';
              } else if (u.role === 'moderator') {
                roleColor = '#60a5fa';
                borderColor = '#60a5fa';
              } else if (u.role === 'reader' || u.role === 'ctenar') {
                roleColor = '#ffffff';
                borderColor = 'rgba(255, 255, 255, 0.4)';
              } else {
                roleColor = '#ef4444';
                borderColor = '#ef4444';
              }

              return (
                <div 
                  key={u.id} 
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.85)', 
                    padding: '16px 20px', 
                    borderRadius: '16px', 
                    border: `1px solid ${borderColor}`, 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flexGrow: 1 }}>
                      <span style={{ fontWeight: 'bold', fontSize: '18px', color: roleColor, minWidth: '100px' }}>
                        {u.username || 'Neznámý'}
                      </span>

                      <input
                        type="text"
                        defaultValue={u.admin_note || ''}
                        placeholder="poznámka"
                        onBlur={(e) => handleSaveAdminNote(u.id, e.target.value)}
                        style={{ padding: '6px 10px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: '160px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <select
                        value={u.role || 'unassigned'}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        style={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: `1px solid ${borderColor}`, borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: roleColor, outline: 'none', fontFamily: 'inherit', fontWeight: 'bold' }}
                      >
                        <option value="unassigned" style={{ color: '#ef4444' }}>Nezařazen</option>
                        <option value="reader" style={{ color: '#ffffff' }}>Čtenář</option>
                        <option value="moderator" style={{ color: '#60a5fa' }}>Moderátor</option>
                        <option value="admin" style={{ color: '#22c55e' }}>Admin</option>
                      </select>

                      <button
                        onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          border: 'none',
                          color: 'white',
                          backgroundColor: u.is_blocked ? '#059669' : '#dc2626',
                          fontFamily: 'inherit'
                        }}
                      >
                        {u.is_blocked ? 'Odblokovat' : 'Zablokovat'}
                      </button>
                    </div>
                  </div>

                  {u.role === 'unassigned' && u.request_note && (
                    <div style={{ backgroundColor: 'rgba(180, 83, 9, 0.25)', border: '1px solid rgba(245, 158, 11, 0.7)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#fef3c7' }}>
                      <strong style={{ color: '#fde047' }}>💬 Vzkaz od uživatele při registraci:</strong> {u.request_note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. ZÁLOŽKA: Správa bodů */}
        {activeTab === 'points' && profile?.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {users.map((u) => {
              const amount = parseInt(pointInputs[u.id] || '0', 10);

              return (
                <div 
                  key={u.id} 
                  style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'white', marginRight: '16px' }}>
                      {u.username || 'Neznámý'}
                    </span>
                    <span style={{ color: '#fde047', fontSize: '15px' }}>
                      Bodů: <strong>{u.points || 0}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Počet bodů"
                      value={pointInputs[u.id] ?? ''}
                      onChange={(e) => setPointInputs({ ...pointInputs, [u.id]: e.target.value })}
                      style={{
                        width: '90px',
                        padding: '6px 10px',
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />

                    <button
                      onClick={() => {
                        if (!amount || isNaN(amount)) return;
                        handleUpdatePoints(u.id, u.points, -amount);
                        setPointInputs({ ...pointInputs, [u.id]: '' });
                      }}
                      style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                    >
                      - Odečíst
                    </button>

                    <button
                      onClick={() => {
                        if (!amount || isNaN(amount)) return;
                        handleUpdatePoints(u.id, u.points, amount);
                        setPointInputs({ ...pointInputs, [u.id]: '' });
                      }}
                      style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                    >
                      + Přičíst
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. ZÁLOŽKA: Správa žebříčku a historie */}
        {activeTab === 'leaderboard' && profile?.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fde047', marginBottom: '12px' }}>Nastavení nového kola / odpočtu</h3>
              <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
                Zadej název kola a datum a čas konce. Tím se spustí živý odpočet v katalogu pro všechny hráče.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '450px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Název žebříčku / Sezóny</label>
                  <input
                    type="text"
                    value={leaderboardTitle}
                    onChange={(e) => setLeaderboardTitle(e.target.value)}
                    placeholder="např. Podzim 2026"
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px' }}>Konec platnosti (datum a čas)</label>
                  <input
                    type="datetime-local"
                    value={leaderboardEndsAt}
                    onChange={(e) => setLeaderboardEndsAt(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '6px', outline: 'none', color: 'white', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <button
                    onClick={handleSaveActiveLeaderboard}
                    style={{ backgroundColor: '#059669', color: 'white', fontWeight: 'bold', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', flexGrow: 1 }}
                  >
                    ▶️ Uložit a spustit odpočet
                  </button>

                  <button
                    onClick={handleCloseLeaderboard}
                    style={{ backgroundColor: '#d97706', color: 'white', fontWeight: 'bold', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', flexGrow: 1 }}
                  >
                    🔒 Uzavřít a smazat/uložit do historie
                  </button>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fde047', marginTop: '12px' }}>Archivovaná historie žebříčků</h3>
            {historyList.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Zatím nebyl uložen žádný historický žebříček.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {historyList.map((item) => (
                  <div key={item.id} style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fde047', margin: 0 }}>{item.title}</h4>
                      <button
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}
                      >
                        Smazat archiv
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                      Ukončeno: {new Date(item.created_at).toLocaleDateString('cs-CZ')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Array.isArray(item.results) && item.results.map((res, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span>{idx + 1}. {res.username || 'Neznámý'}</span>
                          <span style={{ color: '#fde047' }}>{res.points || 0} bodů</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. ZÁLOŽKA: Políčka formuláře */}
        {activeTab === 'fields' && profile?.role === 'admin' && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fde047', marginBottom: '8px' }}>Přidat nové dynamické pole</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>Zadaný název se automaticky objeví jako textové políčko ve formuláři pro přidání hry.</p>
            
            <form onSubmit={handleAddCustomField} style={{ display: 'flex', gap: '12px', maxWidth: '450px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <input
                type="text"
                required
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="např. Doporučené oblečení"
                style={{ flexGrow: 1, padding: '10px 14px', backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid #374151', borderRadius: '8px', outline: 'none', color: 'white', fontFamily: 'inherit', fontSize: '14px' }}
              />
              <button
                type="submit"
                style={{ backgroundColor: '#d97706', color: 'white', fontWeight: 'bold', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}
              >
                + Přidat pole
              </button>
            </form>

            <h4 style={{ fontWeight: 'bold', fontSize: '15px', color: '#fde047', marginBottom: '12px' }}>Aktivní dynamická pole:</h4>
            {customFields.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Zatím nebyla přidána žádná vlastní pole.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '450px' }}>
                {customFields.map((field) => (
                  <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(17, 24, 39, 0.9)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #374151', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>{field.field_name}</span>
                    <button
                      onClick={() => handleDeleteCustomField(field.id)}
                      style={{ fontSize: '12px', backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' }}
                    >
                      Smazat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
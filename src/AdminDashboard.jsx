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

  useEffect(() => {
    fetchPendingGames();
    fetchCustomFields();
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

  // Uložení soukromé poznámky administrátora
  const handleSaveAdminNote = async (userId, noteValue) => {
    await supabase.from('profiles').update({ admin_note: noteValue }).eq('id', userId);
    fetchUsers();
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
              pendingGames.map((game) => (
                <div key={game.id} style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fde047', margin: 0 }}>{game.title}</h3>
                    <span style={{ backgroundColor: 'rgba(146, 64, 14, 0.8)', color: '#fde047', fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
                      Čeká na schválení
                    </span>
                  </div>

                  {game.note && (
                    <div style={{ backgroundColor: 'rgba(180, 83, 9, 0.25)', border: '1px solid rgba(245, 158, 11, 0.7)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', color: '#fef3c7' }}>
                      <strong style={{ color: '#fde047' }}>💡 Úkol / Poznámka od uživatele:</strong> {game.note}
                    </div>
                  )}

                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {game.players_count && <span>👥 {game.players_count}</span>}
                    {game.duration && <span>⏱️ {game.duration}</span>}
                    {game.preparation && <span>🛠️ {game.preparation}</span>}
                    {game.environment?.length > 0 && <span>📍 {game.environment.join(', ')}</span>}
                    {game.equipment && <span>🎒 Pomůcky: {game.equipment}</span>}
                    {game.required_items && <span>🎒 S sebou: {game.required_items}</span>}
                  </div>

                  <p style={{ color: '#d1d5db', fontSize: '14px', whiteSpace: 'pre-line', lineHeight: '1.6', marginBottom: '20px' }}>
                    {game.description}
                  </p>

                  <div style={{ display: 'flex', gap: '12px' }}>
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
                  </div>
                </div>
              ))
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
                roleColor = '#22c55e'; // Zelená
                borderColor = '#22c55e';
              } else if (u.role === 'moderator') {
                roleColor = '#60a5fa'; // Modrá
                borderColor = '#60a5fa';
              } else if (u.role === 'reader' || u.role === 'ctenar') {
                roleColor = '#ffffff'; // Bílá
                borderColor = 'rgba(255, 255, 255, 0.4)';
              } else {
                roleColor = '#ef4444'; // Červená pro nezařazeného
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
                  {/* PRVNÍ ŘÁDEK: Jméno, poznámka, select role a tlačítko zablokovat */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flexGrow: 1 }}>
                      <span style={{ fontWeight: 'bold', fontSize: '18px', color: roleColor, minWidth: '100px' }}>
                        {u.username || 'Neznámý'}
                      </span>

                      {/* Úzké políčko pro poznámku vedle jména */}
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

                  {/* DRUHÝ ŘÁDEK: Vzkaz od uživatele (zobrazuje se POUZE pokud je nezařazený) */}
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

        {/* 3. ZÁLOŽKA: Políčka formuláře */}
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
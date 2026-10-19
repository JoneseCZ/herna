import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [pendingGames, setPendingGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('games');

  useEffect(() => {
    fetchPendingGames();
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
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const handleApproveGame = async (gameId, newStatus) => {
    await supabase.from('games').update({ status: newStatus }).eq('id', gameId);
    fetchPendingGames();
  };

  const handleChangeRole = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchUsers();
  };

  const handleToggleBlock = async (userId, currentBlocked) => {
    await supabase.from('profiles').update({ is_blocked: !currentBlocked }).eq('id', userId);
    fetchUsers();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Administrace & Moderace</h1>

      {/* Záložky */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('games')}
          className={`pb-3 font-semibold text-sm transition border-b-2 ${
            activeTab === 'games'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Schvalování her ({pendingGames.length})
        </button>

        {profile?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 font-semibold text-sm transition border-b-2 ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Správa uživatelů
          </button>
        )}
      </div>

      {/* Záložka: Ke schválení */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          {pendingGames.length === 0 ? (
            <p className="text-slate-500 italic">Žádné hry nečekají na schválení.</p>
          ) : (
            pendingGames.map((game) => (
              <div key={game.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-800">{game.title}</h3>
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded">Čeká</span>
                </div>
                <p className="text-slate-600 text-sm mb-4">{game.description}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveGame(game.id, 'approved')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Schválit
                  </button>
                  <button
                    onClick={() => handleApproveGame(game.id, 'rejected')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Zamítnout
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Záložka: Správa uživatelů */}
      {activeTab === 'users' && profile?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">Uživatel</th>
                <th className="p-4">Role</th>
                <th className="p-4">Stav</th>
                <th className="p-4">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-4 font-semibold">{u.username}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs outline-none"
                    >
                      <option value="reader">Čtenář</option>
                      <option value="moderator">Moderátor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4">
                    {u.is_blocked ? (
                      <span className="text-red-600 font-bold text-xs">Blokován</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold text-xs">Aktivní</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                      className={`text-xs px-3 py-1 rounded font-semibold text-white ${
                        u.is_blocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {u.is_blocked ? 'Odblokovat' : 'Zablokovat'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
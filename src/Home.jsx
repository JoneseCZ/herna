import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

export default function Home() {
  const { user, profile } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulář pro novou hru
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minAge, setMinAge] = useState(3);
  const [maxAge, setMaxAge] = useState(10);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error) setGames(data);
    setLoading(false);
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    setMsg('');

    const { error } = await supabase.from('games').insert([
      {
        title,
        description,
        min_age: Number(minAge),
        max_age: maxAge ? Number(maxAge) : null,
        created_by: user.id,
        status: 'pending', // Čeká na schválení moderátorem/adminem
      },
    ]);

    if (error) {
      setMsg('Chyba při ukládání: ' + error.message);
    } else {
      setMsg('Hra byla odeslána ke schválení moderátorovi!');
      setTitle('');
      setDescription('');
      setShowForm(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Katalog dětských her</h1>
          <p className="text-slate-600 text-sm mt-1">
            Prohlížej schválené hry nebo přidej svou vlastní nápaditou hru.
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg shadow transition text-sm w-full sm:w-auto"
          >
            {showForm ? 'Zavřít formulář' : '+ Přidat novou hru'}
          </button>
        )}
      </div>

      {msg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 mb-6 text-sm">
          {msg}
        </div>
      )}

      {/* Formulář pro přidání hry */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Navrhni novou hru</h2>
          <form onSubmit={handleAddGame} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Název hry</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="např. Na schovávanou"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min. věk</label>
                <input
                  type="number"
                  min="1"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max. věk</label>
                <input
                  type="number"
                  min="1"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pravidla a popis hry</label>
              <textarea
                required
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Popiš pravidla hry..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg shadow transition"
            >
              Odeslat hru ke schválení
            </button>
          </form>
        </div>
      )}

      {/* Seznam her */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Načítám hry...</div>
      ) : games.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">Zatím nebyly schváleny žádné hry. Budeš první, kdo nějakou přidá?</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-slate-800">{game.title}</h3>
                  <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-100">
                    {game.min_age} - {game.max_age || '∞'} let
                  </span>
                </div>
                <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed mb-4">
                  {game.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        // --- REGISTRACE ---
        // 1. Kontrola, zda už jméno neexistuje
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          throw new Error('Toto uživatelské jméno je již obsazené. Vyber jiné.');
        }

        // 2. Registrace do Supabase Auth (e-mail + heslo + jméno v metadatech)
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        if (error) throw error;

        setMessage('Registrace proběhla úspěšně! Nyní se můžeš přihlásit.');
        setIsSignUp(false);
      } else {
        // --- PŘIHLÁŠENÍ POMOCÍ UŽIVATELSKÉHO JMÉNA ---
        // 1. Zavoláme naši SQL funkci, která nám k zadanému jménu vrátí e-mail
        const { data: userEmail, error: rpcError } = await supabase
          .rpc('get_email_by_username', { p_username: username });

        if (rpcError) throw rpcError;
        if (!userEmail) {
          throw new Error('Uživatelské jméno neexistuje.');
        }

        // 2. Přihlášení pomocí získaného e-mailu a zadaného hesla
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password,
        });

        if (loginError) throw loginError;

        // Přesměrování na hlavní stránku
        navigate('/');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Něco se nepovedlo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-slate-800 mb-2">
          🎲 Herna
        </h1>
        <p className="text-center text-slate-500 mb-6 text-sm sm:text-base">
          {isSignUp ? 'Vytvoř si nový účet' : 'Přihlas se ke svému účtu'}
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
            {errorMsg}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 border border-green-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Uživatelské jméno
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="např. Pepa"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-mail (pro případ ztráty hesla)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vás@email.cz"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Heslo
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 shadow-md disabled:opacity-50"
          >
            {loading
              ? 'Zpracovávám...'
              : isSignUp
              ? 'Zaregistrovat se'
              : 'Přihlásit se'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? (
            <p>
              Již máš účet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                  setMessage('');
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Přihlas se
              </button>
            </p>
          ) : (
            <p>
              Nemáš ještě účet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                  setMessage('');
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Zaregistruj se
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
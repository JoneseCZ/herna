import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          throw new Error('Toto uživatelské jméno je již obsazené.');
        }

        const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      username: username, // Tímto se hodnota předá do raw_user_meta_data v Supabase
    },
  },
});

        if (error) throw error;
        setMessage('Registrace proběhla úspěšně! Nyní se můžeš přihlásit.');
        setIsSignUp(false);
      } else {
        const { data: userEmail, error: rpcError } = await supabase
          .rpc('get_email_by_username', { p_username: username });

        if (rpcError) throw rpcError;
        if (!userEmail) throw new Error('Uživatelské jméno neexistuje.');

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password,
        });

        if (loginError) throw loginError;
        navigate('/');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Něco se nepovedlo.');
    } finally {
      setLoading(false);
    }
  };

  // Styl pro černý text s bílým obtažením
  const blackWithWhiteStroke = {
    color: '#000000',
    fontWeight: 'bold',
    textShadow: `
      -1px -1px 0 #ffffff,  
       1px -1px 0 #ffffff,
      -1px  1px 0 #ffffff,
       1px  1px 0 #ffffff,
       0px  2px 4px rgba(255,255,255,0.8)
    `
  };

  // Styl pro čistě bílý tučný odkaz s obtažením
  const whiteBoldLink = {
    color: '#ffffff',
    fontWeight: 'bold',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'inherit',
    fontSize: '14px',
    textShadow: `
      -1px -1px 0 #000000,  
       1px -1px 0 #000000,
      -1px  1px 0 #000000,
       1px  1px 0 #000000,
       0px  2px 4px rgba(0,0,0,0.9)
    `
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif"
      }}
    >
      {/* Znak BVÚ - pevně vpravo nahoře */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 50 }}>
        <img 
          src="/logo-bvu.png" 
          alt="Znak BVÚ" 
          style={{ width: '85px', height: 'auto', borderRadius: '8px' }}
        />
      </div>

      {/* Formulář */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '300px', margin: '16px', padding: '16px', color: 'white' }}>
        {/* Nadpis posunutý výše */}
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', color: '#fde047', marginTop: '-35px', marginBottom: '52px', textShadow: '0 3px 6px rgba(0,0,0,0.9)' }}>
          Databáze her
        </h1>
        
      
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(127, 29, 29, 0.9)', color: '#fecaca', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        {message && (
          <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.9)', color: '#a7f3d0', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px', textAlign: 'center', textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}>Uživatelské jméno</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="např. Pepa"
              style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>

          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px', textAlign: 'center', textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}>E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vás@email.cz"
                style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#fde047', marginBottom: '4px', textAlign: 'center', textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}>Heslo</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: '6px', outline: 'none', color: 'white', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', backgroundColor: '#d97706', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', marginTop: '6px', fontFamily: 'inherit', fontSize: '15px', textShadow: '0 1px 2px rgba(0,0,0,0.5)', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Zpracovávám...' : isSignUp ? 'Zaregistrovat se' : 'Přihlásit se'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', ...blackWithWhiteStroke }}>
          {isSignUp ? (
            <p>
              Již máš účet?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); setMessage(''); }}
                style={whiteBoldLink}
              >
                Přihlas se
              </button>
            </p>
          ) : (
            <p>
              Nemáš ještě účet?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); setMessage(''); }}
                style={whiteBoldLink}
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
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Okamžitá kontrola URL hash parametrů při načtení (recovery token z e-mailu)
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
      sessionStorage.setItem('reset_password_mode', 'true');
    }

    // 2. Posluchač změn stavu přihlášení Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('reset_password_mode', 'true');
      }
      
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // 3. Načtení počáteční session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentUser) => {
    if (!currentUser || !currentUser.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.is_blocked) {
        alert('Tento účet byl zablokován.');
        await supabase.auth.signOut();
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Chyba při načítání profilu:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
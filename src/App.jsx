import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Home from './Home';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import ProtectedRoute from './ProtectedRoute';
import { supabase } from './supabaseClient';

function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Zkontrolujeme URL hash hned při načtení Layoutu
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      sessionStorage.setItem('reset_password_mode', 'true');
    }

    // 2. Posluchač pro Supabase událost změny hesla
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('reset_password_mode', 'true');
        navigate('/'); // Zajistí, že uživatel bude na hlavní stránce, kde se okno otevře
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['moderator', 'admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
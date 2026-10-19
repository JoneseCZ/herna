import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';

export default function Navbar() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">Admin</span>;
      case 'moderator':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">Moderátor</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">Čtenář</span>;
    }
  };

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            🎲 <span className="text-indigo-400">Herna</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-indigo-300 font-medium">
              Katalog her
            </Link>

            {(profile?.role === 'moderator' || profile?.role === 'admin') && (
              <Link to="/admin" className="hover:text-indigo-300 font-medium text-amber-300">
                Správa her & Uživatelé
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3 bg-slate-700 px-3 py-1.5 rounded-lg">
                <span className="text-sm font-semibold">{profile?.username || 'Uživatel'}</span>
                {profile && getRoleBadge(profile.role)}
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-xs px-3 py-1 rounded transition"
                >
                  Odhlásit
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-sm transition"
              >
                Přihlásit se
              </Link>
            )}
          </div>

          {/* Tlačítko pro mobilní menu */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-300 hover:text-white p-2 rounded-md focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobilní Rozbalovací Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 px-4 pt-2 pb-4 space-y-3 border-t border-slate-700">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-base font-medium hover:text-indigo-300"
          >
            Katalog her
          </Link>

          {(profile?.role === 'moderator' || profile?.role === 'admin') && (
            <Link
              to="/admin"
              onClick={() => setIsOpen(false)}
              className="block py-2 text-base font-medium text-amber-300 hover:text-amber-200"
            >
              Správa her & Uživatelé
            </Link>
          )}

          {user ? (
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-200">{profile?.username}</span>
                {profile && getRoleBadge(profile.role)}
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="w-full text-left bg-red-600 hover:bg-red-700 py-2 px-3 rounded text-sm font-medium transition"
              >
                Odhlásit se
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 py-2 rounded font-medium text-sm"
            >
              Přihlásit se
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
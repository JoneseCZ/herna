import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Načítání...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700 p-4">
        <div className="bg-white p-6 rounded-xl shadow-md text-center max-w-sm">
          <h2 className="text-xl font-bold text-red-600 mb-2">Přístup odepřen</h2>
          <p>K této stránce nemáš dostatečná oprávnění.</p>
        </div>
      </div>
    );
  }

  return children;
}
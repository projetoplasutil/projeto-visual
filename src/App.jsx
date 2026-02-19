import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Products from './pages/Products';
import ResetPassword from './pages/ResetPassword';
import CreateLine from './pages/CreateLine';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Checar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Escutar mudanças na auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        if (event === 'PASSWORD_RECOVERY') {
          // Mantém o estado de recuperação para redirecionar
          window.location.href = '/reset-password';
        }
      }
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error) setProfile(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando sistema...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {session && (
          <Sidebar
            userRole={profile?.role || 'user'}
            onLogout={handleLogout}
          />
        )}

        <main style={{ flex: 1 }}>
          <Routes>
            <Route
              path="/login"
              element={!session ? <Login /> : <Navigate to="/dashboard" />}
            />

            <Route
              path="/dashboard"
              element={session ? <Dashboard /> : <Navigate to="/login" />}
            />

            <Route
              path="/reports"
              element={profile?.role === 'master' ? <Reports /> : <Navigate to="/dashboard" />}
            />

            <Route
              path="/products"
              element={session ? <Products /> : <Navigate to="/login" />}
            />

            <Route
              path="/create-line"
              element={session ? <CreateLine /> : <Navigate to="/login" />}
            />

            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

            <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

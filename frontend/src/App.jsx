import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Aprovacoes from './pages/Aprovacoes';
import Ciclos from './pages/Ciclos';
import Lancamentos from './pages/Lancamentos';
import LancamentoForm from './pages/LancamentoForm';
import Metas from './pages/Metas';
import MetaForm from './pages/MetaForm';
import Perfil from './pages/Perfil';
import ResultadoPPR from './pages/ResultadoPPR';
import Setores from './pages/Setores';
import Usuarios from './pages/Usuarios';

function PrivateRoute({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="p-8">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" />;
  return children;
}

function RoutesApp() {
  const { usuario } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="aprovacoes" element={<Aprovacoes />} />
        <Route path="ciclos" element={<Ciclos />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="lancamentos/novo" element={<LancamentoForm />} />
        <Route path="lancamentos/novo/:metaId" element={<LancamentoForm />} />
        <Route path="metas" element={<Metas />} />
        <Route path="metas/nova" element={<MetaForm />} />
        <Route path="metas/editar/:id" element={<MetaForm />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="resultado-ppr" element={<ResultadoPPR />} />
        <Route path="setores" element={<Setores />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <RoutesApp />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
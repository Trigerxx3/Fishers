import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewBill from './pages/NewBill';
import BillBook from './pages/BillBook';
import BillDetail from './pages/BillDetail';
import PrintBill from './pages/PrintBill';
import Invoice from './pages/Invoice';
import Parties from './pages/Parties';
import PartyDetail from './pages/PartyDetail';
import PartyLedger from './pages/PartyLedger';
import Payments from './pages/Payments';
import Items from './pages/Items';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppWithLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontSize: 13.5, fontFamily: 'Inter, sans-serif', maxWidth: 380 },
          success: { iconTheme: { primary: '#0a7c42', secondary: '#fff' } },
          error: { iconTheme: { primary: '#c0392b', secondary: '#fff' } },
        }} />
        <Routes>
          {/* Login - no layout */}
          <Route path="/login" element={<Login />} />

          {/* Print/Invoice routes - no sidebar layout */}
          <Route path="/bills/:id/print" element={<ProtectedRoute><PrintBill /></ProtectedRoute>} />
          <Route path="/bills/:id/invoice" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />

          {/* App routes with sidebar layout */}
          <Route path="/" element={<AppWithLayout><Dashboard /></AppWithLayout>} />
          <Route path="/bills" element={<AppWithLayout><BillBook /></AppWithLayout>} />
          <Route path="/bills/new" element={<AppWithLayout><NewBill /></AppWithLayout>} />
          <Route path="/bills/:id" element={<AppWithLayout><BillDetail /></AppWithLayout>} />
          <Route path="/bills/:id/edit" element={<AppWithLayout><NewBill /></AppWithLayout>} />
          <Route path="/parties" element={<AppWithLayout><Parties /></AppWithLayout>} />
          <Route path="/parties/:id" element={<AppWithLayout><PartyDetail /></AppWithLayout>} />
          <Route path="/parties/:id/ledger" element={<AppWithLayout><PartyLedger /></AppWithLayout>} />
          <Route path="/payments" element={<AppWithLayout><Payments /></AppWithLayout>} />
          <Route path="/items" element={<AppWithLayout><Items /></AppWithLayout>} />
          <Route path="/reports" element={<AppWithLayout><Reports /></AppWithLayout>} />
          <Route path="/settings" element={<AppWithLayout><Settings /></AppWithLayout>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

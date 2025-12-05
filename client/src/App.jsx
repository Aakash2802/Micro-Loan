// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Admin/Officer Pages
import AdminDashboard from './pages/AdminDashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import LoanProductList from './pages/LoanProductList';
import LoanProductForm from './pages/LoanProductForm';
import LoanAccountCreate from './pages/LoanAccountCreate';
import LoanAccountDetail from './pages/LoanAccountDetail';
import LoanAccountList from './pages/LoanAccountList';
import LoanApplicationList from './pages/LoanApplicationList';

// Customer Pages
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerProfile from './pages/CustomerProfile';
import LoanProducts from './pages/customer/LoanProducts';
import LoanApply from './pages/customer/LoanApply';
import MyApplications from './pages/customer/MyApplications';
import CustomerLoanDetail from './pages/customer/LoanDetail';
import PayEMI from './pages/customer/PayEMI';
import AutoDebit from './pages/customer/AutoDebit';

// Common Pages
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';

// Public Pages
import LoanCalculator from './pages/LoanCalculator';

// Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard
    if (user?.role === 'customer') {
      return <Navigate to="/dashboard/customer" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (user?.role === 'customer') {
      return <Navigate to="/dashboard/customer" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Public Pages (no auth required) */}
      <Route path="/loan-calculator" element={<LoanCalculator />} />

      {/* Admin/Officer Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'officer']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="loan-products" element={<LoanProductList />} />
        <Route path="loan-products/new" element={<LoanProductForm />} />
        <Route path="loan-products/:id/edit" element={<LoanProductForm />} />
        <Route path="loans" element={<LoanAccountList />} />
        <Route path="loans/new" element={<LoanAccountCreate />} />
        <Route path="loans/:id" element={<LoanAccountDetail />} />
        <Route path="applications" element={<LoanApplicationList />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<HelpSupport />} />
      </Route>

      {/* Customer Routes */}
      <Route
        path="/dashboard/customer"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="loan-products" element={<LoanProducts />} />
        <Route path="apply-loan" element={<LoanApply />} />
        <Route path="my-applications" element={<MyApplications />} />
        <Route path="pay-emi" element={<PayEMI />} />
        <Route path="auto-debit" element={<AutoDebit />} />
        <Route path="loans/:id" element={<CustomerLoanDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<HelpSupport />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

// client/src/test/utils.jsx
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

// Custom render with providers
const AllProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Mock user data
export const mockAdmin = {
  _id: '1',
  name: 'Admin User',
  email: 'admin@loansphere.com',
  role: 'admin',
};

export const mockOfficer = {
  _id: '2',
  name: 'Officer User',
  email: 'officer@loansphere.com',
  role: 'officer',
};

export const mockCustomer = {
  _id: '3',
  name: 'Customer User',
  email: 'customer@loansphere.com',
  role: 'customer',
};

// Mock loan data
export const mockLoan = {
  _id: 'loan1',
  accountNumber: 'LN-2024-001',
  customerId: {
    _id: 'cust1',
    fullName: 'John Doe',
    phone: '9876543210',
  },
  productId: {
    _id: 'prod1',
    name: 'Personal Loan',
    code: 'PL',
  },
  principal: 100000,
  interestRate: 12,
  tenure: 12,
  outstandingAmount: 85000,
  status: 'active',
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock API response helper
export const createApiResponse = (data, success = true) => ({
  data: {
    success,
    data,
  },
});

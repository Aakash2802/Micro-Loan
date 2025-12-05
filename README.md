# LoanSphere - Micro Loan / EMI Management System

A complete, production-quality FinTech application for managing micro loans, EMI schedules, payments, and customer KYC.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [EMI Calculation Formula](#emi-calculation-formula)
- [Credit Score Algorithm](#credit-score-algorithm)
- [Razorpay Integration Guide](#razorpay-integration-guide)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)

---

## Overview

LoanSphere is a comprehensive loan management system designed for microfinance institutions, NBFCs, and lending businesses. It provides:

- **Admin Portal**: Full control over customers, loan products, and loan accounts
- **Customer Portal**: Self-service dashboard for borrowers to view loans and payment history
- **EMI Management**: Automatic schedule generation with reducing balance calculation
- **Payment Tracking**: Record payments with automatic late penalty calculation
- **Credit Scoring**: Heuristic-based risk assessment for loan decisions
- **PDF Reports**: Generate loan statements and EMI receipts

---

## Features

### For Admin/Loan Officers
- Customer onboarding with KYC verification
- Loan product configuration (rates, tenure, fees)
- Loan disbursement and approval workflow
- Payment recording with penalty calculation
- Dashboard with analytics and charts
- Export reports to CSV/PDF

### For Customers
- View active loans and payment history
- Track EMI schedule and upcoming dues
- Download loan statements
- Profile management

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM for MongoDB |
| JWT | Authentication |
| bcrypt | Password hashing |
| PDFKit | PDF generation |
| express-validator | Request validation |
| Helmet | Security headers |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI library |
| Vite | Build tool |
| TailwindCSS | Styling |
| React Router v6 | Routing |
| Axios | HTTP client |
| Recharts | Charts |
| react-hot-toast | Notifications |
| date-fns | Date formatting |

---

## Project Structure

```
Micro Loan/
├── server/                    # Backend
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── models/           # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Customer.js
│   │   │   ├── LoanProduct.js
│   │   │   ├── LoanAccount.js
│   │   │   ├── EMI.js
│   │   │   └── AuditLog.js
│   │   ├── controllers/      # Route handlers
│   │   ├── routes/           # API routes
│   │   ├── middlewares/      # Auth, error handling
│   │   ├── utils/            # EMI calculator, PDF generator
│   │   └── index.js          # Server entry point
│   ├── package.json
│   └── .env.example
│
├── client/                    # Frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── context/          # Auth context
│   │   ├── services/         # API services
│   │   └── utils/            # Formatters
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or yarn

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Micro Loan"
```

### 2. Setup Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your MongoDB URI and JWT secret
# MONGO_URI=mongodb://localhost:27017/loansphere
# JWT_SECRET=your-super-secret-key-change-in-production
# JWT_EXPIRES_IN=7d

# Run seed script (creates demo data)
npm run seed

# Start development server
npm run dev
```

The backend will start at `http://localhost:5000`

### 3. Setup Frontend

```bash
# Navigate to client directory (from project root)
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

### 4. Access the Application

Open `http://localhost:5173` in your browser and login with demo credentials.

---

## API Endpoints

### Authentication
```
POST   /api/auth/register     # Register new user
POST   /api/auth/login        # Login
GET    /api/auth/me           # Get current user
POST   /api/auth/logout       # Logout
PUT    /api/auth/password     # Change password
```

### Customers
```
GET    /api/customers                 # List all customers (paginated)
GET    /api/customers/:id             # Get customer by ID
POST   /api/customers                 # Create customer
PUT    /api/customers/:id             # Update customer
PATCH  /api/customers/:id/kyc-status  # Update KYC status
DELETE /api/customers/:id             # Delete customer
GET    /api/customers/me/profile      # Get own profile (customer)
```

### Loan Products
```
GET    /api/loan-products             # List all products
GET    /api/loan-products/:id         # Get product by ID
POST   /api/loan-products             # Create product (admin)
PUT    /api/loan-products/:id         # Update product (admin)
DELETE /api/loan-products/:id         # Delete product (admin)
```

### Loan Accounts
```
GET    /api/loan-accounts             # List all loans (paginated)
GET    /api/loan-accounts/:id         # Get loan by ID
POST   /api/loan-accounts             # Create loan
PATCH  /api/loan-accounts/:id/approve # Approve loan
PATCH  /api/loan-accounts/:id/disburse# Disburse loan
GET    /api/loan-accounts/:id/emis    # Get EMI schedule
GET    /api/loan-accounts/me/loans    # Get own loans (customer)
POST   /api/loan-accounts/preview-emi # Preview EMI schedule
```

### Payments
```
GET    /api/payments                  # List all payments
GET    /api/payments/:id              # Get payment by ID
POST   /api/payments                  # Record payment
POST   /api/payments/bulk             # Record bulk payment
```

### Reports
```
GET    /api/reports/dashboard         # Dashboard statistics
GET    /api/reports/collection        # Collection report
GET    /api/reports/overdue           # Overdue loans report
GET    /api/reports/loan-statement/:id# Generate loan statement PDF
```

### Example API Calls

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@loansphere.com", "password": "Admin@123"}'
```

**Create Loan:**
```bash
curl -X POST http://localhost:5000/api/loan-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customerId": "...",
    "productId": "...",
    "principal": 50000,
    "tenure": 12,
    "purpose": "Business expansion"
  }'
```

---

## EMI Calculation Formula

LoanSphere uses the **Reducing Balance Method** (also known as the diminishing balance method) for EMI calculation, which is the industry standard for most loans.

### Formula

```
EMI = [P × R × (1+R)^N] / [(1+R)^N – 1]
```

Where:
- **P** = Principal loan amount
- **R** = Monthly interest rate (Annual rate / 12 / 100)
- **N** = Loan tenure in months

### Example Calculation

For a loan of ₹1,00,000 at 12% annual interest for 12 months:

```
P = 100000
R = 12 / 12 / 100 = 0.01 (1% per month)
N = 12

EMI = [100000 × 0.01 × (1.01)^12] / [(1.01)^12 – 1]
EMI = [100000 × 0.01 × 1.1268] / [1.1268 – 1]
EMI = 1126.83 / 0.1268
EMI = ₹8,884.88
```

### Amortization Schedule

Each month, the EMI is split into:
- **Interest Component**: Outstanding Balance × Monthly Rate
- **Principal Component**: EMI - Interest Component

The principal component increases each month while the interest component decreases.

### Code Reference

See `server/src/utils/emiCalculator.js` for the implementation:

```javascript
const calculateEMI = (principal, annualRate, tenureMonths) => {
  const monthlyRate = annualRate / 12 / 100;

  if (monthlyRate === 0) {
    return principal / tenureMonths;
  }

  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Math.round(emi * 100) / 100;
};
```

---

## Credit Score Algorithm

LoanSphere implements a heuristic-based credit scoring system (0-100 scale) to assess loan risk.

### Score Components

| Factor | Weight | Description |
|--------|--------|-------------|
| Payment History | 40% | On-time payment ratio |
| Outstanding Dues | 25% | Current overdue amount |
| Credit Utilization | 15% | Total borrowed vs limit |
| Account Age | 10% | Length of relationship |
| Payment Consistency | 10% | Variance in payment timing |

### Scoring Logic

```javascript
// Payment History (40 points max)
// - 100% on-time = 40 points
// - Each late payment reduces score

// Outstanding Dues (25 points max)
// - No overdues = 25 points
// - Overdues reduce score proportionally

// Credit Utilization (15 points max)
// - < 30% utilization = 15 points
// - > 80% utilization = 5 points

// Account Age (10 points max)
// - > 2 years = 10 points
// - < 6 months = 3 points

// Consistency (10 points max)
// - Regular payments = 10 points
// - Irregular patterns reduce score
```

### Risk Categories

| Score Range | Risk Level | Recommendation |
|-------------|------------|----------------|
| 80-100 | Low Risk | Auto-approve eligible |
| 60-79 | Medium Risk | Manual review |
| 40-59 | High Risk | Additional verification |
| 0-39 | Very High Risk | Likely rejection |

### Code Reference

See `server/src/utils/creditScore.js` for the implementation.

---

## Razorpay Integration Guide

The system includes placeholder code for Razorpay payment gateway integration. Here's how to implement it:

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install razorpay
```

**Frontend:**
Add to `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Backend Setup

Create `server/src/config/razorpay.js`:
```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;
```

### 3. Create Order Endpoint

Add to `server/src/controllers/paymentController.js`:
```javascript
const createRazorpayOrder = async (req, res) => {
  const { amount, emiId, loanAccountId } = req.body;

  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency: 'INR',
    receipt: `emi_${emiId}`,
    notes: {
      emiId,
      loanAccountId,
    },
  };

  const order = await razorpay.orders.create(options);

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    },
  });
};
```

### 4. Verify Payment Endpoint

```javascript
const crypto = require('crypto');

const verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Verify signature
  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest('hex');

  if (razorpay_signature !== expectedSign) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  // Record payment in your system
  // ... update EMI status, loan account, etc.

  res.json({ success: true, message: 'Payment verified' });
};
```

### 5. Frontend Integration

```javascript
const initiatePayment = async (emiId, amount) => {
  // 1. Create order
  const { data } = await paymentAPI.createOrder({ amount, emiId });

  // 2. Open Razorpay checkout
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: data.amount,
    currency: data.currency,
    order_id: data.orderId,
    name: 'LoanSphere',
    description: `EMI Payment`,
    handler: async (response) => {
      // 3. Verify payment
      await paymentAPI.verifyPayment(response);
      toast.success('Payment successful!');
      fetchData(); // Refresh data
    },
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone,
    },
    theme: {
      color: '#4F46E5',
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};
```

### 6. Environment Variables

Add to `.env`:
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

Add to frontend `.env`:
```
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

---

## Environment Variables

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/loansphere

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Razorpay (optional)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=
```

---

## Demo Credentials

After running the seed script (`npm run seed`), use these credentials:

### Admin Account
```
Email: admin@loansphere.com
Password: Admin@123
Role: admin
```

### Loan Officer Account
```
Email: officer@loansphere.com
Password: Officer@123
Role: officer
```

### Customer Accounts
```
Email: rahul.sharma@email.com
Password: Customer@123
Role: customer

Email: priya.patel@email.com
Password: Customer@123
Role: customer

Email: amit.kumar@email.com
Password: Customer@123
Role: customer
```

---

## Scripts

### Backend
```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm run seed     # Seed database with demo data
```

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## License

MIT License - feel free to use this project for learning or commercial purposes.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

For issues and feature requests, please create an issue in the repository.

---

Built with ❤️ for the FinTech community

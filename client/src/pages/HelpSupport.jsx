// client/src/pages/HelpSupport.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';

const HelpSupport = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  });

  const categories = [
    { id: 'general', label: 'General', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'loans', label: 'Loans', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'account', label: 'Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  const faqs = {
    general: [
      {
        question: 'What is LoanSphere?',
        answer: 'LoanSphere is a comprehensive micro loan management system designed to help financial institutions manage loans, track EMIs, handle customer KYC, and monitor payment collections efficiently.',
      },
      {
        question: 'How do I get started?',
        answer: 'After logging in, you can navigate to the Dashboard to see an overview of your loans and payments. Customers can view their loan details and payment history, while staff can manage customers and create new loans.',
      },
      {
        question: 'Is my data secure?',
        answer: 'Yes, we take security seriously. All data is encrypted, and we follow industry best practices for data protection. Your personal and financial information is stored securely.',
      },
    ],
    loans: [
      {
        question: 'How do I apply for a new loan?',
        answer: 'As a customer, contact your loan officer to apply for a new loan. They will guide you through the application process, verify your KYC documents, and help you choose the right loan product.',
      },
      {
        question: 'What loan products are available?',
        answer: 'We offer various loan products including Personal Loans, Business Loans, Education Loans, Vehicle Loans, Home Loans, Gold Loans, and Agriculture Loans. Each product has different interest rates and tenure options.',
      },
      {
        question: 'How is the EMI calculated?',
        answer: 'EMI (Equated Monthly Installment) is calculated using the formula that considers your principal amount, interest rate, and loan tenure. The EMI remains constant throughout the loan period for reducing balance method.',
      },
      {
        question: 'Can I prepay my loan?',
        answer: 'Yes, you can prepay your loan either partially or in full. Some loan products may have prepayment charges. Please check with your loan officer for specific terms.',
      },
    ],
    payments: [
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept payments via Cash, Bank Transfer, UPI, Cheque, and Debit/Credit Cards. Online payment integration with Razorpay is coming soon.',
      },
      {
        question: 'When is my EMI due?',
        answer: 'Your EMI is due on the same date each month as your loan disbursement date. You can view your next due date on your Dashboard or in the loan details section.',
      },
      {
        question: 'What happens if I miss a payment?',
        answer: 'Missing a payment may result in late fees and can affect your credit score. If you anticipate difficulty in making a payment, please contact us immediately to discuss options.',
      },
      {
        question: 'How do I get a payment receipt?',
        answer: 'You can download your loan statement which includes all payment details from the loan details page. Click on "Download Statement" to get a PDF receipt.',
      },
    ],
    account: [
      {
        question: 'How do I update my profile information?',
        answer: 'Navigate to Settings from the user menu, or go to My Profile section. You can update your contact information and preferences there.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'Go to Settings > Security > Change Password. You will need to enter your current password and then set a new one.',
      },
      {
        question: 'What is KYC and why is it required?',
        answer: 'KYC (Know Your Customer) is a mandatory process to verify your identity. It includes documents like Aadhaar, PAN card, and address proof. KYC verification is required before loan disbursement.',
      },
    ],
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) {
      toast.error('Please fill in all fields');
      return;
    }
    toast.success('Message sent successfully! We will get back to you soon.');
    setContactForm({ subject: '', message: '' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 animate-slide-in">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
          <p className="text-gray-500">Find answers and get help</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">Call Us</h3>
            <p className="text-blue-100 text-sm mb-3">Mon-Sat, 9AM-6PM</p>
            <p className="font-bold text-xl">1800-123-4567</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">Email Us</h3>
            <p className="text-emerald-100 text-sm mb-3">24/7 Support</p>
            <p className="font-bold">support@loansphere.com</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">Live Chat</h3>
            <p className="text-purple-100 text-sm mb-3">Quick responses</p>
            <p className="font-bold">Coming Soon</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in" style={{ animationDelay: '100ms' }}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-lg">Frequently Asked Questions</h3>
          <p className="text-sm text-gray-500">Find quick answers to common questions</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-100 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
              </svg>
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="p-4 space-y-3">
          {faqs[activeCategory]?.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedFaq === index && (
                <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-scale-in" style={{ animationDelay: '200ms' }}>
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Send us a message</h3>
            <p className="text-sm text-gray-500">Can't find what you're looking for? Contact us directly</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
              placeholder="What do you need help with?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all resize-none"
              rows={4}
              placeholder="Describe your issue or question in detail..."
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send Message
          </button>
        </form>
      </div>

      {/* Additional Resources */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 animate-scale-in" style={{ animationDelay: '300ms' }}>
        <h3 className="font-semibold text-gray-900 mb-4">Additional Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">User Guide</p>
              <p className="text-sm text-gray-500">Learn how to use LoanSphere</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Terms & Conditions</p>
              <p className="text-sm text-gray-500">Read our terms of service</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Privacy Policy</p>
              <p className="text-sm text-gray-500">How we protect your data</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Video Tutorials</p>
              <p className="text-sm text-gray-500">Watch step-by-step guides</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;

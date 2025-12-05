// client/src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, isCustomer } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Role-based static notifications
  const customerNotifications = [
    { id: 1, title: 'EMI payment due in 3 days', time: '2 min ago', unread: true, type: 'payment', icon: 'payment' },
    { id: 2, title: 'Your loan has been approved!', time: '1 hour ago', unread: true, type: 'loan', icon: 'success' },
    { id: 3, title: 'KYC verification successful', time: '3 hours ago', unread: false, type: 'kyc', icon: 'check' },
    { id: 4, title: 'Loan amount disbursed to your account', time: '1 day ago', unread: false, type: 'loan', icon: 'money' },
    { id: 5, title: 'Welcome to LoanSphere!', time: '2 days ago', unread: false, type: 'account', icon: 'welcome' },
  ];

  const staffNotifications = [
    { id: 1, title: 'New loan application received', time: '2 min ago', unread: true, type: 'loan', icon: 'new' },
    { id: 2, title: 'Payment of ₹5,000 received', time: '1 hour ago', unread: true, type: 'payment', icon: 'payment' },
    { id: 3, title: 'New customer registered', time: '3 hours ago', unread: false, type: 'customer', icon: 'user' },
    { id: 4, title: 'KYC pending review (3)', time: '5 hours ago', unread: true, type: 'kyc', icon: 'pending' },
    { id: 5, title: 'Loan #1234 overdue by 5 days', time: '1 day ago', unread: false, type: 'overdue', icon: 'warning' },
  ];

  const [notificationList, setNotificationList] = useState(
    isCustomer ? customerNotifications : staffNotifications
  );

  // Update notifications when role changes
  useEffect(() => {
    setNotificationList(isCustomer ? customerNotifications : staffNotifications);
  }, [isCustomer]);

  const unreadCount = notificationList.filter(n => n.unread).length;

  // Mark notification as read
  const handleNotificationClick = (id) => {
    setNotificationList(prev =>
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    );
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotificationList(prev => prev.map(n => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
    setShowNotifications(false);
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between">
        {/* Left - Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">LoanSphere</span>
        </div>

        {/* Left - Search (Desktop) */}
        <div className="hidden lg:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search loans, customers..."
              className="w-full pl-12 pr-4 py-2.5 bg-gray-100/80 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-200">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-300 group"
            >
              <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 animate-dropdown overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationList.map((notif) => {
                      // Get icon and colors based on notification type
                      const getNotificationStyle = () => {
                        switch (notif.icon) {
                          case 'payment':
                            return { bg: 'bg-blue-100', color: 'text-blue-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
                          case 'success':
                            return { bg: 'bg-emerald-100', color: 'text-emerald-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
                          case 'check':
                            return { bg: 'bg-green-100', color: 'text-green-600', icon: 'M5 13l4 4L19 7' };
                          case 'money':
                            return { bg: 'bg-purple-100', color: 'text-purple-600', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' };
                          case 'welcome':
                            return { bg: 'bg-amber-100', color: 'text-amber-600', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' };
                          case 'new':
                            return { bg: 'bg-indigo-100', color: 'text-indigo-600', icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' };
                          case 'user':
                            return { bg: 'bg-cyan-100', color: 'text-cyan-600', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' };
                          case 'pending':
                            return { bg: 'bg-orange-100', color: 'text-orange-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' };
                          case 'warning':
                            return { bg: 'bg-red-100', color: 'text-red-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' };
                          default:
                            return { bg: notif.unread ? 'bg-primary-100' : 'bg-gray-100', color: notif.unread ? 'text-primary-600' : 'text-gray-500', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' };
                        }
                      };
                      const style = getNotificationStyle();

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif.id)}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-2 ${
                            notif.unread ? 'border-primary-500 bg-primary-50/30' : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                              <svg className={`w-4 h-4 ${style.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notif.unread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={handleMarkAllRead}
                      className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-200 mx-2" />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-all duration-300 group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 animate-dropdown overflow-hidden">
                  {/* User Info */}
                  <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{user?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-sm text-primary-100">{user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-white/20 backdrop-blur text-xs font-medium rounded-lg capitalize">
                        {user?.role}
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-500/30 text-xs font-medium rounded-lg flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        if (isCustomer) {
                          navigate('/dashboard/customer/profile');
                        } else {
                          toast('Admin profile page coming soon!', { icon: '👤' });
                        }
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate(isCustomer ? '/dashboard/customer/settings' : '/dashboard/settings');
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        navigate(isCustomer ? '/dashboard/customer/help' : '/dashboard/help');
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Help & Support
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={logout}
                      className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

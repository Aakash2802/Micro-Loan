// client/src/components/Layout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-mesh bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-4 text-center text-sm">
          Designed & Developed by <span className="text-white font-semibold">Aakash</span> © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

export default Layout;

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import Sidebar from '../components/navigation/Sidebar';
import TopBar from '../components/navigation/TopBar';
import MobileNav from '../components/navigation/MobileNav';
import QuickCreateModal from '../components/tasks/QuickCreateModal';

export default function AppShell() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const location = useLocation();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location]);

  return (
    <div className="min-h-screen flex bg-[--bg-secondary] theme-transition">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        onCreateTask={() => setShowQuickCreate(true)}
      />

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <TopBar onCreateTask={() => setShowQuickCreate(true)} />

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav onCreateTask={() => setShowQuickCreate(true)} />
      </div>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <QuickCreateModal onClose={() => setShowQuickCreate(false)} />
      )}
    </div>
  );
}

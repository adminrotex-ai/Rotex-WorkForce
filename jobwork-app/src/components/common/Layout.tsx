import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { DEPARTMENT_LABELS } from '../../types';
import {
  LayoutDashboard, Users, Package, BarChart3, DollarSign,
  ClipboardList, Warehouse, LogOut, Menu, X, ChevronRight,
  Settings, FileText
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isHod = currentUser.role === 'hod';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/batches', label: 'Batches', icon: Package, show: true },
    { path: '/users', label: 'User Management', icon: Users, show: isAdmin || isHod },
    { path: '/statistics', label: 'Statistics', icon: BarChart3, show: true },
    { path: '/accounting', label: 'Accounting', icon: DollarSign, show: isAdmin || isHod },
    { path: '/materials', label: 'Materials & Inventory', icon: Warehouse, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/consumer-goods', label: 'Consumer Goods', icon: Settings, show: isAdmin || (isHod && (currentUser.department === 'store' || currentUser.department === 'welding' || currentUser.department === 'buffing')) },
    { path: '/audit', label: 'Audit Logs', icon: ClipboardList, show: isAdmin },
    { path: '/reports', label: 'Reports', icon: FileText, show: isAdmin || isHod },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}
        style={{ backgroundColor: '#001f3f' }}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-white/10">
            <h1 className="text-white text-xl font-bold">JOBWORK</h1>
            <p className="text-white/50 text-xs mt-1">Workflow Management</p>
          </div>

          <div className="p-4 border-b border-white/10">
            <p className="text-white font-medium text-sm">{currentUser.firstName}</p>
            <p className="text-white/50 text-xs capitalize">{currentUser.role} - {DEPARTMENT_LABELS[currentUser.department]}</p>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.filter(i => i.show).map(item => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-all ${
                    active
                      ? 'bg-white/15 text-white border-r-3 border-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#001f3f' }}>
              {currentUser.firstName[0]}
            </div>
          </div>
        </header>

        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { DEPARTMENT_LABELS } from '../../types';
import { loadCustomDepartmentsIntoLabels } from '../../database/operations';
import {
  LayoutDashboard, Users, Package, BarChart3, DollarSign,
  ClipboardList, Warehouse, LogOut, Settings, FileText,
  Bell, Building2, Boxes, ChevronDown, Menu, X
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isHod = currentUser.role === 'hod';

  const [, forceTick] = useState(0);
  useEffect(() => { loadCustomDepartmentsIntoLabels().then(() => forceTick(t => t + 1)); }, []);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/batches', label: 'Batches', icon: Package, show: true },
    { path: '/users', label: 'Users', icon: Users, show: isAdmin || isHod },
    { path: '/departments', label: 'Departments', icon: Building2, show: isAdmin },
    { path: '/statistics', label: 'Statistics', icon: BarChart3, show: true },
    { path: '/accounting', label: 'Accounting', icon: DollarSign, show: isAdmin || isHod },
    { path: '/materials', label: 'Materials', icon: Warehouse, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/consumer-goods', label: 'Goods', icon: Settings, show: isAdmin || (isHod && (currentUser.department === 'store' || currentUser.department === 'welding' || currentUser.department === 'buffing')) },
    { path: '/products', label: 'Products', icon: Boxes, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/audit', label: 'Audit', icon: ClipboardList, show: isAdmin },
    { path: '/reports', label: 'Reports', icon: FileText, show: isAdmin || isHod },
  ];

  const visibleNav = navItems.filter(i => i.show);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e5' }}>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 px-4 md:px-8 py-3" style={{ backgroundColor: '#f5f0e5' }}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="px-4 py-2 rounded-full border border-gray-300/60 bg-white/60">
              <span className="font-bold text-sm text-gray-800 tracking-tight">Rotex</span>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/50 rounded-full px-2 py-1.5 border border-gray-200/40">
            {visibleNav.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`pill-tab ${active ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Settings, Bell, Profile */}
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-white/60 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <button className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/60 border border-gray-200/40 text-gray-600 text-xs font-medium hover:bg-white transition-colors">
              <Settings size={14} />
              Setting
            </button>

            <button className="relative p-2.5 rounded-full bg-white/60 border border-gray-200/40 hover:bg-white transition-colors">
              <Bell size={16} className="text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-white/60 border border-gray-200/40 hover:bg-white transition-colors"
              >
                {currentUser.profilePicture ? (
                  <img src={currentUser.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#c9a227] flex items-center justify-center text-white text-xs font-bold">
                    {currentUser.firstName[0]}
                  </div>
                )}
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-sm text-gray-800">{currentUser.firstName}</p>
                      <p className="text-xs text-gray-400 capitalize">{currentUser.role} &bull; {DEPARTMENT_LABELS[currentUser.department] || currentUser.department}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 bg-white rounded-2xl border border-gray-200/40 shadow-lg p-3 animate-scale-in">
            <div className="grid grid-cols-3 gap-2">
              {visibleNav.map(item => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#2d2d2d] text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 pb-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { DEPARTMENT_LABELS } from '../../types';
import { currentISTString } from '../../utils/helpers';
import { loadCustomDepartmentsIntoLabels } from '../../database/operations';
import {
  LayoutDashboard, Users, Package, BarChart3, DollarSign,
  ClipboardList, Warehouse, LogOut, Menu, ChevronRight,
  Settings, FileText, Bell, Search, Building2, Boxes
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

  const [, forceTick] = useState(0);
  useEffect(() => { loadCustomDepartmentsIntoLabels().then(() => forceTick(t => t + 1)); }, []);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/batches', label: 'Batches', icon: Package, show: true },
    { path: '/users', label: 'User Management', icon: Users, show: isAdmin || isHod },
    { path: '/departments', label: 'Departments', icon: Building2, show: isAdmin },
    { path: '/statistics', label: 'Statistics', icon: BarChart3, show: true },
    { path: '/accounting', label: 'Accounting', icon: DollarSign, show: isAdmin || isHod },
    { path: '/materials', label: 'Materials & Inventory', icon: Warehouse, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/consumer-goods', label: 'Consumer Goods', icon: Settings, show: isAdmin || (isHod && (currentUser.department === 'store' || currentUser.department === 'welding' || currentUser.department === 'buffing')) },
    { path: '/products', label: 'Final Products', icon: Boxes, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/audit', label: 'Audit Logs', icon: ClipboardList, show: isAdmin },
    { path: '/reports', label: 'Reports', icon: FileText, show: isAdmin || isHod },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7fa]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ${sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'}`}
        style={{ background: 'linear-gradient(180deg, #1a237e 0%, #0d47a1 100%)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight">JOBWORK</h1>
              <p className="text-white/60 text-[10px] font-medium tracking-wider uppercase">Workflow Management</p>
            </div>
          </div>

          {/* User Info */}
          <div className="mx-4 mb-5 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {currentUser.profilePicture ? (
                <img src={currentUser.profilePicture} alt={currentUser.firstName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser.firstName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{currentUser.firstName}</p>
                <p className="text-white/60 text-[11px] capitalize truncate">{currentUser.role} &bull; {DEPARTMENT_LABELS[currentUser.department] || currentUser.department}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 overflow-y-auto space-y-2.5 pb-4">
            {navItems.filter(i => i.show).map(item => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-[#0d47a1] shadow-lg shadow-black/10'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span>{item.label}</span>
                  {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
                </button>
              );
            })}
          </nav>

          {/* Settings & Logout */}
          <div className="px-3 pb-4 space-y-1">
            <div className="border-t border-white/15 mb-3" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-[260px]' : 'ml-0'}`}>
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 w-72">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="bg-transparent text-sm border-none outline-none w-full text-gray-600 placeholder-gray-400"
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden lg:block font-medium">
              {currentISTString()}
            </span>
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell size={18} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-[#1a237e] to-[#0d47a1]">
              {currentUser.firstName[0]}
            </div>
          </div>
        </header>

        <main className="p-10 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

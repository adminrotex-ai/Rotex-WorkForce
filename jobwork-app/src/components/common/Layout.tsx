import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { DEPARTMENT_LABELS } from '../../types';
import { loadCustomDepartmentsIntoLabels } from '../../database/operations';
import {
  LayoutDashboard, Users, Package, BarChart3, Wallet,
  ClipboardList, Warehouse, LogOut, Building2, Boxes,
  ChevronRight, Menu, X, Settings, FileText
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
    { path: '/batches', label: 'Batch Management', icon: Package, show: true },
    { path: '/users', label: isAdmin ? 'User Management' : 'My Users', icon: Users, show: isAdmin || isHod },
    { path: '/materials', label: 'Materials & Stock', icon: Warehouse, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/consumer-goods', label: 'Consumer Goods', icon: Settings, show: isAdmin || (isHod && (currentUser.department === 'store' || currentUser.department === 'welding' || currentUser.department === 'buffing')) },
    { path: '/products', label: 'Products', icon: Boxes, show: isAdmin || (isHod && currentUser.department === 'store') },
    { path: '/departments', label: 'Departments', icon: Building2, show: isAdmin },
    { path: '/accounting', label: 'Accounting', icon: Wallet, show: isAdmin || isHod },
    { path: '/statistics', label: 'Statistics', icon: BarChart3, show: true },
    { path: '/reports', label: 'Reports', icon: FileText, show: isAdmin || isHod },
    { path: '/audit', label: 'Audit Log', icon: ClipboardList, show: isAdmin },
  ];

  const visibleNav = navItems.filter(i => i.show);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#e8e0cc] p-3">
      <div className="bg-[#f5f0e0] rounded-[1.5rem] min-h-[calc(100vh-1.5rem)] flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-white/40 backdrop-blur-sm border-r border-gray-200/30 flex flex-col transition-all duration-300`}>
          <div className="p-4 flex items-center justify-between">
            {sidebarOpen && (
              <div className="border border-gray-300/70 rounded-full px-4 py-2">
                <span className="text-xs font-semibold text-gray-800">Rotex WorkForce</span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center text-gray-500 cursor-pointer">
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
            {visibleNav.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#2a2a2a] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                  {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-200/30">
            <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} px-2 py-2`}>
              <div className="w-8 h-8 rounded-full bg-gold-300 flex items-center justify-center text-dark-800 font-bold text-xs shrink-0">
                {currentUser.firstName?.[0] || 'U'}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{currentUser.firstName}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{currentUser.role} · {DEPARTMENT_LABELS[currentUser.department] || currentUser.department}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-2 px-3' : 'justify-center'} py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer mt-1`}
            >
              <LogOut size={16} />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

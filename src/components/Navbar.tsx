import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Menu,
  LogOut,
  Clock,
  ShieldCheck,
  BookOpen,
  EyeOff
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'attendance' | 'admin' | 'policy';
  onOpenSidebar: () => void;
  systemDate?: string;
  onToggleHeader?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab,
  onOpenSidebar,
  onToggleHeader
}) => {
  const { currentUser, logout } = useAuth();

  const getTabTitle = () => {
    switch (currentTab) {
      case 'attendance':
        return {
          title: 'My Attendance & Calendar',
          subtitle: 'Active Shift Tracking & Monthly Leave Balance',
          icon: Clock,
          color: 'text-blue-400'
        };
      case 'admin':
        return {
          title: 'Admin Control Center',
          subtitle: 'Workforce Roster, Attendance Audits & Quota Management',
          icon: ShieldCheck,
          color: 'text-purple-400'
        };
      case 'policy':
        return {
          title: 'Corporate Policy Handbook',
          subtitle: 'Official Leave Rules, Deductions & Sunday Compensation',
          icon: BookOpen,
          color: 'text-emerald-400'
        };
      default:
        return {
          title: 'Attendance System',
          subtitle: 'Corporate Shift & Leave Suite',
          icon: Clock,
          color: 'text-blue-400'
        };
    }
  };

  const tabInfo = getTabTitle();
  const TabIcon = tabInfo.icon;

  return (
    <header 
      id="main-navigation-header"
      className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl transition-all"
    >
      <div className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* Left Side: Mobile Menu Button + Page Context Title */}
        <div className="flex items-center space-x-3.5 min-w-0">
          {/* Mobile hamburger to toggle sidebar */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Section Breadcrumb & Title */}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <TabIcon className={`w-4 h-4 ${tabInfo.color} shrink-0 hidden sm:block`} />
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {tabInfo.title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 truncate hidden md:block mt-0.5">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: STRICTLY User Account Card, Hide Header & Logout Button */}
        {currentUser && (
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            {/* User Profile Info Card */}
            <div className="flex items-center space-x-3 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-sm">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white flex items-center space-x-2">
                  <span className="truncate max-w-[140px]">{currentUser.name}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                  {currentUser.email}
                </div>
              </div>
            </div>

            {/* Hide Header Button */}
            {onToggleHeader && (
              <button
                id="navbar-hide-header-btn"
                type="button"
                onClick={onToggleHeader}
                title="Hide top header for more workspace screen"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
              >
                <EyeOff className="w-4 h-4 text-slate-400" />
                <span className="font-medium hidden md:inline">Hide Header</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              id="user-logout-btn"
              type="button"
              onClick={logout}
              title="Sign Out of Account"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-300 hover:text-red-200 text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="font-semibold hidden sm:inline">Logout</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};

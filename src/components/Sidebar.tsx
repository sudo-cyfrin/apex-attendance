import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'attendance' | 'admin' | 'policy';
  setCurrentTab: (tab: 'attendance' | 'admin' | 'policy') => void;
  isOpen: boolean;
  onClose: () => void;
  isHeaderVisible?: boolean;
  onToggleHeader?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose,
  isHeaderVisible = true,
  onToggleHeader
}) => {
  const { isAdmin } = useAuth();

  const navItems = [
    {
      id: 'attendance' as const,
      label: 'My Attendance',
      sublabel: 'Clock-in & Calendar',
      icon: Clock,
      color: 'blue'
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as const,
            label: 'Admin Control',
            sublabel: 'Roster & Leave Audit',
            icon: ShieldCheck,
            color: 'purple',
            badge: 'Admin'
          }
        ]
      : []),
    {
      id: 'policy' as const,
      label: 'Rules & Policy',
      sublabel: 'Leave & Shift Terms',
      icon: BookOpen,
      color: 'emerald'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B0F19] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-[#0B0F19]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Apex<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Attendance</span>
                </span>
              </div>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                Enterprise Suite
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                type="button"
                onClick={() => {
                  setCurrentTab(item.id);
                  onClose();
                }}
                className={`w-full group flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? item.color === 'purple'
                      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-lg shadow-purple-500/20 font-medium'
                      : 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-blue-500/20 font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-900 border border-white/10 text-slate-400 group-hover:text-slate-200 group-hover:border-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center space-x-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-200 border border-purple-400/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-white translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Policy & View Options Box */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 space-y-3">
          {/* Header Visibility Toggle Button */}
          {onToggleHeader && (
            <button
              id="sidebar-toggle-header-btn"
              type="button"
              onClick={onToggleHeader}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
              title={isHeaderVisible ? 'Hide top header' : 'Show top header'}
            >
              <span className="flex items-center space-x-2">
                {isHeaderVisible ? (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="font-medium">{isHeaderVisible ? 'Hide Header' : 'Show Header'}</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isHeaderVisible ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {isHeaderVisible ? 'Visible' : 'Hidden'}
              </span>
            </button>
          )}

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium">Leave Quota</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                2 Days / Mo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Excess leaves carry deduction. Sunday shifts award +1 credit.
            </p>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Firestore Sync</span>
              </span>
              <span>Sept 2026</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

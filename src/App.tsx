import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { StatsRow } from './components/StatsRow.tsx';
import { CurrentDayBanner } from './components/CurrentDayBanner.tsx';
import { MonthlyCalendarGrid } from './components/MonthlyCalendarGrid.tsx';
import { DayDetailModal } from './components/DayDetailModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PolicyHandbook } from './components/PolicyHandbook.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { DayAttendanceInfo, MonthEvaluationResult, AttendanceRecord } from './types.ts';
import { CheckCircle2, AlertTriangle, X, Info, ShieldCheck, Eye, Menu } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.ts';

function AttendanceApp() {
  const { currentUser, isAdmin, loading } = useAuth();
  
  // Navigation tabs: 'attendance' | 'admin' | 'policy'
  const [currentTab, setCurrentTab] = useState<'attendance' | 'admin' | 'policy'>('attendance');

  // Mobile sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Header visibility state (requested by user)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Month navigation: default to September 2026
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9);

  // Data states
  const [todayDateStr, setTodayDateStr] = useState('2026-09-04');
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [monthEvaluation, setMonthEvaluation] = useState<MonthEvaluationResult | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayAttendanceInfo | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Ensure non-admins are never stuck on admin tab
  useEffect(() => {
    if (!isAdmin && currentTab === 'admin') {
      setCurrentTab('attendance');
    }
  }, [isAdmin, currentTab]);

  // Sync authenticated user to server store
  useEffect(() => {
    if (currentUser) {
      fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser }),
      }).catch((err) => console.error('Failed to sync user to server:', err));
    }
  }, [currentUser]);

  // Fetch month data for active user
  const fetchMonthData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/attendance/month/${currentUser.id}/${year}/${month}?email=${encodeURIComponent(currentUser.email)}&name=${encodeURIComponent(currentUser.name)}&role=${currentUser.role}&department=${encodeURIComponent(currentUser.department)}`);
      if (res.ok) {
        const data = await res.json();
        setMonthEvaluation(data.evaluation);
        setTodayDateStr(data.todayDate || '2026-09-04');
      }
    } catch (err) {
      console.error('Failed to load month attendance:', err);
    }
  }, [currentUser, year, month]);

  // Fetch today's record for active user
  const fetchTodayData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/attendance/today?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setTodayRecord(data.record);
        if (data.todayDate) setTodayDateStr(data.todayDate);
      }
    } catch (err) {
      console.error('Failed to load today record:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMonthData();
      fetchTodayData();
    }
  }, [currentUser, fetchMonthData, fetchTodayData]);

  // Firestore real-time sync and collection initialization for attendance_records
  useEffect(() => {
    if (!currentUser) return;
    const docId = `${currentUser.id}_${todayDateStr}`;
    const recRef = doc(db, 'attendance_records', docId);

    // Initial check: if record not yet in Firestore, provision it so attendance_records collection is immediately visible
    getDoc(recRef).then(async (snap) => {
      if (!snap.exists()) {
        const initialDoc = {
          id: docId,
          userId: currentUser.id,
          date: todayDateStr,
          status: 'PRESENT',
          checkInTime: null,
          checkOutTime: null,
          hoursWorked: 0,
          notes: 'Active Attendance Day - September 4, 2026',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        try {
          await setDoc(recRef, initialDoc);
        } catch (e) {
          console.warn('Initial attendance doc creation note:', e);
        }
      } else {
        const remoteData = snap.data() as AttendanceRecord;
        if (remoteData.checkInTime || remoteData.checkOutTime) {
          setTodayRecord(remoteData);
        }
      }
    }).catch((err) => {
      console.warn('Firestore attendance fetch note:', err);
    });

    const unsubscribe = onSnapshot(recRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AttendanceRecord;
        if (data.checkInTime || data.checkOutTime) {
          setTodayRecord(data);
        }
      }
    }, (err) => {
      console.warn('Firestore attendance onSnapshot note:', err);
    });

    return () => unsubscribe();
  }, [currentUser, todayDateStr]);

  // Check In Handler (Enforces Active Day Restriction)
  const handleCheckIn = async () => {
    if (!currentUser) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          date: todayDateStr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to check in', 'warning');
      } else {
        showToast(data.message || 'Checked in successfully!', 'success');
        setTodayRecord(data.record);
        fetchMonthData();

        // Write directly to Firestore cloud database
        if (data.record) {
          try {
            await setDoc(doc(db, 'attendance_records', `${currentUser.id}_${todayDateStr}`), {
              ...data.record,
              syncedAt: serverTimestamp(),
            }, { merge: true });
          } catch (fsErr) {
            console.warn('Firestore attendance record write note:', fsErr);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Network error checking in', 'warning');
    } finally {
      setLoadingAction(false);
    }
  };

  // Check Out Handler (Enforces Active Day Restriction)
  const handleCheckOut = async () => {
    if (!currentUser) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          date: todayDateStr,
          checkInTime: todayRecord?.checkInTime || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to check out', 'warning');
      } else {
        showToast(data.message || 'Checked out successfully!', 'success');
        setTodayRecord(data.record);
        fetchMonthData();

        // Write directly to Firestore cloud database
        if (data.record) {
          try {
            await setDoc(doc(db, 'attendance_records', `${currentUser.id}_${todayDateStr}`), {
              ...data.record,
              syncedAt: serverTimestamp(),
            }, { merge: true });
          } catch (fsErr) {
            console.warn('Firestore attendance checkout sync note:', fsErr);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Network error checking out', 'warning');
    } finally {
      setLoadingAction(false);
    }
  };

  // Reset Shift Handler (Allows employee to reset shift to re-test check in & check out)
  const handleResetShift = async () => {
    if (!currentUser) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/attendance/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          date: todayDateStr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to reset shift', 'warning');
      } else {
        showToast('Shift session reset! You can now test Check In again.', 'success');
        setTodayRecord(null);
        fetchMonthData();

        // Remove from Firestore or set to empty
        try {
          await deleteDoc(doc(db, 'attendance_records', `${currentUser.id}_${todayDateStr}`));
        } catch (e) {
          try {
            await setDoc(doc(db, 'attendance_records', `${currentUser.id}_${todayDateStr}`), {
              userId: currentUser.id,
              date: todayDateStr,
              checkInTime: null,
              checkOutTime: null,
              hoursWorked: 0,
              status: 'FUTURE',
            }, { merge: true });
          } catch (fsErr) {
            console.warn('Firestore reset note:', fsErr);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Network error resetting shift', 'warning');
    } finally {
      setLoadingAction(false);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Auth Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-400 font-medium">Verifying Firebase Authentication...</span>
      </div>
    );
  }

  // If not logged in, display the dedicated Login Page
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-[#F8FAFC] selection:bg-blue-600 selection:text-white relative">
      
      {/* Background Ambience / Radial Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-gradient-to-bl from-purple-600/10 via-fuchsia-600/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-blue-900/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={() => setIsHeaderVisible(!isHeaderVisible)}
      />

      {/* Main Content Area (Spaced for left sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Top Header - Spacious, uncluttered, strictly User & Logout (Can be toggled hidden/shown) */}
        {isHeaderVisible ? (
          <Navbar
            currentTab={currentTab}
            onOpenSidebar={() => setSidebarOpen(true)}
            systemDate={todayDateStr}
            onToggleHeader={() => setIsHeaderVisible(false)}
          />
        ) : (
          /* Floating Action Bar when Header is Hidden */
          <div className="sticky top-4 z-30 px-4 sm:px-8 flex items-center justify-between pointer-events-none mt-2">
            <button
              id="mobile-restore-menu-btn"
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden pointer-events-auto p-2 rounded-xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white shadow-xl backdrop-blur-xl cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="ml-auto pointer-events-auto">
              <button
                id="show-header-floating-btn"
                type="button"
                onClick={() => setIsHeaderVisible(true)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-blue-500/40 hover:border-blue-400 text-xs font-semibold shadow-2xl backdrop-blur-xl transition-all cursor-pointer"
                title="Restore top header"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Show Header</span>
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification Container */}
        {toast && (
          <div className="fixed top-20 right-4 sm:right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-200">
            <div
              className={`flex items-center space-x-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-500/10'
                  : 'bg-blue-950/90 border-blue-500/40 text-blue-200 shadow-blue-500/10'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
              <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main View Area */}
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        
        {/* VIEW 1: EMPLOYEE ATTENDANCE VIEW */}
        {currentTab === 'attendance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Monthly KPI Stats Row */}
            {monthEvaluation && (
              <StatsRow
                stats={monthEvaluation.stats}
                monthName="September 2026"
              />
            )}

            {/* Current Day Action Banner with Check In/Check Out State Machine */}
            <CurrentDayBanner
              todayDateStr={todayDateStr}
              todayRecord={todayRecord}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onResetShift={handleResetShift}
              loadingAction={loadingAction}
            />

            {/* Monthly Interactive Calendar Grid */}
            {monthEvaluation && (
              <MonthlyCalendarGrid
                days={monthEvaluation.days}
                year={year}
                month={month}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onSelectDay={(day) => setSelectedDay(day)}
              />
            )}

            {/* Day Detail Inspector Modal */}
            {selectedDay && (
              <DayDetailModal
                day={selectedDay}
                onClose={() => setSelectedDay(null)}
              />
            )}

          </div>
        )}

        {/* VIEW 2: ADMIN DASHBOARD (Protected to Admin role) */}
        {currentTab === 'admin' && isAdmin && <AdminDashboard />}

        {/* VIEW 3: CORPORATE POLICY HANDBOOK */}
        {currentTab === 'policy' && <PolicyHandbook />}

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 bg-[#0B0F19]/90 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ApexCorp Corporate Attendance & Leave System</span>
          <div className="flex items-center space-x-4 text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Firebase Connected</span>
            </span>
            <span>Policy: 2 Paid Leaves / Month</span>
          </div>
        </div>
      </footer>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AttendanceApp />
    </AuthProvider>
  );
}

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
import {
  DayAttendanceInfo,
  MonthEvaluationResult,
  AttendanceRecord,
} from './types.ts';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  Eye,
  Menu,
} from 'lucide-react';
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.ts';

function AttendanceApp() {
  const { currentUser, isAdmin, loading } = useAuth();

  // ============================================================
  // CURRENT DATE — INDIA STANDARD TIME
  // ============================================================
  const getTodayIST = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  // ============================================================
  // GET YEAR / MONTH / DAY FROM YYYY-MM-DD
  // ============================================================
  const getDateParts = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);

    return {
      year,
      month,
      day,
    };
  };

  // ============================================================
  // INITIAL CURRENT DATE
  //
  // Example:
  // 2026-09-05
  // ============================================================
  const initialToday = getTodayIST();
  const initialDateParts = getDateParts(initialToday);

  // ============================================================
  // NAVIGATION TABS
  // 'attendance' | 'admin' | 'policy'
  // ============================================================
  const [currentTab, setCurrentTab] = useState<
    'attendance' | 'admin' | 'policy'
  >('attendance');

  // ============================================================
  // MOBILE SIDEBAR DRAWER
  // ============================================================
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ============================================================
  // HEADER VISIBILITY
  // ============================================================
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // ============================================================
  // MONTH NAVIGATION
  //
  // IMPORTANT:
  // This application/API uses:
  //
  // January = 1
  // February = 2
  // ...
  // September = 9
  // December = 12
  //
  // So we intentionally keep month as 1-12.
  // ============================================================
  const [year, setYear] = useState(initialDateParts.year);

  const [month, setMonth] = useState(initialDateParts.month);

  // ============================================================
  // TODAY
  // ============================================================
  const [todayDateStr, setTodayDateStr] = useState(initialToday);

  // ============================================================
  // DATA STATES
  // ============================================================
  const [todayRecord, setTodayRecord] =
    useState<AttendanceRecord | null>(null);

  const [monthEvaluation, setMonthEvaluation] =
    useState<MonthEvaluationResult | null>(null);

  const [selectedDay, setSelectedDay] =
    useState<DayAttendanceInfo | null>(null);

  const [loadingAction, setLoadingAction] = useState(false);

  // ============================================================
  // TOAST FEEDBACK
  // ============================================================
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'warning' | 'info' = 'success'
  ) => {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // ============================================================
  // KEEP TODAY'S DATE UPDATED
  //
  // Checks every minute using IST.
  //
  // Example:
  //
  // 11:59 PM → 2026-09-05
  // 12:00 AM → 2026-09-06
  //
  // The application automatically detects the new day.
  // ============================================================
  useEffect(() => {
    const updateToday = () => {
      const currentToday = getTodayIST();

      setTodayDateStr((previousDate) => {
        if (previousDate !== currentToday) {
          console.log(
            `Attendance date changed: ${previousDate} → ${currentToday}`
          );
        }

        return currentToday;
      });
    };

    // Run immediately
    updateToday();

    // Check every minute
    const interval = setInterval(updateToday, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // WHEN THE REAL DATE CHANGES:
  //
  // Automatically move the calendar to the new current month.
  //
  // Example:
  // Dec 31 → Jan 1
  // Calendar automatically changes to January.
  //
  // We only do this when the month actually changes.
  // ============================================================
  useEffect(() => {
    const currentParts = getDateParts(todayDateStr);

    setYear((previousYear) => {
      if (previousYear !== currentParts.year) {
        return currentParts.year;
      }

      return previousYear;
    });

    setMonth((previousMonth) => {
      if (previousMonth !== currentParts.month) {
        return currentParts.month;
      }

      return previousMonth;
    });
  }, [todayDateStr]);

  // ============================================================
  // FORMAT TODAY'S DATE
  //
  // Example:
  // Saturday, 5 September 2026
  // ============================================================
  const formatLongDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);

    // Noon prevents accidental date rollover.
    const date = new Date(y, m - 1, d, 12, 0, 0);

    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  // ============================================================
  // FORMAT CURRENT MONTH
  //
  // Example:
  // September 2026
  // ============================================================
  const formatMonthName = (yearValue: number, monthValue: number) => {
    const date = new Date(
      yearValue,
      monthValue - 1,
      1,
      12,
      0,
      0
    );

    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  // ============================================================
  // CHECK WHETHER A DATE IS TODAY
  // ============================================================
  const isToday = (dateStr: string) => {
    return dateStr === todayDateStr;
  };

  // ============================================================
  // CHECK WHETHER DATE IS FUTURE
  // ============================================================
  const isFutureDate = (dateStr: string) => {
    return dateStr > todayDateStr;
  };

  // ============================================================
  // CHECK WHETHER DATE IS PAST
  // ============================================================
  const isPastDate = (dateStr: string) => {
    return dateStr < todayDateStr;
  };

  // ============================================================
  // GET DAY OF WEEK
  //
  // 0 = Sunday
  // 1 = Monday
  // ...
  // 6 = Saturday
  // ============================================================
  const getDayOfWeek = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);

    const date = new Date(y, m - 1, d);

    return date.getDay();
  };

  // ============================================================
  // CHECK WHETHER DATE IS SUNDAY
  // ============================================================
  const isSunday = (dateStr: string) => {
    return getDayOfWeek(dateStr) === 0;
  };

  // ============================================================
  // ENSURE NON-ADMINS ARE NEVER STUCK ON ADMIN TAB
  // ============================================================
  useEffect(() => {
    if (!isAdmin && currentTab === 'admin') {
      setCurrentTab('attendance');
    }
  }, [isAdmin, currentTab]);

  // ============================================================
  // FETCH MONTH DATA
  //
  // IMPORTANT:
  // We do NOT overwrite todayDateStr with a hard-coded
  // fallback anymore.
  //
  // The browser/application calculates today's date using IST.
  // ============================================================
  const fetchMonthData = useCallback(async () => {
  if (!currentUser) return;

  try {
    const res = await fetch(
      `/api/attendance/month/${currentUser.id}/${year}/${month}` +
      `?email=${encodeURIComponent(currentUser.email)}` +
      `&name=${encodeURIComponent(currentUser.name)}` +
      `&role=${currentUser.role}` +
      `&department=${encodeURIComponent(
        currentUser.department || ''
      )}`
    );

    if (res.ok) {
      const data = await res.json();

      setMonthEvaluation(data.evaluation);

      // IMPORTANT:
      // Do NOT overwrite todayDateStr from the API.
      // todayDateStr is controlled by IST in this component.
    }
  } catch (err) {
    console.error(
      'Failed to load month attendance:',
      err
    );
  }
}, [
  currentUser,
  year,
  month,
]);

  // ============================================================
  // FETCH TODAY'S RECORD
  // ============================================================
  const fetchTodayData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const res = await fetch(
        `/api/attendance/today?userId=${currentUser.id}&date=${todayDateStr}`
      );

      if (res.ok) {
        const data = await res.json();

        setTodayRecord(data.record || null);

        // We intentionally DO NOT replace today's date
        // with a server fallback.
      } else {
        setTodayRecord(null);
      }
    } catch (err) {
      console.error(
        'Failed to load today record:',
        err
      );
    }
  }, [
    currentUser,
    todayDateStr,
  ]);

  // ============================================================
  // LOAD MONTH + TODAY DATA
  //
  // Runs when:
  // - User logs in
  // - Month changes
  // - Date changes
  // ============================================================
  useEffect(() => {
    if (!currentUser) return;

    fetchMonthData();
  }, [
    currentUser,
    fetchMonthData,
    todayDateStr,
  ]);

  useEffect(() => {
    if (!currentUser) return;

    fetchTodayData();
  }, [
    currentUser,
    fetchTodayData,
  ]);

  // ============================================================
  // FIRESTORE REAL-TIME SYNC FOR TODAY
  //
  // IMPORTANT:
  // We DO NOT create a fake PRESENT record when the user
  // has not checked in.
  //
  // A Firestore record is created only when the actual
  // check-in/check-out operation happens.
  // ============================================================
  useEffect(() => {
    if (!currentUser) return;

    const docId =
      `${currentUser.id}_${todayDateStr}`;

    const recRef = doc(
      db,
      'attendance_records',
      docId
    );

    const unsubscribe = onSnapshot(
      recRef,
      (snap) => {
        if (snap.exists()) {
          const data =
            snap.data() as AttendanceRecord;

          setTodayRecord(data);
        } else {
          // No record means the employee hasn't
          // checked in today.
          setTodayRecord(null);
        }
      },
      (err) => {
        console.warn(
          'Firestore attendance onSnapshot note:',
          err
        );
      }
    );

    return () => unsubscribe();
  }, [
    currentUser,
    todayDateStr,
  ]);

  // ============================================================
  // CHECK IN HANDLER
  // ============================================================
  const handleCheckIn = async () => {
    if (!currentUser) return;

    setLoadingAction(true);

    try {
      const res = await fetch(
        '/api/attendance/check-in',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            date: todayDateStr,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(
          data.error || 'Failed to check in',
          'warning'
        );
      } else {
        showToast(
          data.message ||
          'Checked in successfully!',
          'success'
        );

        setTodayRecord(data.record);

        await fetchMonthData();

        // ======================================================
        // FIRESTORE CLOUD SYNC
        // ======================================================
        if (data.record) {
          try {
            await setDoc(
              doc(
                db,
                'attendance_records',
                `${currentUser.id}_${todayDateStr}`
              ),
              {
                ...data.record,
                syncedAt: serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          } catch (fsErr) {
            console.warn(
              'Firestore attendance record write note:',
              fsErr
            );
          }
        }
      }
    } catch (err: any) {
      showToast(
        err.message ||
        'Network error checking in',
        'warning'
      );
    } finally {
      setLoadingAction(false);
    }
  };

  // ============================================================
  // CHECK OUT HANDLER
  // ============================================================
  const handleCheckOut = async () => {
    if (!currentUser) return;

    setLoadingAction(true);

    try {
      const res = await fetch(
        '/api/attendance/check-out',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            date: todayDateStr,
            checkInTime:
              todayRecord?.checkInTime ||
              undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(
          data.error ||
          'Failed to check out',
          'warning'
        );
      } else {
        showToast(
          data.message ||
          'Checked out successfully!',
          'success'
        );

        setTodayRecord(data.record);

        await fetchMonthData();

        // ======================================================
        // FIRESTORE CLOUD SYNC
        // ======================================================
        if (data.record) {
          try {
            await setDoc(
              doc(
                db,
                'attendance_records',
                `${currentUser.id}_${todayDateStr}`
              ),
              {
                ...data.record,
                syncedAt: serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          } catch (fsErr) {
            console.warn(
              'Firestore attendance checkout sync note:',
              fsErr
            );
          }
        }
      }
    } catch (err: any) {
      showToast(
        err.message ||
        'Network error checking out',
        'warning'
      );
    } finally {
      setLoadingAction(false);
    }
  };

  // ============================================================
  // RESET SHIFT HANDLER
  // ============================================================
  const handleResetShift = async () => {
    if (!currentUser) return;

    setLoadingAction(true);

    try {
      const res = await fetch(
        '/api/attendance/reset',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            date: todayDateStr,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(
          data.error ||
          'Failed to reset shift',
          'warning'
        );
      } else {
        showToast(
          'Shift session reset! You can now test Check In again.',
          'success'
        );

        setTodayRecord(null);

        await fetchMonthData();

        // ======================================================
        // REMOVE TODAY'S FIRESTORE RECORD
        // ======================================================
        try {
          await deleteDoc(
            doc(
              db,
              'attendance_records',
              `${currentUser.id}_${todayDateStr}`
            )
          );
        } catch (fsErr) {
          console.warn(
            'Firestore reset note:',
            fsErr
          );
        }
      }
    } catch (err: any) {
      showToast(
        err.message ||
        'Network error resetting shift',
        'warning'
      );
    } finally {
      setLoadingAction(false);
    }
  };

  // ============================================================
  // PREVIOUS MONTH
  // ============================================================
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  // ============================================================
  // NEXT MONTH
  // ============================================================
  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // ============================================================
  // AUTH LOADING SCREEN
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />

        <span className="text-sm text-slate-400 font-medium">
          Verifying Firebase Authentication...
        </span>
      </div>
    );
  }

  // ============================================================
  // NOT LOGGED IN
  // ============================================================
  if (!currentUser) {
    return <LoginPage />;
  }

  // ============================================================
  // MAIN APPLICATION
  // ============================================================
  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-[#F8FAFC] selection:bg-blue-600 selection:text-white relative">

      {/* ========================================================
          BACKGROUND AMBIENCE
      ======================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">

        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl" />

        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-gradient-to-bl from-purple-600/10 via-fuchsia-600/5 to-transparent rounded-full blur-3xl" />

        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-blue-900/10 to-transparent rounded-full blur-3xl" />

      </div>

      {/* ========================================================
          LEFT SIDEBAR
      ======================================================== */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isHeaderVisible={isHeaderVisible}
        onToggleHeader={() =>
          setIsHeaderVisible(!isHeaderVisible)
        }
      />

      {/* ========================================================
          MAIN CONTENT AREA
      ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">

        {/* ======================================================
            TOP HEADER
        ====================================================== */}
        {isHeaderVisible ? (
          <Navbar
            currentTab={currentTab}
            onOpenSidebar={() =>
              setSidebarOpen(true)
            }
            systemDate={todayDateStr}
            onToggleHeader={() =>
              setIsHeaderVisible(false)
            }
          />
        ) : (
          /* ====================================================
             FLOATING ACTION BAR WHEN HEADER IS HIDDEN
          ==================================================== */
          <div className="sticky top-4 z-30 px-4 sm:px-8 flex items-center justify-between pointer-events-none mt-2">

            <button
              id="mobile-restore-menu-btn"
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="lg:hidden pointer-events-auto p-2 rounded-xl bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white shadow-xl backdrop-blur-xl cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="ml-auto pointer-events-auto">

              <button
                id="show-header-floating-btn"
                type="button"
                onClick={() =>
                  setIsHeaderVisible(true)
                }
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-blue-500/40 hover:border-blue-400 text-xs font-semibold shadow-2xl backdrop-blur-xl transition-all cursor-pointer"
                title="Restore top header"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />

                <span>
                  Show Header
                </span>
              </button>

            </div>
          </div>
        )}

        {/* ======================================================
            TOAST NOTIFICATION
        ====================================================== */}
        {toast && (
          <div className="fixed top-20 right-4 sm:right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-200">

            <div
              className={`flex items-center space-x-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                  : toast.type === 'warning'
                    ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-500/10'
                    : 'bg-blue-950/90 border-blue-500/40 text-blue-200 shadow-blue-500/10'
                }`}
            >

              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}

              {toast.type === 'warning' && (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}

              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
              )}

              <span className="text-xs sm:text-sm font-medium">
                {toast.message}
              </span>

              <button
                onClick={() =>
                  setToast(null)
                }
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

            </div>
          </div>
        )}

        {/* ======================================================
            MAIN VIEW AREA
        ====================================================== */}
        <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">

          {/* ====================================================
              VIEW 1: EMPLOYEE ATTENDANCE
          ==================================================== */}
          {currentTab === 'attendance' && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* =================================================
                  MONTHLY KPI STATS
              ================================================= */}
              {monthEvaluation && (
                <StatsRow
                  stats={monthEvaluation.stats}
                  monthName={formatMonthName(
                    year,
                    month
                  )}
                />
              )}

              {/* =================================================
                  CURRENT DAY BANNER
              ================================================= */}
              <CurrentDayBanner
                todayDateStr={todayDateStr}
                todayRecord={todayRecord}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onResetShift={handleResetShift}
                loadingAction={loadingAction}
              />

              {/* =================================================
                  MONTHLY INTERACTIVE CALENDAR
              ================================================= */}
              {monthEvaluation && (
                <MonthlyCalendarGrid
                  days={monthEvaluation.days}
                  year={year}
                  month={month}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onSelectDay={(day) =>
                    setSelectedDay(day)
                  }
                />
              )}

              {/* =================================================
                  DAY DETAIL MODAL
              ================================================= */}
              {selectedDay && (
                <DayDetailModal
                  day={selectedDay}
                  onClose={() =>
                    setSelectedDay(null)
                  }
                />
              )}

            </div>
          )}

          {/* ====================================================
              VIEW 2: ADMIN DASHBOARD
          ==================================================== */}
          {currentTab === 'admin' && isAdmin && (
            <AdminDashboard />
          )}

          {/* ====================================================
              VIEW 3: POLICY HANDBOOK
          ==================================================== */}
          {currentTab === 'policy' && (
            <PolicyHandbook />
          )}

        </main>

        {/* ======================================================
            FOOTER
        ====================================================== */}
        <footer className="relative z-10 border-t border-white/5 py-6 bg-[#0B0F19]/90 text-center text-xs text-slate-500">

          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">

            <span>
              ApexCorp Corporate Attendance & Leave System
            </span>

            <div className="flex items-center space-x-4 text-slate-400">

              <span className="flex items-center space-x-1">

                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                <span>
                  Firebase Connected
                </span>

              </span>

              <span>
                Policy: 2 Paid Leaves / Month
              </span>

            </div>
          </div>

        </footer>

      </div>
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  return (
    <AuthProvider>
      <AttendanceApp />
    </AuthProvider>
  );
}

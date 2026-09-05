import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../types.ts';
import {
  formatTimeDisplay,
  formatHoursWorked,
} from '../utils/attendanceCalculations.ts';

import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Database,
} from 'lucide-react';

interface CurrentDayBannerProps {
  todayDateStr: string; // e.g. "2026-09-04"
  todayRecord: AttendanceRecord | null;
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
  loadingAction: boolean;
}

export const CurrentDayBanner: React.FC<CurrentDayBannerProps> = ({
  todayDateStr,
  todayRecord,
  onCheckIn,
  onCheckOut,
  loadingAction,
}) => {
  const [liveTime, setLiveTime] = useState<string>('');

  // Live IST clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setLiveTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();

    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format today's date for display
  const [y, m, d] = (todayDateStr || '2026-09-04')
    .split('-')
    .map(Number);

  const todayDateObj = new Date(y, m - 1, d, 12, 0, 0);

  const formattedToday = todayDateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Attendance state
  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const isSunday = todayDateObj.getDay() === 0;

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-panel-elevated border border-white/15 mb-8 shadow-2xl">

      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/15 via-indigo-600/10 to-purple-600/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

        {/* =========================================================
            LEFT SIDE
            Date + Live Clock + Status
        ========================================================== */}
        <div className="space-y-3">

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Active Attendance Day */}
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Calendar className="w-3.5 h-3.5" />
              <span>Active Attendance Day</span>
            </span>

            {/* Sunday */}
            {isSunday && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>
                  Sunday Shift (+1 Holiday Credit Eligible)
                </span>
              </span>
            )}

            {/* Firestore */}
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Firestore: attendance_records</span>
            </span>

            {/* Rule */}
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-white/5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Rule 1 Active Day Enforced</span>
            </span>

          </div>

          {/* Date + Clock */}
          <div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formattedToday}
            </h1>

            <div className="flex items-center space-x-3 mt-1.5 text-slate-400 text-sm sm:text-base">

              {/* Live Clock */}
              <div className="flex items-center space-x-1.5 font-mono text-blue-400 font-semibold">

                <Clock className="w-4 h-4 text-blue-400 animate-pulse" />

                <span>
                  {liveTime || '09:00:00 AM'}
                </span>

              </div>

              <span>•</span>

              <span className="text-slate-300 text-xs sm:text-sm font-medium">
                Indian Standard Time (IST / UTC+5:30)
              </span>

            </div>

          </div>

        </div>

        {/* =========================================================
            RIGHT SIDE
            Attendance State Machine
        ========================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">

          {/* =====================================================
              STATE 1: NOT CHECKED IN
          ====================================================== */}
          {!isCheckedIn && !isCheckedOut && (
            <div className="flex flex-col sm:flex-row items-center gap-3">

              <button
                id="btn-check-in-now"
                onClick={onCheckIn}
                disabled={loadingAction}
                className="w-full sm:w-auto relative group flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >

                <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />

                <span>
                  Check In Now
                </span>

                <span className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-30 blur transition-opacity"></span>

              </button>

            </div>
          )}

          {/* =====================================================
              STATE 2: CHECKED IN / WAITING FOR CHECKOUT
          ====================================================== */}
          {isCheckedIn && !isCheckedOut && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/30">

              {/* Clocked In Information */}
              <div className="flex items-center space-x-3">

                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">

                  <Clock className="w-5 h-5 animate-spin-slow" />

                </div>

                <div>

                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    Clocked In Today
                  </div>

                  <div className="text-base font-bold text-white">
                    {formatTimeDisplay(todayRecord?.checkInTime)}
                  </div>

                </div>

              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

              {/* Check Out Button */}
              <div className="flex items-center space-x-2">

                <button
                  id="btn-check-out-now"
                  onClick={onCheckOut}
                  disabled={loadingAction}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/20 disabled:opacity-50 cursor-pointer"
                >

                  <LogOut className="w-4 h-4" />

                  <span>
                    Check Out (End Shift)
                  </span>

                </button>

              </div>

            </div>
          )}

          {/* =====================================================
              STATE 3: SHIFT COMPLETED
          ====================================================== */}
          {isCheckedIn && isCheckedOut && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">

              {/* Completed Status */}
              <div className="flex items-center space-x-4">

                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">

                  <CheckCircle2 className="w-6 h-6" />

                </div>

                <div>

                  <div className="flex items-center space-x-2">

                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Shift Completed
                    </span>

                    <span className="text-xs text-slate-400 font-mono">
                      {formatTimeDisplay(todayRecord?.checkInTime)}
                      {' – '}
                      {formatTimeDisplay(todayRecord?.checkOutTime)}
                    </span>

                  </div>

                  <div className="text-lg font-extrabold text-white mt-0.5 flex items-center space-x-1.5">

                    <span>
                      {formatHoursWorked(todayRecord?.hoursWorked)}
                    </span>

                    <span className="text-xs font-normal text-slate-400">
                      total work logged
                    </span>

                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* =========================================================
          FOOTER WARNING
          Rule 2: Incomplete Checkout
      ========================================================== */}
      {isCheckedIn && !isCheckedOut && (
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center space-x-2 text-xs text-amber-300/90">

          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />

          <span>

            <strong>
              Reminder:
            </strong>{' '}

            Please remember to clock out before 11:59 PM. Failing to check out tags this day as{' '}

            <strong className="text-amber-400">
              INCOMPLETE_CHECKOUT (Yellow)
            </strong>{' '}

            and excludes it from your Average Hours Logged In calculation.

          </span>

        </div>
      )}

    </div>
  );
};
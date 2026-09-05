import React, { useEffect, useMemo, useState } from 'react';
import { DayAttendanceInfo } from '../types.ts';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface MonthlyCalendarGridProps {
  days: DayAttendanceInfo[];
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: DayAttendanceInfo) => void;
}

export const MonthlyCalendarGrid: React.FC<MonthlyCalendarGridProps> = ({
  days,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
}) => {
  // ============================================================
  // CURRENT DATE - INDIA STANDARD TIME
  // ============================================================
  const getTodayIST = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  };

  // Keep today's date updated automatically.
  const [todayDateStr, setTodayDateStr] = useState(getTodayIST());

  useEffect(() => {
    const updateToday = () => {
      setTodayDateStr(getTodayIST());
    };

    updateToday();

    // Check every minute so date changes automatically at midnight IST.
    const interval = setInterval(updateToday, 60_000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // DATE HELPERS
  // ============================================================
  const pad = (value: number) => String(value).padStart(2, '0');

  const makeDateString = (y: number, m: number, d: number) => {
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  const getDateParts = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);

    return {
      year: y,
      month: m,
      day: d,
    };
  };

  const isDateToday = (dateString: string) => {
    return dateString === todayDateStr;
  };

  const isDatePast = (dateString: string) => {
    return dateString < todayDateStr;
  };

  const isDateFuture = (dateString: string) => {
    return dateString > todayDateStr;
  };

  // ============================================================
  // MONTH INFORMATION
  //
  // IMPORTANT:
  // This component expects month = 1 to 12.
  // ============================================================
  const monthDate = useMemo(() => {
    return new Date(year, month - 1, 1);
  }, [year, month]);

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(monthDate);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // ============================================================
  // CALCULATE CALENDAR OFFSET
  //
  // Monday = first column
  // Sunday = last column
  // ============================================================
  const firstDayOfWeek = monthDate.getDay();

  const leadingOffset = (firstDayOfWeek + 6) % 7;

  // ============================================================
  // CHECK WHETHER CURRENTLY DISPLAYED MONTH IS THIS MONTH
  // ============================================================
  const todayParts = getDateParts(todayDateStr);

  const isCurrentMonth =
    year === todayParts.year &&
    month === todayParts.month;

  // ============================================================
  // CHECK WHETHER DISPLAYED MONTH IS IN THE FUTURE
  // ============================================================
  const isFutureMonth =
    year > todayParts.year ||
    (year === todayParts.year && month > todayParts.month);

  // ============================================================
  // CHECK WHETHER DISPLAYED MONTH IS BEFORE CURRENT MONTH
  // ============================================================
  const isPastMonth =
    year < todayParts.year ||
    (year === todayParts.year && month < todayParts.month);

  // ============================================================
  // GO TO CURRENT MONTH
  //
  // We cannot directly change parent state because the parent owns
  // year/month. Instead, we can use the navigation callbacks.
  //
  // Number of month steps between current displayed month and today.
  // ============================================================
  const goToToday = () => {
    if (isCurrentMonth) {
      // If already on current month, scroll today's cell into view.
      setTimeout(() => {
        const element = document.getElementById(
          `calendar-day-${todayDateStr}`
        );

        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 50);

      return;
    }

    // Move backwards or forwards until current month.
    const displayedMonthIndex = year * 12 + (month - 1);
    const todayMonthIndex =
      todayParts.year * 12 + (todayParts.month - 1);

    const difference = todayMonthIndex - displayedMonthIndex;

    if (difference > 0) {
      for (let i = 0; i < difference; i++) {
        onNextMonth();
      }
    } else {
      for (let i = 0; i < Math.abs(difference); i++) {
        onPrevMonth();
      }
    }

    setTimeout(() => {
      const element = document.getElementById(
        `calendar-day-${todayDateStr}`
      );

      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 150);
  };

  // ============================================================
  // STATUS LABEL
  // ============================================================
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'Present';

      case 'CHECKED_IN':
        return 'Checked In';

      case 'INCOMPLETE_CHECKOUT':
        return 'Incomplete Checkout';

      case 'PAID_LEAVE':
        return 'Paid Leave';

      case 'UNPAID_LEAVE':
        return 'Unpaid Leave';

      case 'SUNDAY_WORKED':
        return 'Sunday Worked';

      case 'WEEKEND_OFF':
        return 'Weekly Off';

      case 'ABSENT':
        return 'Absent';

      case 'FUTURE':
        return 'Scheduled';

      case 'PRE_LAUNCH':
        return 'Not Started';

      default:
        return 'No Attendance';
    }
  };

  // ============================================================
  // GET STATUS ICON
  // ============================================================
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle2 className="w-3 h-3 text-blue-400" />;

      case 'CHECKED_IN':
        return (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        );

      case 'INCOMPLETE_CHECKOUT':
        return <AlertTriangle className="w-3 h-3 text-amber-400" />;

      case 'PAID_LEAVE':
        return <CheckCircle2 className="w-3 h-3 text-orange-400" />;

      case 'UNPAID_LEAVE':
        return <XCircle className="w-3 h-3 text-red-400" />;

      case 'SUNDAY_WORKED':
        return <Sparkles className="w-3 h-3 text-fuchsia-400" />;

      case 'WEEKEND_OFF':
        return <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />;

      case 'ABSENT':
        return <XCircle className="w-3 h-3 text-red-400" />;

      default:
        return <HelpCircle className="w-3 h-3 text-slate-500" />;
    }
  };

  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 shadow-2xl">

      {/* ========================================================
          CALENDAR HEADER
      ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">

        <div className="flex items-center space-x-3">

          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {monthName}
            </h2>

            <p className="text-xs text-slate-400">
              Attendance calendar with live daily status
            </p>
          </div>

        </div>

        {/* Month Controls */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">

          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${isCurrentMonth
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:border-blue-500/30'
              }`}
            title="Go to current month"
          >
            {isCurrentMonth ? 'Current Month' : 'Today'}
          </button>

          <button
            type="button"
            onClick={onNextMonth}
            disabled={isFutureMonth || isCurrentMonth}
            className={`p-2 rounded-xl bg-slate-900/80 border border-white/10 transition-colors ${isFutureMonth || isCurrentMonth
                ? 'text-slate-700 cursor-not-allowed opacity-50'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* ========================================================
          LIVE DATE INFORMATION
      ======================================================== */}
      <div className="mb-6 flex flex-wrap items-center gap-2">

        <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
          Today: {todayDateStr}
        </div>

        {isCurrentMonth && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
            Live Month
          </div>
        )}

        {isPastMonth && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/5 text-slate-400 text-xs font-medium">
            Historical Month
          </div>
        )}

        {isFutureMonth && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-slate-500 text-xs font-medium">
            Future Month
          </div>
        )}

      </div>

      {/* ========================================================
          STATUS LEGEND
      ======================================================== */}
      <div className="mb-6 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-wrap items-center gap-3 text-xs">

        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mr-1">
          Status:
        </span>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Present</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Checked In</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Incomplete Checkout</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          <span>Paid Leave</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span>Unpaid / Absent</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
          <Sparkles className="w-3 h-3 text-fuchsia-400" />
          <span>Sunday Worked</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 text-slate-400 border border-slate-700/40">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span>Weekly Off</span>
        </div>

      </div>

      {/* ========================================================
          WEEKDAY HEADER
      ======================================================== */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">

        {weekdays.map((day, index) => (
          <div
            key={day}
            className={`text-center py-2 text-xs font-semibold uppercase tracking-wider ${index === 6
                ? 'text-purple-400'
                : 'text-slate-400'
              }`}
          >
            {day}
          </div>
        ))}

      </div>

      {/* ========================================================
          CALENDAR GRID
      ======================================================== */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">

        {/* Empty cells before first day */}
        {Array.from({ length: leadingOffset }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="min-h-[100px] sm:min-h-[115px] rounded-2xl bg-slate-950/20 border border-transparent opacity-30"
          />
        ))}

        {/* ======================================================
            REAL ATTENDANCE DAYS
        ====================================================== */}
        {days.map((day) => {

          const {
            dayOfMonth,
            computedStatus,
            themeStyle,
            checkInTimeFormatted,
            checkOutTimeFormatted,
            hoursWorkedFormatted,
            isSunday,
          } = day;

          /*
           * IMPORTANT:
           * Use the actual date from the record rather than relying
           * on hardcoded September dates.
           */
          const dateString = day.dateString;

          const dayIsToday = isDateToday(dateString);
          const dayIsPast = isDatePast(dateString);
          const dayIsFuture = isDateFuture(dateString);

          /*
           * Some backend versions may return a status but no theme.
           * These fallback classes prevent the calendar from breaking.
           */
          const safeTheme = themeStyle || {
            bg: 'bg-slate-900/40',
            border: 'border-white/5',
            glow: '',
          };

          return (
            <div
              key={dateString}
              id={`calendar-day-${dateString}`}
              onClick={() => {
                if (dayIsToday) {
                  onSelectDay(day);
                }
              }}
              className={`
                group relative
                min-h-[100px] sm:min-h-[115px]
                p-2.5 sm:p-3
                rounded-2xl
                border
                transition-all duration-200
                ${dayIsToday
                  ? 'cursor-pointer'
                  : 'cursor-default'
                }
                flex flex-col justify-between

                ${safeTheme.bg}
                ${safeTheme.border}
                ${safeTheme.glow || ''}

                ${dayIsToday
                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0B0F19] shadow-lg shadow-blue-500/20'
                  : ''
                }

                ${dayIsFuture
                  ? 'opacity-60'
                  : ''
                }

                ${dayIsPast
                  ? 'hover:border-white/20 hover:scale-[1.01]'
                  : ''
                }
              `}
            >

              {/* =================================================
                  DAY NUMBER + BADGES
              ================================================= */}
              <div className="flex items-center justify-between gap-1">

                <span
                  className={`
                    text-sm sm:text-base
                    font-bold
                    tracking-tight

                    ${dayIsToday
                      ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30'
                      : isSunday
                        ? 'text-purple-400'
                        : 'text-slate-200'
                    }
                  `}
                >
                  {dayOfMonth}
                </span>

                <div className="flex items-center gap-1">

                  {dayIsToday && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white">
                      Today
                    </span>
                  )}

                  {computedStatus === 'SUNDAY_WORKED' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/50 flex items-center space-x-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-fuchsia-300" />
                      <span>+1</span>
                    </span>
                  )}

                </div>
              </div>

              {/* =================================================
                  ATTENDANCE DETAILS
              ================================================= */}
              <div className="mt-1 space-y-1">

                {/* PRESENT */}
                {computedStatus === 'PRESENT' && (
                  <div className="space-y-0.5">

                    {checkInTimeFormatted && (
                      <div className="text-[11px] font-medium text-blue-300 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>In: {checkInTimeFormatted}</span>
                      </div>
                    )}

                    {checkOutTimeFormatted && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Out: {checkOutTimeFormatted}
                      </div>
                    )}

                    {hoursWorkedFormatted && (
                      <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {hoursWorkedFormatted}
                      </span>
                    )}

                    {!checkInTimeFormatted && !checkOutTimeFormatted && dayIsPast && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <HelpCircle className="w-3 h-3" />
                        <span>No attendance data</span>
                      </div>
                    )}

                  </div>
                )}

                {/* CHECKED IN */}
                {computedStatus === 'CHECKED_IN' && (
                  <div className="space-y-1">

                    <div className="text-[11px] font-medium text-emerald-300 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>In: {checkInTimeFormatted || '--'}</span>
                    </div>

                    <div className="text-[9px] text-emerald-400/70">
                      Currently working
                    </div>

                  </div>
                )}

                {/* INCOMPLETE CHECKOUT */}
                {computedStatus === 'INCOMPLETE_CHECKOUT' && (
                  <div className="space-y-1">

                    <div className="text-[10px] font-bold text-amber-300 uppercase tracking-tight flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>No Checkout</span>
                    </div>

                    <div className="text-[10px] text-amber-300/80 font-mono">
                      In: {checkInTimeFormatted || '--'}
                    </div>

                  </div>
                )}

                {/* PAID LEAVE */}
                {computedStatus === 'PAID_LEAVE' && (
                  <div className="space-y-0.5">

                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-orange-400" />

                      <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
                        Paid Leave
                      </span>
                    </div>

                    {day.compensatedBySunday && (
                      <span className="text-[9px] text-orange-300/80 font-medium block">
                        Sunday credit applied
                      </span>
                    )}

                  </div>
                )}

                {/* UNPAID LEAVE */}
                {computedStatus === 'UNPAID_LEAVE' && (
                  <div className="space-y-0.5">

                    <div className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-400" />

                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        Unpaid Leave
                      </span>
                    </div>

                    <span className="text-[9px] text-red-300/70 font-medium block">
                      Exceeded quota
                    </span>

                  </div>
                )}

                {/* ABSENT */}
                {computedStatus === 'ABSENT' && (
                  <div className="space-y-0.5">

                    <div className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-400" />

                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        Absent
                      </span>
                    </div>

                    <span className="text-[9px] text-red-300/70">
                      No attendance recorded
                    </span>

                  </div>
                )}

                {/* SUNDAY WORKED */}
                {computedStatus === 'SUNDAY_WORKED' && (
                  <div className="space-y-0.5">

                    <div className="text-[10px] font-bold text-fuchsia-300 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" />
                      <span>Sunday Shift</span>
                    </div>

                    {checkInTimeFormatted && (
                      <div className="text-[9px] text-slate-300">
                        In: {checkInTimeFormatted}
                      </div>
                    )}

                    {checkOutTimeFormatted && (
                      <div className="text-[9px] text-slate-300">
                        Out: {checkOutTimeFormatted}
                      </div>
                    )}

                    <div className="text-[9px] text-fuchsia-300">
                      +1 compensation credit
                    </div>

                  </div>
                )}

                {/* WEEKEND OFF */}
                {computedStatus === 'WEEKEND_OFF' && (
                  <div className="space-y-1">

                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />

                      <span className="text-[10px] text-slate-500 font-medium">
                        Weekly Off
                      </span>
                    </div>

                  </div>
                )}

                {/* FUTURE */}
                {dayIsFuture && (
                  <span className="text-[10px] text-slate-600 font-medium block">
                    Scheduled
                  </span>
                )}

                {/* FALLBACK FOR PAST DAYS */}
                {dayIsPast &&
                  ![
                    'PRESENT',
                    'CHECKED_IN',
                    'INCOMPLETE_CHECKOUT',
                    'PAID_LEAVE',
                    'UNPAID_LEAVE',
                    'SUNDAY_WORKED',
                    'WEEKEND_OFF',
                    'ABSENT',
                    'FUTURE',
                    'PRE_LAUNCH',
                  ].includes(computedStatus) && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      {getStatusIcon(computedStatus)}
                      <span>{getStatusLabel(computedStatus)}</span>
                    </div>
                  )}

                {/* PREVIOUS DAY WITH NO DATA */}
                {dayIsPast &&
                  !computedStatus &&
                  !checkInTimeFormatted &&
                  !checkOutTimeFormatted && (
                    <div className="text-[10px] text-slate-500">
                      No attendance data
                    </div>
                  )}

                {/* TODAY WITH NO CHECK-IN */}
                {dayIsToday &&
                  !checkInTimeFormatted &&
                  !checkOutTimeFormatted &&
                  computedStatus !== 'PAID_LEAVE' &&
                  computedStatus !== 'UNPAID_LEAVE' &&
                  computedStatus !== 'WEEKEND_OFF' &&
                  computedStatus !== 'SUNDAY_WORKED' && (
                    <div className="text-[10px] text-slate-400/80 font-medium">
                      Not Clocked In
                    </div>
                  )}

              </div>

              {/* =================================================
                  HOVER INSPECT
              ================================================= */}
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">

                <span>
                  {dayIsPast ? 'View attendance' : 'Inspect'}
                </span>

                <span className="text-blue-400">
                  →
                </span>

              </div>

            </div>
          );
        })}

      </div>

      {/* ========================================================
          EMPTY MONTH MESSAGE
      ======================================================== */}
      {days.length === 0 && (
        <div className="py-16 text-center">

          <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />

          <p className="text-sm text-slate-400">
            No attendance data available for this month.
          </p>

        </div>
      )}

    </div>
  );
};

import React from 'react';
import { DayAttendanceInfo } from '../types.ts';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle
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
  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Calculate starting padding for calendar (Monday-first)
  // getDay(): 0 is Sunday, 1 is Monday...
  const firstDayOfWeek = monthDate.getDay(); 
  // Convert so Monday is 0, Sunday is 6
  const leadingOffset = (firstDayOfWeek + 6) % 7;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 shadow-2xl">
      
      {/* Calendar Header with Month Switcher */}
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
              Interactive corporate attendance matrix with automated quota tagging
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={onPrevMonth}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs font-semibold text-slate-300">
            {monthName}
          </div>
          <button
            onClick={onNextMonth}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Policy Visual Legend Bar */}
      <div className="mb-6 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mr-1">
          Color Status Key:
        </span>
        
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span>Normal Shift</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Incomplete Checkout (Yellow)</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 font-medium">
          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
          <span>Paid Leaves (Orange: 1 & 2)</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span>Unpaid Leave (Red: 3+)</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50 font-medium">
          <Sparkles className="w-3 h-3 text-fuchsia-400" />
          <span>Sunday Shift (Neon: +1 Credit)</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 text-slate-400 border border-slate-700/40">
          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          <span>Sunday Off</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 text-slate-500 border border-slate-800 font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
          <span>Pre-Launch (1 - 3 Sept)</span>
        </div>
      </div>

      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">
        {weekdays.map((day, idx) => (
          <div
            key={day}
            className={`text-center py-2 text-xs font-semibold uppercase tracking-wider ${
              idx === 6 ? 'text-purple-400' : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {/* Blank offset tiles for start of month */}
        {Array.from({ length: leadingOffset }).map((_, i) => (
          <div
            key={`empty-start-${i}`}
            className="min-h-[100px] sm:min-h-[115px] rounded-2xl bg-slate-950/20 border border-transparent opacity-30"
          />
        ))}

        {/* Real Days of the Month */}
        {days.map((day) => {
          const {
            dayOfMonth,
            isToday,
            computedStatus,
            themeStyle,
            checkInTimeFormatted,
            checkOutTimeFormatted,
            hoursWorkedFormatted,
            isSunday,
          } = day;

          return (
            <div
              key={day.dateString}
              id={`calendar-day-${day.dateString}`}
              onClick={() => onSelectDay(day)}
              className={`group relative min-h-[100px] sm:min-h-[115px] p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                themeStyle.bg
              } ${themeStyle.border} ${themeStyle.glow || ''} ${
                isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0B0F19]' : ''
              }`}
            >
              {/* Day Number and Badges */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm sm:text-base font-bold tracking-tight ${
                    isToday
                      ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md'
                      : isSunday
                      ? 'text-purple-400'
                      : 'text-slate-200'
                  }`}
                >
                  {dayOfMonth}
                </span>

                {/* Micro indicators for quick scanning */}
                {isToday && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white">
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

              {/* Attendance Details Box Inside Cell */}
              <div className="mt-1 space-y-1">
                {computedStatus === 'PRESENT' && (checkInTimeFormatted || checkOutTimeFormatted) && (
                  <div className="space-y-0.5">
                    {checkInTimeFormatted && (
                      <div className="text-[11px] font-medium text-blue-300 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>{checkInTimeFormatted}</span>
                      </div>
                    )}
                    {checkOutTimeFormatted && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Out: {checkOutTimeFormatted}
                      </div>
                    )}
                    {hoursWorkedFormatted && (
                      <span className="inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                        {hoursWorkedFormatted}
                      </span>
                    )}
                  </div>
                )}

                {isToday && !checkInTimeFormatted && (
                  <div className="text-[10px] text-slate-400/80 font-medium">
                    Not Clocked In
                  </div>
                )}

                {computedStatus === 'CHECKED_IN' && (
                  <div className="text-[11px] font-medium text-emerald-300 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>In: {checkInTimeFormatted}</span>
                  </div>
                )}

                {/* Incomplete Checkout (Yellow Alert) */}
                {computedStatus === 'INCOMPLETE_CHECKOUT' && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-amber-300 uppercase tracking-tight flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>No Checkout</span>
                    </div>
                    <div className="text-[10px] text-amber-300/80 font-mono">
                      In: {checkInTimeFormatted}
                    </div>
                  </div>
                )}

                {/* Paid Leave (Orange) */}
                {computedStatus === 'PAID_LEAVE' && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider block">
                      Paid Leave
                    </span>
                    {day.compensatedBySunday && (
                      <span className="text-[9px] text-orange-300/80 font-medium block">
                        Sunday credit applied
                      </span>
                    )}
                  </div>
                )}

                {/* Unpaid Leave (Red) */}
                {computedStatus === 'UNPAID_LEAVE' && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      Unpaid Leave
                    </span>
                    <span className="text-[9px] text-red-300/70 font-medium block">
                      Exceeded quota
                    </span>
                  </div>
                )}

                {/* Sunday Worked (Neon) */}
                {computedStatus === 'SUNDAY_WORKED' && (
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-fuchsia-300 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" />
                      <span>Sunday Shift</span>
                    </div>
                    <div className="text-[9px] text-slate-300">
                      {checkInTimeFormatted} – {checkOutTimeFormatted}
                    </div>
                  </div>
                )}

                {/* Weekend Off */}
                {computedStatus === 'WEEKEND_OFF' && (
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Weekly Off
                  </span>
                )}

                {/* Pre-Launch (1 - 3 Sept) */}
                {computedStatus === 'PRE_LAUNCH' && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      Pre-Launch
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono block">
                      Starts Sept 4
                    </span>
                  </div>
                )}

                {/* Future Workday */}
                {computedStatus === 'FUTURE' && (
                  <span className="text-[10px] text-slate-600 font-medium block">
                    Scheduled
                  </span>
                )}
              </div>

              {/* Hover indicator */}
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Inspect</span>
                <span className="text-blue-400">→</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

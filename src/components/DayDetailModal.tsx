import React from 'react';
import { DayAttendanceInfo } from '../types.ts';
import { 
  X, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  FileText,
  ArrowRight
} from 'lucide-react';

interface DayDetailModalProps {
  day: DayAttendanceInfo | null;
  onClose: () => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ day, onClose }) => {
  if (!day) return null;

  const dateObj = new Date(day.dateString);
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg rounded-3xl glass-panel-elevated p-6 sm:p-8 border border-white/15 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {formattedDate}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${day.themeStyle.badgeBg}`}>
                {day.statusLabel}
              </span>
              {day.isToday && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  Current Active Day
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timestamps & Hours Section */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Clock-In Time
            </span>
            <div className="text-base font-bold text-white mt-1 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{day.checkInTimeFormatted || (day.isToday ? 'Awaiting Clock-In' : 'None recorded')}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Clock-Out Time
            </span>
            <div className="text-base font-bold text-white mt-1 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>{day.checkOutTimeFormatted || (day.isToday ? (day.checkInTimeFormatted ? 'Awaiting Clock-Out' : 'Not Clocked In') : 'None recorded')}</span>
            </div>
          </div>
        </div>

        {day.hoursWorkedFormatted && (
          <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-between mb-6">
            <span className="text-xs text-blue-300 font-medium">Total Duration Logged</span>
            <span className="text-sm font-bold text-white font-mono">{day.hoursWorkedFormatted}</span>
          </div>
        )}

        {/* Policy Explanatory Note based on status */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2 mb-6">
          <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Attendance Policy Evaluation</span>
          </div>

          {day.computedStatus === 'INCOMPLETE_CHECKOUT' && (
            <div className="text-xs text-amber-300/90 space-y-1">
              <p className="font-semibold flex items-center space-x-1 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Rule 2: Yellow Alert Applied</span>
              </p>
              <p>
                An active check-in was registered at {day.checkInTimeFormatted}, but checkout was not completed before 11:59 PM.
              </p>
              <p className="text-amber-200 font-medium">
                Crucial Rule: This session is strictly excluded from your Monthly Average Hours Logged In calculation.
              </p>
            </div>
          )}

          {day.computedStatus === 'PAID_LEAVE' && (
            <div className="text-xs text-orange-300/90 space-y-1">
              <p className="font-semibold flex items-center space-x-1 text-orange-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Rule 4: Paid Holiday Allocation (Orange)</span>
              </p>
              <p>
                This absence is covered under the corporate 2-day monthly paid leave entitlement.
              </p>
              {day.compensatedBySunday && (
                <p className="text-fuchsia-300 font-medium flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Sunday Shift Compensation neutralized this day into a Paid Leave!</span>
                </p>
              )}
            </div>
          )}

          {day.computedStatus === 'UNPAID_LEAVE' && (
            <div className="text-xs text-red-300/90 space-y-1">
              <p className="font-semibold flex items-center space-x-1 text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Rule 4: Unpaid Leave Threshold (Red)</span>
              </p>
              <p>
                This absence occurred beyond the monthly paid leave quota. It is tagged in Red and subject to payroll leave deduction.
              </p>
              <p className="text-slate-400">
                Tip: Working a Sunday shift awards +1 holiday credit, which will automatically neutralize this back into an Orange paid day!
              </p>
            </div>
          )}

          {day.computedStatus === 'SUNDAY_WORKED' && (
            <div className="text-xs text-fuchsia-300/90 space-y-1">
              <p className="font-semibold flex items-center space-x-1 text-fuchsia-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rule 5: Sunday Shift Compensation (+1 Credit)</span>
              </p>
              <p>
                Completed a full Sunday shift. Standard Sundays are weekly offs, so this weekend work successfully earned <strong>+1 Paid Holiday Credit</strong>!
              </p>
            </div>
          )}

          {day.computedStatus === 'PRESENT' && (
            <p className="text-xs text-slate-300">
              Complete on-schedule attendance with valid check-in and checkout. Included in Average Hours Logged In calculation.
            </p>
          )}

          {day.computedStatus === 'WEEKEND_OFF' && (
            <p className="text-xs text-slate-400">
              Standard Sunday weekly off. Does not deduct from leave quota.
            </p>
          )}

          {day.computedStatus === 'PRE_LAUNCH' && (
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Pre-Portal Inception:</strong> Official system attendance operations commence on September 4, 2026. This date occurred prior to portal creation and does not consume leave balance or incur penalties.
            </p>
          )}

          {day.isToday && !day.checkInTimeFormatted && (
            <div className="text-xs text-blue-300/90 space-y-1">
              <p className="font-semibold text-blue-400">
                Rule 1: Active Attendance Day
              </p>
              <p>
                Today is the active attendance day ({day.dateString}). The member has not clocked in yet. Once clocked in and out, the logged shift hours and timestamps will reflect immediately.
              </p>
            </div>
          )}

          {day.computedStatus === 'FUTURE' && !day.isToday && (
            <p className="text-xs text-slate-400">
              Future scheduled workday. Under Rule 1 (Active Day Restrictions), check-in and check-out are locked until this day arrives.
            </p>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
        >
          Close Inspector
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Sparkles, 
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const PolicyHandbook: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-purple-500/20 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Corporate Attendance & Leave Policy
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Official employee handbook rules for daily check-in, leave quotas, and Sunday compensation credits.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Rule 1: Active Day Restrictions */}
        <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-white">Active Day Restrictions</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            An employee can <strong>only</strong> click &quot;Check In&quot; or &quot;Check Out&quot; on the exact current calendar day.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-400 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Checking in/out for past or future dates is strictly disabled by system middleware.</span>
          </div>
        </div>

        {/* Rule 2: Missing Checkout Handling (Yellow Alert) */}
        <div className="rounded-3xl glass-panel p-6 border border-amber-500/20 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Missing Checkout Handling</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Yellow Alert
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If an employee checks in on a day but does not check out before 11:59 PM, the record status automatically flips to <strong className="text-amber-400">INCOMPLETE_CHECKOUT</strong>.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 space-y-1">
            <div className="font-semibold flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Crucial Policy Requirement:</span>
            </div>
            <p>
              Incomplete sessions are displayed tagged in <strong>Yellow</strong> showing only check-in time, and are <strong>strictly excluded</strong> from the employee&apos;s Average Hours Logged In calculation.
            </p>
          </div>
        </div>

        {/* Rule 3: Absences & Past Dates */}
        <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-white">Absences & Past Dates</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Any past working weekday (Monday through Saturday) where the employee never logged in automatically registers as <strong className="text-slate-200">ABSENT</strong>.
          </p>
          <p className="text-xs text-slate-400">
            Past absences are sequentially processed through the monthly leave quota engine to evaluate paid vs. unpaid leave status.
          </p>
        </div>

        {/* Rule 4: Holidays & Leave Allocation (Orange vs. Red) */}
        <div className="rounded-3xl glass-panel p-6 border border-orange-500/20 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Leave Allocation Thresholds</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Orange vs. Red
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The standard corporate policy allows <strong>2 paid holidays</strong> per calendar month.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/30 text-orange-300">
              <span className="font-bold block">Days 1 & 2 (Orange)</span>
              <span className="text-[11px] text-orange-300/80">Paid Leave. Covered under baseline monthly quota.</span>
            </div>
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300">
              <span className="font-bold block">Day 3+ (Red)</span>
              <span className="text-[11px] text-red-300/80">Unpaid Leave. Deducted from payroll.</span>
            </div>
          </div>
        </div>

        {/* Rule 5: Sunday Shift Compensation (Exemption) */}
        <div className="md:col-span-2 rounded-3xl glass-panel p-6 sm:p-8 border border-fuchsia-500/30 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-sm">
              5
            </div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Sunday Shift Compensation (Exemption Policy)</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                Neon Highlight
              </span>
            </h3>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Sundays are designated weekly rest days and do not count toward leaves. When an employee clocks in and successfully clocks out on a Sunday, the system automatically awards <strong>+1 Paid Holiday Credit</strong>.
          </p>

          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-fuchsia-400 shrink-0" />
              <span>
                <strong>Threshold Reversal:</strong> The +1 credit expands the paid leave allowance (from 2 to 3, 4, etc.), neutralizing a weekday absence and preventing or reversing an Orange absence from crossing into Red!
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

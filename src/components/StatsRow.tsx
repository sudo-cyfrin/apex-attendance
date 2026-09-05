import React from 'react';
import { MonthlyStats } from '../types.ts';
import { Clock, CalendarCheck, AlertTriangle, Sparkles, HelpCircle, ShieldAlert } from 'lucide-react';

interface StatsRowProps {
  stats: MonthlyStats;
  monthName: string;
}

export const StatsRow: React.FC<StatsRowProps> = ({ stats, monthName }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* KPI 1: Average Hours Logged In */}
      <div className="relative group overflow-hidden rounded-2xl p-5 glass-card border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Avg Hours Logged In
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            {stats.averageHoursLoggedIn || '0h'}
          </span>
          <span className="text-xs text-slate-400">/ completed shift</span>
        </div>
        <div className="mt-2 flex items-center space-x-1.5 text-xs text-blue-400/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>{stats.validCheckoutSessionsCount} valid checkout sessions</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Incomplete checkouts are strictly excluded.
        </p>
      </div>

      {/* KPI 2: Paid Leaves Used */}
      <div className="relative group overflow-hidden rounded-2xl p-5 glass-card border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Paid Leaves Used
          </span>
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {stats.paidLeavesUsed}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            / {stats.paidLeavesAllowance} allowed
          </span>
        </div>
        <div className="mt-2 flex items-center space-x-1.5 text-xs text-orange-400/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
          <span>Orange Tagged in Calendar</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Base: 2/mo {stats.sundayCompensationsEarned > 0 && `+ ${stats.sundayCompensationsEarned} Sunday shift credit`}
        </p>
      </div>

      {/* KPI 3: Unpaid Leaves */}
      <div className="relative group overflow-hidden rounded-2xl p-5 glass-card border border-red-500/20 hover:border-red-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Unpaid Leaves
          </span>
          <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {stats.unpaidLeaves}
          </span>
          <span className="text-sm font-medium text-slate-400">days</span>
        </div>
        <div className="mt-2 flex items-center space-x-1.5 text-xs text-red-400/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          <span>Red Tagged (Excess &gt; {stats.paidLeavesAllowance})</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Salary deduction applies for days beyond quota.
        </p>
      </div>

      {/* KPI 4: Sunday Compensations Earned */}
      <div className="relative group overflow-hidden rounded-2xl p-5 glass-card border border-purple-500/25 hover:border-purple-500/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Sunday Compensations
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-fuchsia-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-300">
            +{stats.sundayCompensationsEarned}
          </span>
          <span className="text-sm font-semibold text-slate-400">Credits</span>
        </div>
        <div className="mt-2 flex items-center space-x-1.5 text-xs text-fuchsia-400/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
          <span>Exempts / neutralizes weekday leave</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Earned by full clock in & out on Sunday.
        </p>
      </div>

    </div>
  );
};

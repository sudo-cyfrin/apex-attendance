import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { User, DayAttendanceInfo, MonthEvaluationResult } from '../types.ts';
import {
  ShieldAlert,
  Search,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Eye,
  X,
  Plus,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { MonthlyCalendarGrid } from './MonthlyCalendarGrid.tsx';
import { StatsRow } from './StatsRow.tsx';
import { DayDetailModal } from './DayDetailModal.tsx';

interface EmployeeSummaryData {
  user: User;
  stats: {
    averageHoursLoggedIn?: string;
    averageCheckInTime: string;
    validCheckoutSessionsCount: number;
    paidLeavesUsed: number;
    paidLeavesAllowance: number;
    unpaidLeaves: number;
    sundayCompensationsEarned: number;
    incompleteCheckoutsCount: number;
    totalHoursWorked: number;
  };
  todayRecord: any;
  todayStatus: string;
}

export const AdminDashboard: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  const [employees, setEmployees] = useState<EmployeeSummaryData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // New Employee Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');
  const [newEmpTitle, setNewEmpTitle] = useState('Senior Engineer');
  const [isAdding, setIsAdding] = useState(false);

  // Slide-over inspect state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );

  const [employeeDetails, setEmployeeDetails] = useState<{
    employee: User;
    year: number;
    month: number;
    evaluation: MonthEvaluationResult;
  } | null>(null);

  const [inspectDay, setInspectDay] = useState<DayAttendanceInfo | null>(null);

  // Fetch admin summary
  const fetchEmployees = async () => {
    if (!isAdmin || !currentUser) return;

    setLoading(true);

    try {
      const res = await fetch('/api/admin/employees', {
        headers: {
          'x-user-role': currentUser.role,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawList = data.employees || [];

      const seen = new Set<string>();

      const deduped = rawList.filter((item: any) => {
        const key = (
          item.user?.email ||
          item.user?.id ||
          ''
        )
          .toLowerCase()
          .trim();

        if (!key || seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });

      setEmployees(deduped);
    } catch (err) {
      console.error(
        'Failed to load admin employees:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [isAdmin, currentUser]);

  // Load detailed employee attendance for slide-over
  const inspectEmployee = async (employeeId: string) => {
    if (!currentUser) return;

    setSelectedEmployeeId(employeeId);

    try {
      const res = await fetch(
        `/api/admin/employee/${employeeId}/attendance`,
        {
          headers: {
            'x-user-role': currentUser.role,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setEmployeeDetails(data);
      }
    } catch (err) {
      console.error(
        'Failed to load employee details:',
        err
      );
    }
  };

  // Add new employee
  const handleAddEmployee = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !newEmpName ||
      !newEmpEmail ||
      !currentUser
    ) {
      return;
    }

    setIsAdding(true);

    try {
      const cleanEmail = newEmpEmail
        .trim()
        .toLowerCase();

      const res = await fetch(
        '/api/admin/employees',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser.role,
          },
          body: JSON.stringify({
            name: newEmpName.trim(),
            email: cleanEmail,
            department: newEmpDept,
            jobTitle: newEmpTitle,
            role: 'EMPLOYEE',
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();

        if (data.user) {
          // Also persist directly to Firestore collection
          try {
            await setDoc(
              doc(db, 'users', data.user.id),
              {
                ...data.user,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }
            );
          } catch (fsErr) {
            console.warn(
              'Firestore employee write notice:',
              fsErr
            );
          }
        }

        setShowAddModal(false);
        setNewEmpName('');
        setNewEmpEmail('');

        fetchEmployees();
      }
    } catch (err) {
      console.error(
        'Failed to add employee:',
        err
      );
    } finally {
      setIsAdding(false);
    }
  };

  // 403 Forbidden Screen if non-admin attempts access
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="rounded-3xl bg-[#0F172A]/80 p-8 sm:p-12 border border-red-500/30 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
            Restricted Admin Area
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-4 tracking-tight">
            Administrator Access Required
          </h2>

          <p className="text-slate-400 max-w-md mx-auto mt-3 text-sm leading-relaxed">
            The Master Corporate Attendance Dashboard
            is reserved strictly for authenticated
            system administrators. Your account (
            {currentUser?.email}
            ) does not have administrative privileges.
          </p>
        </div>
      </div>
    );
  }

  // Filter employees
  const filteredEmployees = employees.filter(
    (item) => {
      const dept =
        item.user.department || 'General';

      const matchesSearch =
        item.user.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.user.email
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        dept
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.user.employeeCode
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesDept =
        departmentFilter === 'ALL' ||
        dept === departmentFilter;

      return matchesSearch && matchesDept;
    }
  );

  const dynamicDepts = Array.from(
    new Set(
      employees
        .map(
          (e) =>
            e.user.department || 'General'
        )
        .filter(Boolean)
    )
  );

  const departments = [
    'ALL',
    ...dynamicDepts,
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[#0F172A]/80 backdrop-blur-xl border border-purple-500/20 shadow-xl">

        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-600/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          <div>
            <div className="flex items-center space-x-2">

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Executive Access
              </span>

              <span className="text-xs text-slate-400">
                September 2026
              </span>

            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Master Attendance Dashboard
            </h1>

            <p className="text-slate-400 text-sm mt-1">
              Real-time employee clock status,
              automated leave balance audit, and
              yellow alert oversight.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">

            {/* Sync Cloud DB */}
            <button
              id="admin-sync-db-btn"
              type="button"
              onClick={fetchEmployees}
              disabled={loading}
              title="Pull latest employee registrations directly from Firebase Firestore"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loading
                    ? 'animate-spin text-purple-400'
                    : ''
                }`}
              />

              <span>
                Sync Cloud DB
              </span>
            </button>

            {/* Add Employee */}
            <button
              id="admin-add-employee-btn"
              type="button"
              onClick={() =>
                setShowAddModal(true)
              }
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />

              <span>
                Add Employee
              </span>
            </button>

            {/* Staff Roster */}
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-right">

              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Staff Roster
              </span>

              <span className="text-base font-bold text-white font-mono">
                {employees.length} Members
              </span>

            </div>

          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">

        {/* Search Input */}
        <div className="relative flex-1">

          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />

          <input
            id="admin-search-employee-input"
            type="text"
            placeholder="Search by employee name, code, email, or department..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/70 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 transition-colors"
          />

        </div>

        {/* Department Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">

          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />

          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() =>
                setDepartmentFilter(dept)
              }
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                departmentFilter === dept
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-white/5'
              }`}
            >
              {dept === 'ALL'
                ? 'All Departments'
                : dept}
            </button>
          ))}

        </div>
      </div>

      {/* Master Employee Table */}
      <div className="rounded-3xl bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">

        {loading ? (

          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">

            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />

            <span className="text-xs">
              Loading employee attendance records...
            </span>

          </div>

        ) : filteredEmployees.length === 0 ? (

          <div className="py-16 px-6 text-center text-slate-400 flex flex-col items-center justify-center">

            <Users className="w-12 h-12 text-slate-600 mb-3" />

            <h3 className="text-lg font-semibold text-white mb-1">
              No Team Members Found
            </h3>

            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Registered employees will automatically
              appear here once authenticated, or you
              can register new team members manually.
            </p>

            <button
              onClick={() =>
                setShowAddModal(true)
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />

              <span>
                Add First Team Member
              </span>
            </button>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>
                <tr className="border-b border-white/10 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">

                  <th className="py-4 px-6">
                    Employee Name
                  </th>

                  <th className="py-4 px-4">
                    Department
                  </th>

                  <th className="py-4 px-4">
                    Month Hours
                  </th>

                  <th className="py-4 px-4">
                    Leaves Taken (Orange/Red)
                  </th>

                  <th className="py-4 px-4">
                    Incomplete Logs
                  </th>

                  <th className="py-4 px-4">
                    Today Status
                  </th>

                  <th className="py-4 px-6 text-right">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-sm">

                {filteredEmployees.map((emp) => {

                  const isClockedInToday =
                    emp.todayStatus ===
                    'CHECKED_IN';

                  const isCompletedToday =
                    emp.todayStatus ===
                    'PRESENT';

                  return (
                    <tr
                      key={emp.user.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() =>
                        inspectEmployee(
                          emp.user.id
                        )
                      }
                    >

                      {/* Name & Code */}
                      <td className="py-4 px-6">

                        <div className="flex items-center space-x-3">

                          <img
                            src={
                              emp.user.avatarUrl
                            }
                            alt={
                              emp.user.name
                            }
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                          />

                          <div>

                            <div className="flex items-center space-x-2">

                              <span className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                                {emp.user.name}
                              </span>

                              {emp.user.role ===
                                'ADMIN' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  ADMIN
                                </span>
                              )}

                            </div>

                            <div className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">

                              <span className="font-mono text-[11px] text-slate-400">
                                {
                                  emp.user
                                    .employeeCode
                                }
                              </span>

                              <span>•</span>

                              <span>
                                {
                                  emp.user.email
                                }
                              </span>

                            </div>

                          </div>

                        </div>

                      </td>

                      {/* Department */}
                      <td className="py-4 px-4">

                        <div className="text-xs font-medium text-slate-300">
                          {
                            emp.user
                              .department ||
                            'General'
                          }
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {
                            emp.user
                              .jobTitle ||
                            (emp.user.role ===
                            'ADMIN'
                              ? 'System Administrator'
                              : 'Staff Member')
                          }
                        </div>

                      </td>

                      {/* Month Hours */}
                      <td className="py-4 px-4">

                        <div className="font-mono font-semibold text-white">
                          {
                            emp.stats
                              .totalHoursWorked
                          }
                          h
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Avg:{' '}
                          {
                            emp.stats
                              .averageHoursLoggedIn ||
                            '0h'
                          }
                          /shift
                        </div>

                      </td>

                      {/* Leaves Taken */}
                      <td className="py-4 px-4">

                        <div className="flex items-center space-x-2">

                          {/* Paid Leaves */}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            {
                              emp.stats
                                .paidLeavesUsed
                            }{' '}
                            Paid
                          </span>

                          {/* Unpaid Leaves */}
                          {emp.stats
                            .unpaidLeaves >
                          0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                              {
                                emp.stats
                                  .unpaidLeaves
                              }{' '}
                              Unpaid
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              0 Unpaid
                            </span>
                          )}

                          {/* Sunday credit bonus */}
                          {emp.stats
                            .sundayCompensationsEarned >
                            0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                              +
                              {
                                emp.stats
                                  .sundayCompensationsEarned
                              }{' '}
                              Sun
                            </span>
                          )}

                        </div>

                      </td>

                      {/* Incomplete Logs */}
                      <td className="py-4 px-4">

                        {emp.stats
                          .incompleteCheckoutsCount >
                        0 ? (

                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">

                            <AlertTriangle className="w-3 h-3" />

                            <span>
                              {
                                emp.stats
                                  .incompleteCheckoutsCount
                              }{' '}
                              Missed 11:59PM
                            </span>

                          </span>

                        ) : (

                          <span className="text-xs text-slate-400">
                            Clean (0)
                          </span>

                        )}

                      </td>

                      {/* Today Status */}
                      <td className="py-4 px-4">

                        {isClockedInToday && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">

                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>

                            <span>
                              Clocked In
                            </span>

                          </span>
                        )}

                        {isCompletedToday && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">

                            <CheckCircle2 className="w-3 h-3" />

                            <span>
                              Shift Done
                            </span>

                          </span>
                        )}

                        {!isClockedInToday &&
                          !isCompletedToday && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-white/5">
                              Not Clocked In
                            </span>
                          )}

                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            inspectEmployee(
                              emp.user.id
                            );
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />

                          <span>
                            Inspect
                          </span>
                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>
            </table>

          </div>

        )}

      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">

          <div className="w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl relative">

            <button
              onClick={() =>
                setShowAddModal(false)
              }
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-white mb-1">
              Add Team Member
            </h3>

            <p className="text-xs text-slate-400 mb-4">
              Register a corporate team member to
              track monthly attendance and shift
              compensation.
            </p>

            <form
              onSubmit={handleAddEmployee}
              className="space-y-3.5"
            >

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="e.g. Rachel Adams"
                  value={newEmpName}
                  onChange={(e) =>
                    setNewEmpName(e.target.value)
                  }
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Corporate Email
                </label>

                <input
                  type="email"
                  placeholder="e.g. rachel@apexcorp.internal"
                  value={newEmpEmail}
                  onChange={(e) =>
                    setNewEmpEmail(e.target.value)
                  }
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Department
                </label>

                <select
                  value={newEmpDept}
                  onChange={(e) =>
                    setNewEmpDept(e.target.value)
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Engineering">
                    Engineering
                  </option>

                  <option value="Product Design">
                    Product Design
                  </option>

                  <option value="Cloud Operations">
                    Cloud Operations
                  </option>

                  <option value="People & Talent">
                    People & Talent
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Job Title
                </label>

                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={newEmpTitle}
                  onChange={(e) =>
                    setNewEmpTitle(e.target.value)
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                >
                  {isAdding
                    ? 'Adding...'
                    : 'Register Employee'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* Slide-over Inspection Panel */}
      {selectedEmployeeId &&
        employeeDetails && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">

              <div className="w-screen max-w-4xl bg-[#0F172A] border-l border-white/10 shadow-2xl p-6 sm:p-8 overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">

                  <div className="flex items-center space-x-4">

                    <img
                      src={
                        employeeDetails
                          .employee.avatarUrl
                      }
                      alt={
                        employeeDetails
                          .employee.name
                      }
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-500/40"
                    />

                    <div>

                      <div className="flex items-center space-x-2">

                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                          {
                            employeeDetails
                              .employee.name
                          }
                        </h2>

                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/20 text-purple-300">
                          {
                            employeeDetails
                              .employee
                              .employeeCode
                          }
                        </span>

                      </div>

                      <p className="text-xs text-slate-400">
                        {
                          employeeDetails
                            .employee.jobTitle
                        }{' '}
                        •{' '}
                        {
                          employeeDetails
                            .employee
                            .department
                        }
                      </p>

                    </div>

                  </div>

                  <button
                    id="btn-close-admin-slideover"
                    onClick={() =>
                      setSelectedEmployeeId(
                        null
                      )
                    }
                    className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                </div>

                {/* Monthly KPI Stats Row */}
                <StatsRow
                  stats={
                    employeeDetails
                      .evaluation.stats
                  }
                  monthName="September 2026"
                />

                {/* Sunday Shift Compensation Audit Trail */}
                {employeeDetails.evaluation
                  .leaveAudits.length > 0 && (
                  <div className="mb-6 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">

                    <div className="flex items-center space-x-2 text-xs font-bold text-fuchsia-300 uppercase tracking-wider mb-2">

                      <Sparkles className="w-4 h-4 text-fuchsia-400" />

                      <span>
                        Sunday Shift Compensation
                        Audit Trail
                      </span>

                    </div>

                    <div className="space-y-2">

                      {employeeDetails.evaluation.leaveAudits.map(
                        (audit) => (
                          <div
                            key={audit.id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 text-xs text-slate-300 flex items-center justify-between"
                          >

                            <div>

                              <div className="font-semibold text-white">
                                {audit.reason}
                              </div>

                              <div className="text-[11px] text-fuchsia-300/80 mt-0.5">
                                Credit: +
                                {
                                  audit.creditAmount
                                }{' '}
                                Paid Holiday •
                                Neutralizes leave
                                threshold
                              </div>

                            </div>

                            {audit.appliedToLeaveDate && (
                              <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-semibold">
                                Applied to{' '}
                                {
                                  audit.appliedToLeaveDate
                                }
                              </span>
                            )}

                          </div>
                        )
                      )}

                    </div>
                  </div>
                )}

                {/* Full Month Interactive Calendar */}
                <MonthlyCalendarGrid
                  days={
                    employeeDetails
                      .evaluation.days
                  }
                  year={
                    employeeDetails.year
                  }
                  month={
                    employeeDetails.month
                  }
                  onPrevMonth={() => {}}
                  onNextMonth={() => {}}
                  onSelectDay={(day) =>
                    setInspectDay(day)
                  }
                />

                {/* Day Inspector Modal */}
                {inspectDay && (
                  <DayDetailModal
                    day={inspectDay}
                    onClose={() =>
                      setInspectDay(null)
                    }
                  />
                )}

              </div>
            </div>
          </div>
        )}

    </div>
  );
};
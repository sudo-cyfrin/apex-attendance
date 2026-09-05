export type Role = 'EMPLOYEE' | 'ADMIN';

export type AttendanceStatus =
  | 'PRESENT'              // Checked in & checked out successfully
  | 'CHECKED_IN'          // Currently clocked in (active today)
  | 'INCOMPLETE_CHECKOUT'  // Checked in on past day but missed checkout before 23:59 (YELLOW)
  | 'ABSENT'               // Past weekday without attendance (evaluates to PAID_LEAVE or UNPAID_LEAVE)
  | 'PAID_LEAVE'           // 1st or 2nd leave of the month (ORANGE) or neutralized by Sunday shift
  | 'UNPAID_LEAVE'         // 3rd+ leave of the month (RED)
  | 'WEEKEND_OFF'          // Sunday not worked (Muted dark slate)
  | 'SUNDAY_WORKED'        // Sunday worked with complete check-in & check-out (NEON)
  | 'PRE_LAUNCH'           // Pre-portal launch days (Sept 1 - 4, 2026) - Inactive Gray
  | 'FUTURE';              // Upcoming day in month

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  jobTitle: string;
  avatarUrl?: string;
  employeeCode: string;
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // Format: YYYY-MM-DD
  checkInTime: string | null; // ISO string or HH:mm:ss
  checkOutTime: string | null; // ISO string or HH:mm:ss
  status: AttendanceStatus;
  hoursWorked: number | null; // Float hours, e.g., 8.5
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveCreditAudit {
  id: string;
  userId: string;
  sourceDate: string; // The Sunday worked date YYYY-MM-DD
  creditAmount: number; // typically +1
  reason: string; // e.g. "Sunday Shift Compensation for 2026-09-06"
  appliedToLeaveDate?: string | null; // The weekday absence it neutralized
  createdAt: string;
}

export interface DayAttendanceInfo {
  dateString: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isSunday: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  record?: AttendanceRecord;
  computedStatus: AttendanceStatus;
  statusLabel: string;
  themeStyle: {
    bg: string;
    text: string;
    border: string;
    glow?: string;
    badgeBg: string;
  };
  checkInTimeFormatted?: string;
  checkOutTimeFormatted?: string;
  hoursWorkedFormatted?: string;
  compensatedBySunday?: boolean;
}

export interface MonthlyStats {
  averageHoursLoggedIn: string; // Formatted e.g. "8h 15m" or "0h"
  averageHoursDecimal: number; // e.g. 8.25
  averageCheckInTime: string; // Formatted e.g. "09:12 AM" or "N/A"
  validCheckoutSessionsCount: number;
  paidLeavesUsed: number;
  paidLeavesAllowance: number; // Base 2 + Sunday compensations earned
  unpaidLeaves: number;
  sundayCompensationsEarned: number;
  incompleteCheckoutsCount: number;
  totalWorkingDaysPassed: number;
  presentDaysCount: number;
  totalHoursWorked: number;
}

export interface MonthEvaluationResult {
  days: DayAttendanceInfo[];
  stats: MonthlyStats;
  leaveAudits: LeaveCreditAudit[];
}

export interface EmployeeSummary {
  user: User;
  stats: MonthlyStats;
  todayRecord?: AttendanceRecord;
  todayStatus: AttendanceStatus;
}

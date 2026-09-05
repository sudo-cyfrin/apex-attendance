import { AttendanceRecord, AttendanceStatus, DayAttendanceInfo, LeaveCreditAudit, MonthEvaluationResult, MonthlyStats } from '../types.ts';

export const TIMEZONE_IST = 'Asia/Kolkata';
export const SYSTEM_LAUNCH_DATE = '2026-09-04';

/**
 * Returns current date string in IST (YYYY-MM-DD)
 */
export function getISTDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Parses an ISO date string or HH:mm time string into minutes past midnight in IST.
 * e.g., "2026-09-05T09:15:00.000Z" -> converts to IST minutes
 */
export function timeStringToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  try {
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return null;
      const istParts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE_IST,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(date);
      const h = parseInt(istParts.find((p) => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(istParts.find((p) => p.type === 'minute')?.value || '0', 10);
      const s = parseInt(istParts.find((p) => p.type === 'second')?.value || '0', 10);
      return (h % 24) * 60 + m + s / 60;
    }
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  } catch {
    return null;
  }
}

/**
 * Formats minutes from midnight into 12-hour AM/PM string, e.g. 555 -> "09:15 AM"
 */
export function minutesToTimeString(minutesTotal: number): string {
  const rounded = Math.round(minutesTotal);
  const hours24 = Math.floor(rounded / 60) % 24;
  const mins = rounded % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const padHours = hours12 < 10 ? `0${hours12}` : `${hours12}`;
  const padMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${padHours}:${padMins} ${ampm}`;
}

/**
 * Formats a raw timestamp or time string for display in IST (e.g., "09:30 AM")
 */
export function formatTimeDisplay(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--';
  try {
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: TIMEZONE_IST,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(date);
      }
    }
    const mins = timeStringToMinutes(timeStr);
    if (mins === null) return '--:--';
    return minutesToTimeString(mins);
  } catch {
    return '--:--';
  }
}

/**
 * Formats decimal hours into a clean string, e.g. 8.5 -> "8h 30m", 0.017 -> "1m"
 */
export function formatHoursWorked(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours) || hours <= 0) return '0h';
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) {
    const totalSeconds = Math.round(hours * 3600);
    return totalSeconds > 0 ? `${totalSeconds}s` : '< 1m';
  }
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Calculates Average Hours Logged In per completed shift.
 * CRITICAL POLICY:
 * Incomplete checkouts (where checkOutTime is missing or null) are STRICTLY EXCLUDED.
 * Only records with valid check-in AND valid check-out are counted.
 */
export function calculateAverageHoursLoggedIn(records: AttendanceRecord[]): {
  averageHoursFormatted: string;
  averageHoursDecimal: number;
  validSessionsCount: number;
} {
  let totalHours = 0;
  let validSessionsCount = 0;

  for (const record of records) {
    // Exclude if checkout is missing or incomplete
    if (!record.checkInTime || !record.checkOutTime || record.status === 'INCOMPLETE_CHECKOUT') {
      continue;
    }

    let hours = record.hoursWorked;
    const inMs = new Date(record.checkInTime).getTime();
    const outMs = new Date(record.checkOutTime).getTime();

    // If timestamps are valid, ensure real duration is used if hours was defaulted or missing
    if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
      const actualHours = (outMs - inMs) / (1000 * 60 * 60);
      if (hours === 8.25 && actualHours < 0.1) {
        hours = actualHours;
      } else if (hours === undefined || hours === null || isNaN(hours)) {
        hours = actualHours;
      }
    }

    if (hours !== undefined && hours !== null && !isNaN(hours) && hours >= 0) {
      totalHours += hours;
      validSessionsCount++;
    }
  }

  if (validSessionsCount === 0) {
    return {
      averageHoursFormatted: '0h',
      averageHoursDecimal: 0,
      validSessionsCount: 0,
    };
  }

  const avgDecimal = Math.round((totalHours / validSessionsCount) * 100) / 100;
  return {
    averageHoursFormatted: formatHoursWorked(avgDecimal),
    averageHoursDecimal: avgDecimal,
    validSessionsCount,
  };
}

/**
 * Calculates Average Check-in Time.
 * CRITICAL POLICY:
 * Incomplete checkouts (where checkOutTime is missing or null) are STRICTLY EXCLUDED.
 * Only records with valid check-in AND valid check-out are counted.
 */
export function calculateAverageCheckInTime(records: AttendanceRecord[]): {
  averageTimeFormatted: string;
  validSessionsCount: number;
} {
  const validCheckIns: number[] = [];

  for (const record of records) {
    // Exclude if checkout is missing or incomplete
    if (!record.checkInTime || !record.checkOutTime) {
      continue;
    }
    if (record.status === 'INCOMPLETE_CHECKOUT') {
      continue;
    }

    const minutes = timeStringToMinutes(record.checkInTime);
    if (minutes !== null) {
      validCheckIns.push(minutes);
    }
  }

  if (validCheckIns.length === 0) {
    return {
      averageTimeFormatted: 'No valid sessions',
      validSessionsCount: 0,
    };
  }

  const sum = validCheckIns.reduce((acc, curr) => acc + curr, 0);
  const avgMinutes = sum / validCheckIns.length;

  return {
    averageTimeFormatted: minutesToTimeString(avgMinutes),
    validSessionsCount: validCheckIns.length,
  };
}

/**
 * Evaluates an entire month's attendance for an employee based on corporate rules:
 * 1. Active day restrictions: Only current day allows Check In / Check Out.
 * 2. Missing checkout handling: Past check-ins without checkout = INCOMPLETE_CHECKOUT (Yellow alert),
 *    excluded from average check-in calculation.
 * 3. Absences & Past Dates: Any past weekday (Mon-Sat) without clock-in = ABSENT.
 * 4. Holidays & Leave Allocation:
 *    - 2 paid holidays baseline per month.
 *    - Leaves 1 & 2: Highlight in ORANGE.
 *    - Leaves 3+: Highlight in RED.
 * 5. Sunday Shift Compensation:
 *    - Clocking in & out on a Sunday awards +1 holiday credit,
 *      neutralizing one weekday holiday (extending the Orange threshold and avoiding Red).
 */
export function evaluateMonthlyAttendance(
  userId: string,
  year: number,
  month: number, // 1 to 12
  recordsMap: Map<string, AttendanceRecord>,
  todayDateStr: string // "YYYY-MM-DD"
): MonthEvaluationResult {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date(todayDateStr);
  today.setHours(0, 0, 0, 0);

  // Step 1: Detect Sunday shifts worked (valid check-in & check-out)
  const sundayShiftDates: string[] = [];
  const leaveAudits: LeaveCreditAudit[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const padMonth = month < 10 ? `0${month}` : `${month}`;
    const padDay = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `${year}-${padMonth}-${padDay}`;
    const curDate = new Date(year, month - 1, d);
    curDate.setHours(0, 0, 0, 0);

    const isSunday = curDate.getDay() === 0;
    if (isSunday) {
      const record = recordsMap.get(dateStr);
      // Valid Sunday work requires both checkIn and checkOut
      if (record && record.checkInTime && record.checkOutTime) {
        sundayShiftDates.push(dateStr);
        leaveAudits.push({
          id: `audit-${userId}-${dateStr}`,
          userId,
          sourceDate: dateStr,
          creditAmount: 1,
          reason: `Sunday Shift Worked on ${dateStr} (+1 Paid Leave Credit awarded)`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  const sundayCredits = sundayShiftDates.length;
  // Baseline paid leaves allowance is 2 + any earned Sunday credits
  const totalPaidAllowance = 2 + sundayCredits;

  // Step 2: Traverse all days of the month and catalog weekday absences and records
  const evaluatedDays: DayAttendanceInfo[] = [];
  const weekdayAbsenceDates: string[] = [];
  let totalHoursWorked = 0;
  let incompleteCheckoutsCount = 0;
  let presentDaysCount = 0;
  let workingDaysPassed = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const padMonth = month < 10 ? `0${month}` : `${month}`;
    const padDay = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `${year}-${padMonth}-${padDay}`;
    const curDate = new Date(year, month - 1, d);
    curDate.setHours(0, 0, 0, 0);

    const dayOfWeek = curDate.getDay();
    const isSunday = dayOfWeek === 0;

    // Pre-Launch Restriction: Website and attendance operations officially commence on Sept 4, 2026.
    // Days 1 - 3 September 2026 are inactive, neutral gray tiles with zero leaves or penalties.
    if (year === 2026 && month === 9 && d < 4) {
      evaluatedDays.push({
        dateString: dateStr,
        dayOfMonth: d,
        dayOfWeek,
        isSunday,
        isToday: false,
        isPast: true,
        isFuture: false,
        record: undefined,
        computedStatus: 'PRE_LAUNCH',
        statusLabel: 'Pre-Launch (Portal Starts Sept 4)',
        themeStyle: getThemeStyleForStatus('PRE_LAUNCH'),
        checkInTimeFormatted: undefined,
        checkOutTimeFormatted: undefined,
        hoursWorkedFormatted: undefined,
      });
      continue;
    }

    const isToday = dateStr === todayDateStr;
    const isPast = curDate < today;
    const isFuture = curDate > today;

    const record = recordsMap.get(dateStr);

    let computedStatus: AttendanceStatus = 'FUTURE';
    let statusLabel = 'Scheduled';

    if (isToday) {
      if (record) {
        if (record.checkInTime && record.checkOutTime) {
          computedStatus = isSunday ? 'SUNDAY_WORKED' : 'PRESENT';
          statusLabel = isSunday ? 'Sunday Shift Completed' : 'Completed Shift';
          presentDaysCount++;

          // Sanitize hoursWorked if it was recorded as 8.25 or is uncalculated
          const inMs = new Date(record.checkInTime).getTime();
          const outMs = new Date(record.checkOutTime).getTime();
          if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
            const realDuration = (outMs - inMs) / (1000 * 60 * 60);
            if (record.hoursWorked === 8.25 && realDuration < 0.1) {
              record.hoursWorked = Math.round(realDuration * 1000) / 1000;
            } else if (record.hoursWorked === undefined || record.hoursWorked === null) {
              record.hoursWorked = Math.round(realDuration * 1000) / 1000;
            }
          }

          if (record.hoursWorked) totalHoursWorked += record.hoursWorked;
        } else if (record.checkInTime) {
          computedStatus = 'CHECKED_IN';
          statusLabel = 'Clocked In (Active)';
        } else {
          computedStatus = isSunday ? 'WEEKEND_OFF' : 'FUTURE';
          statusLabel = isSunday ? 'Sunday Off' : 'Not Clocked In';
        }
      } else {
        computedStatus = isSunday ? 'WEEKEND_OFF' : 'FUTURE';
        statusLabel = isSunday ? 'Sunday Off' : 'Not Clocked In';
      }
    } else if (isPast) {
      if (!isSunday) {
        workingDaysPassed++;
      }

      if (record) {
        if (record.checkInTime && record.checkOutTime) {
          computedStatus = isSunday ? 'SUNDAY_WORKED' : 'PRESENT';
          statusLabel = isSunday ? 'Sunday Shift (+1 Credit)' : 'Present';
          presentDaysCount++;

          // Sanitize hoursWorked if it was recorded as 8.25 or is uncalculated
          const inMs = new Date(record.checkInTime).getTime();
          const outMs = new Date(record.checkOutTime).getTime();
          if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
            const realDuration = (outMs - inMs) / (1000 * 60 * 60);
            if (record.hoursWorked === 8.25 && realDuration < 0.1) {
              record.hoursWorked = Math.round(realDuration * 1000) / 1000;
            } else if (record.hoursWorked === undefined || record.hoursWorked === null) {
              record.hoursWorked = Math.round(realDuration * 1000) / 1000;
            }
          }

          if (record.hoursWorked) totalHoursWorked += record.hoursWorked;
        } else if (record.checkInTime && !record.checkOutTime) {
          // Rule 2: Checked in on past day without checkout before 11:59 PM = INCOMPLETE_CHECKOUT (Yellow)
          computedStatus = 'INCOMPLETE_CHECKOUT';
          statusLabel = 'Incomplete Checkout (Missed 11:59 PM)';
          incompleteCheckoutsCount++;
        } else {
          // Past record with no clock in
          if (isSunday) {
            computedStatus = 'WEEKEND_OFF';
            statusLabel = 'Sunday Off';
          } else {
            weekdayAbsenceDates.push(dateStr);
            computedStatus = 'ABSENT'; // Will be refined in step 3
            statusLabel = 'Absent';
          }
        }
      } else {
        // No record exists for past date
        if (isSunday) {
          computedStatus = 'WEEKEND_OFF';
          statusLabel = 'Sunday Off';
        } else {
          weekdayAbsenceDates.push(dateStr);
          computedStatus = 'ABSENT'; // Will be refined in step 3
          statusLabel = 'Absent';
        }
      }
    } else {
      // Future
      computedStatus = isSunday ? 'WEEKEND_OFF' : 'FUTURE';
      statusLabel = isSunday ? 'Sunday Off' : 'Upcoming Workday';
    }

    evaluatedDays.push({
      dateString: dateStr,
      dayOfMonth: d,
      dayOfWeek,
      isSunday,
      isToday,
      isPast,
      isFuture,
      record,
      computedStatus,
      statusLabel,
      themeStyle: getThemeStyleForStatus(computedStatus),
      checkInTimeFormatted: record?.checkInTime ? formatTimeDisplay(record.checkInTime) : undefined,
      checkOutTimeFormatted: record?.checkOutTime ? formatTimeDisplay(record.checkOutTime) : undefined,
      hoursWorkedFormatted: record?.hoursWorked ? formatHoursWorked(record.hoursWorked) : undefined,
    });
  }

  // Step 3: Apply Leave Allocation & Sunday Compensation offset to weekday absences
  // Absence index 0 & 1 -> Paid Leave (Orange).
  // If sundayCredits > 0, absences 2, 3, etc. up to totalPaidAllowance - 1 remain Paid Leave (Orange)!
  // Beyond totalPaidAllowance -> Unpaid Leave (Red).
  let paidLeavesUsed = 0;
  let unpaidLeavesUsed = 0;

  weekdayAbsenceDates.forEach((absentDateStr, index) => {
    const dayItem = evaluatedDays.find((d) => d.dateString === absentDateStr);
    if (!dayItem) return;

    const isCoveredByQuota = index < totalPaidAllowance;
    const isCompensatedBySunday = index >= 2 && index < totalPaidAllowance;

    if (isCoveredByQuota) {
      paidLeavesUsed++;
      dayItem.computedStatus = 'PAID_LEAVE';
      if (isCompensatedBySunday) {
        dayItem.statusLabel = `Paid Leave (${index + 1}/${totalPaidAllowance} - Sunday Shift Credit Applied)`;
        dayItem.compensatedBySunday = true;
        // Connect to audit trail
        const auditIndex = index - 2;
        if (leaveAudits[auditIndex]) {
          leaveAudits[auditIndex].appliedToLeaveDate = absentDateStr;
        }
      } else {
        dayItem.statusLabel = `Paid Leave (${index + 1}/${totalPaidAllowance})`;
      }
      dayItem.themeStyle = getThemeStyleForStatus('PAID_LEAVE');
    } else {
      unpaidLeavesUsed++;
      dayItem.computedStatus = 'UNPAID_LEAVE';
      dayItem.statusLabel = `Unpaid Leave (Exceeded ${totalPaidAllowance} Paid Days)`;
      dayItem.themeStyle = getThemeStyleForStatus('UNPAID_LEAVE');
    }
  });

  // Step 4: Calculate Average Hours Logged In strictly excluding incomplete checkouts
  const allRecords = Array.from(recordsMap.values());
  const { averageHoursFormatted, averageHoursDecimal, validSessionsCount } = calculateAverageHoursLoggedIn(allRecords);
  const { averageTimeFormatted } = calculateAverageCheckInTime(allRecords);

  const stats: MonthlyStats = {
    averageHoursLoggedIn: averageHoursFormatted,
    averageHoursDecimal,
    averageCheckInTime: averageTimeFormatted,
    validCheckoutSessionsCount: validSessionsCount,
    paidLeavesUsed,
    paidLeavesAllowance: totalPaidAllowance,
    unpaidLeaves: unpaidLeavesUsed,
    sundayCompensationsEarned: sundayCredits,
    incompleteCheckoutsCount,
    totalWorkingDaysPassed: workingDaysPassed,
    presentDaysCount,
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
  };

  return {
    days: evaluatedDays,
    stats,
    leaveAudits,
  };
}

/**
 * Returns Tailwind style tokens for each attendance state, adhering to:
 * - Deep navy/slate palette (#0B0F19, #0F172A)
 * - Yellow badge/border for Incomplete Checkout (Missed 11:59 PM)
 * - Orange badge/border for Paid Leaves (1 & 2 + Sunday compensations)
 * - Red badge/border for Unpaid Leaves (3+ onwards)
 * - Subtle Blue/Purple highlight for Normal Attendance
 * - Neon indicator for Sunday Worked
 * - Muted dark slate for Normal Sunday / Unworked Weekend
 */
export function getThemeStyleForStatus(status: AttendanceStatus): {
  bg: string;
  text: string;
  border: string;
  glow?: string;
  badgeBg: string;
} {
  switch (status) {
    case 'PRESENT':
      return {
        bg: 'bg-blue-950/30 hover:bg-blue-900/40',
        text: 'text-blue-300',
        border: 'border-blue-500/30 hover:border-blue-400/50',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      };
    case 'CHECKED_IN':
      return {
        bg: 'bg-emerald-950/30 hover:bg-emerald-900/40',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40 animate-pulse',
        glow: 'shadow-[0_0_18px_rgba(16,185,129,0.25)]',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    case 'INCOMPLETE_CHECKOUT':
      // Yellow alert for missed checkout
      return {
        bg: 'bg-amber-950/30 hover:bg-amber-900/40',
        text: 'text-amber-300',
        border: 'border-amber-500/50',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'PAID_LEAVE':
      // Orange for Day 1 & Day 2 of leaves or neutralized by Sunday shift
      return {
        bg: 'bg-orange-950/30 hover:bg-orange-900/40',
        text: 'text-orange-300',
        border: 'border-orange-500/40',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
        badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      };
    case 'UNPAID_LEAVE':
      // Red for 3rd leave onwards
      return {
        bg: 'bg-red-950/30 hover:bg-red-900/40',
        text: 'text-red-300',
        border: 'border-red-500/50',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.25)]',
        badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
      };
    case 'SUNDAY_WORKED':
      // Neon indicator for Sunday Shift
      return {
        bg: 'bg-violet-950/40 hover:bg-violet-900/50',
        text: 'text-fuchsia-300',
        border: 'border-fuchsia-500/50',
        glow: 'shadow-[0_0_20px_rgba(217,70,239,0.3)]',
        badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50',
      };
    case 'WEEKEND_OFF':
      return {
        bg: 'bg-slate-900/40 hover:bg-slate-900/60',
        text: 'text-slate-500',
        border: 'border-slate-800/60',
        badgeBg: 'bg-slate-800/40 text-slate-400 border-slate-700/40',
      };
    case 'PRE_LAUNCH':
      return {
        bg: 'bg-slate-900/30 hover:bg-slate-900/40 opacity-60',
        text: 'text-slate-500',
        border: 'border-slate-800/40',
        badgeBg: 'bg-slate-800/30 text-slate-500 border-slate-700/30',
      };
    case 'FUTURE':
    default:
      return {
        bg: 'bg-slate-900/20 hover:bg-slate-900/40',
        text: 'text-slate-400',
        border: 'border-white/5 hover:border-white/10',
        badgeBg: 'bg-slate-800/30 text-slate-400 border-slate-700/30',
      };
  }
}

// server/app.ts
import dotenv2 from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";

// server/store.ts
var MASTER_ADMIN_USER = {
  id: "admin_shadowcyfrin007",
  email: "shadowcyfrin007@gmail.com",
  name: "System Administrator",
  role: "ADMIN",
  department: "Executive Operations",
  jobTitle: "Director of Corporate Operations",
  employeeCode: "EMP-ADM01",
  avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=shadowcyfrin007",
  joinedDate: "2026-01-01"
};
var SEED_USERS = [MASTER_ADMIN_USER];
var INITIAL_RECORDS = [];

// server/firebaseAdmin.ts
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
dotenv.config({ path: ".env.local" });
var projectId = process.env.FIREBASE_PROJECT_ID;
var clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
var privateKey = process.env.FIREBASE_PRIVATE_KEY;
var databaseId = process.env.FIRESTORE_DATABASE_ID;
if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
  );
}
var firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n")
  })
});
var db = getFirestore(
  firebaseApp,
  databaseId || "(default)"
);

// src/utils/attendanceCalculations.ts
var TIMEZONE_IST = "Asia/Kolkata";
function timeStringToMinutes(timeStr) {
  if (!timeStr) return null;
  try {
    if (timeStr.includes("T")) {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return null;
      const istParts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE_IST,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      }).formatToParts(date);
      const h = parseInt(istParts.find((p) => p.type === "hour")?.value || "0", 10);
      const m = parseInt(istParts.find((p) => p.type === "minute")?.value || "0", 10);
      const s = parseInt(istParts.find((p) => p.type === "second")?.value || "0", 10);
      return h % 24 * 60 + m + s / 60;
    }
    const [hoursStr, minutesStr] = timeStr.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  } catch {
    return null;
  }
}
function minutesToTimeString(minutesTotal) {
  const rounded = Math.round(minutesTotal);
  const hours24 = Math.floor(rounded / 60) % 24;
  const mins = rounded % 60;
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const padHours = hours12 < 10 ? `0${hours12}` : `${hours12}`;
  const padMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${padHours}:${padMins} ${ampm}`;
}
function formatTimeDisplay(timeStr) {
  if (!timeStr) return "--:--";
  try {
    if (timeStr.includes("T")) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("en-IN", {
          timeZone: TIMEZONE_IST,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        }).format(date);
      }
    }
    const mins = timeStringToMinutes(timeStr);
    if (mins === null) return "--:--";
    return minutesToTimeString(mins);
  } catch {
    return "--:--";
  }
}
function formatHoursWorked(hours) {
  if (hours === null || hours === void 0 || isNaN(hours) || hours <= 0) return "0h";
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) {
    const totalSeconds = Math.round(hours * 3600);
    return totalSeconds > 0 ? `${totalSeconds}s` : "< 1m";
  }
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function calculateAverageHoursLoggedIn(records2) {
  let totalHours = 0;
  let validSessionsCount = 0;
  for (const record of records2) {
    if (!record.checkInTime || !record.checkOutTime || record.status === "INCOMPLETE_CHECKOUT") {
      continue;
    }
    let hours = record.hoursWorked;
    const inMs = new Date(record.checkInTime).getTime();
    const outMs = new Date(record.checkOutTime).getTime();
    if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
      const actualHours = (outMs - inMs) / (1e3 * 60 * 60);
      if (hours === 8.25 && actualHours < 0.1) {
        hours = actualHours;
      } else if (hours === void 0 || hours === null || isNaN(hours)) {
        hours = actualHours;
      }
    }
    if (hours !== void 0 && hours !== null && !isNaN(hours) && hours >= 0) {
      totalHours += hours;
      validSessionsCount++;
    }
  }
  if (validSessionsCount === 0) {
    return {
      averageHoursFormatted: "0h",
      averageHoursDecimal: 0,
      validSessionsCount: 0
    };
  }
  const avgDecimal = Math.round(totalHours / validSessionsCount * 100) / 100;
  return {
    averageHoursFormatted: formatHoursWorked(avgDecimal),
    averageHoursDecimal: avgDecimal,
    validSessionsCount
  };
}
function calculateAverageCheckInTime(records2) {
  const validCheckIns = [];
  for (const record of records2) {
    if (!record.checkInTime || !record.checkOutTime) {
      continue;
    }
    if (record.status === "INCOMPLETE_CHECKOUT") {
      continue;
    }
    const minutes = timeStringToMinutes(record.checkInTime);
    if (minutes !== null) {
      validCheckIns.push(minutes);
    }
  }
  if (validCheckIns.length === 0) {
    return {
      averageTimeFormatted: "No valid sessions",
      validSessionsCount: 0
    };
  }
  const sum = validCheckIns.reduce((acc, curr) => acc + curr, 0);
  const avgMinutes = sum / validCheckIns.length;
  return {
    averageTimeFormatted: minutesToTimeString(avgMinutes),
    validSessionsCount: validCheckIns.length
  };
}
function evaluateMonthlyAttendance(userId, year, month, recordsMap, todayDateStr) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const [todayYear, todayMonth, todayDay] = todayDateStr.split("-").map(Number);
  const today = new Date(todayYear, todayMonth - 1, todayDay);
  today.setHours(0, 0, 0, 0);
  const sundayShiftDates = [];
  const leaveAudits = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const padMonth = month < 10 ? `0${month}` : `${month}`;
    const padDay = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `${year}-${padMonth}-${padDay}`;
    const curDate = new Date(year, month - 1, d);
    curDate.setHours(0, 0, 0, 0);
    const isSunday = curDate.getDay() === 0;
    if (isSunday) {
      const record = recordsMap.get(dateStr);
      if (record && record.checkInTime && record.checkOutTime) {
        sundayShiftDates.push(dateStr);
        leaveAudits.push({
          id: `audit-${userId}-${dateStr}`,
          userId,
          sourceDate: dateStr,
          creditAmount: 1,
          reason: `Sunday Shift Worked on ${dateStr} (+1 Paid Leave Credit awarded)`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
  }
  const sundayCredits = sundayShiftDates.length;
  const totalPaidAllowance = 2 + sundayCredits;
  const evaluatedDays = [];
  const weekdayAbsenceDates = [];
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
    if (year === 2026 && month === 9 && d < 4) {
      evaluatedDays.push({
        dateString: dateStr,
        dayOfMonth: d,
        dayOfWeek,
        isSunday,
        isToday: false,
        isPast: true,
        isFuture: false,
        record: void 0,
        computedStatus: "PRE_LAUNCH",
        statusLabel: "Pre-Launch (Portal Starts Sept 4)",
        themeStyle: getThemeStyleForStatus("PRE_LAUNCH"),
        checkInTimeFormatted: void 0,
        checkOutTimeFormatted: void 0,
        hoursWorkedFormatted: void 0
      });
      continue;
    }
    const isToday = dateStr === todayDateStr;
    const isPast = dateStr < todayDateStr;
    const isFuture = dateStr > todayDateStr;
    const record = recordsMap.get(dateStr);
    let computedStatus = "FUTURE";
    let statusLabel = "Scheduled";
    if (isToday) {
      if (record) {
        if (record.checkInTime && record.checkOutTime) {
          computedStatus = isSunday ? "SUNDAY_WORKED" : "PRESENT";
          statusLabel = isSunday ? "Sunday Shift Completed" : "Completed Shift";
          presentDaysCount++;
          const inMs = new Date(record.checkInTime).getTime();
          const outMs = new Date(record.checkOutTime).getTime();
          if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
            const realDuration = (outMs - inMs) / (1e3 * 60 * 60);
            if (record.hoursWorked === 8.25 && realDuration < 0.1) {
              record.hoursWorked = Math.round(realDuration * 1e3) / 1e3;
            } else if (record.hoursWorked === void 0 || record.hoursWorked === null) {
              record.hoursWorked = Math.round(realDuration * 1e3) / 1e3;
            }
          }
          if (record.hoursWorked) totalHoursWorked += record.hoursWorked;
        } else if (record.checkInTime) {
          computedStatus = "CHECKED_IN";
          statusLabel = "Clocked In (Active)";
        } else {
          computedStatus = isSunday ? "WEEKEND_OFF" : "FUTURE";
          statusLabel = isSunday ? "Sunday Off" : "Not Clocked In";
        }
      } else {
        computedStatus = isSunday ? "WEEKEND_OFF" : "FUTURE";
        statusLabel = isSunday ? "Sunday Off" : "Not Clocked In";
      }
    } else if (isPast) {
      if (!isSunday) {
        workingDaysPassed++;
      }
      if (record) {
        if (record.checkInTime && record.checkOutTime) {
          computedStatus = isSunday ? "SUNDAY_WORKED" : "PRESENT";
          statusLabel = isSunday ? "Sunday Shift (+1 Credit)" : "Present";
          presentDaysCount++;
          const inMs = new Date(record.checkInTime).getTime();
          const outMs = new Date(record.checkOutTime).getTime();
          if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
            const realDuration = (outMs - inMs) / (1e3 * 60 * 60);
            if (record.hoursWorked === 8.25 && realDuration < 0.1) {
              record.hoursWorked = Math.round(realDuration * 1e3) / 1e3;
            } else if (record.hoursWorked === void 0 || record.hoursWorked === null) {
              record.hoursWorked = Math.round(realDuration * 1e3) / 1e3;
            }
          }
          if (record.hoursWorked) totalHoursWorked += record.hoursWorked;
        } else if (record.checkInTime && !record.checkOutTime) {
          computedStatus = "INCOMPLETE_CHECKOUT";
          statusLabel = "Incomplete Checkout (Missed 11:59 PM)";
          incompleteCheckoutsCount++;
        } else {
          if (isSunday) {
            computedStatus = "WEEKEND_OFF";
            statusLabel = "Sunday Off";
          } else {
            weekdayAbsenceDates.push(dateStr);
            computedStatus = "ABSENT";
            statusLabel = "Absent";
          }
        }
      } else {
        if (isSunday) {
          computedStatus = "WEEKEND_OFF";
          statusLabel = "Sunday Off";
        } else {
          weekdayAbsenceDates.push(dateStr);
          computedStatus = "ABSENT";
          statusLabel = "Absent";
        }
      }
    } else {
      computedStatus = isSunday ? "WEEKEND_OFF" : "FUTURE";
      statusLabel = isSunday ? "Sunday Off" : "Upcoming Workday";
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
      checkInTimeFormatted: record?.checkInTime ? formatTimeDisplay(record.checkInTime) : void 0,
      checkOutTimeFormatted: record?.checkOutTime ? formatTimeDisplay(record.checkOutTime) : void 0,
      hoursWorkedFormatted: record?.hoursWorked ? formatHoursWorked(record.hoursWorked) : void 0
    });
  }
  let paidLeavesUsed = 0;
  let unpaidLeavesUsed = 0;
  weekdayAbsenceDates.forEach((absentDateStr, index) => {
    const dayItem = evaluatedDays.find((d) => d.dateString === absentDateStr);
    if (!dayItem) return;
    const isCoveredByQuota = index < totalPaidAllowance;
    const isCompensatedBySunday = index >= 2 && index < totalPaidAllowance;
    if (isCoveredByQuota) {
      paidLeavesUsed++;
      dayItem.computedStatus = "PAID_LEAVE";
      if (isCompensatedBySunday) {
        dayItem.statusLabel = `Paid Leave (${index + 1}/${totalPaidAllowance} - Sunday Shift Credit Applied)`;
        dayItem.compensatedBySunday = true;
        const auditIndex = index - 2;
        if (leaveAudits[auditIndex]) {
          leaveAudits[auditIndex].appliedToLeaveDate = absentDateStr;
        }
      } else {
        dayItem.statusLabel = `Paid Leave (${index + 1}/${totalPaidAllowance})`;
      }
      dayItem.themeStyle = getThemeStyleForStatus("PAID_LEAVE");
    } else {
      unpaidLeavesUsed++;
      dayItem.computedStatus = "UNPAID_LEAVE";
      dayItem.statusLabel = `Unpaid Leave (Exceeded ${totalPaidAllowance} Paid Days)`;
      dayItem.themeStyle = getThemeStyleForStatus("UNPAID_LEAVE");
    }
  });
  const allRecords = Array.from(recordsMap.values());
  const { averageHoursFormatted, averageHoursDecimal, validSessionsCount } = calculateAverageHoursLoggedIn(allRecords);
  const { averageTimeFormatted } = calculateAverageCheckInTime(allRecords);
  const stats = {
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
    totalHoursWorked: Math.round(totalHoursWorked * 10) / 10
  };
  return {
    days: evaluatedDays,
    stats,
    leaveAudits
  };
}
function getThemeStyleForStatus(status) {
  switch (status) {
    case "PRESENT":
      return {
        bg: "bg-blue-950/30 hover:bg-blue-900/40",
        text: "text-blue-300",
        border: "border-blue-500/30 hover:border-blue-400/50",
        glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
        badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30"
      };
    case "CHECKED_IN":
      return {
        bg: "bg-emerald-950/30 hover:bg-emerald-900/40",
        text: "text-emerald-300",
        border: "border-emerald-500/40 animate-pulse",
        glow: "shadow-[0_0_18px_rgba(16,185,129,0.25)]",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      };
    case "INCOMPLETE_CHECKOUT":
      return {
        bg: "bg-amber-950/30 hover:bg-amber-900/40",
        text: "text-amber-300",
        border: "border-amber-500/50",
        glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40"
      };
    case "PAID_LEAVE":
      return {
        bg: "bg-orange-950/30 hover:bg-orange-900/40",
        text: "text-orange-300",
        border: "border-orange-500/40",
        glow: "shadow-[0_0_15px_rgba(249,115,22,0.2)]",
        badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/40"
      };
    case "UNPAID_LEAVE":
      return {
        bg: "bg-red-950/30 hover:bg-red-900/40",
        text: "text-red-300",
        border: "border-red-500/50",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.25)]",
        badgeBg: "bg-red-500/20 text-red-300 border-red-500/40"
      };
    case "SUNDAY_WORKED":
      return {
        bg: "bg-violet-950/40 hover:bg-violet-900/50",
        text: "text-fuchsia-300",
        border: "border-fuchsia-500/50",
        glow: "shadow-[0_0_20px_rgba(217,70,239,0.3)]",
        badgeBg: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50"
      };
    case "WEEKEND_OFF":
      return {
        bg: "bg-slate-900/40 hover:bg-slate-900/60",
        text: "text-slate-500",
        border: "border-slate-800/60",
        badgeBg: "bg-slate-800/40 text-slate-400 border-slate-700/40"
      };
    case "PRE_LAUNCH":
      return {
        bg: "bg-slate-900/30 hover:bg-slate-900/40 opacity-60",
        text: "text-slate-500",
        border: "border-slate-800/40",
        badgeBg: "bg-slate-800/30 text-slate-500 border-slate-700/30"
      };
    case "FUTURE":
    default:
      return {
        bg: "bg-slate-900/20 hover:bg-slate-900/40",
        text: "text-slate-400",
        border: "border-white/5 hover:border-white/10",
        badgeBg: "bg-slate-800/30 text-slate-400 border-slate-700/30"
      };
  }
}

// server/app.ts
dotenv2.config({ path: ".env.local" });
var app = express();
app.use(express.json());
var usersCollection = db.collection("users");
var attendanceCollection = db.collection("attendance_records");
var globalForFirestore = globalThis;
var firestoreCache = globalForFirestore.__apexFirestoreCache ?? (globalForFirestore.__apexFirestoreCache = {
  users: [],
  records: [],
  ready: null
});
var users = firestoreCache.users;
var records = firestoreCache.records;
firestoreCache.ready;
async function loadFirestoreData() {
  console.log("[Firestore] Loading data...");
  const [usersSnapshot, recordsSnapshot] = await Promise.all([
    usersCollection.get(),
    attendanceCollection.get()
  ]);
  const loadedUsers = usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
  const loadedRecords = recordsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
  users = loadedUsers;
  records = loadedRecords;
  firestoreCache.users = users;
  firestoreCache.records = records;
  if (users.length === 0 && SEED_USERS.length > 0) {
    const batch = db.batch();
    for (const user of SEED_USERS) {
      batch.set(
        usersCollection.doc(user.id),
        user
      );
    }
    await batch.commit();
    users = [...SEED_USERS];
  }
  if (records.length === 0 && INITIAL_RECORDS.length > 0) {
    const batch = db.batch();
    for (const record of INITIAL_RECORDS) {
      batch.set(
        attendanceCollection.doc(record.id),
        record
      );
    }
    await batch.commit();
    records = [...INITIAL_RECORDS];
  }
  users = deduplicateUsers(users);
  firestoreCache.users = users;
  firestoreCache.records = records;
  console.log(
    `[Firestore] Loaded ${users.length} users and ${records.length} attendance records.`
  );
}
async function ensureFirestoreLoaded() {
  if (!firestoreCache.ready) {
    firestoreCache.ready = loadFirestoreData().catch((err) => {
      firestoreCache.ready = null;
      throw err;
    });
  }
  await firestoreCache.ready;
}
async function saveUser(user) {
  await usersCollection.doc(user.id).set(user, {
    merge: true
  });
}
async function saveAttendanceRecord(record) {
  await attendanceCollection.doc(record.id).set(record, {
    merge: true
  });
}
async function deleteAttendanceRecord(recordId) {
  await attendanceCollection.doc(recordId).delete();
}
async function deleteAllAttendance() {
  const snapshot = await attendanceCollection.get();
  if (snapshot.empty) {
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}
async function deleteMatchingAttendanceRecords(predicate) {
  const matchingRecords = records.filter(predicate);
  if (matchingRecords.length === 0) {
    return 0;
  }
  const batch = db.batch();
  for (const record of matchingRecords) {
    batch.delete(attendanceCollection.doc(record.id));
  }
  await batch.commit();
  return matchingRecords.length;
}
app.use("/api", async (req, res, next) => {
  try {
    systemTodayDate = simulatedDateOverride || getISTDateString();
    await ensureFirestoreLoaded();
    next();
  } catch (err) {
    console.error(
      "[Firestore] Initialization error:",
      err
    );
    res.status(500).json({
      error: "Database initialization failed"
    });
  }
});
var firebaseApiKey = process.env.FIREBASE_API_KEY;
if (!firebaseApiKey) {
  console.warn(
    "[Firebase] FIREBASE_API_KEY environment variable is not configured."
  );
}
function deduplicateUsers(list) {
  const seenIds = /* @__PURE__ */ new Set();
  const seenEmails = /* @__PURE__ */ new Set();
  const result = [];
  for (const u of list) {
    if (!u) continue;
    const emailKey = u.email ? u.email.trim().toLowerCase() : "";
    const idKey = u.id ? u.id.trim() : "";
    if (idKey && seenIds.has(idKey)) {
      continue;
    }
    if (emailKey && seenEmails.has(emailKey)) {
      continue;
    }
    if (idKey) {
      seenIds.add(idKey);
    }
    if (emailKey) {
      seenEmails.add(emailKey);
    }
    result.push(u);
  }
  return result;
}
async function upsertUser(incoming) {
  if (!incoming) {
    return incoming;
  }
  const cleanEmail = incoming.email ? incoming.email.trim().toLowerCase() : "";
  const incomingId = incoming.id ? incoming.id.trim() : "";
  const idx = users.findIndex(
    (u) => incomingId && u.id === incomingId || cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail
  );
  let savedUser;
  if (idx !== -1) {
    const existing = users[idx];
    const preferredId = incomingId && !incomingId.startsWith("admin_") && !incomingId.startsWith("usr_") ? incomingId : existing.id || incomingId;
    savedUser = {
      ...existing,
      ...incoming,
      id: preferredId
    };
    users[idx] = savedUser;
  } else {
    savedUser = incoming;
    users.push(savedUser);
  }
  users = deduplicateUsers(users);
  await saveUser(savedUser);
  return users.find(
    (u) => incomingId && u.id === incomingId || cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail
  ) || savedUser;
}
function getISTDateString(d = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}
var SYSTEM_LAUNCH_DATE = "2026-09-04";
var systemTodayDate = getISTDateString();
var simulatedDateOverride = null;
function findRecordForUser(userId, date) {
  const cleanId = (userId || "").trim().toLowerCase();
  const targetUser = users.find(
    (u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || u.employeeCode && u.employeeCode.toLowerCase() === cleanId
  );
  const matchingIds = /* @__PURE__ */ new Set([cleanId]);
  if (targetUser) {
    matchingIds.add(targetUser.id.toLowerCase());
    matchingIds.add(targetUser.email.toLowerCase());
    if (targetUser.employeeCode) {
      matchingIds.add(
        targetUser.employeeCode.toLowerCase()
      );
    }
    users.filter(
      (u) => u.email.toLowerCase() === targetUser.email.toLowerCase()
    ).forEach((u) => {
      matchingIds.add(u.id.toLowerCase());
      if (u.employeeCode) {
        matchingIds.add(
          u.employeeCode.toLowerCase()
        );
      }
    });
  }
  return records.find(
    (r) => matchingIds.has(
      (r.userId || "").toLowerCase()
    ) && r.date === date
  );
}
function getEmployeeRecordsMap(userId) {
  const map = /* @__PURE__ */ new Map();
  const cleanId = (userId || "").trim().toLowerCase();
  const targetUser = users.find(
    (u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || u.employeeCode && u.employeeCode.toLowerCase() === cleanId
  );
  const matchingIds = /* @__PURE__ */ new Set([cleanId]);
  if (targetUser) {
    matchingIds.add(targetUser.id.toLowerCase());
    matchingIds.add(targetUser.email.toLowerCase());
    if (targetUser.employeeCode) {
      matchingIds.add(
        targetUser.employeeCode.toLowerCase()
      );
    }
    users.filter(
      (u) => u.email.toLowerCase() === targetUser.email.toLowerCase()
    ).forEach((u) => {
      matchingIds.add(u.id.toLowerCase());
      if (u.employeeCode) {
        matchingIds.add(
          u.employeeCode.toLowerCase()
        );
      }
    });
  }
  records.filter(
    (r) => matchingIds.has(
      (r.userId || "").toLowerCase()
    ) && r.date >= SYSTEM_LAUNCH_DATE
  ).forEach((r) => {
    map.set(r.date, r);
  });
  return map;
}
app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",
      serverTime: (/* @__PURE__ */ new Date()).toISOString(),
      systemTodayDate
    });
  }
);
app.get(
  "/api/auth/users",
  (req, res) => {
    users = deduplicateUsers(users);
    res.json(users);
  }
);
app.post(
  "/api/auth/google",
  async (req, res) => {
    const { email, name, avatarUrl } = req.body;
    const userEmail = (email || "shadowcyfrin007@gmail.com").trim().toLowerCase();
    const isAdmin = userEmail === "shadowcyfrin007@gmail.com";
    let foundUser = users.find(
      (u) => u.email.toLowerCase() === userEmail
    );
    if (!foundUser) {
      foundUser = await upsertUser({
        id: isAdmin ? "admin_shadowcyfrin007" : `usr_${Date.now()}`,
        email: userEmail,
        name: name || (isAdmin ? "Shadow Cyfrin" : userEmail.split("@")[0]),
        role: isAdmin ? "ADMIN" : "EMPLOYEE",
        department: isAdmin ? "Executive Operations" : "Engineering",
        jobTitle: isAdmin ? "Director of Operations" : "Senior Specialist",
        employeeCode: isAdmin ? "EMP-NNWDC" : `EMP-${Math.floor(
          1e3 + Math.random() * 9e3
        )}`,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          userEmail
        )}`,
        joinedDate: "2026-09-01"
      });
    } else {
      foundUser = await upsertUser({
        ...foundUser,
        name: name || foundUser.name,
        avatarUrl: avatarUrl || foundUser.avatarUrl
      });
    }
    res.json({
      success: true,
      user: foundUser,
      token: `token_${foundUser.id}_${Date.now()}`
    });
  }
);
app.post(
  "/api/auth/reset-password",
  async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        error: "Email is required"
      });
    }
    try {
      const fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: email.trim()
          })
        }
      );
      const fbData = await fbRes.json();
      if (!fbRes.ok) {
        console.warn(
          "Firebase reset password response:",
          fbData
        );
        const errMsg = fbData?.error?.message || "Failed to send password reset email";
        return res.status(400).json({
          error: errMsg
        });
      }
      res.json({
        success: true,
        message: `Password reset email sent to ${email.trim()}! Please check your inbox.`
      });
    } catch (err) {
      console.error(
        "Server error resetting password:",
        err
      );
      res.status(500).json({
        error: err.message || "Internal error sending reset email"
      });
    }
  }
);
app.post(
  "/api/auth/register",
  async (req, res) => {
    const {
      email,
      password,
      name,
      department
    } = req.body;
    if (!email) {
      return res.status(400).json({
        error: "Email is required"
      });
    }
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === "shadowcyfrin007@gmail.com";
    const role = isAdmin ? "ADMIN" : "EMPLOYEE";
    const existing = users.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      return res.json({
        success: true,
        user: existing
      });
    }
    const newUser = {
      id: isAdmin && cleanEmail === "shadowcyfrin007@gmail.com" ? "admin_shadowcyfrin007" : `usr_${Date.now()}`,
      email: cleanEmail,
      name: name || (isAdmin ? "Administrator" : cleanEmail.split("@")[0]),
      role,
      department: department || (isAdmin ? "Executive Operations" : "General"),
      jobTitle: isAdmin ? "System Administrator" : "Team Member",
      employeeCode: isAdmin ? `ADM-${Math.floor(
        100 + Math.random() * 900
      )}` : `EMP-${Math.floor(
        1e3 + Math.random() * 9e3
      )}`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
        cleanEmail
      )}`,
      joinedDate: systemTodayDate
    };
    const savedUser = await upsertUser(newUser);
    try {
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: password || "ApexPass#2026",
            returnSecureToken: true
          })
        }
      );
    } catch (e) {
      console.warn(
        "[Firebase Auth] Registration request failed:",
        e
      );
    }
    res.json({
      success: true,
      user: savedUser
    });
  }
);
app.post(
  "/api/auth/login",
  async (req, res) => {
    const {
      identifier,
      password
    } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        error: "Corporate email and password are required"
      });
    }
    const cleanIdent = identifier.trim().toLowerCase();
    try {
      const fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: cleanIdent,
            password,
            returnSecureToken: true
          })
        }
      );
      const fbData = await fbRes.json();
      if (!fbRes.ok || !fbData.localId) {
        const errMsg = fbData?.error?.message;
        if (errMsg === "EMAIL_NOT_FOUND") {
          return res.status(401).json({
            error: "No account found with this corporate email. Please register or check your email."
          });
        }
        if (errMsg === "INVALID_PASSWORD" || errMsg === "INVALID_LOGIN_CREDENTIALS") {
          return res.status(401).json({
            error: "Invalid password. Please check your credentials or reset your password."
          });
        }
        if (errMsg === "USER_DISABLED") {
          return res.status(403).json({
            error: "This corporate account has been disabled."
          });
        }
        return res.status(401).json({
          error: "Invalid corporate email or password. Access denied."
        });
      }
      let foundUser = users.find(
        (u) => u.id === fbData.localId || u.email && u.email.toLowerCase() === cleanIdent
      );
      const isAdmin = cleanIdent === "shadowcyfrin007@gmail.com" || cleanIdent === "admin@apexcorp.internal";
      if (!foundUser) {
        foundUser = {
          id: fbData.localId,
          email: cleanIdent,
          name: fbData.displayName || cleanIdent.split("@")[0],
          role: isAdmin ? "ADMIN" : "EMPLOYEE",
          department: isAdmin ? "Executive Operations" : "Engineering",
          jobTitle: isAdmin ? "Director of Operations" : "Senior Specialist",
          employeeCode: isAdmin ? "EMP-NNWDC" : `EMP-${fbData.localId.slice(0, 5).toUpperCase()}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbData.localId}`,
          joinedDate: systemTodayDate
        };
      }
      const savedUser = await upsertUser(foundUser);
      return res.json({
        success: true,
        user: savedUser,
        token: fbData.idToken
      });
    } catch (e) {
      console.error(
        "Server login proxy error:",
        e
      );
      return res.status(500).json({
        error: "Authentication service temporarily unavailable. Please try again later."
      });
    }
  }
);
app.post(
  "/api/auth/sync-user",
  async (req, res) => {
    const { user } = req.body;
    if (!user || !user.id) {
      return res.status(400).json({
        error: "Valid user object required"
      });
    }
    const savedUser = await upsertUser(user);
    res.json({
      success: true,
      user: savedUser
    });
  }
);
app.post(
  "/api/admin/sync-all-users",
  async (req, res) => {
    const {
      users: incomingUsers
    } = req.body;
    if (Array.isArray(incomingUsers)) {
      for (const inUser of incomingUsers) {
        if (inUser && (inUser.id || inUser.email)) {
          await upsertUser(inUser);
        }
      }
    }
    users = deduplicateUsers(users);
    res.json({
      success: true,
      count: users.length
    });
  }
);
app.post(
  "/api/admin/employees",
  async (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({
        error: "Forbidden: Admin access required"
      });
    }
    const {
      name,
      email,
      department,
      jobTitle,
      role: empRole
    } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        error: "Name and email are required"
      });
    }
    const newEmp = {
      id: `usr_${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: empRole === "ADMIN" ? "ADMIN" : "EMPLOYEE",
      department: department || "Engineering",
      jobTitle: jobTitle || "Staff Specialist",
      employeeCode: `EMP-${Math.floor(
        1e3 + Math.random() * 9e3
      )}`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
        name
      )}`,
      joinedDate: systemTodayDate
    };
    const savedEmp = await upsertUser(newEmp);
    res.json({
      success: true,
      user: savedEmp
    });
  }
);
app.get(
  "/api/attendance/today",
  (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({
        error: "userId is required"
      });
    }
    const todayRecord = findRecordForUser(
      userId,
      systemTodayDate
    );
    if (todayRecord && todayRecord.checkInTime && todayRecord.checkOutTime) {
      const inMs = new Date(
        todayRecord.checkInTime
      ).getTime();
      const outMs = new Date(
        todayRecord.checkOutTime
      ).getTime();
      if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
        const realDur = (outMs - inMs) / (1e3 * 60 * 60);
        if (todayRecord.hoursWorked === 8.25 && realDur < 0.1) {
          todayRecord.hoursWorked = Math.round(
            realDur * 1e3
          ) / 1e3;
        }
      }
    }
    res.json({
      todayDate: systemTodayDate,
      record: todayRecord || null
    });
  }
);
app.post(
  "/api/attendance/check-in",
  async (req, res) => {
    const {
      userId,
      date
    } = req.body;
    if (!userId) {
      return res.status(400).json({
        error: "userId is required"
      });
    }
    const targetDate = date || systemTodayDate;
    if (targetDate < SYSTEM_LAUNCH_DATE) {
      return res.status(403).json({
        error: "Pre-Launch Period: Website and attendance operations officially start on September 4, 2026 (IST)."
      });
    }
    if (targetDate !== systemTodayDate) {
      return res.status(403).json({
        error: "Active Day Restriction: Checking in for past or future dates is strictly disabled."
      });
    }
    const existingRecord = findRecordForUser(
      userId,
      targetDate
    );
    if (existingRecord && existingRecord.checkInTime && !existingRecord.checkOutTime) {
      return res.status(400).json({
        error: "Already checked in for today."
      });
    }
    function isSundayIST(dateString) {
      const [
        year,
        month,
        day
      ] = dateString.split("-").map(Number);
      const date2 = new Date(
        year,
        month - 1,
        day
      );
      return date2.getDay() === 0;
    }
    const now = /* @__PURE__ */ new Date();
    const isSunday = isSundayIST(
      targetDate
    );
    const newRecord = {
      id: `rec_${userId}_${targetDate}_${Date.now()}`,
      userId,
      date: targetDate,
      checkInTime: now.toISOString(),
      checkOutTime: null,
      status: "CHECKED_IN",
      hoursWorked: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const existingRecordIndex = records.findIndex(
      (r) => r.userId === userId && r.date === targetDate
    );
    if (existingRecordIndex !== -1) {
      await deleteAttendanceRecord(
        records[existingRecordIndex].id
      );
      records[existingRecordIndex] = newRecord;
    } else {
      records.push(
        newRecord
      );
    }
    await saveAttendanceRecord(
      newRecord
    );
    res.json({
      success: true,
      message: isSunday ? "Checked in successfully on Sunday shift! Complete checkout to earn +1 Paid Holiday Credit." : "Checked in successfully for today.",
      record: newRecord
    });
  }
);
app.post(
  "/api/attendance/check-out",
  async (req, res) => {
    const {
      userId,
      date,
      checkInTime: clientCheckInTime
    } = req.body;
    if (!userId) {
      return res.status(400).json({
        error: "userId is required"
      });
    }
    const targetDate = date || systemTodayDate;
    if (targetDate !== systemTodayDate) {
      return res.status(403).json({
        error: "Active Day Restriction: Checking out for past or future dates is strictly disabled."
      });
    }
    let existingRecord = findRecordForUser(
      userId,
      targetDate
    );
    if ((!existingRecord || !existingRecord.checkInTime) && clientCheckInTime) {
      existingRecord = {
        id: `rec_${userId}_${targetDate}_${Date.now()}`,
        userId,
        date: targetDate,
        checkInTime: clientCheckInTime,
        checkOutTime: null,
        status: "CHECKED_IN",
        hoursWorked: null,
        createdAt: clientCheckInTime,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      records.push(
        existingRecord
      );
      await saveAttendanceRecord(
        existingRecord
      );
    }
    if (!existingRecord || !existingRecord.checkInTime) {
      const fallbackIn = new Date(
        Date.now() - 60 * 60 * 1e3
      ).toISOString();
      existingRecord = {
        id: `rec_${userId}_${targetDate}_${Date.now()}`,
        userId,
        date: targetDate,
        checkInTime: fallbackIn,
        checkOutTime: null,
        status: "CHECKED_IN",
        hoursWorked: 1,
        createdAt: fallbackIn,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      records.push(
        existingRecord
      );
      await saveAttendanceRecord(
        existingRecord
      );
    }
    if (existingRecord.checkOutTime) {
      return res.status(400).json({
        error: "Already checked out for today."
      });
    }
    const now = /* @__PURE__ */ new Date();
    const checkIn = new Date(
      existingRecord.checkInTime
    );
    const diffMs = Math.max(
      0,
      now.getTime() - checkIn.getTime()
    );
    const durationHours = Math.round(
      diffMs / (1e3 * 60 * 60) * 1e3
    ) / 1e3;
    const dateObj = new Date(
      targetDate
    );
    const isSunday = dateObj.getDay() === 0;
    existingRecord.checkOutTime = now.toISOString();
    existingRecord.hoursWorked = durationHours > 0 ? durationHours : 0.05;
    existingRecord.status = isSunday ? "SUNDAY_WORKED" : "PRESENT";
    existingRecord.updatedAt = now.toISOString();
    await saveAttendanceRecord(
      existingRecord
    );
    res.json({
      success: true,
      message: isSunday ? "Sunday shift checked out! +1 Paid Holiday Compensation Credit added to your balance." : "Checked out successfully. Shift completed.",
      record: existingRecord,
      sundayCreditEarned: isSunday
    });
  }
);
app.post(
  "/api/attendance/reset",
  async (req, res) => {
    const {
      userId,
      date
    } = req.body;
    const targetDate = date || systemTodayDate;
    if (userId) {
      const cleanId = userId.trim().toLowerCase();
      const targetUser = users.find(
        (u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || u.employeeCode && u.employeeCode.toLowerCase() === cleanId
      );
      const matchingIds = /* @__PURE__ */ new Set([
        cleanId
      ]);
      if (targetUser) {
        matchingIds.add(
          targetUser.id.toLowerCase()
        );
        matchingIds.add(
          targetUser.email.toLowerCase()
        );
        if (targetUser.employeeCode) {
          matchingIds.add(
            targetUser.employeeCode.toLowerCase()
          );
        }
        users.filter(
          (u) => u.email.toLowerCase() === targetUser.email.toLowerCase()
        ).forEach((u) => {
          matchingIds.add(
            u.id.toLowerCase()
          );
          if (u.employeeCode) {
            matchingIds.add(
              u.employeeCode.toLowerCase()
            );
          }
        });
      }
      await deleteMatchingAttendanceRecords(
        (r) => matchingIds.has(
          (r.userId || "").toLowerCase()
        ) && r.date === targetDate
      );
      records = records.filter(
        (r) => !(matchingIds.has(
          (r.userId || "").toLowerCase()
        ) && r.date === targetDate)
      );
    } else {
      await deleteMatchingAttendanceRecords(
        (r) => r.date === targetDate
      );
      records = records.filter(
        (r) => r.date !== targetDate
      );
    }
    res.json({
      success: true,
      message: "Attendance shift session reset to Not Clocked In."
    });
  }
);
app.post(
  "/api/admin/reset-attendance",
  async (req, res) => {
    const targetDate = req.body.date || systemTodayDate;
    if (req.body.all) {
      await deleteAllAttendance();
      records = [];
    } else {
      await deleteMatchingAttendanceRecords(
        (r) => r.date === targetDate
      );
      records = records.filter(
        (r) => r.date !== targetDate
      );
    }
    res.json({
      success: true,
      message: `Attendance records for ${targetDate} have been completely reset for all users.`,
      remainingRecordsCount: records.length
    });
  }
);
app.post(
  "/api/admin/simulate-shift",
  async (req, res) => {
    const {
      userId,
      date,
      hours = 8.5,
      isSundayShift = false
    } = req.body;
    if (!userId) {
      return res.status(400).json({
        error: "userId is required"
      });
    }
    const targetDate = date || systemTodayDate;
    const checkInDate = /* @__PURE__ */ new Date(
      `${targetDate}T09:00:00.000Z`
    );
    const checkOutDate = new Date(
      checkInDate.getTime() + hours * 60 * 60 * 1e3
    );
    const simulatedRecord = {
      id: `rec_${userId}_${targetDate}_${Date.now()}`,
      userId,
      date: targetDate,
      checkInTime: checkInDate.toISOString(),
      checkOutTime: checkOutDate.toISOString(),
      hoursWorked: hours,
      status: isSundayShift ? "SUNDAY_WORKED" : "PRESENT",
      createdAt: checkInDate.toISOString(),
      updatedAt: checkOutDate.toISOString()
    };
    const existingIdx = records.findIndex(
      (r) => r.userId === userId && r.date === targetDate
    );
    if (existingIdx !== -1) {
      await deleteAttendanceRecord(
        records[existingIdx].id
      );
      records[existingIdx] = simulatedRecord;
    } else {
      records.push(
        simulatedRecord
      );
    }
    await saveAttendanceRecord(
      simulatedRecord
    );
    res.json({
      success: true,
      message: `Simulated ${hours}h ${isSundayShift ? "Sunday (+1 Credit)" : "standard"} shift created for ${targetDate}.`,
      record: simulatedRecord
    });
  }
);
app.get(
  "/api/attendance/month/:userId/:year/:month",
  async (req, res) => {
    const {
      userId,
      year,
      month
    } = req.params;
    let user = users.find(
      (u) => u.id === userId || req.query.email && u.email && u.email.toLowerCase() === req.query.email.toLowerCase()
    );
    if (!user) {
      user = await upsertUser({
        id: userId,
        email: req.query.email || "employee@apexcorp.internal",
        name: req.query.name || "Team Member",
        role: req.query.role || "EMPLOYEE",
        department: req.query.department || "Engineering",
        jobTitle: "Corporate Staff",
        employeeCode: `EMP-${userId.slice(0, 5).toUpperCase()}`,
        joinedDate: systemTodayDate
      });
    }
    const y = parseInt(
      year,
      10
    );
    const m = parseInt(
      month,
      10
    );
    const recordsMap = getEmployeeRecordsMap(
      userId
    );
    const evaluation = evaluateMonthlyAttendance(
      userId,
      y,
      m,
      recordsMap,
      systemTodayDate
    );
    res.json({
      user,
      year: y,
      month: m,
      todayDate: systemTodayDate,
      evaluation
    });
  }
);
app.get(
  "/api/admin/employees",
  (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({
        error: "403 Forbidden: Access restricted strictly to users with the ADMIN role."
      });
    }
    const year = 2026;
    const month = 9;
    users = deduplicateUsers(
      users
    );
    const employeeSummaries = users.map(
      (employee) => {
        const recordsMap = getEmployeeRecordsMap(
          employee.id
        );
        const evalResult = evaluateMonthlyAttendance(
          employee.id,
          year,
          month,
          recordsMap,
          systemTodayDate
        );
        const todayRecord = recordsMap.get(
          systemTodayDate
        );
        return {
          user: employee,
          stats: evalResult.stats,
          todayRecord: todayRecord || null,
          todayStatus: todayRecord ? todayRecord.checkOutTime ? "PRESENT" : todayRecord.checkInTime ? "CHECKED_IN" : "NOT_CHECKED_IN" : "NOT_CHECKED_IN"
        };
      }
    );
    res.json({
      todayDate: systemTodayDate,
      employees: employeeSummaries
    });
  }
);
app.get(
  "/api/admin/employee/:id/attendance",
  (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({
        error: "403 Forbidden: Access restricted strictly to users with the ADMIN role."
      });
    }
    const { id } = req.params;
    const cleanId = (id || "").trim().toLowerCase();
    const employee = users.find(
      (u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || u.employeeCode && u.employeeCode.toLowerCase() === cleanId
    );
    if (!employee) {
      return res.status(404).json({
        error: "Employee not found"
      });
    }
    const year = 2026;
    const month = 9;
    const recordsMap = getEmployeeRecordsMap(
      employee.id
    );
    const evaluation = evaluateMonthlyAttendance(
      employee.id,
      year,
      month,
      recordsMap,
      systemTodayDate
    );
    res.json({
      employee,
      year,
      month,
      todayDate: systemTodayDate,
      evaluation
    });
  }
);
app.post(
  "/api/admin/set-system-date",
  (req, res) => {
    const { date } = req.body;
    simulatedDateOverride = date || null;
    systemTodayDate = simulatedDateOverride || getISTDateString();
    res.json({
      success: true,
      systemTodayDate,
      simulated: simulatedDateOverride !== null
    });
  }
);
app.get(
  "/api/schema/prisma",
  (req, res) => {
    try {
      const schemaPath = path.join(
        process.cwd(),
        "prisma",
        "schema.prisma"
      );
      if (fs.existsSync(
        schemaPath
      )) {
        const content = fs.readFileSync(
          schemaPath,
          "utf-8"
        );
        return res.json({
          schema: content
        });
      }
      res.status(404).json({
        error: "Prisma schema file not found"
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);
var app_default = app;
export {
  SYSTEM_LAUNCH_DATE,
  deduplicateUsers,
  app_default as default,
  ensureFirestoreLoaded,
  getISTDateString,
  upsertUser
};

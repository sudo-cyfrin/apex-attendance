import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

import { SEED_USERS, INITIAL_RECORDS } from './store.ts';
import { db } from './firebaseAdmin.ts';

import { User, AttendanceRecord, Role } from '../src/types.ts';
import { evaluateMonthlyAttendance } from '../src/utils/attendanceCalculations.ts';

const app = express();

app.use(express.json());

// =============================================================================
// FIRESTORE
// =============================================================================

const usersCollection = db.collection('users');
const attendanceCollection = db.collection('attendance_records');

// Firestore-backed local cache.
// Firestore is the persistent source of truth.
// These arrays are kept so the rest of the existing application needs
// minimal changes.
type FirestoreCache = {
  users: User[];
  records: AttendanceRecord[];
  ready: Promise<void> | null;
};

const globalForFirestore =
  globalThis as typeof globalThis & {
    __apexFirestoreCache?: FirestoreCache;
  };

const firestoreCache =
  globalForFirestore.__apexFirestoreCache ??
  (globalForFirestore.__apexFirestoreCache = {
    users: [],
    records: [],
    ready: null,
  });

let users = firestoreCache.users;
let records = firestoreCache.records;

// Prevent multiple simultaneous Firestore initializations.
firestoreCache.ready

// Load users and attendance records from Firestore.
async function loadFirestoreData(): Promise<void> {
  console.log('[Firestore] Loading data...');

  const [usersSnapshot, recordsSnapshot] =
    await Promise.all([
      usersCollection.get(),
      attendanceCollection.get(),
    ]);

  const loadedUsers = usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];

  const loadedRecords =
    recordsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AttendanceRecord[];

  users = loadedUsers;
  records = loadedRecords;

  // Keep the global cache synchronized.
  firestoreCache.users = users;
  firestoreCache.records = records;

  // Seed users only when Firestore is empty.
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

  // Seed attendance only when Firestore is empty.
  if (
    records.length === 0 &&
    INITIAL_RECORDS.length > 0
  ) {
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

// Ensure Firestore is initialized before a request accesses users/records.
export async function ensureFirestoreLoaded(): Promise<void> {
  if (!firestoreCache.ready) {
    firestoreCache.ready = loadFirestoreData().catch((err) => {
      // Allow a future request to retry if initialization fails.
      firestoreCache.ready = null;
      throw err;
    });
  }

  await firestoreCache.ready;
}

// =============================================================================
// FIRESTORE WRITE HELPERS
// =============================================================================

async function saveUser(user: User): Promise<void> {
  await usersCollection.doc(user.id).set(user, {
    merge: true,
  });
}

async function saveAttendanceRecord(
  record: AttendanceRecord
): Promise<void> {
  await attendanceCollection.doc(record.id).set(record, {
    merge: true,
  });
}

async function deleteAttendanceRecord(recordId: string): Promise<void> {
  await attendanceCollection.doc(recordId).delete();
}

async function deleteAllAttendance(): Promise<void> {
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

// Delete attendance records matching a predicate.
// Useful for the existing alias-aware reset functionality.
async function deleteMatchingAttendanceRecords(
  predicate: (record: AttendanceRecord) => boolean
): Promise<number> {
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

// =============================================================================
// FIRESTORE INITIALIZATION MIDDLEWARE
// =============================================================================

app.use('/api', async (req, res, next) => {
  try {
    await ensureFirestoreLoaded();
    next();
  } catch (err) {
    console.error(
      '[Firestore] Initialization error:',
      err
    );

    res.status(500).json({
      error: 'Database initialization failed',
    });
  }
});

// =============================================================================
// FIREBASE API KEY
// =============================================================================

const firebaseApiKey = process.env.FIREBASE_API_KEY;

if (!firebaseApiKey) {
  console.warn(
    '[Firebase] FIREBASE_API_KEY environment variable is not configured.'
  );
}

// =============================================================================
// DEFAULT ADMIN
// =============================================================================

const DEFAULT_ADMIN_USER: User = {
  id: 'admin_shadowcyfrin007',
  email: 'shadowcyfrin007@gmail.com',
  name: 'Cyfrin Admin',
  role: 'ADMIN',
  department: 'Executive Operations',
  jobTitle: 'Director of Operations & Admin',
  employeeCode: 'ADMIN-001',
  avatarUrl:
    'https://api.dicebear.com/7.x/bottts/svg?seed=shadowcyfrin007',
  joinedDate: '2026-01-01',
};

// =============================================================================
// USER HELPERS
// =============================================================================

// Helper to deduplicate users by ID and email.
export function deduplicateUsers(list: User[]): User[] {
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  const result: User[] = [];

  for (const u of list) {
    if (!u) continue;

    const emailKey = u.email
      ? u.email.trim().toLowerCase()
      : '';

    const idKey = u.id
      ? u.id.trim()
      : '';

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

// Upsert user into local cache AND Firestore.
export async function upsertUser(
  incoming: User
): Promise<User> {
  if (!incoming) {
    return incoming;
  }

  const cleanEmail = incoming.email
    ? incoming.email.trim().toLowerCase()
    : '';

  const incomingId = incoming.id
    ? incoming.id.trim()
    : '';

  const idx = users.findIndex(
    (u) =>
      (incomingId && u.id === incomingId) ||
      (
        cleanEmail &&
        u.email &&
        u.email.trim().toLowerCase() === cleanEmail
      )
  );

  let savedUser: User;

  if (idx !== -1) {
    const existing = users[idx];

    // Preserve real Firebase UID over placeholder IDs.
    const preferredId =
      incomingId &&
      !incomingId.startsWith('admin_') &&
      !incomingId.startsWith('usr_')
        ? incomingId
        : existing.id || incomingId;

    savedUser = {
      ...existing,
      ...incoming,
      id: preferredId,
    };

    users[idx] = savedUser;
  } else {
    savedUser = incoming;
    users.push(savedUser);
  }

  users = deduplicateUsers(users);

  // Persist to Firestore.
  await saveUser(savedUser);

  return (
    users.find(
      (u) =>
        (incomingId && u.id === incomingId) ||
        (
          cleanEmail &&
          u.email &&
          u.email.trim().toLowerCase() === cleanEmail
        )
    ) || savedUser
  );
}

// =============================================================================
// DATE HELPERS
// =============================================================================

// Calculate current date in Indian Standard Time.
export function getISTDateString(
  d = new Date()
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Portal launch date.
export const SYSTEM_LAUNCH_DATE = '2026-09-04';

// Active system date.
let systemTodayDate = getISTDateString();

// =============================================================================
// ATTENDANCE HELPERS
// =============================================================================

// Find a record for a user using UID, email, or employee code.
function findRecordForUser(
  userId: string,
  date: string
): AttendanceRecord | undefined {
  const cleanId = (userId || '')
    .trim()
    .toLowerCase();

  const targetUser = users.find(
    (u) =>
      u.id.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      (
        u.employeeCode &&
        u.employeeCode.toLowerCase() === cleanId
      )
  );

  const matchingIds = new Set<string>([cleanId]);

  if (targetUser) {
    matchingIds.add(targetUser.id.toLowerCase());
    matchingIds.add(targetUser.email.toLowerCase());

    if (targetUser.employeeCode) {
      matchingIds.add(
        targetUser.employeeCode.toLowerCase()
      );
    }

    users
      .filter(
        (u) =>
          u.email.toLowerCase() ===
          targetUser.email.toLowerCase()
      )
      .forEach((u) => {
        matchingIds.add(u.id.toLowerCase());

        if (u.employeeCode) {
          matchingIds.add(
            u.employeeCode.toLowerCase()
          );
        }
      });
  }

  return records.find(
    (r) =>
      matchingIds.has(
        (r.userId || '').toLowerCase()
      ) &&
      r.date === date
  );
}

// Get records map for an employee.
function getEmployeeRecordsMap(
  userId: string
): Map<string, AttendanceRecord> {
  const map = new Map<string, AttendanceRecord>();

  const cleanId = (userId || '')
    .trim()
    .toLowerCase();

  const targetUser = users.find(
    (u) =>
      u.id.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      (
        u.employeeCode &&
        u.employeeCode.toLowerCase() === cleanId
      )
  );

  const matchingIds = new Set<string>([cleanId]);

  if (targetUser) {
    matchingIds.add(targetUser.id.toLowerCase());
    matchingIds.add(targetUser.email.toLowerCase());

    if (targetUser.employeeCode) {
      matchingIds.add(
        targetUser.employeeCode.toLowerCase()
      );
    }

    users
      .filter(
        (u) =>
          u.email.toLowerCase() ===
          targetUser.email.toLowerCase()
      )
      .forEach((u) => {
        matchingIds.add(u.id.toLowerCase());

        if (u.employeeCode) {
          matchingIds.add(
            u.employeeCode.toLowerCase()
          );
        }
      });
  }

  records
    .filter(
      (r) =>
        matchingIds.has(
          (r.userId || '').toLowerCase()
        ) &&
        r.date >= SYSTEM_LAUNCH_DATE
    )
    .forEach((r) => {
      map.set(r.date, r);
    });

  return map;
}

// =============================================================================
// API ROUTES
// =============================================================================

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------

app.get(
  '/api/health',
  (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      systemTodayDate,
    });
  }
);

// -----------------------------------------------------------------------------
// Demo Accounts
// -----------------------------------------------------------------------------

app.get(
  '/api/auth/users',
  (req: Request, res: Response) => {
    users = deduplicateUsers(users);
    res.json(users);
  }
);

// -----------------------------------------------------------------------------
// Google Login Proxy
// -----------------------------------------------------------------------------

app.post(
  '/api/auth/google',
  async (req: Request, res: Response) => {
    const { email, name, avatarUrl } = req.body;

    const userEmail = (
      email ||
      'shadowcyfrin007@gmail.com'
    )
      .trim()
      .toLowerCase();

    const isAdmin =
      userEmail === 'shadowcyfrin007@gmail.com';

    let foundUser = users.find(
      (u) =>
        u.email.toLowerCase() === userEmail
    );

    if (!foundUser) {
      foundUser = await upsertUser({
        id: isAdmin
          ? 'admin_shadowcyfrin007'
          : `usr_${Date.now()}`,

        email: userEmail,

        name:
          name ||
          (
            isAdmin
              ? 'Shadow Cyfrin'
              : userEmail.split('@')[0]
          ),

        role: isAdmin
          ? 'ADMIN'
          : 'EMPLOYEE',

        department: isAdmin
          ? 'Executive Operations'
          : 'Engineering',

        jobTitle: isAdmin
          ? 'Director of Operations'
          : 'Senior Specialist',

        employeeCode: isAdmin
          ? 'EMP-NNWDC'
          : `EMP-${Math.floor(
              1000 + Math.random() * 9000
            )}`,

        avatarUrl:
          avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
            userEmail
          )}`,

        joinedDate: '2026-09-01',
      });
    } else {
      foundUser = await upsertUser({
        ...foundUser,
        name:
          name || foundUser.name,
        avatarUrl:
          avatarUrl || foundUser.avatarUrl,
      });
    }

    res.json({
      success: true,
      user: foundUser,
      token: `token_${foundUser.id}_${Date.now()}`,
    });
  }
);

// -----------------------------------------------------------------------------
// Password Reset
// -----------------------------------------------------------------------------

app.post(
  '/api/auth/reset-password',
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    try {
      const fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: email.trim(),
          }),
        }
      );

      const fbData: any =
        await fbRes.json();

      if (!fbRes.ok) {
        console.warn(
          'Firebase reset password response:',
          fbData
        );

        const errMsg =
          fbData?.error?.message ||
          'Failed to send password reset email';

        return res.status(400).json({
          error: errMsg,
        });
      }

      res.json({
        success: true,
        message: `Password reset email sent to ${email.trim()}! Please check your inbox.`,
      });
    } catch (err: any) {
      console.error(
        'Server error resetting password:',
        err
      );

      res.status(500).json({
        error:
          err.message ||
          'Internal error sending reset email',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Registration
// -----------------------------------------------------------------------------

app.post(
  '/api/auth/register',
  async (req: Request, res: Response) => {
    const {
      email,
      password,
      name,
      department,
    } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const isAdmin =
      cleanEmail ===
      'shadowcyfrin007@gmail.com';

    const role: Role =
      isAdmin
        ? 'ADMIN'
        : 'EMPLOYEE';

    const existing = users.find(
      (u) =>
        u.email.toLowerCase() ===
        cleanEmail
    );

    if (existing) {
      return res.json({
        success: true,
        user: existing,
      });
    }

    const newUser: User = {
      id:
        isAdmin &&
        cleanEmail ===
          'shadowcyfrin007@gmail.com'
          ? 'admin_shadowcyfrin007'
          : `usr_${Date.now()}`,

      email: cleanEmail,

      name:
        name ||
        (
          isAdmin
            ? 'Administrator'
            : cleanEmail.split('@')[0]
        ),

      role,

      department:
        department ||
        (
          isAdmin
            ? 'Executive Operations'
            : 'General'
        ),

      jobTitle:
        isAdmin
          ? 'System Administrator'
          : 'Team Member',

      employeeCode:
        isAdmin
          ? `ADM-${Math.floor(
              100 + Math.random() * 900
            )}`
          : `EMP-${Math.floor(
              1000 + Math.random() * 9000
            )}`,

      avatarUrl:
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          cleanEmail
        )}`,

      joinedDate:
        systemTodayDate,
    };

    // Save profile to Firestore.
    const savedUser =
      await upsertUser(newUser);

    // Create Firebase Auth account.
    try {
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password:
              password ||
              'ApexPass#2026',
            returnSecureToken: true,
          }),
        }
      );
    } catch (e) {
      console.warn(
        '[Firebase Auth] Registration request failed:',
        e
      );
    }

    res.json({
      success: true,
      user: savedUser,
    });
  }
);

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

app.post(
  '/api/auth/login',
  async (req: Request, res: Response) => {
    const {
      identifier,
      password,
    } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        error:
          'Corporate email and password are required',
      });
    }

    const cleanIdent =
      identifier
        .trim()
        .toLowerCase();

    try {
      const fbRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanIdent,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const fbData: any =
        await fbRes.json();

      if (
        !fbRes.ok ||
        !fbData.localId
      ) {
        const errMsg =
          fbData?.error?.message;

        if (
          errMsg ===
          'EMAIL_NOT_FOUND'
        ) {
          return res.status(401).json({
            error:
              'No account found with this corporate email. Please register or check your email.',
          });
        }

        if (
          errMsg ===
            'INVALID_PASSWORD' ||
          errMsg ===
            'INVALID_LOGIN_CREDENTIALS'
        ) {
          return res.status(401).json({
            error:
              'Invalid password. Please check your credentials or reset your password.',
          });
        }

        if (
          errMsg ===
          'USER_DISABLED'
        ) {
          return res.status(403).json({
            error:
              'This corporate account has been disabled.',
          });
        }

        return res.status(401).json({
          error:
            'Invalid corporate email or password. Access denied.',
        });
      }

      let foundUser =
        users.find(
          (u) =>
            u.id ===
              fbData.localId ||
            (
              u.email &&
              u.email.toLowerCase() ===
                cleanIdent
            )
        );

      const isAdmin =
        cleanIdent ===
          'shadowcyfrin007@gmail.com' ||
        cleanIdent ===
          'admin@apexcorp.internal';

      if (!foundUser) {
        foundUser = {
          id: fbData.localId,

          email: cleanIdent,

          name:
            fbData.displayName ||
            cleanIdent.split('@')[0],

          role:
            isAdmin
              ? 'ADMIN'
              : 'EMPLOYEE',

          department:
            isAdmin
              ? 'Executive Operations'
              : 'Engineering',

          jobTitle:
            isAdmin
              ? 'Director of Operations'
              : 'Senior Specialist',

          employeeCode:
            isAdmin
              ? 'EMP-NNWDC'
              : `EMP-${fbData.localId
                  .slice(0, 5)
                  .toUpperCase()}`,

          avatarUrl:
            `https://api.dicebear.com/7.x/bottts/svg?seed=${fbData.localId}`,

          joinedDate:
            systemTodayDate,
        };
      }

      const savedUser =
        await upsertUser(foundUser);

      return res.json({
        success: true,
        user: savedUser,
        token: fbData.idToken,
      });
    } catch (e: any) {
      console.error(
        'Server login proxy error:',
        e
      );

      return res.status(500).json({
        error:
          'Authentication service temporarily unavailable. Please try again later.',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Sync User
// -----------------------------------------------------------------------------

app.post(
  '/api/auth/sync-user',
  async (req: Request, res: Response) => {
    const { user } = req.body;

    if (!user || !user.id) {
      return res.status(400).json({
        error: 'Valid user object required',
      });
    }

    const savedUser =
      await upsertUser(user);

    res.json({
      success: true,
      user: savedUser,
    });
  }
);

// -----------------------------------------------------------------------------
// Bulk Sync Users
// -----------------------------------------------------------------------------

app.post(
  '/api/admin/sync-all-users',
  async (req: Request, res: Response) => {
    const {
      users: incomingUsers,
    } = req.body;

    if (Array.isArray(incomingUsers)) {
      for (const inUser of incomingUsers) {
        if (
          inUser &&
          (inUser.id || inUser.email)
        ) {
          await upsertUser(inUser);
        }
      }
    }

    users = deduplicateUsers(users);

    res.json({
      success: true,
      count: users.length,
    });
  }
);

// -----------------------------------------------------------------------------
// Admin Create Employee
// -----------------------------------------------------------------------------

app.post(
  '/api/admin/employees',
  async (req: Request, res: Response) => {
    const role =
      req.headers['x-user-role'] as string;

    if (role !== 'ADMIN') {
      return res.status(403).json({
        error:
          'Forbidden: Admin access required',
      });
    }

    const {
      name,
      email,
      department,
      jobTitle,
      role: empRole,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error:
          'Name and email are required',
      });
    }

    const newEmp: User = {
      id: `usr_${Date.now()}`,

      email:
        email
          .trim()
          .toLowerCase(),

      name:
        name.trim(),

      role:
        empRole === 'ADMIN'
          ? 'ADMIN'
          : 'EMPLOYEE',

      department:
        department ||
        'Engineering',

      jobTitle:
        jobTitle ||
        'Staff Specialist',

      employeeCode:
        `EMP-${Math.floor(
          1000 +
            Math.random() *
              9000
        )}`,

      avatarUrl:
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          name
        )}`,

      joinedDate:
        systemTodayDate,
    };

    const savedEmp =
      await upsertUser(newEmp);

    res.json({
      success: true,
      user: savedEmp,
    });
  }
);

// -----------------------------------------------------------------------------
// Today's Attendance
// -----------------------------------------------------------------------------

app.get(
  '/api/attendance/today',
  (req: Request, res: Response) => {
    const userId =
      req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    const todayRecord =
      findRecordForUser(
        userId,
        systemTodayDate
      );

    if (
      todayRecord &&
      todayRecord.checkInTime &&
      todayRecord.checkOutTime
    ) {
      const inMs =
        new Date(
          todayRecord.checkInTime
        ).getTime();

      const outMs =
        new Date(
          todayRecord.checkOutTime
        ).getTime();

      if (
        !isNaN(inMs) &&
        !isNaN(outMs) &&
        outMs >= inMs
      ) {
        const realDur =
          (outMs - inMs) /
          (1000 * 60 * 60);

        if (
          todayRecord.hoursWorked ===
            8.25 &&
          realDur < 0.1
        ) {
          todayRecord.hoursWorked =
            Math.round(
              realDur * 1000
            ) / 1000;
        }
      }
    }

    res.json({
      todayDate:
        systemTodayDate,
      record:
        todayRecord || null,
    });
  }
);

// -----------------------------------------------------------------------------
// Check In
// -----------------------------------------------------------------------------

app.post(
  '/api/attendance/check-in',
  async (req: Request, res: Response) => {
    const {
      userId,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    const targetDate =
      date || systemTodayDate;

    if (
      targetDate <
      SYSTEM_LAUNCH_DATE
    ) {
      return res.status(403).json({
        error:
          'Pre-Launch Period: Website and attendance operations officially start on September 4, 2026 (IST).',
      });
    }

    if (
      targetDate !==
      systemTodayDate
    ) {
      return res.status(403).json({
        error:
          'Active Day Restriction: Checking in for past or future dates is strictly disabled.',
      });
    }

    const existingRecord =
      findRecordForUser(
        userId,
        targetDate
      );

    if (
      existingRecord &&
      existingRecord.checkInTime &&
      !existingRecord.checkOutTime
    ) {
      return res.status(400).json({
        error:
          'Already checked in for today.',
      });
    }

    function isSundayIST(
      dateString: string
    ): boolean {
      const [
        year,
        month,
        day,
      ] =
        dateString
          .split('-')
          .map(Number);

      const date = new Date(
        year,
        month - 1,
        day
      );

      return (
        date.getDay() === 0
      );
    }

    const now =
      new Date();

    const isSunday =
      isSundayIST(
        targetDate
      );

    const newRecord: AttendanceRecord =
      {
        id: `rec_${userId}_${targetDate}_${Date.now()}`,

        userId,

        date:
          targetDate,

        checkInTime:
          now.toISOString(),

        checkOutTime:
          null,

        status:
          'CHECKED_IN',

        hoursWorked:
          null,

        createdAt:
          now.toISOString(),

        updatedAt:
          now.toISOString(),
      };

    // Replace existing local record if one exists.
    const existingRecordIndex =
      records.findIndex(
        (r) =>
          r.userId ===
            userId &&
          r.date ===
            targetDate
      );

    if (
      existingRecordIndex !==
      -1
    ) {
      // Delete old Firestore document.
      await deleteAttendanceRecord(
        records[
          existingRecordIndex
        ].id
      );

      records[
        existingRecordIndex
      ] = newRecord;
    } else {
      records.push(
        newRecord
      );
    }

    // Persist to Firestore.
    await saveAttendanceRecord(
      newRecord
    );

    res.json({
      success: true,

      message: isSunday
        ? 'Checked in successfully on Sunday shift! Complete checkout to earn +1 Paid Holiday Credit.'
        : 'Checked in successfully for today.',

      record:
        newRecord,
    });
  }
);

// -----------------------------------------------------------------------------
// Check Out
// -----------------------------------------------------------------------------

app.post(
  '/api/attendance/check-out',
  async (req: Request, res: Response) => {
    const {
      userId,
      date,
      checkInTime:
        clientCheckInTime,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    const targetDate =
      date || systemTodayDate;

    if (
      targetDate !==
      systemTodayDate
    ) {
      return res.status(403).json({
        error:
          'Active Day Restriction: Checking out for past or future dates is strictly disabled.',
      });
    }

    let existingRecord =
      findRecordForUser(
        userId,
        targetDate
      );

    // Restore from client-provided check-in.
    if (
      (!existingRecord ||
        !existingRecord.checkInTime) &&
      clientCheckInTime
    ) {
      existingRecord = {
        id: `rec_${userId}_${targetDate}_${Date.now()}`,

        userId,

        date:
          targetDate,

        checkInTime:
          clientCheckInTime,

        checkOutTime:
          null,

        status:
          'CHECKED_IN',

        hoursWorked:
          null,

        createdAt:
          clientCheckInTime,

        updatedAt:
          new Date().toISOString(),
      };

      records.push(
        existingRecord
      );

      await saveAttendanceRecord(
        existingRecord
      );
    }

    // Fallback for testing.
    if (
      !existingRecord ||
      !existingRecord.checkInTime
    ) {
      const fallbackIn =
        new Date(
          Date.now() -
            60 * 60 * 1000
        ).toISOString();

      existingRecord = {
        id: `rec_${userId}_${targetDate}_${Date.now()}`,

        userId,

        date:
          targetDate,

        checkInTime:
          fallbackIn,

        checkOutTime:
          null,

        status:
          'CHECKED_IN',

        hoursWorked:
          1,

        createdAt:
          fallbackIn,

        updatedAt:
          new Date().toISOString(),
      };

      records.push(
        existingRecord
      );

      await saveAttendanceRecord(
        existingRecord
      );
    }

    if (
      existingRecord.checkOutTime
    ) {
      return res.status(400).json({
        error:
          'Already checked out for today.',
      });
    }

    const now =
      new Date();

    const checkIn =
      new Date(
        existingRecord.checkInTime
      );

    const diffMs =
      Math.max(
        0,
        now.getTime() -
          checkIn.getTime()
      );

    const durationHours =
      Math.round(
        (
          diffMs /
          (1000 * 60 * 60)
        ) * 1000
      ) / 1000;

    const dateObj =
      new Date(
        targetDate
      );

    const isSunday =
      dateObj.getDay() === 0;

    existingRecord.checkOutTime =
      now.toISOString();

    existingRecord.hoursWorked =
      durationHours > 0
        ? durationHours
        : 0.05;

    existingRecord.status =
      isSunday
        ? 'SUNDAY_WORKED'
        : 'PRESENT';

    existingRecord.updatedAt =
      now.toISOString();

    // Persist updated record.
    await saveAttendanceRecord(
      existingRecord
    );

    res.json({
      success: true,

      message: isSunday
        ? 'Sunday shift checked out! +1 Paid Holiday Compensation Credit added to your balance.'
        : 'Checked out successfully. Shift completed.',

      record:
        existingRecord,

      sundayCreditEarned:
        isSunday,
    });
  }
);

// -----------------------------------------------------------------------------
// Single User Shift Reset
// -----------------------------------------------------------------------------

app.post(
  '/api/attendance/reset',
  async (req: Request, res: Response) => {
    const {
      userId,
      date,
    } = req.body;

    const targetDate =
      date || systemTodayDate;

    if (userId) {
      const cleanId =
        userId
          .trim()
          .toLowerCase();

      const targetUser =
        users.find(
          (u) =>
            u.id.toLowerCase() ===
              cleanId ||
            u.email.toLowerCase() ===
              cleanId ||
            (
              u.employeeCode &&
              u.employeeCode.toLowerCase() ===
                cleanId
            )
        );

      const matchingIds =
        new Set<string>([
          cleanId,
        ]);

      if (targetUser) {
        matchingIds.add(
          targetUser.id.toLowerCase()
        );

        matchingIds.add(
          targetUser.email.toLowerCase()
        );

        if (
          targetUser.employeeCode
        ) {
          matchingIds.add(
            targetUser.employeeCode.toLowerCase()
          );
        }

        users
          .filter(
            (u) =>
              u.email.toLowerCase() ===
              targetUser.email.toLowerCase()
          )
          .forEach((u) => {
            matchingIds.add(
              u.id.toLowerCase()
            );

            if (
              u.employeeCode
            ) {
              matchingIds.add(
                u.employeeCode.toLowerCase()
              );
            }
          });
      }

      // Delete from Firestore.
      await deleteMatchingAttendanceRecords(
        (r) =>
          matchingIds.has(
            (
              r.userId ||
              ''
            ).toLowerCase()
          ) &&
          r.date ===
            targetDate
      );

      // Delete from local cache.
      records =
        records.filter(
          (r) =>
            !(
              matchingIds.has(
                (
                  r.userId ||
                  ''
                ).toLowerCase()
              ) &&
              r.date ===
                targetDate
            )
        );
    } else {
      // Delete all records for target date from Firestore.
      await deleteMatchingAttendanceRecords(
        (r) =>
          r.date ===
          targetDate
      );

      // Delete from local cache.
      records =
        records.filter(
          (r) =>
            r.date !==
            targetDate
        );
    }

    res.json({
      success: true,

      message:
        'Attendance shift session reset to Not Clocked In.',
    });
  }
);

// -----------------------------------------------------------------------------
// Admin Reset Attendance
// -----------------------------------------------------------------------------

app.post(
  '/api/admin/reset-attendance',
  async (req: Request, res: Response) => {
    const targetDate =
      req.body.date ||
      systemTodayDate;

    if (req.body.all) {
      await deleteAllAttendance();

      records = [];
    } else {
      await deleteMatchingAttendanceRecords(
        (r) =>
          r.date ===
          targetDate
      );

      records =
        records.filter(
          (r) =>
            r.date !==
            targetDate
        );
    }

    res.json({
      success: true,

      message: `Attendance records for ${targetDate} have been completely reset for all users.`,

      remainingRecordsCount:
        records.length,
    });
  }
);

// -----------------------------------------------------------------------------
// Admin Shift Simulation
// -----------------------------------------------------------------------------

app.post(
  '/api/admin/simulate-shift',
  async (req: Request, res: Response) => {
    const {
      userId,
      date,
      hours = 8.5,
      isSundayShift = false,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    const targetDate =
      date || systemTodayDate;

    const checkInDate =
      new Date(
        `${targetDate}T09:00:00.000Z`
      );

    const checkOutDate =
      new Date(
        checkInDate.getTime() +
          hours *
            60 *
            60 *
            1000
      );

    const simulatedRecord:
      AttendanceRecord =
      {
        id: `rec_${userId}_${targetDate}_${Date.now()}`,

        userId,

        date:
          targetDate,

        checkInTime:
          checkInDate.toISOString(),

        checkOutTime:
          checkOutDate.toISOString(),

        hoursWorked:
          hours,

        status:
          isSundayShift
            ? 'SUNDAY_WORKED'
            : 'PRESENT',

        createdAt:
          checkInDate.toISOString(),

        updatedAt:
          checkOutDate.toISOString(),
      };

    const existingIdx =
      records.findIndex(
        (r) =>
          r.userId ===
            userId &&
          r.date ===
            targetDate
      );

    if (
      existingIdx !==
      -1
    ) {
      // Remove old Firestore record.
      await deleteAttendanceRecord(
        records[
          existingIdx
        ].id
      );

      records[
        existingIdx
      ] = simulatedRecord;
    } else {
      records.push(
        simulatedRecord
      );
    }

    // Persist simulated record.
    await saveAttendanceRecord(
      simulatedRecord
    );

    res.json({
      success: true,

      message: `Simulated ${hours}h ${
        isSundayShift
          ? 'Sunday (+1 Credit)'
          : 'standard'
      } shift created for ${targetDate}.`,

      record:
        simulatedRecord,
    });
  }
);

// -----------------------------------------------------------------------------
// Monthly Attendance Evaluation
// -----------------------------------------------------------------------------

app.get(
  '/api/attendance/month/:userId/:year/:month',
  async (
    req: Request,
    res: Response
  ) => {
    const {
      userId,
      year,
      month,
    } = req.params;

    let user =
      users.find(
        (u) =>
          u.id ===
            userId ||
          (
            req.query.email &&
            u.email &&
            u.email.toLowerCase() ===
              (
                req.query.email as string
              ).toLowerCase()
          )
      );

    if (!user) {
      user =
        await upsertUser({
          id: userId,

          email:
            (
              req.query.email as string
            ) ||
            'employee@apexcorp.internal',

          name:
            (
              req.query.name as string
            ) ||
            'Team Member',

          role:
            (
              req.query.role as any
            ) ||
            'EMPLOYEE',

          department:
            (
              req.query.department as string
            ) ||
            'Engineering',

          jobTitle:
            'Corporate Staff',

          employeeCode:
            `EMP-${userId
              .slice(0, 5)
              .toUpperCase()}`,

          joinedDate:
            systemTodayDate,
        });
    }

    const y =
      parseInt(
        year,
        10
      );

    const m =
      parseInt(
        month,
        10
      );

    const recordsMap =
      getEmployeeRecordsMap(
        userId
      );

    const evaluation =
      evaluateMonthlyAttendance(
        userId,
        y,
        m,
        recordsMap,
        systemTodayDate
      );

    res.json({
      user,

      year:
        y,

      month:
        m,

      todayDate:
        systemTodayDate,

      evaluation,
    });
  }
);

// -----------------------------------------------------------------------------
// Admin Employee Overview
// -----------------------------------------------------------------------------

app.get(
  '/api/admin/employees',
  (req: Request, res: Response) => {
    const role =
      req.headers[
        'x-user-role'
      ] as string;

    if (role !== 'ADMIN') {
      return res.status(403).json({
        error:
          '403 Forbidden: Access restricted strictly to users with the ADMIN role.',
      });
    }

    const year =
      2026;

    const month =
      9;

    users =
      deduplicateUsers(
        users
      );

    const employeeSummaries =
      users.map(
        (employee) => {
          const recordsMap =
            getEmployeeRecordsMap(
              employee.id
            );

          const evalResult =
            evaluateMonthlyAttendance(
              employee.id,
              year,
              month,
              recordsMap,
              systemTodayDate
            );

          const todayRecord =
            recordsMap.get(
              systemTodayDate
            );

          return {
            user:
              employee,

            stats:
              evalResult.stats,

            todayRecord:
              todayRecord ||
              null,

            todayStatus:
              todayRecord
                ? todayRecord.checkOutTime
                  ? 'PRESENT'
                  : todayRecord.checkInTime
                    ? 'CHECKED_IN'
                    : 'NOT_CHECKED_IN'
                : 'NOT_CHECKED_IN',
          };
        }
      );

    res.json({
      todayDate:
        systemTodayDate,

      employees:
        employeeSummaries,
    });
  }
);

// -----------------------------------------------------------------------------
// Admin Employee Attendance Details
// -----------------------------------------------------------------------------

app.get(
  '/api/admin/employee/:id/attendance',
  (req: Request, res: Response) => {
    const role =
      req.headers[
        'x-user-role'
      ] as string;

    if (role !== 'ADMIN') {
      return res.status(403).json({
        error:
          '403 Forbidden: Access restricted strictly to users with the ADMIN role.',
      });
    }

    const { id } =
      req.params;

    const cleanId =
      (id || '')
        .trim()
        .toLowerCase();

    const employee =
      users.find(
        (u) =>
          u.id.toLowerCase() ===
            cleanId ||
          u.email.toLowerCase() ===
            cleanId ||
          (
            u.employeeCode &&
            u.employeeCode.toLowerCase() ===
              cleanId
          )
      );

    if (!employee) {
      return res.status(404).json({
        error:
          'Employee not found',
      });
    }

    const year =
      2026;

    const month =
      9;

    const recordsMap =
      getEmployeeRecordsMap(
        employee.id
      );

    const evaluation =
      evaluateMonthlyAttendance(
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

      todayDate:
        systemTodayDate,

      evaluation,
    });
  }
);

// -----------------------------------------------------------------------------
// Simulation: Set System Date
// -----------------------------------------------------------------------------

app.post(
  '/api/admin/set-system-date',
  (req: Request, res: Response) => {
    const { date } =
      req.body;

    if (date) {
      systemTodayDate =
        date;
    }

    res.json({
      success: true,
      systemTodayDate,
    });
  }
);

// -----------------------------------------------------------------------------
// Prisma Schema
// -----------------------------------------------------------------------------

app.get(
  '/api/schema/prisma',
  (req: Request, res: Response) => {
    try {
      const schemaPath =
        path.join(
          process.cwd(),
          'prisma',
          'schema.prisma'
        );

      if (
        fs.existsSync(
          schemaPath
        )
      ) {
        const content =
          fs.readFileSync(
            schemaPath,
            'utf-8'
          );

        return res.json({
          schema:
            content,
        });
      }

      res.status(404).json({
        error:
          'Prisma schema file not found',
      });
    } catch (err: any) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  }
);

export default app;
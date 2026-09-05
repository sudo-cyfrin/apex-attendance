import { User, AttendanceRecord } from '../src/types.ts';

// Master corporate admin user
export const MASTER_ADMIN_USER: User = {
  id: 'admin_shadowcyfrin007',
  email: 'shadowcyfrin007@gmail.com',
  name: 'System Administrator',
  role: 'ADMIN',
  department: 'Executive Operations',
  jobTitle: 'Director of Corporate Operations',
  employeeCode: 'EMP-ADM01',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=shadowcyfrin007',
  joinedDate: '2026-01-01',
};

// Seed store includes Master Admin for resilient server authentication
export const SEED_USERS: User[] = [MASTER_ADMIN_USER];

// Clean initial attendance records. Real attendance records are created on check-in/check-out.
export const INITIAL_RECORDS: AttendanceRecord[] = [];

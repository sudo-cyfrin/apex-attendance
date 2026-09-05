import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Code, FileText, Sparkles, BookOpen, Layers } from 'lucide-react';

export const PrismaSchemaViewer: React.FC = () => {
  const [schemaText, setSchemaText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'schema' | 'calculations' | 'architecture'>('schema');

  useEffect(() => {
    fetch('/api/schema/prisma')
      .then((res) => res.json())
      .then((data) => {
        if (data.schema) setSchemaText(data.schema);
      })
      .catch(() => {
        // Fallback schema definition
        setSchemaText(`// Prisma Schema: Corporate Attendance Tracking & Leave Credit System
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  EMPLOYEE
  ADMIN
}

enum AttendanceStatus {
  PRESENT
  CHECKED_IN
  INCOMPLETE_CHECKOUT
  ABSENT
  PAID_LEAVE
  UNPAID_LEAVE
  WEEKEND_OFF
  SUNDAY_WORKED
}

model User {
  id                String             @id @default(uuid())
  email             String             @unique
  username          String             @unique
  passwordHash      String
  name              String
  role              Role               @default(EMPLOYEE)
  department        String             @default("Engineering")
  jobTitle          String             @default("Software Engineer")
  employeeCode      String             @unique
  avatarUrl         String?
  isActive          Boolean            @default(true)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  attendanceRecords AttendanceRecord[]
  leaveCreditAudits LeaveCreditAudit[]

  @@map("users")
}

model AttendanceRecord {
  id                String             @id @default(uuid())
  userId            String
  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  date              String             // "YYYY-MM-DD"
  checkInTime       DateTime?
  checkOutTime      DateTime?
  status            AttendanceStatus   @default(PRESENT)
  hoursWorked       Float?             @default(0.0)
  isMissingCheckout Boolean            @default(false)
  isSundayShift     Boolean            @default(false)
  notes             String?

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  @@unique([userId, date], name: "user_date_unique")
  @@index([userId, date])
  @@index([status])
  @@map("attendance_records")
}

model LeaveCreditAudit {
  id                 String    @id @default(uuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceSundayDate   String
  creditAmount       Int       @default(1)
  reason             String
  appliedToLeaveDate String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([userId])
  @@map("leave_credit_audits")
}`);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-blue-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Technical Specifications & Deliverables
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Prisma v5+
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                PostgreSQL schema definition, calculation utilities, and corporate attendance policies.
              </p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'schema'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              schema.prisma
            </button>
            <button
              onClick={() => setActiveTab('calculations')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'calculations'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Calculations Spec
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'architecture'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Data Architecture
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Prisma Schema */}
      {activeTab === 'schema' && (
        <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>/prisma/schema.prisma</span>
              <span className="text-slate-400">• PostgreSQL Dialect</span>
            </div>

            <button
              id="btn-copy-prisma-schema"
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy Schema'}</span>
            </button>
          </div>

          <pre className="p-6 text-xs sm:text-sm font-mono text-slate-200 overflow-x-auto bg-[#070A12] leading-relaxed max-h-[600px] overflow-y-auto">
            <code>{schemaText}</code>
          </pre>
        </div>
      )}

      {/* Tab 2: Calculation Utilities */}
      {activeTab === 'calculations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
              <Code className="w-4 h-4" />
              <span>1. Average Check-in Time Algorithm</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Standard corporate rule: employees who clock in but fail to clock out before 11:59 PM generate an <span className="text-amber-400 font-semibold">INCOMPLETE_CHECKOUT (Yellow)</span>. These invalid sessions are strictly filtered out to prevent skewing company reporting.
            </p>
            <div className="p-4 rounded-2xl bg-black/50 font-mono text-xs text-blue-300 border border-white/5 space-y-1">
              <div>// Filter valid sessions only:</div>
              <div>records.filter(r =&gt; r.checkInTime && r.checkOutTime)</div>
              <div>// Incomplete checkout excluded:</div>
              <div>records.filter(r =&gt; r.status !== 'INCOMPLETE_CHECKOUT')</div>
              <div>// Average minutes since midnight converted to 12h:</div>
              <div>avgMinutes = sum(checkInMinutes) / validCount</div>
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-6 border border-white/10 space-y-4">
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>2. Sunday Compensation & Orange/Red Thresholds</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Policy allocates 2 paid leaves/month. Leaves 1 & 2 highlight in Orange. Day 3+ highlights in Red. Working a Sunday awards +1 holiday credit, extending the Orange threshold and neutralizing a Red penalty.
            </p>
            <div className="p-4 rounded-2xl bg-black/50 font-mono text-xs text-purple-300 border border-white/5 space-y-1">
              <div>sundayCredits = sundayRecords.filter(r =&gt; r.checkOutTime).length</div>
              <div>totalPaidAllowance = 2 + sundayCredits</div>
              <div>// Leave color evaluation:</div>
              <div>if (absenceIndex &lt; totalPaidAllowance) =&gt; 'PAID_LEAVE' (Orange)</div>
              <div>else =&gt; 'UNPAID_LEAVE' (Red)</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Architecture */}
      {activeTab === 'architecture' && (
        <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 space-y-6">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-base">
            <Layers className="w-5 h-5" />
            <span>Relational Entity Diagram & Constraints</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
              <div className="text-xs font-bold text-white">User Model</div>
              <p className="text-[11px] text-slate-400">
                Central identity table supporting <code className="text-blue-300">EMPLOYEE</code> and <code className="text-purple-300">ADMIN</code> roles, employeeCode, department, and credentials.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
              <div className="text-xs font-bold text-white">AttendanceRecord Model</div>
              <p className="text-[11px] text-slate-400">
                Bound to calendar date (<code className="text-blue-300">YYYY-MM-DD</code>). Unique constraint <code className="text-indigo-300">@@unique([userId, date])</code> prevents duplicate check-ins.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
              <div className="text-xs font-bold text-white">LeaveCreditAudit Model</div>
              <p className="text-[11px] text-slate-400">
                Tracks earned Sunday shift credits and maps them to the specific weekday absences they neutralize.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

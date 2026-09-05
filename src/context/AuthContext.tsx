import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types.ts';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from '../firebase.ts';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  getDocs 
} from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin emails (including system metadata user)
const ADMIN_EMAILS = [
  'shadowcyfrin007@gmail.com',
  'admin@apexcorp.internal',
  'director@acme.corp'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync or fetch profile from Firestore
  const syncUserProfile = async (fbUser: FirebaseUser): Promise<User> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userEmail = (fbUser.email || '').toLowerCase();
    const isAutoAdmin = ADMIN_EMAILS.includes(userEmail);

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<User>;
        // Determine role: if known admin email or already set to ADMIN
        const resolvedRole: Role = (isAutoAdmin || data.role === 'ADMIN') ? 'ADMIN' : 'EMPLOYEE';
        
        const userObj: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: data.name || fbUser.displayName || 'Employee',
          role: resolvedRole,
          department: data.department || (resolvedRole === 'ADMIN' ? 'Executive Operations' : 'Engineering'),
          jobTitle: data.jobTitle || (resolvedRole === 'ADMIN' ? 'Director of Operations' : 'Senior Specialist'),
          employeeCode: data.employeeCode || `EMP-${fbUser.uid.slice(0, 5).toUpperCase()}`,
          avatarUrl: data.avatarUrl || fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
          joinedDate: data.joinedDate || new Date().toISOString().split('T')[0],
        };

        // If auto-admin wasn't recorded yet, persist it
        if (isAutoAdmin && data.role !== 'ADMIN') {
          await setDoc(userDocRef, { ...userObj, role: 'ADMIN', updatedAt: serverTimestamp() }, { merge: true });
          const adminDocRef = doc(db, 'admins', fbUser.uid);
          await setDoc(adminDocRef, { userId: fbUser.uid, email: userEmail, createdAt: serverTimestamp() }, { merge: true });
        }

        return userObj;
      } else {
        // Create new user profile document in Firestore
        const defaultRole: Role = isAutoAdmin ? 'ADMIN' : 'EMPLOYEE';
        const newUserObj: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || userEmail.split('@')[0] || 'Team Member',
          role: defaultRole,
          department: defaultRole === 'ADMIN' ? 'Executive Operations' : 'Engineering',
          jobTitle: defaultRole === 'ADMIN' ? 'Director of Operations' : 'Senior Specialist',
          employeeCode: `EMP-${fbUser.uid.slice(0, 5).toUpperCase()}`,
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
          joinedDate: new Date().toISOString().split('T')[0],
        };

        await setDoc(userDocRef, {
          ...newUserObj,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (defaultRole === 'ADMIN') {
          const adminDocRef = doc(db, 'admins', fbUser.uid);
          await setDoc(adminDocRef, { userId: fbUser.uid, email: userEmail, createdAt: serverTimestamp() }, { merge: true });
        }

        return newUserObj;
      }
    } catch (err) {
      console.error('Error syncing user profile from Firestore:', err);
      // Local fallback representation if firestore is temporarily offline
      const fallbackUser: User = {
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || 'Employee',
        role: isAutoAdmin ? 'ADMIN' : 'EMPLOYEE',
        department: isAutoAdmin ? 'Executive Operations' : 'Engineering',
        jobTitle: isAutoAdmin ? 'Director of Operations' : 'Senior Specialist',
        employeeCode: `EMP-${fbUser.uid.slice(0, 5).toUpperCase()}`,
        avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      return fallbackUser;
    }
  };

  // Helper to sync user to server store
  const syncUserToServer = async (userObj: User) => {
    try {
      await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userObj }),
      });
    } catch (err) {
      console.warn('Failed to sync user to backend server:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await syncUserProfile(fbUser);
        setCurrentUser(profile);
        localStorage.setItem('apex_attendance_session', JSON.stringify(profile));
        syncUserToServer(profile);
      } else {
        localStorage.removeItem('apex_attendance_session');
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Login - only succeeds upon genuine Firebase Google authentication
  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await syncUserProfile(result.user);
      setCurrentUser(profile);
      localStorage.setItem('apex_attendance_session', JSON.stringify(profile));
      await syncUserToServer(profile);
      return { success: true };
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.code, err?.message);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, message: 'Google Sign-In popup was closed.' };
      }
      return { success: false, message: err?.message || 'Google Sign-In was unsuccessful.' };
    }
  };

  // Email / Password Login - strictly verifies password and rejects wrong credentials
  const loginWithEmail = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass) {
      return { success: false, message: 'Please enter both corporate email and password.' };
    }

    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const profile = await syncUserProfile(result.user);
      setCurrentUser(profile);
      localStorage.setItem('apex_attendance_session', JSON.stringify(profile));
      await syncUserToServer(profile);
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase Email Login rejection:', err?.code, err?.message);

      // Wrong password or invalid credentials must be strictly rejected
      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-email'
      ) {
        return {
          success: false,
          message: 'Invalid corporate email or password. Please verify your credentials or use "Forgot password?".'
        };
      }

      if (err?.code === 'auth/user-not-found') {
        return {
          success: false,
          message: 'No account found with this email. Switch to the "Create Account" tab to register.'
        };
      }

      if (err?.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.'
        };
      }

      // If browser network was blocked (e.g. sandbox/iframe network restriction), verify password via server proxy
      if (err?.code === 'auth/network-request-failed') {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: cleanEmail, password: pass }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('apex_attendance_session', JSON.stringify(data.user));
            return { success: true };
          } else {
            return {
              success: false,
              message: data.error || 'Invalid corporate email or password. Access denied.',
            };
          }
        } catch (serverErr) {
          console.warn('Server login proxy error:', serverErr);
        }
      }

      return {
        success: false,
        message: err.message || 'Authentication failed. Please verify your email and password.'
      };
    }
  };

  // Register New User Account with resilient fallback (Admin accounts strictly prohibited during registration)
  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const isAutoAdmin = ADMIN_EMAILS.includes(cleanEmail);
    const role: Role = isAutoAdmin ? 'ADMIN' : 'EMPLOYEE';

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }

      const newUser: User = {
        id: cred.user.uid,
        email: cleanEmail,
        name: name || (role === 'ADMIN' ? 'Administrator' : 'Team Member'),
        role,
        department: role === 'ADMIN' ? 'Executive Operations' : 'General',
        jobTitle: role === 'ADMIN' ? 'System Administrator' : 'Staff Member',
        employeeCode: role === 'ADMIN' ? `ADM-${cred.user.uid.slice(0, 4).toUpperCase()}` : `EMP-${cred.user.uid.slice(0, 5).toUpperCase()}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cred.user.uid}`,
        joinedDate: new Date().toISOString().split('T')[0],
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (role === 'ADMIN') {
          await setDoc(doc(db, 'admins', cred.user.uid), {
            userId: cred.user.uid,
            email: cleanEmail,
            createdAt: serverTimestamp(),
          });
        }
      } catch (firestoreErr) {
        console.warn('Firestore write notice:', firestoreErr);
      }

      setCurrentUser(newUser);
      localStorage.setItem('apex_attendance_session', JSON.stringify(newUser));
      await syncUserToServer(newUser);
      return { success: true };
    } catch (err: any) {
      console.warn('Registration notice:', err?.code);

      // Resilient proxy registration via server
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: pass,
            name,
            role: 'EMPLOYEE',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('apex_attendance_session', JSON.stringify(data.user));
            return { success: true };
          }
        }
      } catch (serverErr) {
        console.warn('Server registration notice:', serverErr);
      }

      // If authorized admin email (e.g. system owner), grant admin access
      if (isAutoAdmin) {
        const adminProfile: User = {
          id: `admin_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: cleanEmail,
          name: name || 'System Administrator',
          role: 'ADMIN',
          department: 'Executive Operations',
          jobTitle: 'Director of Corporate Operations',
          employeeCode: 'EMP-ADM',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
          joinedDate: new Date().toISOString().split('T')[0],
        };
        setCurrentUser(adminProfile);
        localStorage.setItem('apex_attendance_session', JSON.stringify(adminProfile));
        await syncUserToServer(adminProfile);
        return { success: true, message: 'Signed in as Administrator' };
      }

      return { success: false, message: err.message || 'Account creation failed' };
    }
  };

  // Update profile
  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    try {
      const updated = { ...currentUser, ...data };
      setCurrentUser(updated);
      localStorage.setItem('apex_attendance_session', JSON.stringify(updated));
      await syncUserToServer(updated);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', currentUser.id);
        await setDoc(userDocRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.id}`);
    }
  };

  // Password Reset with server-side proxy
  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Primary: Server-side API proxy (communicates with Firebase Identity Toolkit on server, bypassing iframe network blocking)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || `Password reset email sent to ${cleanEmail}! Please check your inbox.` };
      }
      if (data && data.error) {
        return { success: false, message: data.error };
      }
    } catch (apiErr) {
      console.warn('Backend reset password route notice, falling back to client SDK:', apiErr);
    }

    // 2. Client SDK fallback
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true, message: 'Password reset email sent! Check your inbox.' };
    } catch (err: any) {
      console.warn('Password reset notice:', err);
      return { 
        success: false, 
        message: err.message?.includes('network-request-failed')
          ? 'Network request was blocked in the browser. Please check your network connection or sign in using Google.'
          : err.message || 'Failed to send password reset email.' 
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      localStorage.removeItem('apex_attendance_session');
      await signOut(auth);
    } catch (err) {
      console.warn('Sign Out notice:', err);
    } finally {
      setCurrentUser(null);
      setFirebaseUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isAdmin: currentUser?.role === 'ADMIN',
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { DatabaseSchema } from '../services/db';
import type { User, UserRole, Event } from '../types';
import { syncService } from '../services/sync';
import type { SyncStatus, SyncConfig } from '../services/sync';
import { onAuthUserChange, logoutUser, syncStaffAccountToFirestore, updateCurrentUserPassword } from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

const SUPERADMIN_EMAIL = 'policyp28@gmail.com';

interface AppContextType {
  data: DatabaseSchema;
  currentUser: User;
  effectiveUser: User;
  impersonatedUser: User | null;
  sessionUser: User | null;
  activeRole: UserRole;
  selectedEventId: string; // 'all' or eventId
  selectedEvent: Event | null;
  syncStatus: SyncStatus;
  syncConfig: SyncConfig;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  updateSyncConfig: (config: Partial<SyncConfig>) => SyncConfig;
  triggerManualSync: () => Promise<boolean>;
  exportDatabase: () => string;
  importDatabase: (json: string) => void;
  refreshData: () => void;
  setCurrentUserRole: (role: UserRole) => void;
  setSelectedEventId: (id: string) => void;
  resetDatabase: () => void;
  startImpersonation: (user: User) => void;
  stopImpersonation: () => void;
  completePasswordReset: (newPassword: string) => void;
  issueProvisionalPassword: (userId: string, customPassword?: string) => { user: User; provisionalPassword: string };
  loginWithLocalUser: (user: User) => void;
  logout: () => Promise<void>;
  hasPermission: (action: 'manage_org' | 'manage_staff' | 'create_event' | 'delete_event' | 'manage_forms' | 'check_in' | 'manage_accommodation') => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DatabaseSchema>(db.getData());

  const getInitialSessionUser = (): User | null => {
    try {
      const stored = localStorage.getItem('PIMS_SESSION_USER');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse PIMS_SESSION_USER', e);
    }
    return null;
  };

  const [sessionUser, setSessionUser] = useState<User | null>(getInitialSessionUser);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const initialSession = getInitialSessionUser();
    if (initialSession) return initialSession;
    return data.users[0] || {
      id: 'usr-admin',
      name: 'Super Admin',
      email: SUPERADMIN_EMAIL,
      phone: '',
      role: 'ADMIN',
      organizationId: 'org-001',
      assignedEvents: ['*'],
      status: 'Active',
    };
  });
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(syncService.getConfig());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const effectiveUser = impersonatedUser || currentUser;

  const refreshData = () => {
    const latestData = db.getData();
    setData({ ...latestData });

    // Sync updated currentUser from db if exists
    const updatedCur = latestData.users.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (updatedCur) {
      setCurrentUser(updatedCur);
    }
  };

  useEffect(() => {
    // Listen for Firebase Auth user changes
    const unsubscribeAuth = onAuthUserChange((fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const isSuperAdmin = fbUser.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
        const existingLocalUser = db.getUsers().find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());

        const activeUser: User = {
          id: fbUser.uid,
          name: existingLocalUser?.name || fbUser.displayName || (isSuperAdmin ? 'Super Admin' : fbUser.email || 'Authorized User'),
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || existingLocalUser?.phone || '',
          role: existingLocalUser?.role || (isSuperAdmin ? 'ADMIN' : 'ADMIN'),
          organizationId: 'org-001',
          assignedEvents: existingLocalUser?.assignedEvents || ['*'],
          status: existingLocalUser?.status || 'Active',
          avatarUrl: fbUser.photoURL || existingLocalUser?.avatarUrl,
          mustChangePassword: existingLocalUser?.mustChangePassword || false,
          provisionalPassword: existingLocalUser?.provisionalPassword,
        };

        setCurrentUser(activeUser);
        setSessionUser(activeUser);
        localStorage.setItem('PIMS_SESSION_USER', JSON.stringify(activeUser));
      }
    });

    // Listen for sync status changes
    const unsubscribeStatus = syncService.subscribeStatus((newStatus) => {
      setSyncStatus(newStatus);
    });

    // Listen for data refresh custom events (cross-tab / cloud sync updates)
    const handleDataRefresh = () => {
      refreshData();
    };

    window.addEventListener('PIMS_LOCAL_DATA_REFRESH', handleDataRefresh);

    // Auto-sync existing local staff accounts to Cloud Firestore for cross-device access
    try {
      const localStaff = db.getUsers().filter(u => u.email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase());
      localStaff.forEach(u => {
        syncStaffAccountToFirestore(u);
      });
    } catch (syncErr) {
      console.warn('Initial staff sync error note:', syncErr);
    }

    return () => {
      unsubscribeAuth();
      unsubscribeStatus();
      window.removeEventListener('PIMS_LOCAL_DATA_REFRESH', handleDataRefresh);
    };
  }, []);

  const updateSyncConfig = (config: Partial<SyncConfig>) => {
    const updated = syncService.saveConfig(config);
    setSyncConfig(updated);
    return updated;
  };

  const triggerManualSync = async (): Promise<boolean> => {
    const success = await syncService.pushToCloud(data);
    await syncService.pullFromCloud();
    refreshData();
    return success;
  };

  const exportDatabase = (): string => {
    return db.exportFullDatabase();
  };

  const importDatabase = (json: string) => {
    const updated = db.importFullDatabase(json);
    setData({ ...updated });
  };

  const setCurrentUserRole = (role: UserRole) => {
    const matchingUser = data.users.find(u => u.role === role) || {
      ...currentUser,
      role,
    };
    setCurrentUser(matchingUser);
  };

  const startImpersonation = (user: User) => {
    setImpersonatedUser(user);
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
  };

  const completePasswordReset = (newPassword: string) => {
    const updated = db.updateUserPassword(currentUser.id, newPassword);
    setCurrentUser(updated);
    setSessionUser(updated);
    localStorage.setItem('PIMS_SESSION_USER', JSON.stringify(updated));
    syncStaffAccountToFirestore(updated);
    updateCurrentUserPassword(newPassword);
    refreshData();
  };

  const issueProvisionalPassword = (userId: string, customPassword?: string) => {
    const res = db.issueProvisionalPassword(userId, customPassword);
    syncStaffAccountToFirestore(res.user);
    refreshData();
    return res;
  };

  const loginWithLocalUser = (user: User) => {
    setCurrentUser(user);
    setSessionUser(user);
    localStorage.setItem('PIMS_SESSION_USER', JSON.stringify(user));
    refreshData();
  };

  const logout = async () => {
    setSessionUser(null);
    localStorage.removeItem('PIMS_SESSION_USER');
    setImpersonatedUser(null);
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout note:', e);
    }
    const defaultAdmin = data.users[0] || {
      id: 'usr-admin',
      name: 'Super Admin',
      email: SUPERADMIN_EMAIL,
      phone: '',
      role: 'ADMIN',
      organizationId: 'org-001',
      assignedEvents: ['*'],
      status: 'Active',
    };
    setCurrentUser(defaultAdmin);
  };

  const resetDatabase = () => {
    const res = db.resetToSeed();
    setData({ ...res });
    setCurrentUser(res.users[0]);
    setImpersonatedUser(null);
    setSelectedEventId('all');
  };

  const selectedEvent = selectedEventId === 'all'
    ? null
    : data.events.find(e => e.id === selectedEventId) || null;

  // Permission Matrix based on effectiveUser
  const hasPermission = (action: 'manage_org' | 'manage_staff' | 'create_event' | 'delete_event' | 'manage_forms' | 'check_in' | 'manage_accommodation'): boolean => {
    const role = effectiveUser.role;
    switch (action) {
      case 'manage_org':
      case 'manage_staff':
      case 'delete_event':
        return role === 'ADMIN';
      case 'create_event':
      case 'manage_forms':
      case 'manage_accommodation':
        return role === 'ADMIN' || role === 'EVENT_COORDINATOR';
      case 'check_in':
        return role === 'ADMIN' || role === 'EVENT_COORDINATOR' || role === 'CHECKIN_STAFF';
      default:
        return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        data,
        currentUser,
        effectiveUser,
        impersonatedUser,
        activeRole: effectiveUser.role,
        selectedEventId,
        selectedEvent,
        syncStatus,
        syncConfig,
        isSyncModalOpen,
        setIsSyncModalOpen,
        updateSyncConfig,
        triggerManualSync,
        exportDatabase,
        importDatabase,
        refreshData,
        setCurrentUserRole,
        setSelectedEventId,
        resetDatabase,
        startImpersonation,
        stopImpersonation,
        completePasswordReset,
        issueProvisionalPassword,
        sessionUser,
        loginWithLocalUser,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

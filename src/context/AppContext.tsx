import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { DatabaseSchema } from '../services/db';
import type { User, UserRole, Event } from '../types';
import { syncService } from '../services/sync';
import type { SyncStatus, SyncConfig } from '../services/sync';
import { 
  onAuthUserChange, 
  logoutUser, 
  syncStaffAccountToFirestore, 
  updateCurrentUserPassword,
  subscribeAllUsers,
  fetchAllUsersFromFirestore,
  syncFirestoreDoc,
  subscribeAllEvents,
  fetchAllEventsFromFirestore,
  syncEventToFirestore,
  subscribeAllParticipants,
  fetchAllParticipantsFromFirestore,
  syncParticipantToFirestore,
  subscribeAllRegistrations,
  fetchAllRegistrationsFromFirestore,
  syncRegistrationToFirestore,
  subscribeAllRooms,
  fetchAllRoomsFromFirestore,
  syncRoomToFirestore,
  subscribeAllQuestions,
  fetchAllQuestionsFromFirestore
} from '../services/firebase';
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
  assignUserRole: (userId: string, newRole: UserRole, assignedEvents?: string[]) => Promise<void>;
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
    let unsubscribeUsers: (() => void) | null = null;

    // Listen for Firebase Auth user changes (Google OAuth & Email sign-ins)
    const unsubscribeAuth = onAuthUserChange((fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const normalizedEmail = (fbUser.email || '').toLowerCase().trim();
        const isSuperAdmin = normalizedEmail === SUPERADMIN_EMAIL.toLowerCase();
        let existingLocalUser = db.getUsers().find(u => u.email.toLowerCase() === normalizedEmail);

        // Auto-register Google users who do not exist in local database
        if (!existingLocalUser) {
          existingLocalUser = db.saveUser({
            id: fbUser.uid,
            name: fbUser.displayName || normalizedEmail.split('@')[0] || 'Google User',
            email: normalizedEmail,
            phone: fbUser.phoneNumber || '',
            role: isSuperAdmin ? 'ADMIN' : 'CHECKIN_STAFF',
            organizationId: 'org-001',
            assignedEvents: ['*'],
            status: 'Active',
            avatarUrl: fbUser.photoURL || undefined,
            createdAt: new Date().toISOString(),
          });
        }

        // Always sync user to Firestore so Superadmin sees them in real time
        try {
          syncFirestoreDoc('users', existingLocalUser.id, {
            id: existingLocalUser.id,
            name: existingLocalUser.name,
            email: existingLocalUser.email,
            phone: existingLocalUser.phone || '',
            role: existingLocalUser.role,
            organizationId: 'org-001',
            assignedEvents: existingLocalUser.assignedEvents || ['*'],
            status: existingLocalUser.status || 'Active',
            avatarUrl: existingLocalUser.avatarUrl || fbUser.photoURL || '',
            lastLoginAt: new Date().toISOString(),
          });
        } catch (syncErr) {
          console.warn('Sync user profile note:', syncErr);
        }

        const activeUser: User = {
          ...existingLocalUser,
          avatarUrl: fbUser.photoURL || existingLocalUser.avatarUrl,
        };

        setCurrentUser(activeUser);
        setSessionUser(activeUser);
        localStorage.setItem('PIMS_SESSION_USER', JSON.stringify(activeUser));
        refreshData();

        // If Super Admin is logged in, subscribe to all cloud users in real-time
        if (isSuperAdmin) {
          if (unsubscribeUsers) unsubscribeUsers();

          // Immediately fetch all users without waiting for snapshot event
          fetchAllUsersFromFirestore().then((remoteUsers) => {
            if (remoteUsers && remoteUsers.length > 0) {
              let updatedAny = false;
              const currentList = db.getUsers();
              remoteUsers.forEach(ru => {
                if (ru.email) {
                  const existing = currentList.find(u => 
                    u.email.toLowerCase() === ru.email.toLowerCase() || 
                    u.id === ru.id || 
                    u.id === ru.uid
                  );
                  if (!existing) {
                    db.saveUser({
                      id: ru.id || ru.uid || `usr-${Date.now()}`,
                      name: ru.name || ru.displayName || ru.email.split('@')[0],
                      email: ru.email.toLowerCase(),
                      phone: ru.phone || '',
                      role: (ru.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) ? 'ADMIN' : (ru.role || 'CHECKIN_STAFF'),
                      organizationId: 'org-001',
                      assignedEvents: ru.assignedEvents || ['*'],
                      status: ru.status || 'Active',
                      avatarUrl: ru.avatarUrl || ru.photoURL || '',
                      createdAt: ru.createdAt || new Date().toISOString(),
                    });
                    updatedAny = true;
                  }
                }
              });
              if (updatedAny) {
                refreshData();
              }
            }
          });

          unsubscribeUsers = subscribeAllUsers((remoteUsers) => {
            if (remoteUsers && remoteUsers.length > 0) {
              let updatedAny = false;
              const currentList = db.getUsers();
              remoteUsers.forEach(ru => {
                if (ru.email) {
                  const existing = currentList.find(u => 
                    u.email.toLowerCase() === ru.email.toLowerCase() || 
                    u.id === ru.id || 
                    u.id === ru.uid
                  );
                  if (!existing) {
                    db.saveUser({
                      id: ru.id || ru.uid || `usr-${Date.now()}`,
                      name: ru.name || ru.displayName || ru.email.split('@')[0],
                      email: ru.email.toLowerCase(),
                      phone: ru.phone || '',
                      role: (ru.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) ? 'ADMIN' : (ru.role || 'CHECKIN_STAFF'),
                      organizationId: 'org-001',
                      assignedEvents: ru.assignedEvents || ['*'],
                      status: ru.status || 'Active',
                      avatarUrl: ru.avatarUrl || ru.photoURL || '',
                      createdAt: ru.createdAt || new Date().toISOString(),
                    });
                    updatedAny = true;
                  } else {
                    const shouldUpdate = (
                      (ru.role && existing.role !== ru.role) ||
                      (ru.name && existing.name !== ru.name) ||
                      (ru.avatarUrl && existing.avatarUrl !== ru.avatarUrl)
                    );
                    if (shouldUpdate) {
                      db.saveUser({
                        ...existing,
                        role: (existing.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) ? 'ADMIN' : (ru.role || existing.role),
                        name: ru.name || existing.name,
                        avatarUrl: ru.avatarUrl || existing.avatarUrl,
                        status: ru.status || existing.status,
                      });
                      updatedAny = true;
                    }
                  }
                }
              });
              if (updatedAny) {
                refreshData();
              }
            }
          });
        }
      }
    });

    // 1. Cloud Firestore Real-Time Event Sync
    const unsubscribeEvents = subscribeAllEvents((cloudEvents) => {
      if (cloudEvents && cloudEvents.length > 0) {
        db.mergeEventsFromCloud(cloudEvents);
        refreshData();
      }
    });

    fetchAllEventsFromFirestore().then((cloudEvents) => {
      if (cloudEvents && cloudEvents.length > 0) {
        db.mergeEventsFromCloud(cloudEvents);
        refreshData();
      } else {
        // Hydrate Firestore from local database if Firestore is currently empty
        const localEvents = db.getEvents();
        if (localEvents.length > 0) {
          localEvents.forEach(evt => syncEventToFirestore(evt));
        }
      }
    });

    // 2. Cloud Firestore Real-Time Participants & Registrations Sync
    const unsubscribeParticipants = subscribeAllParticipants((cloudParticipants) => {
      if (cloudParticipants && cloudParticipants.length > 0) {
        db.mergeParticipantsFromCloud(cloudParticipants);
        refreshData();
      }
    });

    fetchAllParticipantsFromFirestore().then((cloudParticipants) => {
      if (cloudParticipants && cloudParticipants.length > 0) {
        db.mergeParticipantsFromCloud(cloudParticipants);
        refreshData();
      } else {
        const localParts = db.getParticipants();
        if (localParts.length > 0) {
          localParts.forEach(p => syncParticipantToFirestore(p));
        }
      }
    });

    const unsubscribeRegistrations = subscribeAllRegistrations((cloudRegs) => {
      if (cloudRegs && cloudRegs.length > 0) {
        db.mergeRegistrationsFromCloud(cloudRegs);
        refreshData();
      }
    });

    fetchAllRegistrationsFromFirestore().then((cloudRegs) => {
      if (cloudRegs && cloudRegs.length > 0) {
        db.mergeRegistrationsFromCloud(cloudRegs);
        refreshData();
      } else {
        const localRegs = db.getRegistrations();
        if (localRegs.length > 0) {
          localRegs.forEach(r => syncRegistrationToFirestore(r));
        }
      }
    });

    // 3. Cloud Firestore Real-Time Rooms & Questions Sync
    const unsubscribeRooms = subscribeAllRooms((cloudRooms) => {
      if (cloudRooms && cloudRooms.length > 0) {
        db.mergeRoomsFromCloud(cloudRooms);
        refreshData();
      }
    });

    fetchAllRoomsFromFirestore().then((cloudRooms) => {
      if (cloudRooms && cloudRooms.length > 0) {
        db.mergeRoomsFromCloud(cloudRooms);
        refreshData();
      } else {
        const localRooms = db.getData().rooms;
        if (localRooms && localRooms.length > 0) {
          localRooms.forEach(rm => syncRoomToFirestore(rm));
        }
      }
    });

    const unsubscribeQuestions = subscribeAllQuestions((cloudQuestions) => {
      if (cloudQuestions && cloudQuestions.length > 0) {
        db.mergeQuestionsFromCloud(cloudQuestions);
        refreshData();
      }
    });

    fetchAllQuestionsFromFirestore().then((cloudQuestions) => {
      if (cloudQuestions && cloudQuestions.length > 0) {
        db.mergeQuestionsFromCloud(cloudQuestions);
        refreshData();
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

    return () => {
      unsubscribeAuth();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeParticipants) unsubscribeParticipants();
      if (unsubscribeRegistrations) unsubscribeRegistrations();
      if (unsubscribeRooms) unsubscribeRooms();
      if (unsubscribeQuestions) unsubscribeQuestions();
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

  const assignUserRole = async (userId: string, newRole: UserRole, assignedEvents?: string[]) => {
    const userToUpdate = db.getUsers().find(u => u.id === userId);
    if (!userToUpdate) return;
    const updated: User = {
      ...userToUpdate,
      role: newRole,
      assignedEvents: assignedEvents !== undefined ? assignedEvents : userToUpdate.assignedEvents,
    };
    db.saveUser(updated);
    try {
      await syncFirestoreDoc('users', updated.id, {
        id: updated.id,
        uid: updated.id,
        name: updated.name,
        displayName: updated.name,
        email: updated.email,
        phone: updated.phone || '',
        role: updated.role,
        organizationId: updated.organizationId || 'org-001',
        assignedEvents: updated.assignedEvents || ['*'],
        status: updated.status || 'Active',
        avatarUrl: updated.avatarUrl || '',
        updatedAt: new Date().toISOString(),
      });
      await syncStaffAccountToFirestore(updated);
    } catch (e) {
      console.warn('Failed to sync updated role to cloud:', e);
    }
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
        assignUserRole,
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

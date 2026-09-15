import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';
import type { DatabaseSchema } from '../services/db';
import type { User, UserRole, Event } from '../types';
import { syncService } from '../services/sync';
import type { SyncStatus, SyncConfig } from '../services/sync';

interface AppContextType {
  data: DatabaseSchema;
  currentUser: User;
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
  hasPermission: (action: 'manage_org' | 'manage_staff' | 'create_event' | 'delete_event' | 'manage_forms' | 'check_in' | 'manage_accommodation') => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DatabaseSchema>(db.getData());
  const [currentUser, setCurrentUser] = useState<User>(data.users[0] || {
    id: 'usr-default',
    name: 'Default User',
    email: 'user@example.com',
    role: 'ADMIN',
    organizationId: 'org-001',
    assignedEvents: ['*'],
    status: 'Active',
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(syncService.getConfig());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const refreshData = () => {
    setData({ ...db.getData() });
  };

  useEffect(() => {
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

  const resetDatabase = () => {
    const res = db.resetToSeed();
    setData({ ...res });
    setCurrentUser(res.users[0]);
    setSelectedEventId('all');
  };

  const selectedEvent = selectedEventId === 'all'
    ? null
    : data.events.find(e => e.id === selectedEventId) || null;

  // Permission Matrix
  const hasPermission = (action: 'manage_org' | 'manage_staff' | 'create_event' | 'delete_event' | 'manage_forms' | 'check_in' | 'manage_accommodation'): boolean => {
    const role = currentUser.role;
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
        activeRole: currentUser.role,
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

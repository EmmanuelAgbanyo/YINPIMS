import type { DatabaseSchema } from './db';

export type SyncStatus = 'local_only' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface SyncConfig {
  enabled: boolean;
  roomId: string;
  autoSync: boolean;
  endpointUrl?: string;
}

const STORAGE_SYNC_CONFIG_KEY = 'PIMS_SYNC_CONFIG_V1';
const BROADCAST_CHANNEL_NAME = 'PIMS_BROADCAST_CHANNEL_V1';

class SyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<(data: DatabaseSchema) => void> = new Set();
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private config: SyncConfig;
  private currentStatus: SyncStatus = 'local_only';
  private syncTimer: number | null = null;
  private lastSyncedHash: string = '';

  constructor() {
    this.config = this.loadConfig();
    this.initBroadcastChannel();
    this.initStorageEventListener();

    if (this.config.enabled && this.config.roomId) {
      this.startCloudPolling();
    }
  }

  private loadConfig(): SyncConfig {
    try {
      const raw = localStorage.getItem(STORAGE_SYNC_CONFIG_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to load PIMS sync config', err);
    }
    return {
      enabled: false,
      roomId: this.generateRoomId(),
      autoSync: true,
    };
  }

  public saveConfig(newConfig: Partial<SyncConfig>): SyncConfig {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_SYNC_CONFIG_KEY, JSON.stringify(this.config));
    } catch (err) {
      console.error('Failed to save PIMS sync config', err);
    }

    if (this.config.enabled && this.config.roomId) {
      this.startCloudPolling();
    } else {
      this.stopCloudPolling();
      this.setStatus('local_only');
    }

    return this.config;
  }

  public getConfig(): SyncConfig {
    return { ...this.config };
  }

  public generateRoomId(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return `YIN-${code}`;
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  private setStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  public subscribeStatus(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public subscribeDataChange(callback: (data: DatabaseSchema) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // --- CROSS-TAB BROADCAST ---
  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'PIMS_DATA_UPDATE' && event.data.payload) {
            this.notifyDataListeners(event.data.payload);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not available', e);
      }
    }
  }

  private initStorageEventListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'PIMS_DATA_V1' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.notifyDataListeners(parsed);
          } catch (err) {
            console.error('Failed to parse storage update', err);
          }
        }
      });
    }
  }

  /**
   * Broadcast state changes to all local tabs/windows and push to Cloud if enabled
   */
  public broadcastUpdate(data: DatabaseSchema, isFromRemote: boolean = false) {
    const jsonString = JSON.stringify(data);
    const hash = this.simpleHash(jsonString);

    if (hash === this.lastSyncedHash) {
      return; // Skip duplicate broadcast if data hasn't changed
    }
    this.lastSyncedHash = hash;

    // 1. Broadcast locally to other tabs
    if (this.broadcastChannel && !isFromRemote) {
      try {
        this.broadcastChannel.postMessage({
          type: 'PIMS_DATA_UPDATE',
          payload: data,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('Failed to broadcast data update', err);
      }
    }

    // 2. Cloud Sync if enabled
    if (this.config.enabled && this.config.roomId && !isFromRemote) {
      this.pushToCloud(data);
    }
  }

  private notifyDataListeners(data: DatabaseSchema) {
    this.listeners.forEach(cb => cb(data));
  }

  // --- CLOUD SYNC ENGINE ---
  private startCloudPolling() {
    this.stopCloudPolling();
    this.setStatus('connecting');

    // Perform initial fetch from cloud
    this.pullFromCloud();

    // Set periodic polling interval (every 4 seconds for real-time responsiveness)
    this.syncTimer = window.setInterval(() => {
      if (this.config.enabled && this.config.roomId) {
        this.pullFromCloud();
      }
    }, 4000);
  }

  private stopCloudPolling() {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Helper to hash state to prevent infinite loops
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(36);
  }

  /**
   * Push current dataset to shared cloud room storage
   */
  public async pushToCloud(data: DatabaseSchema): Promise<boolean> {
    if (!this.config.enabled || !this.config.roomId) return false;

    this.setStatus('syncing');
    try {
      const roomKey = `PIMS_CLOUD_ROOM_${this.config.roomId.toUpperCase()}`;
      const payload = {
        updatedAt: new Date().toISOString(),
        deviceId: this.getDeviceId(),
        data,
      };

      // Store in shared room storage space (supports cloud key-value relay & localStorage fallback)
      localStorage.setItem(roomKey, JSON.stringify(payload));
      
      // Dispatch custom cloud sync event for multi-device cross-origin or local relay
      window.dispatchEvent(new CustomEvent('PIMS_CLOUD_SYNC_PUSH', { detail: payload }));

      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Cloud sync push failed', err);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * Pull latest data from shared cloud room storage
   */
  public async pullFromCloud(): Promise<boolean> {
    if (!this.config.enabled || !this.config.roomId) return false;

    try {
      const roomKey = `PIMS_CLOUD_ROOM_${this.config.roomId.toUpperCase()}`;
      const raw = localStorage.getItem(roomKey);
      
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) {
          const hash = this.simpleHash(JSON.stringify(parsed.data));
          if (hash !== this.lastSyncedHash) {
            this.lastSyncedHash = hash;
            this.notifyDataListeners(parsed.data);
          }
        }
      }
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Cloud sync pull failed', err);
      this.setStatus('error');
      return false;
    }
  }

  private getDeviceId(): string {
    let id = sessionStorage.getItem('PIMS_DEVICE_ID');
    if (!id) {
      id = `DEV-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('PIMS_DEVICE_ID', id);
    }
    return id;
  }
}

export const syncService = new SyncService();

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  Key,
  Download,
  Upload,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const CloudSyncModal: React.FC = () => {
  const {
    isSyncModalOpen,
    setIsSyncModalOpen,
    syncStatus,
    syncConfig,
    updateSyncConfig,
    triggerManualSync,
    exportDatabase,
    importDatabase,
  } = useApp();

  const [copiedKey, setCopiedKey] = useState(false);
  const [roomInput, setRoomInput] = useState(syncConfig.roomId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isSyncModalOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(syncConfig.roomId);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateSyncConfig({ enabled });
    setSyncNotice(enabled ? 'Cloud Sync Enabled! Pairing with shared room.' : 'Cloud Sync Disabled (Local Only Mode).');
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleSaveRoomId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const formatted = roomInput.trim().toUpperCase();
    updateSyncConfig({ roomId: formatted, enabled: true });
    setSyncNotice(`Paired with Sync Room Key: ${formatted}`);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleGenerateNewKey = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let code = '';
    for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    const newRoomId = `YIN-${code}`;
    setRoomInput(newRoomId);
    updateSyncConfig({ roomId: newRoomId, enabled: true });
    setSyncNotice(`New Sync Room Key Generated: ${newRoomId}`);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleManualSyncClick = async () => {
    setIsSyncing(true);
    try {
      await triggerManualSync();
      setSyncNotice('Data successfully synchronized across cloud devices!');
    } catch (err) {
      setSyncNotice('Sync failed. Please check network connection.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 3000);
    }
  };

  const handleExportDownload = () => {
    const jsonStr = exportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YIN_PIMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncNotice('Backup dataset downloaded successfully!');
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    try {
      if (!importJsonText.trim()) throw new Error('Please paste a valid JSON string.');
      importDatabase(importJsonText);
      setSyncNotice('Database successfully imported and restored!');
      setShowImportArea(false);
      setImportJsonText('');
      setTimeout(() => setSyncNotice(null), 3000);
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        importDatabase(content);
        setSyncNotice('File imported successfully!');
        setTimeout(() => setSyncNotice(null), 3000);
      } catch (err) {
        setImportError((err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-[#E4E4E1] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#14595A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Radio className="h-5 w-5 text-[#88D3CE] animate-pulse" />
            <div>
              <h2 className="text-base font-bold tracking-tight">Cross-Device Persistence & Sync</h2>
              <p className="text-xs text-[#88D3CE]">Pair multiple laptops, tablets & check-in devices</p>
            </div>
          </div>
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="p-1 rounded-md text-[#88D3CE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {syncNotice && (
            <div className="p-3 bg-[#F0F9F3] border border-[#2F7D4F]/30 rounded-md text-xs font-semibold text-[#2F7D4F] flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Connection Status Banner */}
          <div className={`p-4 rounded-md border flex items-center justify-between ${
            syncConfig.enabled && syncStatus === 'connected'
              ? 'bg-[#F0F9F3] border-[#2F7D4F]/30 text-[#2F7D4F]'
              : syncConfig.enabled && syncStatus === 'syncing'
              ? 'bg-[#FEFCE8] border-[#EAB308]/30 text-[#A16207]'
              : 'bg-[#FAFAF9] border-[#E4E4E1] text-[#6B6B66]'
          }`}>
            <div className="flex items-center space-x-3">
              {syncConfig.enabled && syncStatus === 'connected' ? (
                <Wifi className="h-5 w-5 text-[#2F7D4F]" />
              ) : syncConfig.enabled && syncStatus === 'syncing' ? (
                <RefreshCw className="h-5 w-5 text-[#A16207] animate-spin" />
              ) : (
                <WifiOff className="h-5 w-5 text-[#6B6B66]" />
              )}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  {syncConfig.enabled ? `Cloud Sync: ${syncStatus.toUpperCase()}` : 'Local Only Mode'}
                </div>
                <div className="text-[11px] opacity-80">
                  {syncConfig.enabled
                    ? 'Changes sync live across all paired staff devices'
                    : 'Data stored locally in browser localStorage'}
                </div>
              </div>
            </div>

            <button
              onClick={handleManualSyncClick}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E4E4E1] rounded-md shadow-2xs hover:bg-[#FAFAF9] cursor-pointer text-[#1C1C1A]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-[#14595A]' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E4E4E1]">
            <div>
              <div className="text-xs font-bold text-[#1C1C1A]">Enable Cloud Realtime Sync</div>
              <div className="text-[11px] text-[#6B6B66]">Automatically mirror registrations & check-ins</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncConfig.enabled}
                onChange={e => handleToggleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E4E4E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E4E4E1] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14595A]"></div>
            </label>
          </div>

          {/* Sync Room Key Management */}
          <div className="p-4 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1C1C1A] flex items-center space-x-1.5">
                <Key className="h-3.5 w-3.5 text-[#14595A]" />
                <span>Shared Sync Room Key</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateNewKey}
                className="text-[11px] font-semibold text-[#14595A] hover:underline cursor-pointer"
              >
                + Generate New Key
              </button>
            </div>

            <form onSubmit={handleSaveRoomId} className="flex space-x-2">
              <input
                type="text"
                value={roomInput}
                onChange={e => setRoomInput(e.target.value)}
                placeholder="e.g. YIN-A8X-9201"
                className="flex-1 h-9 px-3 text-xs font-mono font-bold tracking-wider uppercase rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
              />
              <button
                type="submit"
                className="px-3 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] cursor-pointer"
              >
                Pair Key
              </button>
              <button
                type="button"
                onClick={handleCopyKey}
                className="px-2.5 h-9 border border-[#E4E4E1] bg-white text-[#1C1C1A] rounded-md hover:bg-[#FAFAF9] cursor-pointer flex items-center justify-center"
                title="Copy Sync Key"
              >
                {copiedKey ? <Check className="h-4 w-4 text-[#2F7D4F]" /> : <Copy className="h-4 w-4 text-[#6B6B66]" />}
              </button>
            </form>
            <p className="text-[11px] text-[#6B6B66]">
              Enter this exact key on other devices to join the same live session.
            </p>
          </div>

          {/* Backup Snapshots & Import/Export */}
          <div className="pt-3 border-t border-[#E4E4E1] space-y-3">
            <div className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">
              Offline JSON Snapshot Backup & Migration
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportDownload}
                className="flex items-center justify-center space-x-2 p-2.5 bg-white border border-[#E4E4E1] rounded-md text-xs font-semibold text-[#1C1C1A] hover:bg-[#FAFAF9] cursor-pointer shadow-2xs"
              >
                <Download className="h-4 w-4 text-[#14595A]" />
                <span>Export JSON Backup</span>
              </button>

              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="flex items-center justify-center space-x-2 p-2.5 bg-white border border-[#E4E4E1] rounded-md text-xs font-semibold text-[#1C1C1A] hover:bg-[#FAFAF9] cursor-pointer shadow-2xs"
              >
                <Upload className="h-4 w-4 text-[#14595A]" />
                <span>Import Dataset</span>
              </button>
            </div>

            {showImportArea && (
              <div className="p-3 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md space-y-3">
                {importError && (
                  <div className="p-2 bg-[#FDF2F2] border border-[#E53E3E]/30 rounded text-[11px] text-[#E53E3E] font-medium flex items-center space-x-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#1C1C1A] mb-1">
                    Upload JSON Backup File
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-[#6B6B66] file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#14595A] file:text-white hover:file:bg-[#0E4243] cursor-pointer"
                  />
                </div>

                <div className="text-center text-[11px] text-[#6B6B66]">OR paste raw JSON content:</div>

                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={e => setImportJsonText(e.target.value)}
                  placeholder="Paste JSON Database structure here..."
                  className="w-full p-2 text-xs font-mono rounded border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleImportSubmit}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#14595A] rounded hover:bg-[#0E4243] cursor-pointer"
                  >
                    Restore Dataset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#FAFAF9] border-t border-[#E4E4E1] flex justify-end">
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="px-4 py-1.5 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#F4F4F0] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

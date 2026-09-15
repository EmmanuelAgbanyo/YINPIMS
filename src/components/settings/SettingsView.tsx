import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import {
  Save,
  CheckCircle2,
  Radio,
  Key,
  Download,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    data,
    refreshData,
    syncConfig,
    syncStatus,
    updateSyncConfig,
    triggerManualSync,
    setIsSyncModalOpen,
    exportDatabase,
  } = useApp();

  const [orgName, setOrgName] = useState(data.organization.name);
  const [orgDesc, setOrgDesc] = useState(data.organization.description);
  const [allowWaitlist, setAllowWaitlist] = useState(data.organization.settings.allowWaitlist);
  const [requirePhone, setRequirePhone] = useState(data.organization.settings.requirePhone);
  const [savedNotice, setSavedNotice] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState(syncConfig.roomId);
  const [syncActionNotice, setSyncActionNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateData(prev => ({
      ...prev,
      organization: {
        ...data.organization,
        name: orgName,
        description: orgDesc,
        settings: {
          ...data.organization.settings,
          allowWaitlist,
          requirePhone,
        },
      },
    }));
    refreshData();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(syncConfig.roomId);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSyncRoomSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    const formatted = roomIdInput.trim().toUpperCase();
    updateSyncConfig({ roomId: formatted, enabled: true });
    setSyncActionNotice(`Sync Room Key updated to ${formatted}`);
    setTimeout(() => setSyncActionNotice(null), 3000);
  };

  const handleManualSync = async () => {
    setSyncActionNotice('Synchronizing data with cloud devices...');
    await triggerManualSync();
    setSyncActionNotice('Synchronization complete!');
    setTimeout(() => setSyncActionNotice(null), 3000);
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
    setSyncActionNotice('Backup JSON exported successfully!');
    setTimeout(() => setSyncActionNotice(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="pb-4 border-b border-[#E4E4E1]">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
          Organization & System Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
          Configure top-level program preferences, multi-device cloud synchronization, and offline backup.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 bg-[#F0F9F3] border border-[#2F7D4F]/30 rounded-md text-xs font-semibold text-[#2F7D4F] flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Organization settings saved successfully!</span>
        </div>
      )}

      {/* Cross-Device Persistence & Cloud Sync Control Card */}
      <div className="bg-white p-6 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E1]">
          <div className="flex items-center space-x-2.5">
            <Radio className="h-5 w-5 text-[#14595A] animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1A]">Cross-Device Data Synchronization</h2>
              <p className="text-xs text-[#6B6B66]">Ensure real-time persistence across multiple laptops, tablets, and mobile devices</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            syncConfig.enabled && syncStatus === 'connected'
              ? 'bg-[#F0F9F3] text-[#2F7D4F] border border-[#2F7D4F]/30'
              : syncConfig.enabled
              ? 'bg-[#FEFCE8] text-[#A16207] border border-[#EAB308]/30'
              : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
          }`}>
            {syncConfig.enabled ? `Status: ${syncStatus}` : 'Local Only'}
          </span>
        </div>

        {syncActionNotice && (
          <div className="p-2.5 bg-[#F0F9F3] border border-[#2F7D4F]/30 rounded text-xs font-semibold text-[#2F7D4F] flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4" />
            <span>{syncActionNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Toggle & Room Key */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-[#FAFAF9] rounded-md border border-[#E4E4E1]">
              <div>
                <div className="text-xs font-bold text-[#1C1C1A]">Enable Cloud Realtime Sync</div>
                <div className="text-[11px] text-[#6B6B66]">Broadcasting edits & check-ins live</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncConfig.enabled}
                  onChange={e => updateSyncConfig({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E4E4E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E4E4E1] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14595A]"></div>
              </label>
            </div>

            <form onSubmit={handleSyncRoomSave} className="space-y-2">
              <label className="block text-xs font-semibold text-[#1C1C1A] flex items-center space-x-1.5">
                <Key className="h-3.5 w-3.5 text-[#14595A]" />
                <span>Pairing Sync Room Key</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={e => setRoomIdInput(e.target.value)}
                  placeholder="e.g. YIN-A8X-9201"
                  className="flex-1 h-9 px-3 text-xs font-mono font-bold tracking-wider uppercase rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                />
                <button
                  type="submit"
                  className="px-3 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] cursor-pointer"
                >
                  Save Key
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-2.5 h-9 border border-[#E4E4E1] bg-white rounded-md hover:bg-[#FAFAF9] cursor-pointer flex items-center justify-center"
                >
                  {copiedKey ? <Check className="h-4 w-4 text-[#2F7D4F]" /> : <Copy className="h-4 w-4 text-[#6B6B66]" />}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-3 p-3.5 bg-[#FAFAF9] rounded-md border border-[#E4E4E1] flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#1C1C1A] mb-1">Device Pair & Data Controls</div>
              <div className="text-[11px] text-[#6B6B66]">
                Configure pairing settings or open the interactive cloud pairing modal to scan & manage devices.
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] cursor-pointer shadow-2xs"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Open Device Sync Modal</span>
              </button>

              <button
                type="button"
                onClick={handleManualSync}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] cursor-pointer shadow-2xs"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#14595A]" />
                <span>Sync Now</span>
              </button>

              <button
                type="button"
                onClick={handleExportDownload}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] cursor-pointer shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-[#14595A]" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Organization / Program Name</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Organization Description</label>
          <textarea
            rows={3}
            value={orgDesc}
            onChange={e => setOrgDesc(e.target.value)}
            className="w-full p-2.5 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
          />
        </div>

        <div className="pt-4 border-t border-[#E4E4E1] space-y-3">
          <h3 className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">System Operational Rules</h3>

          <label className="flex items-center space-x-3 text-xs font-medium text-[#1C1C1A] cursor-pointer">
            <input
              type="checkbox"
              checked={allowWaitlist}
              onChange={e => setAllowWaitlist(e.target.checked)}
              className="rounded text-[#14595A] focus:ring-[#14595A]"
            />
            <div>
              <div className="font-bold">Enable Automatic Capacity Waitlists</div>
              <div className="text-[11px] text-[#6B6B66]">Automatically assign waitlist positions when event capacity limit is reached.</div>
            </div>
          </label>

          <label className="flex items-center space-x-3 text-xs font-medium text-[#1C1C1A] cursor-pointer">
            <input
              type="checkbox"
              checked={requirePhone}
              onChange={e => setRequirePhone(e.target.checked)}
              className="rounded text-[#14595A] focus:ring-[#14595A]"
            />
            <div>
              <div className="font-bold">Require Phone Number for Duplicate Validation</div>
              <div className="text-[11px] text-[#6B6B66]">Enforce phone validation during registration duplicate detection.</div>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-[#E4E4E1] flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-4 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] cursor-pointer shadow-2xs"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

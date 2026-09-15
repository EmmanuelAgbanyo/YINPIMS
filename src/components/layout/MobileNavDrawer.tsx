import React from 'react';
import { useApp } from '../../context/AppContext';
import type { NavTab } from './Sidebar';
import {
  X,
  LayoutDashboard,
  Calendar,
  FileEdit,
  Users,
  Bed,
  QrCode,
  Mail,
  BarChart3,
  ShieldCheck,
  Settings,
  Shield,
  RotateCcw,
} from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}) => {
  const { hasPermission, currentUser, activeRole, setCurrentUserRole, resetDatabase } = useApp();

  if (!isOpen) return null;

  const navItems: Array<{ id: NavTab; label: string; icon: any; adminOnly?: boolean; permissionKey?: any }> = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'checkin', label: 'Check-In Terminal', icon: QrCode },
    { id: 'events', label: 'Event Directory', icon: Calendar },
    { id: 'form-builder', label: 'Registration Form Builder', icon: FileEdit, permissionKey: 'manage_forms' },
    { id: 'accommodation', label: 'Accommodation & Rooms', icon: Bed, permissionKey: 'manage_accommodation' },
    { id: 'participants', label: 'Participant Directory', icon: Users },
    { id: 'communications', label: 'Communications & Logs', icon: Mail },
    { id: 'reports', label: 'Reports & CSV Export', icon: BarChart3 },
    { id: 'team', label: 'Team & Security Roles', icon: ShieldCheck, adminOnly: true },
    { id: 'settings', label: 'Organization Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-black/40 backdrop-blur-2xs flex">
      <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-4 border-r border-[#E4E4E1] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E1]">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-[#14595A] text-white flex items-center justify-center font-bold font-heading text-base">
              P
            </div>
            <div>
              <div className="font-bold text-sm text-[#1C1C1A]">PIMS Operations</div>
              <div className="text-[10px] text-[#6B6B66]">Mobile Navigation</div>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links */}
        <div className="overflow-y-auto space-y-1 flex-1 py-2">
          {navItems.map(item => {
            if (item.adminOnly && currentUser.role !== 'ADMIN') return null;
            if (item.permissionKey && !hasPermission(item.permissionKey)) return null;

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  isActive ? 'bg-[#14595A] text-white' : 'text-[#1C1C1A] hover:bg-[#FAFAF9]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#14595A]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Role Simulator */}
        <div className="pt-3 border-t border-[#E4E4E1] space-y-2">
          <div className="flex items-center justify-between text-xs p-2 bg-[#FAFAF9] rounded border border-[#E4E4E1]">
            <span className="font-bold text-[#6B6B66] flex items-center space-x-1">
              <Shield className="h-3.5 w-3.5 text-[#14595A]" />
              <span>Role:</span>
            </span>
            <select
              value={activeRole}
              onChange={e => setCurrentUserRole(e.target.value as any)}
              className="bg-transparent font-bold text-[#14595A] focus:outline-none cursor-pointer"
            >
              <option value="ADMIN">Administrator</option>
              <option value="EVENT_COORDINATOR">Coordinator</option>
              <option value="CHECKIN_STAFF">Check-In Staff</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (confirm('Reset demo data to initial seed dataset?')) {
                resetDatabase();
                onClose();
              }
            }}
            className="w-full flex items-center justify-center space-x-1.5 h-8 bg-white border border-[#E4E4E1] text-[#6B6B66] text-xs font-medium rounded hover:bg-[#FAFAF9] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

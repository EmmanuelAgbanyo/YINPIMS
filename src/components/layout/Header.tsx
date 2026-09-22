import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';
import {
  Shield,
  ChevronDown,
  RotateCcw,
  Calendar,
  UserCheck,
  Search,
  Menu,
  PanelLeftOpen,
  Wifi,
  WifiOff,
  Radio,
  LogIn,
  LogOut,
} from 'lucide-react';
import { auth, onAuthUserChange } from '../../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  onOpenCheckIn: () => void;
  onOpenCommandPalette: () => void;
  onToggleMobileDrawer: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCheckIn,
  onOpenCommandPalette,
  onToggleMobileDrawer,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenAuthModal,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthUserChange((u) => setFirebaseUser(u));
    return () => unsub();
  }, []);

  const {
    data,
    effectiveUser,
    impersonatedUser,
    stopImpersonation,
    activeRole,
    selectedEventId,
    setCurrentUserRole,
    setSelectedEventId,
    resetDatabase,
    syncStatus,
    syncConfig,
    setIsSyncModalOpen,
    logout,
  } = useApp();

  const authorizedEvents = data.events.filter(e => {
    if (!effectiveUser?.assignedEvents || effectiveUser.assignedEvents.includes('*')) return true;
    return effectiveUser.assignedEvents.includes(e.id);
  });

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentUserRole(e.target.value as UserRole);
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventId(e.target.value);
  };

  return (
    <div className="sticky top-0 z-30 flex flex-col w-full">
      {/* Superadmin Impersonation Support Mode Banner */}
      {impersonatedUser && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-2 flex items-center justify-between text-xs font-medium shadow-md">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-amber-200 animate-pulse" />
            <span>
              <strong>Superadmin Support Mode:</strong> Viewing portal as staff member{' '}
              <span className="underline font-bold">{impersonatedUser.name}</span> ({impersonatedUser.email}) — Scope: {impersonatedUser.role}
            </span>
          </div>
          <button
            onClick={stopImpersonation}
            className="px-3 py-1 bg-white text-amber-900 rounded-lg font-bold text-[11px] hover:bg-amber-100 transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
          >
            <span>Exit Support Mode</span>
          </button>
        </div>
      )}

      <header className="flex h-16 w-full items-center justify-between border-b border-[#E4E4E1] bg-white px-3 sm:px-6 shadow-2xs">
      {/* Left section: Mobile Drawer Toggle, App Brand & Scope Selector */}
      <div className="flex items-center space-x-3">
        {/* Mobile Menu Hamburger */}
        <button
          onClick={onToggleMobileDrawer}
          className="h-9 w-9 rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] flex items-center justify-center md:hidden cursor-pointer"
          title="Open Menu Drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Expand Button (when collapsed) */}
        {isSidebarCollapsed && (
          <button
            onClick={onToggleSidebarCollapse}
            className="hidden md:flex h-9 w-9 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white text-[#14595A] items-center justify-center cursor-pointer transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#14595A] text-white shadow-2xs font-heading font-bold text-lg tracking-wider shrink-0">
            P
          </div>
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-base tracking-tight text-[#1C1C1A] block leading-tight">
              PIMS
            </span>
            <span className="text-[10px] font-semibold text-[#6B6B66] block leading-none uppercase tracking-wider">
              Participant Operations
            </span>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-[#E4E4E1] lg:block" />

        {/* Global Event Scope Selector */}
        <div className="relative flex items-center">
          <Calendar className="absolute left-2.5 h-4 w-4 text-[#6B6B66] pointer-events-none" />
          <select
            value={selectedEventId}
            onChange={handleEventChange}
            className="h-9 w-36 sm:w-56 md:w-64 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] pl-8 pr-7 text-xs font-semibold text-[#1C1C1A] transition-colors focus:border-[#14595A] focus:bg-white focus:outline-none cursor-pointer truncate"
          >
            <option value="all">All Events ({authorizedEvents.length})</option>
            {authorizedEvents.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.status})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-[#6B6B66] pointer-events-none" />
        </div>
      </div>

      {/* Right section: Quick Search Palette, Role Switcher & Check-In Launcher */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Command Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-1.5 h-9 px-2.5 sm:px-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white text-xs text-[#6B6B66] hover:text-[#1C1C1A] transition-colors cursor-pointer"
          title="Quick Search & Command Palette (Cmd+K)"
        >
          <Search className="h-4 w-4 text-[#14595A]" />
          <span className="hidden md:inline font-medium">Quick Search...</span>
          <kbd className="hidden lg:inline-block px-1 py-0.5 text-[9px] font-mono bg-white border border-[#E4E4E1] rounded text-[#6B6B66]">
            ⌘K
          </kbd>
        </button>

        {/* Quick Check-In CTA Button */}
        <button
          onClick={onOpenCheckIn}
          className="flex h-9 items-center space-x-1.5 rounded-md bg-[#14595A] px-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
        >
          <UserCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Check-In</span>
        </button>

        {/* Cloud Multi-Device Sync Badge */}
        <button
          onClick={() => setIsSyncModalOpen(true)}
          className={`flex h-9 items-center space-x-1.5 px-2.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
            syncConfig.enabled && syncStatus === 'connected'
              ? 'bg-[#F0F9F3] border-[#2F7D4F]/40 text-[#2F7D4F] hover:bg-[#E2F4E7]'
              : syncConfig.enabled && syncStatus === 'syncing'
              ? 'bg-[#FEFCE8] border-[#EAB308]/40 text-[#A16207] hover:bg-[#FEF9C3]'
              : 'bg-[#FAFAF9] border-[#E4E4E1] text-[#6B6B66] hover:bg-white'
          }`}
          title="Multi-Device & Cloud Sync Status"
        >
          {syncConfig.enabled && syncStatus === 'connected' ? (
            <Wifi className="h-3.5 w-3.5 text-[#2F7D4F]" />
          ) : syncConfig.enabled ? (
            <Radio className="h-3.5 w-3.5 text-[#A16207] animate-pulse" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-[#6B6B66]" />
          )}
          <span className="hidden md:inline font-mono text-[11px]">
            {syncConfig.enabled ? syncConfig.roomId : 'Local Only'}
          </span>
        </button>

        {/* Firebase Authentication Button */}
        <button
          onClick={onOpenAuthModal}
          className="flex h-9 items-center space-x-1.5 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white px-2.5 text-xs font-semibold text-[#14595A] transition-colors cursor-pointer"
          title="Firebase Authentication (Email, Google, Phone)"
        >
          {firebaseUser ? (
            <div className="flex items-center space-x-1.5">
              {firebaseUser.photoURL ? (
                <img src={firebaseUser.photoURL} alt="Avatar" className="h-4 w-4 rounded-full" />
              ) : (
                <UserCheck className="h-4 w-4 text-emerald-600" />
              )}
              <span className="hidden xl:inline max-w-[100px] truncate text-[11px] font-bold text-emerald-700">
                {firebaseUser.displayName || firebaseUser.email || firebaseUser.phoneNumber}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <LogIn className="h-4 w-4 text-[#14595A]" />
              <span className="hidden sm:inline font-semibold">Firebase Auth</span>
            </div>
          )}
        </button>

        {/* Role Simulator Dropdown */}
        <div className="flex items-center space-x-1 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] p-1">
          <Shield className="h-3.5 w-3.5 text-[#14595A] ml-1 shrink-0" />
          <select
            value={activeRole}
            onChange={handleRoleChange}
            className="h-7 rounded border-0 bg-transparent px-1 text-xs font-bold text-[#14595A] focus:outline-none cursor-pointer"
            title="Switch User Role to test permissions"
          >
            <option value="ADMIN">Admin</option>
            <option value="EVENT_COORDINATOR">Coordinator</option>
            <option value="CHECKIN_STAFF">Staff</option>
          </select>
        </div>

        {/* Reset Demo Data Button */}
        <button
          onClick={() => {
            if (confirm('Reset system data back to initial seed dataset?')) {
              resetDatabase();
            }
          }}
          title="Reset to fresh seed demo data"
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md border border-[#E4E4E1] bg-white text-[#6B6B66] hover:bg-[#FAFAF9] hover:text-[#1C1C1A] transition-colors cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign Out of Portal"
          className="flex h-9 items-center space-x-1.5 rounded-md border border-[#E4E4E1] bg-white text-[#6B6B66] hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-2.5 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </header>
  </div>
  );
};

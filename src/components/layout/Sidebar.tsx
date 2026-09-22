import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Bed,
  QrCode,
  BarChart3,
  ShieldCheck,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'events'
  | 'form-builder'
  | 'participants'
  | 'accommodation'
  | 'checkin'
  | 'communications'
  | 'reports'
  | 'team'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { hasPermission, currentUser, selectedEvent } = useApp();

  interface NavItem {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    permissionKey?: 'manage_forms' | 'manage_accommodation' | 'manage_staff';
    adminOnly?: boolean;
  }

  // Refined Categorized Navigation Groups
  const navGroups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Operations',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'checkin', label: 'Live Check-In Scanner', icon: QrCode, badge: 'Live' },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'accommodation', label: 'Accommodation', icon: Bed, permissionKey: 'manage_accommodation' },
        { id: 'reports', label: 'Reports & Export', icon: BarChart3 },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'team', label: 'Team & Access', icon: ShieldCheck, adminOnly: true },
        { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
      ],
    },
  ];

  return (
    <aside
      className={`shrink-0 border-r border-[#E4E4E1] bg-white flex flex-col justify-between hidden md:flex transition-all duration-300 ease-in-out min-h-[calc(100vh-4rem)] ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="py-3 px-2 space-y-4">
        {/* Collapse / Expand Toggle Control Header */}
        <div className={`flex items-center px-2 pb-2 border-b border-[#E4E4E1]/60 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <span className="text-[10px] font-bold tracking-wider text-[#6B6B66] uppercase font-heading">
              Main Menu
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="h-7 w-7 rounded border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white text-[#6B6B66] hover:text-[#14595A] flex items-center justify-center transition-colors cursor-pointer"
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Categorized Link Groups */}
        {navGroups.map((group, groupIdx) => {
          // Filter items by permission
          const visibleItems = group.items.filter(item => {
            const isSuperAdmin = currentUser.email?.toLowerCase().trim() === 'policyp28@gmail.com';
            if (isSuperAdmin) return true;
            if (item.adminOnly && currentUser.role !== 'ADMIN') return false;
            if (item.permissionKey && !hasPermission(item.permissionKey)) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 text-[10px] font-bold tracking-wider text-[#6B6B66] uppercase font-heading">
                  {group.title}
                </div>
              )}

              {visibleItems.map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-md text-xs font-semibold transition-all cursor-pointer relative ${
                      isCollapsed ? 'justify-center h-10 px-0' : 'justify-between px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-[#14595A] text-white shadow-2xs'
                        : 'text-[#1C1C1A] hover:bg-[#FAFAF9] hover:text-[#14595A]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#14595A]'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#14595A]/10 text-[#14595A]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Compact Mode Active Indicator Bar */}
                    {isCollapsed && isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#14595A] rounded-r" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer Scope Context */}
      <div className="p-2.5 border-t border-[#E4E4E1] bg-[#FAFAF9]">
        {!isCollapsed ? (
          <div className="p-2 rounded border border-[#E4E4E1] bg-white text-xs">
            <div className="text-[9px] font-bold text-[#6B6B66] uppercase tracking-wider">Active Scope</div>
            <div className="font-semibold text-[#1C1C1A] truncate mt-0.5" title={selectedEvent ? selectedEvent.name : 'All Events'}>
              {selectedEvent ? selectedEvent.name : 'All Organization Events'}
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={selectedEvent ? `Scope: ${selectedEvent.name}` : 'Scope: All Events'}>
            <span className="h-2 w-2 rounded-full bg-[#14595A]" />
          </div>
        )}
      </div>
    </aside>
  );
};

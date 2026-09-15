import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { NavTab } from '../layout/Sidebar';
import {
  Search,
  X,
  Calendar,
  Users,
  QrCode,
  FileEdit,
  Bed,
  Mail,
  BarChart3,
  ShieldCheck,
  Settings,
  ArrowRight,
  User,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { data, setSelectedEventId } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  // Filter events & participants
  const matchingEvents = data.events.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) || e.location.toLowerCase().includes(query.toLowerCase())
  );

  const matchingParticipants = data.participants.filter(p =>
    p.fullName.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase())
  );

  const quickNavs: Array<{ id: NavTab; label: string; icon: any; category: string }> = [
    { id: 'checkin', label: 'Check-In QR Terminal', icon: QrCode, category: 'Core Operations' },
    { id: 'events', label: 'Event Directory & Creation', icon: Calendar, category: 'Events' },
    { id: 'form-builder', label: 'Registration Form Builder', icon: FileEdit, category: 'Events' },
    { id: 'accommodation', label: 'Accommodation & Smart Rooms', icon: Bed, category: 'Events' },
    { id: 'participants', label: 'Participant Directory', icon: Users, category: 'Delegates' },
    { id: 'communications', label: 'Communications & Logs', icon: Mail, category: 'Delegates' },
    { id: 'reports', label: 'Reports & CSV Export', icon: BarChart3, category: 'Analytics' },
    { id: 'team', label: 'Team & Security Roles', icon: ShieldCheck, category: 'System' },
    { id: 'settings', label: 'Organization Settings', icon: Settings, category: 'System' },
  ];

  const matchingNavs = quickNavs.filter(n => n.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-2xs p-4 pt-16 sm:pt-24">
      <div className="bg-white border border-[#E4E4E1] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-3 border-b border-[#E4E4E1] flex items-center space-x-3 bg-white">
          <Search className="h-5 w-5 text-[#14595A] shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type to search events, delegates, check-in, or jump to page..."
            className="w-full text-sm bg-transparent focus:outline-none text-[#1C1C1A] placeholder-[#6B6B66]"
          />
          <button onClick={onClose} className="h-7 w-7 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 flex-1 divide-y divide-[#E4E4E1]">
          {/* Quick Navigation Sections */}
          {matchingNavs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B66] px-2 block">
                Quick Navigation
              </span>
              {matchingNavs.map(nav => {
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.id}
                    onClick={() => {
                      onNavigateTab(nav.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-[#EBF4F4] hover:text-[#14595A] text-xs font-semibold text-[#1C1C1A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="h-4 w-4 text-[#14595A]" />
                      <span>{nav.label}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#6B6B66]" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Events Match */}
          {matchingEvents.length > 0 && (
            <div className="pt-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B66] px-2 block">
                Matching Events ({matchingEvents.length})
              </span>
              {matchingEvents.slice(0, 3).map(evt => (
                <button
                  key={evt.id}
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    onNavigateTab('events');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-[#FAFAF9] text-xs text-[#1C1C1A] transition-colors cursor-pointer text-left"
                >
                  <div>
                    <div className="font-bold">{evt.name}</div>
                    <div className="text-[10px] text-[#6B6B66]">{evt.location}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#14595A]/10 text-[#14595A]">
                    Set Scope
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Participants Match */}
          {matchingParticipants.length > 0 && (
            <div className="pt-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B66] px-2 block">
                Matching Delegates ({matchingParticipants.length})
              </span>
              {matchingParticipants.slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onNavigateTab('participants');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-[#FAFAF9] text-xs text-[#1C1C1A] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-[#14595A]" />
                    <div>
                      <div className="font-bold">{p.fullName}</div>
                      <div className="text-[10px] text-[#6B6B66]">{p.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6B6B66] font-mono">{p.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-[#FAFAF9] border-t border-[#E4E4E1] text-[11px] text-[#6B6B66] flex items-center justify-between px-4">
          <span>Tip: Press <kbd className="px-1 py-0.5 bg-white border rounded font-mono text-[10px]">ESC</kbd> to close</span>
          <span className="font-semibold text-[#14595A]">PIMS Command Palette</span>
        </div>
      </div>
    </div>
  );
};

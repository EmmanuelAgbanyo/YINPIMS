import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Participant } from '../../types';
import { Search, UserPlus, ChevronRight, Printer } from 'lucide-react';
import { ParticipantDetailDrawer } from './ParticipantDetailDrawer';
import { BatchBadgePrintModal } from '../badge/BatchBadgePrintModal';

interface ParticipantListProps {
  onRegisterNew: () => void;
  filterEventId?: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ onRegisterNew, filterEventId }) => {
  const { data, selectedEventId } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  const effectiveEventId = filterEventId || selectedEventId;

  // Filter participants
  const filteredParticipants = data.participants.filter(p => {
    const pRegs = data.registrations.filter(r => r.participantId === p.id);

    // Event filter check
    if (effectiveEventId !== 'all' && !pRegs.some(r => r.eventId === effectiveEventId)) {
      return false;
    }

    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.organization && p.organization.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'Checked In' && pRegs.some(r => r.checkInStatus === 'Checked In')) ||
      (statusFilter === 'Waitlisted' && pRegs.some(r => r.status === 'Waitlisted'));

    return matchesSearch && matchesGender && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Participant Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Centralized delegate profiles, event registrations, attendance records, and badges.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsBatchPrintOpen(true)}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white border border-[#E4E4E1] text-[#1C1C1A] hover:bg-[#FAFAF9] text-xs font-semibold rounded-md transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4 text-[#14595A]" />
            <span>Print All Badges (A4 Sheet)</span>
          </button>

          <button
            onClick={onRegisterNew}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register Participant</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E4E4E1] shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B6B66]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by participant name, email, phone, or organization..."
            className="w-full h-9 pl-8 pr-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:outline-none cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:outline-none cursor-pointer"
          >
            <option value="all">All Attendance</option>
            <option value="Checked In">Checked In</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {filteredParticipants.length > 0 ? (
        <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF9] border-b border-[#E4E4E1] text-[#6B6B66] uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Delegate Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Event Pass Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E1]">
                {filteredParticipants.map(p => {
                  const regs = data.registrations.filter(r => r.participantId === p.id);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedParticipant(p)}
                      className="hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1C1C1A]">{p.fullName}</div>
                        <div className="text-[10px] text-[#6B6B66]">ID: <code className="tabular-nums font-mono">{p.id}</code></div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[#1C1C1A] font-medium">{p.email}</div>
                        <div className="text-[11px] text-[#6B6B66]">{p.phone}</div>
                      </td>

                      <td className="py-3 px-4 text-[#1C1C1A]">
                        {p.organization || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {regs.map(r => {
                            const evt = data.events.find(e => e.id === r.eventId);
                            return (
                              <span
                                key={r.id}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  r.checkInStatus === 'Checked In'
                                    ? 'bg-[#F0F9F3] text-[#2F7D4F]'
                                    : r.status === 'Waitlisted'
                                    ? 'bg-[#FDF9F0] text-[#C17F16]'
                                    : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                                }`}
                              >
                                {evt?.name.slice(0, 15)}... ({r.checkInStatus === 'Checked In' ? 'Checked In' : r.status})
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedParticipant(p);
                          }}
                          className="text-[#14595A] font-bold hover:underline inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Profile</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg border border-[#E4E4E1] text-center text-xs text-[#6B6B66]">
          No participants match your criteria.
        </div>
      )}

      {/* Participant Profile Slide-Over Drawer */}
      <ParticipantDetailDrawer
        participant={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
      />

      {/* Batch Badge Printing Modal */}
      <BatchBadgePrintModal
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
        initialEventId={effectiveEventId}
      />
    </div>
  );
};

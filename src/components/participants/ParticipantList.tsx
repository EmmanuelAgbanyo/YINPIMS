import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Participant } from '../../types';
import { Search, UserPlus, ChevronRight, Printer, Download, FileSpreadsheet, FileJson, Calendar, Pencil } from 'lucide-react';
import { ParticipantDetailDrawer } from './ParticipantDetailDrawer';
import { EditParticipantModal } from './EditParticipantModal';
import { BatchBadgePrintModal } from '../badge/BatchBadgePrintModal';
import { exportParticipantsCSV, exportParticipantsJSON } from '../../utils/exportUtils';

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
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const effectiveEventId = filterEventId || selectedEventId;
  const currentEvent = effectiveEventId !== 'all' ? data.events.find(e => e.id === effectiveEventId) : null;

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

  const handleExportCSV = () => {
    exportParticipantsCSV(data, effectiveEventId, filteredParticipants);
    setIsExportMenuOpen(false);
  };

  const handleExportJSON = () => {
    exportParticipantsJSON(data, effectiveEventId, filteredParticipants);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-body">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight font-heading">
            Participant Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Centralized delegate profiles, event registrations, attendance records, badges, and export tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center space-x-1.5 h-9 px-3.5 bg-white border border-[#E4E4E1] text-[#14595A] hover:bg-[#FAFAF9] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="h-4 w-4 text-[#14595A]" />
              <span>Export Participants</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#E4E4E1] shadow-xl z-20 p-1.5 space-y-1">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-[#1C1C1A] hover:bg-[#FAFAF9] rounded-lg transition-colors cursor-pointer text-left"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export to CSV Excel</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-[#1C1C1A] hover:bg-[#FAFAF9] rounded-lg transition-colors cursor-pointer text-left"
                >
                  <FileJson className="h-4 w-4 text-amber-600" />
                  <span>Export to JSON Data</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsBatchPrintOpen(true)}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white border border-[#E4E4E1] text-[#1C1C1A] hover:bg-[#FAFAF9] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="h-4 w-4 text-[#14595A]" />
            <span className="hidden sm:inline">Print Badges</span>
          </button>

          <button
            onClick={onRegisterNew}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-xl hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register Participant</span>
          </button>
        </div>
      </div>

      {/* Active Event Scope Filter Banner (If filtered by specific event) */}
      {currentEvent && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F0F9F3] border border-[#2F7D4F]/30 text-xs text-[#1C1C1A]">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-[#2F7D4F]" />
            <span className="font-bold">Event Filter Active: {currentEvent.name}</span>
            <span className="text-[11px] text-[#6B6B66]">({filteredParticipants.length} registered delegates)</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#2F7D4F] text-white text-[11px] font-semibold rounded-lg hover:bg-[#25633E] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Event CSV</span>
          </button>
        </div>
      )}

      {/* Export Options by Event Selector */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4E4E1] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-4 w-4 text-[#14595A]" />
            <span className="text-xs font-bold text-[#1C1C1A]">Event-Specific Quick Export</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={effectiveEventId}
              onChange={(e) => {
                if (e.target.value !== 'all') {
                  exportParticipantsCSV(data, e.target.value);
                }
              }}
              className="h-9 px-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:outline-none cursor-pointer w-full sm:w-64"
            >
              <option value="all">Select Event to Instant Download CSV...</option>
              {data.events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E4E4E1] shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by participant name, email, phone, or organization..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:outline-none cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:outline-none cursor-pointer"
          >
            <option value="all">All Attendance</option>
            <option value="Checked In">Checked In</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {filteredParticipants.length > 0 ? (
        <div className="bg-white border border-[#E4E4E1] rounded-2xl shadow-2xs overflow-hidden">
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
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1C1C1A] text-sm">{p.fullName}</div>
                        <div className="text-[10px] text-[#6B6B66]">ID: <code className="tabular-nums font-mono">{p.id}</code></div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#1C1C1A] font-medium">{p.email}</div>
                        <div className="text-[11px] text-[#6B6B66]">{p.phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-[#1C1C1A]">
                        {p.organization || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {regs.length === 0 ? (
                            <span className="text-[10px] font-medium text-[#6B6B66]">No Registrations</span>
                          ) : (
                            regs.map(r => {
                              const evt = data.events.find(e => e.id === r.eventId);
                              return (
                                <span
                                  key={r.id}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    r.checkInStatus === 'Checked In'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : r.status === 'Waitlisted'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                                  }`}
                                >
                                  {evt?.name.slice(0, 15)}... ({r.checkInStatus === 'Checked In' ? 'Checked In' : r.status})
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingParticipant(p);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#14595A] hover:bg-[#14595A]/10 rounded-lg inline-flex items-center space-x-1 cursor-pointer transition-colors border border-transparent hover:border-[#14595A]/20"
                            title="Edit participant profile"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedParticipant(p);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#6B6B66] hover:text-[#1C1C1A] hover:bg-[#FAFAF9] rounded-lg inline-flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <span>Profile</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-[#E4E4E1] text-center text-xs text-[#6B6B66] space-y-2">
          <p className="font-semibold text-sm text-[#1C1C1A]">No participants found</p>
          <p>Register participants or adjust filters to view delegate records.</p>
        </div>
      )}

      {/* Participant Profile Slide-Over Drawer */}
      <ParticipantDetailDrawer
        participant={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        onEditParticipant={p => setEditingParticipant(p)}
      />

      {/* Edit Participant Information Modal */}
      <EditParticipantModal
        isOpen={!!editingParticipant}
        participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
        onUpdated={updated => {
          if (selectedParticipant?.id === updated.id) {
            setSelectedParticipant(updated);
          }
        }}
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

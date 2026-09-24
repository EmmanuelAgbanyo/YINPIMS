import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  exportParticipantsCSV,
  exportParticipantsJSON,
  generateParticipantExportData,
  resolveParticipantTitle,
} from '../../utils/exportUtils';
import type { ParticipantBadgeType } from '../../types';
import {
  X,
  Download,
  FileSpreadsheet,
  FileJson,
  Users,
  CheckCircle2,
  Calendar,
  Tag,
} from 'lucide-react';

interface ParticipantExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEventId?: string;
  initialTitleFilter?: string;
}

const TITLE_OPTIONS: { id: string; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'all', label: 'All Titles', icon: '🌟', color: 'text-[#1C1C1A]', bg: 'bg-[#FAFAF9]' },
  { id: 'Contestant', label: 'Contestants', icon: '🏆', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { id: 'Staff', label: 'Staff', icon: '🛡️', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  { id: 'Volunteer', label: 'Volunteers', icon: '🤝', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'Coordinator', label: 'Coordinators', icon: '🎯', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { id: 'Speaker', label: 'Speakers', icon: '🎤', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { id: 'Delegate', label: 'Delegates', icon: '👥', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
];

export const ParticipantExportModal: React.FC<ParticipantExportModalProps> = ({
  isOpen,
  onClose,
  initialEventId = 'all',
  initialTitleFilter = 'all',
}) => {
  const { data } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [selectedTitle, setSelectedTitle] = useState<string>(initialTitleFilter);
  const [selectedAttendance, setSelectedAttendance] = useState<string>('all');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  // Calculate live matching rows
  const matchingRows = useMemo(() => {
    return generateParticipantExportData(
      data,
      selectedEventId,
      undefined,
      selectedTitle,
      selectedAttendance
    );
  }, [data, selectedEventId, selectedTitle, selectedAttendance]);

  // Count by title for badges in quick presets
  const titleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      Contestant: 0,
      Staff: 0,
      Volunteer: 0,
      Coordinator: 0,
      Speaker: 0,
      Delegate: 0,
    };

    data.participants.forEach(p => {
      const pRegs = selectedEventId === 'all'
        ? data.registrations.filter(r => r.participantId === p.id)
        : data.registrations.filter(r => r.participantId === p.id && r.eventId === selectedEventId);

      if (selectedEventId !== 'all' && pRegs.length === 0) return;

      const title = resolveParticipantTitle(p, pRegs[0], data.users);
      counts.all = (counts.all || 0) + 1;
      counts[title] = (counts[title] || 0) + 1;
    });

    return counts;
  }, [data, selectedEventId]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (matchingRows.length === 0) {
      alert('No participants found matching the selected export filters.');
      return;
    }

    if (format === 'csv') {
      exportParticipantsCSV(
        data,
        selectedEventId,
        undefined,
        undefined,
        selectedTitle,
        selectedAttendance
      );
    } else {
      exportParticipantsJSON(
        data,
        selectedEventId,
        undefined,
        undefined,
        selectedTitle,
        selectedAttendance
      );
    }

    onClose();
  };

  const handleQuickExport = (title: string, fileFormat: 'csv' | 'json' = 'csv') => {
    if (fileFormat === 'csv') {
      exportParticipantsCSV(
        data,
        selectedEventId,
        undefined,
        undefined,
        title,
        selectedAttendance
      );
    } else {
      exportParticipantsJSON(
        data,
        selectedEventId,
        undefined,
        undefined,
        title,
        selectedAttendance
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-[#E4E4E1] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] font-body animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#14595A] to-[#0E4243] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading text-white">
                Filtered Export & Report Generator
              </h2>
              <p className="text-xs text-white/80">
                Filter and export delegates by designated title, event scope, or attendance status.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Designated Title Filter Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1C1C1A] flex items-center space-x-1.5 uppercase tracking-wider">
              <Tag className="h-3.5 w-3.5 text-[#14595A]" />
              <span>1. Filter by Designated Title / Role:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TITLE_OPTIONS.map(opt => {
                const count = titleCounts[opt.id] ?? 0;
                const isSelected = selectedTitle.toLowerCase() === opt.id.toLowerCase();
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedTitle(opt.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#14595A] bg-[#EBF4F4] text-[#14595A] ring-2 ring-[#14595A]/20 shadow-xs'
                        : 'border-[#E4E4E1] bg-white text-[#1C1C1A] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5 truncate">
                      <span className="text-sm shrink-0">{opt.icon}</span>
                      <span className="truncate">{opt.label}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isSelected
                          ? 'bg-[#14595A] text-white'
                          : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope Filters: Event and Attendance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Event Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C1C1A] flex items-center space-x-1.5 uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-[#14595A]" />
                <span>2. Event Scope:</span>
              </label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:bg-white focus:outline-none focus:border-[#14595A] cursor-pointer"
              >
                <option value="all">🌟 All Events ({data.events.length} events)</option>
                {data.events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Attendance Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C1C1A] flex items-center space-x-1.5 uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#14595A]" />
                <span>3. Attendance Status:</span>
              </label>
              <select
                value={selectedAttendance}
                onChange={e => setSelectedAttendance(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:bg-white focus:outline-none focus:border-[#14595A] cursor-pointer"
              >
                <option value="all">All Attendance Records</option>
                <option value="Checked In">Checked In Only</option>
                <option value="Not Checked In">Not Checked In</option>
              </select>
            </div>
          </div>

          {/* Export File Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">
              4. Export File Format:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-[#E4E4E1] bg-white hover:bg-[#FAFAF9]'
                }`}
              >
                <FileSpreadsheet className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#1C1C1A]">CSV Spreadsheets</div>
                  <div className="text-[10px] text-[#6B6B66]">Microsoft Excel, Google Sheets, Numbers</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'json'
                    ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                    : 'border-[#E4E4E1] bg-white hover:bg-[#FAFAF9]'
                }`}
              >
                <FileJson className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#1C1C1A]">JSON Data File</div>
                  <div className="text-[10px] text-[#6B6B66]">Structured database format, API integrations</div>
                </div>
              </button>
            </div>
          </div>

          {/* Live Matching Records Preview Card */}
          <div className="p-4 rounded-xl bg-[#FAFAF9] border border-[#E4E4E1] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-[#14595A]" />
                <span className="text-xs font-bold text-[#1C1C1A]">Ready to Export:</span>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#14595A] text-white">
                {matchingRows.length} {matchingRows.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            <p className="text-[11px] text-[#6B6B66]">
              Filters active:{' '}
              <strong className="text-[#1C1C1A]">
                Title: {selectedTitle === 'all' ? 'All Titles' : selectedTitle}
              </strong>
              {' • '}
              <strong className="text-[#1C1C1A]">
                Event: {selectedEventId === 'all' ? 'All Events' : data.events.find(e => e.id === selectedEventId)?.name || selectedEventId}
              </strong>
              {' • '}
              <strong className="text-[#1C1C1A]">
                Attendance: {selectedAttendance === 'all' ? 'All' : selectedAttendance}
              </strong>
            </p>

            {/* Quick Preview of matching attendees */}
            {matchingRows.length > 0 && (
              <div className="max-h-28 overflow-y-auto divide-y divide-[#E4E4E1] border border-[#E4E4E1] rounded-lg bg-white">
                {matchingRows.slice(0, 5).map((row, idx) => (
                  <div key={idx} className="p-2 text-[11px] flex items-center justify-between">
                    <div className="truncate font-medium text-[#1C1C1A]">
                      {row.fullName}
                      {row.organization && (
                        <span className="text-[#6B6B66] text-[10px] ml-1.5">({row.organization})</span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF4F4] text-[#14595A] shrink-0">
                      {row.designatedTitle}
                    </span>
                  </div>
                ))}
                {matchingRows.length > 5 && (
                  <div className="p-1.5 text-center text-[10px] text-[#6B6B66] italic bg-[#FAFAF9]">
                    + {matchingRows.length - 5} more records included in download
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick One-Click Export Shortcuts */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">
              Quick 1-Click Exports (Current Event Scope):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['Contestant', 'Staff', 'Volunteer', 'Coordinator', 'Speaker', 'Delegate'] as ParticipantBadgeType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleQuickExport(t, format)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-[#E4E4E1] text-[#1C1C1A] hover:bg-[#FAFAF9] hover:border-[#14595A] transition-colors cursor-pointer"
                >
                  Export {t}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAFAF9] px-6 py-3.5 border-t border-[#E4E4E1] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6B6B66] hover:text-[#1C1C1A] hover:bg-white border border-transparent hover:border-[#E4E4E1] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={matchingRows.length === 0}
            className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
              matchingRows.length > 0
                ? 'bg-[#14595A] hover:bg-[#0E4243] text-white shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>
              Download {selectedTitle === 'all' ? '' : `${selectedTitle} `}
              {format === 'csv' ? 'CSV (Excel)' : 'JSON'} ({matchingRows.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

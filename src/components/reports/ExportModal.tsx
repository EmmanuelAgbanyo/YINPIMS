import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { data, selectedEventId } = useApp();

  const [exportType, setExportType] = useState<'participants' | 'registrations' | 'attendance' | 'accommodation'>('participants');
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: Array<Record<string, any>> = [];
    let filename = `PIMS_Export_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;

    const filteredRegs = selectedEventId === 'all'
      ? data.registrations
      : data.registrations.filter(r => r.eventId === selectedEventId);

    if (exportType === 'participants') {
      headers = ['ID', 'Full Name', 'Email', 'Phone', 'Gender', 'Organization', 'Job Title', 'Created At'];
      rows = data.participants.map(p => ({
        'ID': p.id,
        'Full Name': p.fullName,
        'Email': p.email,
        'Phone': p.phone,
        'Gender': p.gender,
        'Organization': p.organization || '',
        'Job Title': p.jobTitle || '',
        'Created At': p.createdAt,
      }));
    } else if (exportType === 'registrations') {
      headers = ['Registration ID', 'Event Name', 'Participant Name', 'Email', 'Status', 'Check-In Status', 'Waitlist Position', 'Registration Date'];
      rows = filteredRegs.map(r => {
        const p = data.participants.find(part => part.id === r.participantId);
        const e = data.events.find(evt => evt.id === r.eventId);
        return {
          'Registration ID': r.id,
          'Event Name': e?.name || '',
          'Participant Name': p?.fullName || '',
          'Email': p?.email || '',
          'Status': r.status,
          'Check-In Status': r.checkInStatus,
          'Waitlist Position': r.waitlistPosition || '',
          'Registration Date': r.registrationDate,
        };
      });
    } else if (exportType === 'attendance') {
      headers = ['Registration ID', 'Event Name', 'Participant Name', 'Email', 'Check-In Status', 'Check-In Timestamp'];
      rows = filteredRegs.map(r => {
        const p = data.participants.find(part => part.id === r.participantId);
        const e = data.events.find(evt => evt.id === r.eventId);
        return {
          'Registration ID': r.id,
          'Event Name': e?.name || '',
          'Participant Name': p?.fullName || '',
          'Email': p?.email || '',
          'Check-In Status': r.checkInStatus,
          'Check-In Timestamp': r.checkInTimestamp || 'Not Checked In',
        };
      });
    } else if (exportType === 'accommodation') {
      headers = ['Room ID', 'Event Name', 'Room Number', 'Capacity', 'Gender Group', 'Assigned Participants'];
      const rooms = selectedEventId === 'all'
        ? data.rooms
        : data.rooms.filter(rm => rm.eventId === selectedEventId);

      rows = rooms.map(rm => {
        const e = data.events.find(evt => evt.id === rm.eventId);
        const assignedNames = rm.assignedParticipantIds
          .map(id => data.participants.find(p => p.id === id)?.fullName)
          .filter(Boolean)
          .join('; ');

        return {
          'Room ID': rm.id,
          'Event Name': e?.name || '',
          'Room Number': rm.roomNumber,
          'Capacity': rm.capacity,
          'Gender Group': rm.genderGroup,
          'Assigned Participants': assignedNames,
        };
      });
    }

    // Build CSV string
    const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => headers.map(h => escapeCsv(row[h])).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E4E1] pb-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-[#14595A]" />
            <h3 className="text-base font-bold text-[#1C1C1A] font-heading">
              Export Application Data (CSV)
            </h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {downloaded && (
          <div className="p-3 bg-[#F0F9F3] border border-[#2F7D4F]/30 rounded-md text-xs font-semibold text-[#2F7D4F] flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>CSV File generated and downloaded successfully!</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <label className="block font-semibold text-[#1C1C1A]">Select Dataset to Export</label>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white cursor-pointer">
              <div>
                <div className="font-bold text-[#1C1C1A]">Participant Directory</div>
                <div className="text-[11px] text-[#6B6B66]">Full list of profiles, emails, phones, and metadata ({data.participants.length} records).</div>
              </div>
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'participants'}
                onChange={() => setExportType('participants')}
                className="text-[#14595A] focus:ring-[#14595A]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white cursor-pointer">
              <div>
                <div className="font-bold text-[#1C1C1A]">Event Registrations</div>
                <div className="text-[11px] text-[#6B6B66]">All confirmed & waitlisted registrations with position data.</div>
              </div>
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'registrations'}
                onChange={() => setExportType('registrations')}
                className="text-[#14595A] focus:ring-[#14595A]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white cursor-pointer">
              <div>
                <div className="font-bold text-[#1C1C1A]">Attendance Records</div>
                <div className="text-[11px] text-[#6B6B66]">Verified check-in statuses and timestamp logs.</div>
              </div>
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'attendance'}
                onChange={() => setExportType('attendance')}
                className="text-[#14595A] focus:ring-[#14595A]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white cursor-pointer">
              <div>
                <div className="font-bold text-[#1C1C1A]">Accommodation Room Assignments</div>
                <div className="text-[11px] text-[#6B6B66]">Rooms, bed capacity, and assigned delegate occupants.</div>
              </div>
              <input
                type="radio"
                name="exportType"
                checked={exportType === 'accommodation'}
                onChange={() => setExportType('accommodation')}
                className="text-[#14595A] focus:ring-[#14595A]"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E4E1]">
          <button
            onClick={onClose}
            className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] cursor-pointer shadow-2xs"
          >
            <Download className="h-4 w-4" />
            <span>Generate & Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

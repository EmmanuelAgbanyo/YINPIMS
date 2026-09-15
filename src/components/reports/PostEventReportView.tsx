import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Download, BedDouble } from 'lucide-react';
import { ExportModal } from './ExportModal';

export const PostEventReportView: React.FC = () => {
  const { data, selectedEventId, setSelectedEventId } = useApp();

  const [activeEventId, setActiveEventId] = useState<string>(
    selectedEventId !== 'all' ? selectedEventId : data.events[0]?.id || ''
  );
  const [isExportOpen, setIsExportOpen] = useState(false);

  const event = data.events.find(e => e.id === activeEventId) || data.events[0];
  if (!event) return null;

  const eventRegs = data.registrations.filter(r => r.eventId === event.id);
  const confirmedRegs = eventRegs.filter(r => r.status === 'Confirmed');
  const checkedInRegs = confirmedRegs.filter(r => r.checkInStatus === 'Checked In');
  const noShowRegs = confirmedRegs.filter(r => r.checkInStatus === 'Not Checked In');
  const waitlistedRegs = eventRegs.filter(r => r.status === 'Waitlisted');

  const totalConfirmed = confirmedRegs.length;
  const totalCheckedIn = checkedInRegs.length;
  const noShowCount = noShowRegs.length;

  const attendanceRate = totalConfirmed > 0 ? Math.round((totalCheckedIn / totalConfirmed) * 100) : 0;
  const noShowRate = totalConfirmed > 0 ? Math.round((noShowCount / totalConfirmed) * 100) : 0;

  // Accommodation metrics
  const accomNeeded = confirmedRegs.filter(r => r.accommodationRequired);
  const rooms = data.rooms.filter(r => r.eventId === event.id);
  const assignedAccomCount = accomNeeded.filter(r => r.roomAssignmentId).length;
  const unassignedAccomCount = accomNeeded.length - assignedAccomCount;

  const totalBeds = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const totalOccupiedBeds = rooms.reduce((acc, r) => acc + r.assignedParticipantIds.length, 0);
  const occupancyRate = totalBeds > 0 ? Math.round((totalOccupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Post-Event Operational Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Audit attendance rates, no-show counts, room occupancy metrics, and export data.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Select Event for Report */}
          <select
            value={activeEventId}
            onChange={e => {
              setActiveEventId(e.target.value);
              setSelectedEventId(e.target.value);
            }}
            className="h-9 px-3 text-xs font-semibold rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
          >
            {data.events.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Header Card */}
      <div className="bg-white p-6 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#14595A]/10 text-[#14595A] uppercase tracking-wider">
            {event.type} Report
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            event.status === 'Completed' ? 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]' : 'bg-[#F0F9F3] text-[#2F7D4F]'
          }`}>
            {event.status}
          </span>
        </div>

        <h2 className="text-xl font-bold font-heading text-[#1C1C1A]">{event.name}</h2>
        <p className="text-xs text-[#6B6B66]">{event.location} • Date: {new Date(event.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* Primary Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">Total Confirmed Registrations</span>
          <div className="text-2xl font-bold font-heading text-[#1C1C1A] mt-1 tabular-nums">
            {totalConfirmed}
          </div>
          {event.capacity && (
            <span className="text-[11px] text-[#6B6B66] block mt-1">
              Max Limit: {event.capacity} ({waitlistedRegs.length} waitlisted)
            </span>
          )}
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">Verified Attendance</span>
          <div className="text-2xl font-bold font-heading text-[#2F7D4F] mt-1 tabular-nums">
            {totalCheckedIn}
          </div>
          <span className="text-[11px] text-[#2F7D4F] font-semibold block mt-1">
            Attendance Rate: {attendanceRate}%
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">No-Show Count</span>
          <div className="text-2xl font-bold font-heading text-[#B0413E] mt-1 tabular-nums">
            {noShowCount}
          </div>
          <span className="text-[11px] text-[#B0413E] font-semibold block mt-1">
            No-Show Rate: {noShowRate}%
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">Accommodation Occupancy</span>
          <div className="text-2xl font-bold font-heading text-[#14595A] mt-1 tabular-nums">
            {occupancyRate}%
          </div>
          <span className="text-[11px] text-[#14595A] font-semibold block mt-1">
            {totalOccupiedBeds} of {totalBeds} beds occupied
          </span>
        </div>
      </div>

      {/* Accommodation Breakdowns */}
      {event.accommodationEnabled && (
        <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
            <BedDouble className="h-4 w-4 text-[#14595A]" />
            <span>Accommodation & Room Occupancy Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#FAFAF9] rounded border border-[#E4E4E1]">
              <div className="text-[#6B6B66]">Accommodation Requested</div>
              <div className="text-lg font-bold text-[#1C1C1A] mt-0.5">{accomNeeded.length} delegates</div>
            </div>

            <div className="p-3 bg-[#F0F9F3] rounded border border-[#2F7D4F]/30">
              <div className="text-[#2F7D4F] font-semibold">Assigned Rooms</div>
              <div className="text-lg font-bold text-[#2F7D4F] mt-0.5">{assignedAccomCount} delegates</div>
            </div>

            <div className="p-3 bg-[#FDF2F2] rounded border border-[#B0413E]/30">
              <div className="text-[#B0413E] font-semibold">Unassigned ("Needs a Room")</div>
              <div className="text-lg font-bold text-[#B0413E] mt-0.5">{unassignedAccomCount} delegates</div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

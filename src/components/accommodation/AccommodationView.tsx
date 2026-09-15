import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import {
  BedDouble,
  Wand2,
  Upload,
  ShieldAlert,
} from 'lucide-react';
import { RoomImportModal } from './RoomImportModal';

interface AccommodationViewProps {
  filterEventId?: string;
}

export const AccommodationView: React.FC<AccommodationViewProps> = ({ filterEventId }) => {
  const { data, selectedEventId, setSelectedEventId, refreshData } = useApp();

  const [activeEventId, setActiveEventId] = useState<string>(
    filterEventId || (selectedEventId !== 'all' ? selectedEventId : data.events.find(e => e.accommodationEnabled)?.id || data.events[0]?.id || '')
  );

  const activeEvent = data.events.find(e => e.id === activeEventId);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);

  // New room state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCap, setNewRoomCap] = useState('2');
  const [newRoomGender, setNewRoomGender] = useState<'Male' | 'Female' | 'Mixed'>('Mixed');

  if (!activeEvent) {
    return <div className="p-8 text-center text-[#6B6B66]">Please select an event.</div>;
  }

  const rooms = data.rooms.filter(r => r.eventId === activeEventId);
  const confirmedRegs = data.registrations.filter(r => r.eventId === activeEventId && r.status === 'Confirmed');
  const accomNeededRegs = confirmedRegs.filter(r => r.accommodationRequired);

  // Find participants who are unassigned ("Needs a Room")
  const assignedParticipantIds = new Set(rooms.flatMap(r => r.assignedParticipantIds));
  const unassignedRegs = accomNeededRegs.filter(r => !assignedParticipantIds.has(r.participantId));

  const handleRunSmartAssignment = () => {
    const res = db.runSmartRoomAssignment(activeEventId);
    refreshData();
    setAssignmentNotice(
      `Smart Institutional Assignment Complete: Assigned ${res.assignedCount} participant(s). ${res.matchedInstitutionsCount > 0 ? `Successfully paired ${res.matchedInstitutionsCount} room(s) with delegates from the same school/institution!` : 'Delegates grouped by gender & institution.'} ${res.unassignedCount > 0 ? `${res.unassignedCount} participant(s) remaining unassigned due to capacity.` : 'All accommodation requests fulfilled!'}`
    );
  };

  const handleAddSingleRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;

    db.saveRoom({
      eventId: activeEventId,
      roomNumber: newRoomNumber.trim(),
      capacity: parseInt(newRoomCap, 10) || 1,
      genderGroup: newRoomGender,
    });

    setNewRoomNumber('');
    refreshData();
  };

  const handleAssignManual = (participantId: string, roomId: string) => {
    if (roomId === 'unassign') {
      // Find current room
      const currentRoom = rooms.find(r => r.assignedParticipantIds.includes(participantId));
      if (currentRoom) {
        db.removeParticipantFromRoom(currentRoom.id, participantId);
      }
    } else {
      db.assignParticipantToRoom(roomId, participantId);
    }
    refreshData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
              Accommodation & Room Management
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#14595A]/10 text-[#14595A]">
              {activeEvent.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Manage rooms, group by gender, and run smart accommodation assignment algorithms.
          </p>
        </div>

        {/* Event Scope Switcher & Actions */}
        <div className="flex items-center space-x-2">
          <select
            value={activeEventId}
            onChange={e => {
              setActiveEventId(e.target.value);
              setSelectedEventId(e.target.value);
              setAssignmentNotice(null);
            }}
            className="h-9 px-3 text-xs font-semibold rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
          >
            {data.events.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} {e.accommodationEnabled ? '[Accom Enabled]' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center space-x-1.5 h-9 px-3 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="h-4 w-4 text-[#14595A]" />
            <span>Import Rooms</span>
          </button>

          <button
            onClick={handleRunSmartAssignment}
            className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors cursor-pointer shadow-2xs"
          >
            <Wand2 className="h-4 w-4" />
            <span>Run Smart Assignment</span>
          </button>
        </div>
      </div>

      {/* Smart Assignment Result Banner */}
      {assignmentNotice && (
        <div className="p-3 bg-[#EBF4F4] border border-[#14595A]/30 rounded-md text-xs text-[#14595A] font-semibold flex items-center justify-between">
          <span>{assignmentNotice}</span>
          <button onClick={() => setAssignmentNotice(null)} className="text-[#6B6B66] hover:text-[#1C1C1A] cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Event Accommodation Overview Card */}
      <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E4E1]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#14595A] bg-[#14595A]/10 px-2 py-0.5 rounded">
              Event Accommodation Control
            </span>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading mt-1">
              {activeEvent.name}
            </h2>
            <p className="text-xs text-[#6B6B66]">
              {activeEvent.location} • Dates: {new Date(activeEvent.startDate).toLocaleDateString()} {activeEvent.isMultiDay ? `- ${new Date(activeEvent.endDate).toLocaleDateString()}` : ''}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              activeEvent.accommodationEnabled ? 'bg-[#F0F9F3] text-[#2F7D4F]' : 'bg-[#FDF9F0] text-[#C17F16]'
            }`}>
              {activeEvent.accommodationEnabled ? 'Accommodation Enabled' : 'Accommodation Disabled'}
            </span>
          </div>
        </div>

        {/* Overview Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#FAFAF9] rounded border border-[#E4E4E1]">
            <div className="text-[10px] font-bold text-[#6B6B66] uppercase">Confirmed Delegates</div>
            <div className="text-lg font-bold text-[#1C1C1A] mt-0.5 tabular-nums">{confirmedRegs.length}</div>
            <div className="text-[10px] text-[#6B6B66] mt-0.5">{accomNeededRegs.length} requested rooms</div>
          </div>

          <div className="p-3 bg-[#EBF4F4] rounded border border-[#14595A]/20">
            <div className="text-[10px] font-bold text-[#14595A] uppercase">Total Rooms & Capacity</div>
            <div className="text-lg font-bold text-[#14595A] mt-0.5 tabular-nums">
              {rooms.length} Rooms ({rooms.reduce((acc, r) => acc + r.capacity, 0)} Beds)
            </div>
            <div className="text-[10px] text-[#14595A] mt-0.5">
              {rooms.filter(r => r.genderGroup === 'Female').length} Female | {rooms.filter(r => r.genderGroup === 'Male').length} Male | {rooms.filter(r => r.genderGroup === 'Mixed').length} Mixed
            </div>
          </div>

          <div className="p-3 bg-[#F0F9F3] rounded border border-[#2F7D4F]/30">
            <div className="text-[10px] font-bold text-[#2F7D4F] uppercase">Assigned Occupants</div>
            <div className="text-lg font-bold text-[#2F7D4F] mt-0.5 tabular-nums">
              {accomNeededRegs.length - unassignedRegs.length} / {accomNeededRegs.length}
            </div>
            <div className="text-[10px] text-[#2F7D4F] mt-0.5 font-semibold">
              {accomNeededRegs.length > 0 ? Math.round(((accomNeededRegs.length - unassignedRegs.length) / accomNeededRegs.length) * 100) : 0}% Assigned
            </div>
          </div>

          <div className="p-3 bg-[#FDF2F2] rounded border border-[#B0413E]/30">
            <div className="text-[10px] font-bold text-[#B0413E] uppercase">Needs a Room</div>
            <div className="text-lg font-bold text-[#B0413E] mt-0.5 tabular-nums">{unassignedRegs.length}</div>
            <div className="text-[10px] text-[#B0413E] mt-0.5 font-semibold">
              {unassignedRegs.length > 0 ? 'Requires capacity or assignment' : 'All Requests Fulfilled'}
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Participants List ("Needs a Room" Indicators) */}
      {unassignedRegs.length > 0 && (
        <div className="bg-[#FDF2F2] border border-[#B0413E]/30 p-4 rounded-lg space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#B0413E]">
            <ShieldAlert className="h-4 w-4" />
            <span>ATTENTION REQUIRED: {unassignedRegs.length} Participant(s) Marked "Needs a Room"</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {unassignedRegs.map(reg => {
              const p = data.participants.find(part => part.id === reg.participantId);
              if (!p) return null;

              return (
                <div key={reg.id} className="bg-white p-2.5 rounded border border-[#E4E4E1] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#1C1C1A]">{p.fullName}</div>
                    <div className="text-[11px] text-[#6B6B66]">{p.gender} • ID: {reg.id}</div>
                  </div>

                  <select
                    onChange={e => handleAssignManual(p.id, e.target.value)}
                    defaultValue=""
                    className="h-7 text-[11px] border border-[#E4E4E1] rounded px-1.5 bg-[#FAFAF9] text-[#14595A] font-semibold cursor-pointer"
                  >
                    <option value="" disabled>Assign Room...</option>
                    {rooms.map(rm => (
                      <option key={rm.id} value={rm.id} disabled={rm.assignedParticipantIds.length >= rm.capacity}>
                        {rm.roomNumber} ({rm.assignedParticipantIds.length}/{rm.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Single Room Form */}
      <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-3">
        <span className="text-xs font-bold text-[#1C1C1A]">Add Single Room</span>
        <form onSubmit={handleAddSingleRoom} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={newRoomNumber}
            onChange={e => setNewRoomNumber(e.target.value)}
            placeholder="Room Number (e.g. Suite 305)"
            className="flex-1 min-w-[180px] h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
          />

          <select
            value={newRoomCap}
            onChange={e => setNewRoomCap(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:outline-none cursor-pointer"
          >
            <option value="1">Capacity: 1 Bed</option>
            <option value="2">Capacity: 2 Beds</option>
            <option value="3">Capacity: 3 Beds</option>
            <option value="4">Capacity: 4 Beds</option>
          </select>

          <select
            value={newRoomGender}
            onChange={e => setNewRoomGender(e.target.value as any)}
            className="h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:outline-none cursor-pointer"
          >
            <option value="Female">Gender: Female Only</option>
            <option value="Male">Gender: Male Only</option>
            <option value="Mixed">Gender: Mixed / Flexible</option>
          </select>

          <button
            type="submit"
            className="h-9 px-4 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] cursor-pointer"
          >
            Add Room
          </button>
        </form>
      </div>

      {/* Room Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => {
          const isFull = room.assignedParticipantIds.length >= room.capacity;

          return (
            <div key={room.id} className="bg-white border border-[#E4E4E1] rounded-lg shadow-2xs p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BedDouble className="h-4 w-4 text-[#14595A]" />
                  <span className="font-bold text-sm text-[#1C1C1A]">{room.roomNumber}</span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    room.genderGroup === 'Female'
                      ? 'bg-pink-100 text-pink-700'
                      : room.genderGroup === 'Male'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                  }`}>
                    {room.genderGroup}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isFull ? 'bg-[#FDF9F0] text-[#C17F16]' : 'bg-[#F0F9F3] text-[#2F7D4F]'
                  }`}>
                    {room.assignedParticipantIds.length} / {room.capacity} Beds
                  </span>
                </div>
              </div>

              {/* Occupants List */}
              <div className="space-y-1.5 pt-2 border-t border-[#E4E4E1]">
                {room.assignedParticipantIds.length > 0 ? (
                  room.assignedParticipantIds.map(pId => {
                    const p = data.participants.find(part => part.id === pId);
                    if (!p) return null;

                    return (
                      <div key={pId} className="flex items-center justify-between p-2 bg-[#FAFAF9] rounded border border-[#E4E4E1] text-xs">
                        <div>
                          <div className="font-semibold text-[#1C1C1A]">{p.fullName}</div>
                          <div className="text-[10px] text-[#6B6B66]">{p.gender} • {p.email}</div>
                        </div>

                        <button
                          onClick={() => handleAssignManual(pId, 'unassign')}
                          className="text-[11px] text-[#B0413E] hover:underline font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-[#6B6B66] italic">
                    Room is currently empty.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Import Modal */}
      <RoomImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        eventId={activeEventId}
      />
    </div>
  );
};

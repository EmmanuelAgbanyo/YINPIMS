import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Event, User } from '../../types';
import {
  X,
  Calendar,
  MapPin,
  Users,
  BedDouble,
  FileEdit,
  QrCode,
  Send,
  UserPlus,
  Sparkles,
  Clock,
  Building,
  Edit,
  ArrowRight,
  ShieldCheck,
  Printer,
  Download,
  Check,
} from 'lucide-react';
import { FormBuilder } from '../builder/FormBuilder';
import { AccommodationView } from '../accommodation/AccommodationView';
import { ParticipantList } from '../participants/ParticipantList';
import { CheckInView } from '../checkin/CheckInView';
import { CommunicationsView } from '../communications/CommunicationsView';
import { WaitlistManagerModal } from '../waitlist/WaitlistManagerModal';
import { BatchBadgePrintModal } from '../badge/BatchBadgePrintModal';
import { exportParticipantsCSV } from '../../utils/exportUtils';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onEditEvent: (event: Event) => void;
  onOpenRegister: (eventId: string) => void;
}

export type EventTab =
  | 'overview'
  | 'form'
  | 'participants'
  | 'accommodation'
  | 'checkin'
  | 'communications'
  | 'waitlist';

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onEditEvent,
  onOpenRegister,
}) => {
  const { data, setSelectedEventId, hasPermission, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<EventTab>('overview');
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [isManageStaffOpen, setIsManageStaffOpen] = useState(false);

  if (!isOpen) return null;

  const event = data.events.find(e => e.id === eventId);
  if (!event) return null;

  const assignedStaffList = data.users.filter(u =>
    u.assignedEvents?.includes('*') || u.assignedEvents?.includes(event.id)
  );

  const handleToggleStaffForEvent = (user: User) => {
    const isCurrentlyAssigned = user.assignedEvents?.includes('*') || user.assignedEvents?.includes(event.id);
    let updatedAssignedEvents: string[];

    if (user.assignedEvents?.includes('*')) {
      // Switch from all events to all other events except this one
      const allOtherEventIds = data.events.filter(e => e.id !== event.id).map(e => e.id);
      updatedAssignedEvents = allOtherEventIds;
    } else if (isCurrentlyAssigned) {
      updatedAssignedEvents = (user.assignedEvents || []).filter(id => id !== event.id);
    } else {
      updatedAssignedEvents = [...(user.assignedEvents || []).filter(id => id !== '*'), event.id];
    }

    db.saveUser({
      ...user,
      assignedEvents: updatedAssignedEvents,
    });
    refreshData();
  };

  const registrations = data.registrations.filter(r => r.eventId === event.id);
  const confirmedRegs = registrations.filter(r => r.status === 'Confirmed');
  const waitlistedRegs = registrations.filter(r => r.status === 'Waitlisted');
  const checkedInRegs = confirmedRegs.filter(r => r.checkInStatus === 'Checked In');

  // Rooms for this event
  const rooms = data.rooms.filter(r => r.eventId === event.id);
  const totalBedCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupiedBeds = rooms.reduce((sum, r) => sum + r.assignedParticipantIds.length, 0);

  const handleSetAsActiveScope = () => {
    setSelectedEventId(event.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#E4E4E1] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Top Navigation Bar */}
        <div className="px-5 py-4 border-b border-[#E4E4E1] bg-[#FAFAF9] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-[#14595A]/10 text-[#14595A] border border-[#14595A]/20 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-lg font-bold text-[#1C1C1A] font-heading truncate">
                  {event.name}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#14595A]/10 text-[#14595A]">
                  {event.type === 'Other' && event.customType ? event.customType : event.type}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    event.status === 'Active'
                      ? 'bg-[#F0F9F3] text-[#2F7D4F]'
                      : event.status === 'Completed'
                      ? 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1]'
                      : 'bg-[#FDF9F0] text-[#C17F16]'
                  }`}
                >
                  {event.status}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs text-[#6B6B66] mt-1 flex-wrap gap-y-1">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 text-[#14595A]" />
                  <span>
                    {new Date(event.startDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {event.isMultiDay &&
                      ` - ${new Date(event.endDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`}
                  </span>
                </span>

                <span className="flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-[#6B6B66]" />
                  <span>{event.location}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
            <button
              onClick={() => exportParticipantsCSV(data, event.id)}
              title="Download full participant directory CSV for this event"
              className="h-8 px-2.5 bg-white border border-[#E4E4E1] text-[#2F7D4F] text-xs font-semibold rounded-md hover:bg-[#F0F9F3] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Download className="h-3.5 w-3.5 text-[#2F7D4F]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsBatchPrintOpen(true)}
              title="Print all delegate badges formatted 4 per A4 page"
              className="h-8 px-2.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-semibold rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Printer className="h-3.5 w-3.5 text-[#14595A]" />
              <span>Print Badges (A4)</span>
            </button>

            <button
              onClick={handleSetAsActiveScope}
              title="Set as active working scope in system header"
              className="h-8 px-2.5 bg-white border border-[#E4E4E1] text-[#14595A] text-xs font-semibold rounded-md hover:bg-[#EBF4F4] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Set Active Scope</span>
            </button>

            {hasPermission('create_event') && (
              <button
                onClick={() => onEditEvent(event)}
                className="h-8 px-2.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Edit className="h-3.5 w-3.5 text-[#6B6B66]" />
                <span>Edit Details</span>
              </button>
            )}

            <button
              onClick={() => onOpenRegister(event.id)}
              className="h-8 px-3 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register</span>
            </button>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md border border-[#E4E4E1] bg-white text-[#6B6B66] hover:text-[#1C1C1A] hover:bg-[#FAFAF9] flex items-center justify-center transition-colors cursor-pointer ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="border-b border-[#E4E4E1] bg-white px-5 flex items-center space-x-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#14595A] text-[#14595A]'
                : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            <span>Event Hub</span>
          </button>

          {hasPermission('manage_forms') && (
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'form'
                  ? 'border-[#14595A] text-[#14595A]'
                  : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Form Builder</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('participants')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'participants'
                ? 'border-[#14595A] text-[#14595A]'
                : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Participants</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#14595A]/10 text-[#14595A] font-bold">
              {confirmedRegs.length}
            </span>
          </button>

          {event.accommodationEnabled && hasPermission('manage_accommodation') && (
            <button
              onClick={() => setActiveTab('accommodation')}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'accommodation'
                  ? 'border-[#14595A] text-[#14595A]'
                  : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              <span>Accommodation</span>
              {totalBedCapacity > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAFAF9] border border-[#E4E4E1] text-[#6B6B66] font-bold">
                  {totalOccupiedBeds}/{totalBedCapacity}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'checkin'
                ? 'border-[#14595A] text-[#14595A]'
                : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Live Scanner</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F0F9F3] text-[#2F7D4F] font-bold">
              {checkedInRegs.length}
            </span>
          </button>

          {waitlistedRegs.length > 0 && (
            <button
              onClick={() => setActiveTab('waitlist')}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'waitlist'
                  ? 'border-[#14595A] text-[#14595A]'
                  : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-[#C17F16]" />
              <span>Waitlist Queue</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FDF9F0] text-[#C17F16] font-bold">
                {waitlistedRegs.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('communications')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'communications'
                ? 'border-[#14595A] text-[#14595A]'
                : 'border-transparent text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Broadcasts</span>
          </button>
        </div>

        {/* Tab Content Body Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAF9]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Event Quick Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
                  <div className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">
                    Confirmed Attendees
                  </div>
                  <div className="text-2xl font-extrabold text-[#1C1C1A] mt-1 tabular-nums">
                    {confirmedRegs.length}
                    {event.capacity ? (
                      <span className="text-xs font-normal text-[#6B6B66] ml-1">
                        / {event.capacity} cap
                      </span>
                    ) : (
                      ''
                    )}
                  </div>
                  <div className="w-full bg-[#FAFAF9] h-1.5 rounded-full overflow-hidden mt-2.5 border border-[#E4E4E1]">
                    <div
                      className="bg-[#14595A] h-full transition-all duration-500"
                      style={{
                        width: `${
                          event.capacity
                            ? Math.min(100, (confirmedRegs.length / event.capacity) * 100)
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
                  <div className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">
                    Check-in Rate
                  </div>
                  <div className="text-2xl font-extrabold text-[#2F7D4F] mt-1 tabular-nums">
                    {confirmedRegs.length > 0
                      ? Math.round((checkedInRegs.length / confirmedRegs.length) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-[#6B6B66] mt-1 flex items-center justify-between">
                    <span>{checkedInRegs.length} checked in</span>
                    <span>{confirmedRegs.length - checkedInRegs.length} pending</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
                  <div className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">
                    Waitlist Queue
                  </div>
                  <div className="text-2xl font-extrabold text-[#C17F16] mt-1 tabular-nums">
                    {waitlistedRegs.length}
                  </div>
                  <div className="text-xs text-[#6B6B66] mt-1">
                    {waitlistedRegs.length > 0
                      ? 'Auto-promotes when seats free up'
                      : 'No waiting list'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
                  <div className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">
                    Accommodation
                  </div>
                  <div className="text-2xl font-extrabold text-[#14595A] mt-1 tabular-nums">
                    {event.accommodationEnabled ? `${totalOccupiedBeds}/${totalBedCapacity}` : 'Disabled'}
                  </div>
                  <div className="text-xs text-[#6B6B66] mt-1">
                    {event.accommodationEnabled
                      ? `${rooms.length} room(s) configured`
                      : 'Not required for event'}
                  </div>
                </div>
              </div>

              {/* Quick Workspace Action Launcher */}
              <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-[#14595A]" />
                  <span>Event Workspace Control Center</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {hasPermission('manage_forms') && (
                    <button
                      onClick={() => setActiveTab('form')}
                      className="p-3.5 bg-[#FAFAF9] hover:bg-[#EBF4F4] border border-[#E4E4E1] hover:border-[#14595A]/30 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <FileEdit className="h-4 w-4 text-[#14595A]" />
                        <ArrowRight className="h-3.5 w-3.5 text-[#6B6B66] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="font-semibold text-xs text-[#1C1C1A] mt-2">Form Builder</div>
                      <div className="text-[11px] text-[#6B6B66] mt-0.5">
                        Build questions or generate smartly with AI.
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('participants')}
                    className="p-3.5 bg-[#FAFAF9] hover:bg-[#EBF4F4] border border-[#E4E4E1] hover:border-[#14595A]/30 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <Users className="h-4 w-4 text-[#14595A]" />
                      <ArrowRight className="h-3.5 w-3.5 text-[#6B6B66] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="font-semibold text-xs text-[#1C1C1A] mt-2">
                      Manage Participants
                    </div>
                    <div className="text-[11px] text-[#6B6B66] mt-0.5">
                      Generate digital badges & print pass layout.
                    </div>
                  </button>

                  {event.accommodationEnabled && hasPermission('manage_accommodation') && (
                    <button
                      onClick={() => setActiveTab('accommodation')}
                      className="p-3.5 bg-[#FAFAF9] hover:bg-[#EBF4F4] border border-[#E4E4E1] hover:border-[#14595A]/30 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <BedDouble className="h-4 w-4 text-[#14595A]" />
                        <ArrowRight className="h-3.5 w-3.5 text-[#6B6B66] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="font-semibold text-xs text-[#1C1C1A] mt-2">
                        Accommodation & Rooms
                      </div>
                      <div className="text-[11px] text-[#6B6B66] mt-0.5">
                        Auto-assign rooms & import CSV/Write-ups.
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('checkin')}
                    className="p-3.5 bg-[#FAFAF9] hover:bg-[#EBF4F4] border border-[#E4E4E1] hover:border-[#14595A]/30 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <QrCode className="h-4 w-4 text-[#14595A]" />
                      <ArrowRight className="h-3.5 w-3.5 text-[#6B6B66] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="font-semibold text-xs text-[#1C1C1A] mt-2">
                      Live Check-In Scanner
                    </div>
                    <div className="text-[11px] text-[#6B6B66] mt-0.5">
                      Webcam scanner & manual verification.
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('communications')}
                    className="p-3.5 bg-[#FAFAF9] hover:bg-[#EBF4F4] border border-[#E4E4E1] hover:border-[#14595A]/30 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <Send className="h-4 w-4 text-[#14595A]" />
                      <ArrowRight className="h-3.5 w-3.5 text-[#6B6B66] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="font-semibold text-xs text-[#1C1C1A] mt-2">
                      Broadcast Notifications
                    </div>
                    <div className="text-[11px] text-[#6B6B66] mt-0.5">
                      Send SMS & Email updates to attendees.
                    </div>
                  </button>
                </div>
              </div>

              {/* Event Details Card */}
              <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-[#1C1C1A] font-heading">
                  Event Description & Information
                </h3>
                <p className="text-xs text-[#6B6B66] leading-relaxed">
                  {event.description || 'No custom description provided for this event.'}
                </p>
              </div>

              {/* Assigned Event Staff & Coordinators Card */}
              <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-[#14595A]" />
                      <span>Assigned Event Admins & Staff ({assignedStaffList.length})</span>
                    </h3>
                    <p className="text-xs text-[#6B6B66] mt-0.5">
                      Staff members and coordinators assigned to manage check-ins and operations for this event.
                    </p>
                  </div>

                  {hasPermission('manage_staff') && (
                    <button
                      onClick={() => setIsManageStaffOpen(true)}
                      className="px-3 h-8 text-xs font-semibold bg-[#FAFAF9] border border-[#E4E4E1] text-[#14595A] rounded-md hover:bg-white hover:border-[#14595A] transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Assign / Manage Staff</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {assignedStaffList.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-[#6B6B66] italic">
                      No specific staff members assigned yet.
                    </div>
                  ) : (
                    assignedStaffList.map(member => (
                      <div key={member.id} className="p-3 bg-[#FAFAF9] rounded-lg border border-[#E4E4E1] flex items-center space-x-3">
                        <img
                          src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={member.name}
                          className="h-9 w-9 rounded-full object-cover border border-[#E4E4E1] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#1C1C1A] truncate">{member.name}</div>
                          <div className="text-[11px] text-[#6B6B66] truncate">{member.email}</div>
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-[#14595A] border border-[#E4E4E1]">
                              {member.role === 'ADMIN' ? 'Admin' : member.role === 'EVENT_COORDINATOR' ? 'Coordinator' : 'Check-In Staff'}
                            </span>
                            {member.assignedEvents?.includes('*') && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                Global
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORM BUILDER */}
          {activeTab === 'form' && <FormBuilder initialEventId={event.id} />}

          {/* TAB 3: PARTICIPANTS */}
          {activeTab === 'participants' && (
            <ParticipantList
              onRegisterNew={() => onOpenRegister(event.id)}
              filterEventId={event.id}
            />
          )}

          {/* TAB 4: ACCOMMODATION */}
          {activeTab === 'accommodation' && (
            <AccommodationView filterEventId={event.id} />
          )}

          {/* TAB 5: CHECK-IN */}
          {activeTab === 'checkin' && <CheckInView filterEventId={event.id} />}

          {/* TAB 6: WAITLIST */}
          {activeTab === 'waitlist' && (
            <WaitlistManagerModal
              isOpen={true}
              onClose={() => setActiveTab('overview')}
              event={event}
            />
          )}

          {/* TAB 7: BROADCAST COMMUNICATIONS */}
          {activeTab === 'communications' && (
            <CommunicationsView filterEventId={event.id} />
          )}
        </div>
      </div>

      {/* Batch Badge Print Modal */}
      {isBatchPrintOpen && (
        <BatchBadgePrintModal
          isOpen={isBatchPrintOpen}
          onClose={() => setIsBatchPrintOpen(false)}
          initialEventId={event.id}
        />
      )}

      {/* Manage Event Staff Modal */}
      {isManageStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E4E4E1] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1] bg-[#FAFAF9]">
              <div>
                <h3 className="font-heading font-bold text-base text-[#1C1C1A]">
                  Assign Staff & Coordinators to Event
                </h3>
                <p className="text-xs text-[#6B6B66]">Target Event: {event.name}</p>
              </div>
              <button
                onClick={() => setIsManageStaffOpen(false)}
                className="p-1 rounded-lg text-[#6B6B66] hover:bg-[#E4E4E1] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-[#6B6B66] leading-relaxed">
                Select which team members are assigned to coordinate or handle check-ins for <strong>{event.name}</strong>:
              </p>

              <div className="divide-y divide-[#E4E4E1] border border-[#E4E4E1] rounded-xl overflow-hidden">
                {data.users.map(u => {
                  const isAssigned = u.assignedEvents?.includes('*') || u.assignedEvents?.includes(event.id);

                  return (
                    <div key={u.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-[#FAFAF9]">
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={u.name}
                          className="h-9 w-9 rounded-full object-cover border border-[#E4E4E1] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1C1C1A] truncate">{u.name}</div>
                          <div className="text-[11px] text-[#6B6B66] truncate">{u.email}</div>
                          <div className="text-[10px] text-[#14595A] font-medium">
                            Role: {u.role === 'ADMIN' ? 'Admin' : u.role === 'EVENT_COORDINATOR' ? 'Coordinator' : 'Check-In Staff'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStaffForEvent(u)}
                        disabled={u.email.toLowerCase() === 'policyp28@gmail.com'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1 ${
                          isAssigned
                            ? 'bg-[#14595A] text-white hover:bg-[#0E4243]'
                            : 'bg-[#FAFAF9] text-[#6B6B66] border border-[#E4E4E1] hover:text-[#1C1C1A]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isAssigned && <Check className="h-3.5 w-3.5" />}
                        <span>{isAssigned ? 'Assigned' : '+ Assign'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E4E4E1] bg-[#FAFAF9] flex justify-end">
              <button
                onClick={() => setIsManageStaffOpen(false)}
                className="px-4 py-2 bg-[#14595A] text-white text-xs font-semibold rounded-xl hover:bg-[#0E4243] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

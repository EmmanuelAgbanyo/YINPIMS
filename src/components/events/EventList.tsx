import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Event } from '../../types';
import {
  Search,
  Plus,
  Calendar,
  MapPin,
  BedDouble,
  FileEdit,
  Trash2,
  Edit,
  UserPlus,
  ExternalLink,
  Building,
  Download,
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { EventDetailModal } from './EventDetailModal';
import { ParticipantExportModal } from '../participants/ParticipantExportModal';

interface EventListProps {
  onOpenCreate: () => void;
  onEditEvent: (event: Event) => void;
  onOpenFormBuilder: (eventId: string) => void;
  onOpenRegister: (eventId: string) => void;
}

export const EventList: React.FC<EventListProps> = ({
  onOpenCreate,
  onEditEvent,
  onOpenFormBuilder,
  onOpenRegister,
}) => {
  const { data, refreshData, hasPermission, effectiveUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Event Detail Workspace Modal State
  const [selectedWorkspaceEventId, setSelectedWorkspaceEventId] = useState<string | null>(null);
  const [exportModalEventId, setExportModalEventId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  // Scoped Event Access: Admins or users with '*' see all events; others see assigned events
  const userAssigned = effectiveUser?.assignedEvents || ['*'];
  const isAllEvents = userAssigned.includes('*') || effectiveUser?.role === 'ADMIN';
  const authorizedEvents = data.events.filter(e => isAllEvents || userAssigned.includes(e.id));

  // Filtering Logic
  const filteredEvents = authorizedEvents.filter(event => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDeleteConfirm = () => {
    if (!deletingEvent) return;
    db.deleteEvent(deletingEvent.id);
    refreshData();
    setDeletingEvent(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Event Management
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Create and manage events, registration forms, capacity, and accommodations.
          </p>
        </div>

        {hasPermission('create_event') && (
          <button
            onClick={onOpenCreate}
            className="flex items-center justify-center space-x-1.5 h-9 px-3.5 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E4E4E1] shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B6B66]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events by name, location, or description..."
            className="w-full h-9 pl-8 pr-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:bg-white focus:outline-none focus:border-[#14595A] cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="Workshop">Workshop</option>
            <option value="Training">Training</option>
            <option value="Webinar">Webinar</option>
            <option value="Conference">Conference</option>
            <option value="Meeting">Meeting</option>
            <option value="Other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] text-[#1C1C1A] focus:bg-white focus:outline-none focus:border-[#14595A] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const confirmedRegs = data.registrations.filter(r => r.eventId === event.id && r.status === 'Confirmed');
            const waitlistedRegs = data.registrations.filter(r => r.eventId === event.id && r.status === 'Waitlisted');
            const checkedInCount = confirmedRegs.filter(r => r.checkInStatus === 'Checked In').length;

            return (
              <div
                key={event.id}
                className="bg-white border border-[#E4E4E1] rounded-lg shadow-2xs hover:border-[#14595A] transition-all flex flex-col justify-between group"
              >
                <div
                  onClick={() => setSelectedWorkspaceEventId(event.id)}
                  className="p-4 space-y-3 cursor-pointer"
                >
                  {/* Event Badges Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#14595A]/10 text-[#14595A]">
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

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-heading font-bold text-sm text-[#1C1C1A] group-hover:text-[#14595A] transition-colors leading-snug flex items-center justify-between">
                      <span>{event.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#14595A]" />
                    </h3>
                    {event.description && (
                      <p className="text-xs text-[#6B6B66] mt-1 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Date & Location Details */}
                  <div className="space-y-1.5 pt-1 text-xs text-[#6B6B66]">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3.5 w-3.5 text-[#14595A] shrink-0" />
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
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3.5 w-3.5 text-[#6B6B66] shrink-0" />
                      <span className="truncate" title={event.location}>
                        {event.location}
                      </span>
                    </div>
                  </div>

                  {/* Registration & Capacity Metrics */}
                  <div className="p-2.5 bg-[#FAFAF9] group-hover:bg-[#EBF4F4]/50 rounded-md border border-[#E4E4E1] grid grid-cols-2 gap-2 text-xs transition-colors">
                    <div>
                      <div className="text-[10px] font-semibold text-[#6B6B66] uppercase">
                        Registrations
                      </div>
                      <div className="font-bold text-[#1C1C1A] mt-0.5 tabular-nums">
                        {confirmedRegs.length} {event.capacity ? `/ ${event.capacity}` : ''}
                      </div>
                      {waitlistedRegs.length > 0 && (
                        <span className="text-[10px] text-[#C17F16] font-semibold block">
                          +{waitlistedRegs.length} Waitlisted
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-[#6B6B66] uppercase">
                        Checked In
                      </div>
                      <div className="font-bold text-[#2F7D4F] mt-0.5 tabular-nums">
                        {checkedInCount} (
                        {confirmedRegs.length > 0
                          ? Math.round((checkedInCount / confirmedRegs.length) * 100)
                          : 0}
                        %)
                      </div>
                    </div>
                  </div>

                  {/* Accommodation Tag */}
                  {event.accommodationEnabled && (
                    <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#14595A]">
                      <BedDouble className="h-3.5 w-3.5" />
                      <span>Accommodation Enabled</span>
                    </div>
                  )}
                </div>

                {/* Event Actions Footer */}
                <div className="px-4 py-2.5 bg-[#FAFAF9] border-t border-[#E4E4E1] flex items-center justify-between gap-1">
                  <button
                    onClick={() => setSelectedWorkspaceEventId(event.id)}
                    className="flex items-center space-x-1 h-7 px-2.5 text-[11px] font-semibold text-white bg-[#14595A] rounded hover:bg-[#0E4243] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Building className="h-3 w-3" />
                    <span>Manage Hub</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {hasPermission('manage_forms') && (
                      <button
                        onClick={() => onOpenFormBuilder(event.id)}
                        title="Edit Registration Form"
                        className="flex items-center space-x-1 h-7 px-2 text-[11px] font-medium text-[#14595A] bg-white border border-[#E4E4E1] rounded hover:bg-[#EBF4F4] transition-colors cursor-pointer"
                      >
                        <FileEdit className="h-3 w-3" />
                        <span>Form</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportModalEventId(event.id);
                      }}
                      title="Filter & Export Event Participants by Title (Contestant, Staff, Volunteer, Coordinator, etc.)"
                      className="flex items-center space-x-1 h-7 px-2 text-[11px] font-medium text-[#2F7D4F] bg-white border border-[#E4E4E1] rounded hover:bg-[#F0F9F3] transition-colors cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export</span>
                    </button>

                    <button
                      onClick={() => onOpenRegister(event.id)}
                      title="Register Participant"
                      className="flex items-center space-x-1 h-7 px-2 text-[11px] font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                    >
                      <UserPlus className="h-3 w-3 text-[#14595A]" />
                      <span>Register</span>
                    </button>

                    {hasPermission('create_event') && (
                      <button
                        onClick={() => onEditEvent(event)}
                        title="Edit Event Details"
                        className="h-7 w-7 flex items-center justify-center text-[#6B6B66] hover:text-[#14595A] hover:bg-white rounded border border-transparent hover:border-[#E4E4E1] cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {hasPermission('delete_event') && (
                      <button
                        onClick={() => setDeletingEvent(event)}
                        title="Delete Event"
                        className="h-7 w-7 flex items-center justify-center text-[#6B6B66] hover:text-[#B0413E] hover:bg-white rounded border border-transparent hover:border-[#E4E4E1] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Meaningful Empty State */
        <div className="bg-white p-12 rounded-lg border border-[#E4E4E1] text-center max-w-md mx-auto space-y-3">
          <div className="h-12 w-12 rounded-full bg-[#FAFAF9] border border-[#E4E4E1] text-[#6B6B66] flex items-center justify-center mx-auto">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#1C1C1A] font-heading">
            {data.events.length === 0 
              ? 'No Events Created Yet' 
              : authorizedEvents.length === 0 
                ? 'No Assigned Events' 
                : 'No Matching Events'}
          </h3>
          <p className="text-xs text-[#6B6B66]">
            {data.events.length === 0
              ? 'There are currently no events registered in the system. As an administrator, you can create a new event now.'
              : authorizedEvents.length === 0
                ? 'You are not assigned to any events yet. Please ask the Super Administrator (policyp28@gmail.com) to assign event permissions to your profile.'
                : 'No events match your current search query or filter criteria.'}
          </p>
          {hasPermission('create_event') && (
            <button
              onClick={onOpenCreate}
              className="inline-flex items-center space-x-1.5 h-9 px-4 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors cursor-pointer mt-2 shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Event</span>
            </button>
          )}
        </div>
      )}

      {/* Destructive Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingEvent}
        title="Delete Event"
        message={`Deleting "${deletingEvent?.name}" will permanently remove all associated registrations, form responses, room assignments, and attendance records. This action cannot be undone.`}
        confirmLabel="Delete Event"
        onCancel={() => setDeletingEvent(null)}
        onConfirm={handleDeleteConfirm}
        isDestructive={true}
      />

      {/* Event Detail Workspace Control Center */}
      {selectedWorkspaceEventId && (
        <EventDetailModal
          isOpen={!!selectedWorkspaceEventId}
          onClose={() => setSelectedWorkspaceEventId(null)}
          eventId={selectedWorkspaceEventId}
          onEditEvent={evt => {
            onEditEvent(evt);
            setSelectedWorkspaceEventId(null);
          }}
          onOpenRegister={evtId => {
            onOpenRegister(evtId);
          }}
        />
      )}

      {/* Filtered Export Modal */}
      {exportModalEventId && (
        <ParticipantExportModal
          isOpen={!!exportModalEventId}
          onClose={() => setExportModalEventId(null)}
          initialEventId={exportModalEventId}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Event, EventType, EventStatus } from '../../types';
import { X, Calendar, MapPin, Users, BedDouble, AlertCircle } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEvent?: Event | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, initialEvent }) => {
  const { refreshData } = useApp();

  const [name, setName] = useState(initialEvent?.name || '');
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [type, setType] = useState<EventType>(initialEvent?.type || 'Conference');
  const [customType, setCustomType] = useState(initialEvent?.customType || '');
  const [isMultiDay, setIsMultiDay] = useState(initialEvent?.isMultiDay || false);
  const [startDate, setStartDate] = useState(initialEvent?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEvent?.endDate || new Date().toISOString().split('T')[0]);
  const [capacity, setCapacity] = useState<string>(initialEvent?.capacity ? String(initialEvent.capacity) : '');
  const [accommodationEnabled, setAccommodationEnabled] = useState(initialEvent?.accommodationEnabled || false);
  const [status] = useState<EventStatus>(initialEvent?.status || 'Active');
  const [description, setDescription] = useState(initialEvent?.description || '');

  // Field Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Please enter an event name.';
    if (!location.trim()) newErrors.location = 'Please enter an event location.';
    if (type === 'Other' && !customType.trim()) newErrors.customType = 'Please specify the custom event type.';

    if (isMultiDay && endDate < startDate) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    }

    if (capacity && (isNaN(Number(capacity)) || Number(capacity) <= 0)) {
      newErrors.capacity = 'Capacity must be a positive number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    db.saveEvent({
      id: initialEvent?.id,
      name: name.trim(),
      location: location.trim(),
      type,
      customType: type === 'Other' ? customType.trim() : undefined,
      isMultiDay,
      startDate,
      endDate: isMultiDay ? endDate : startDate,
      capacity: capacity ? Number(capacity) : undefined,
      accommodationEnabled,
      status,
      description: description.trim(),
    });

    refreshData();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-lg w-full max-w-xl max-h-[90vh] flex flex-col my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1]">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
              {initialEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            <p className="text-xs text-[#6B6B66]">Configure event metadata, capacity, and accommodation settings.</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md flex items-center justify-center text-[#6B6B66] hover:bg-[#FAFAF9] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Event Name */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
              Event Name <span className="text-[#B0413E]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Global Youth Innovation Summit 2026"
              className={`w-full h-9 px-3 text-xs rounded-md border bg-white focus:outline-none focus:ring-1 ${
                errors.name ? 'border-[#B0413E] focus:ring-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A] focus:ring-[#14595A]'
              }`}
            />
            {errors.name && (
              <span className="flex items-center space-x-1 text-[11px] text-[#B0413E] mt-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.name}</span>
              </span>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
              Location / Venue <span className="text-[#B0413E]">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B6B66]" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Grand Horizon Convention Center, San Francisco, CA"
                className={`w-full h-9 pl-8 pr-3 text-xs rounded-md border bg-white focus:outline-none focus:ring-1 ${
                  errors.location ? 'border-[#B0413E] focus:ring-[#B0413E]' : 'border-[#E4E4E1] focus:border-[#14595A] focus:ring-[#14595A]'
                }`}
              />
            </div>
            {errors.location && (
              <span className="flex items-center space-x-1 text-[11px] text-[#B0413E] mt-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.location}</span>
              </span>
            )}
          </div>

          {/* Date Setup */}
          <div className="p-3 bg-[#FAFAF9] border border-[#E4E4E1] rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#1C1C1A] flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-[#14595A]" />
                <span>Event Schedule</span>
              </label>
              <label className="flex items-center space-x-2 text-xs font-medium text-[#1C1C1A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMultiDay}
                  onChange={e => setIsMultiDay(e.target.checked)}
                  className="rounded text-[#14595A] focus:ring-[#14595A]"
                />
                <span>This event runs across multiple days</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B6B66] mb-1">
                  {isMultiDay ? 'Start Date' : 'Event Date'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                />
              </div>

              {isMultiDay && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6B66] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                  />
                  {errors.endDate && (
                    <span className="text-[10px] text-[#B0413E] mt-0.5 block">{errors.endDate}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event Type & Custom Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Event Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as EventType)}
                className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
              >
                <option value="Workshop">Workshop</option>
                <option value="Training">Training</option>
                <option value="Webinar">Webinar</option>
                <option value="Conference">Conference</option>
                <option value="Meeting">Meeting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {type === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Specify Custom Type</label>
                <input
                  type="text"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="e.g. Hackathon / Retreat"
                  className="w-full h-9 px-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                />
                {errors.customType && (
                  <span className="text-[10px] text-[#B0413E] mt-0.5 block">{errors.customType}</span>
                )}
              </div>
            )}

            {/* Event Capacity */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">
                Max Capacity (Optional)
              </label>
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B6B66]" />
                <input
                  type="number"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  placeholder="Unlimited if empty"
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
                />
              </div>
              <span className="text-[10px] text-[#6B6B66] mt-0.5 block">
                Overflow registrations automatically join waitlist.
              </span>
              {errors.capacity && (
                <span className="text-[10px] text-[#B0413E] mt-0.5 block">{errors.capacity}</span>
              )}
            </div>
          </div>

          {/* Accommodation Toggle */}
          <div className="p-3 bg-[#EBF4F4] border border-[#14595A]/20 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <BedDouble className="h-5 w-5 text-[#14595A]" />
              <div>
                <div className="text-xs font-bold text-[#1C1C1A]">This event includes accommodation</div>
                <div className="text-[11px] text-[#6B6B66]">Automatically enables accommodation request and room assignment system.</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accommodationEnabled}
              onChange={e => setAccommodationEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-[#14595A] focus:ring-[#14595A] cursor-pointer"
            />
          </div>

          {/* Event Description */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide event details, objectives, or instructions for participants..."
              className="w-full p-2.5 text-xs rounded-md border border-[#E4E4E1] bg-white focus:outline-none focus:border-[#14595A]"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-3 border-t border-[#E4E4E1] bg-[#FAFAF9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 h-9 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
          >
            {initialEvent ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

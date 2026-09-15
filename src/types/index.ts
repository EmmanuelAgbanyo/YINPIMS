export type UserRole = 'ADMIN' | 'EVENT_COORDINATOR' | 'CHECKIN_STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  organizationId: string;
  assignedEvents: string[]; // event IDs ('*' for all)
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  settings: {
    allowWaitlist: boolean;
    requirePhone: boolean;
    defaultCurrency?: string;
  };
}

export type EventType = 'Workshop' | 'Training' | 'Webinar' | 'Conference' | 'Meeting' | 'Other';
export type EventStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled';

export interface Event {
  id: string;
  name: string;
  location: string;
  type: EventType;
  customType?: string;
  isMultiDay: boolean;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
  capacity?: number; // null/undefined = unlimited
  registrationStatus: 'Open' | 'Closed';
  accommodationEnabled: boolean;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'number'
  | 'email'
  | 'phone'
  | 'date';

export interface RegistrationQuestion {
  id: string;
  eventId: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  position: number;
  isSystemQuestion?: boolean; // e.g. Accommodation or Gender auto-added
}

export type ParticipantBadgeType = 'Delegate' | 'Contestant' | 'Speaker' | 'Volunteer' | 'Staff';
export type RegistrationStatus = 'Confirmed' | 'Waitlisted' | 'Cancelled';
export type CheckInStatus = 'Not Checked In' | 'Checked In';

export interface Registration {
  id: string;
  eventId: string;
  participantId: string;
  status: RegistrationStatus;
  badgeType?: ParticipantBadgeType;
  registrationDate: string;
  checkInStatus: CheckInStatus;
  checkInTimestamp?: string;
  waitlistPosition?: number;
  qrIdentifier: string; // unique string encoded into QR code
  accommodationRequired: boolean;
  roomAssignmentId?: string;
  responses: Record<string, string | string[]>; // questionId -> answer
}

export type GenderType = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface Participant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: GenderType;
  badgeType?: ParticipantBadgeType;
  organization?: string;
  jobTitle?: string;
  createdAt: string;
}

export interface AccommodationRoom {
  id: string;
  eventId: string;
  roomNumber: string;
  capacity: number;
  genderGroup: 'Male' | 'Female' | 'Mixed';
  assignedParticipantIds: string[];
}

export interface CommunicationLog {
  id: string;
  eventId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  type: 'Confirmation' | 'Reminder';
  channel: 'Email' | 'SMS';
  sentAt: string;
  status: 'Simulated' | 'Sent' | 'Failed';
  subject: string;
  content: string;
}

export interface OperationalInsight {
  id: string;
  type: 'capacity' | 'waitlist' | 'upcoming' | 'attendance';
  title: string;
  description: string;
  eventId?: string;
  severity: 'info' | 'warning' | 'urgent';
  actionLabel?: string;
}

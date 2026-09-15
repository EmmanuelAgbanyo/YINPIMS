import type {
  User,
  Organization,
  Event,
  Participant,
  Registration,
  RegistrationQuestion,
  AccommodationRoom,
  CommunicationLog,
} from '../types';
import { syncService } from './sync';

const STORAGE_KEY = 'PIMS_DATA_V1';

export interface DatabaseSchema {
  organization: Organization;
  users: User[];
  events: Event[];
  questions: RegistrationQuestion[];
  participants: Participant[];
  registrations: Registration[];
  rooms: AccommodationRoom[];
  logs: CommunicationLog[];
}

const INITIAL_SEED_DATA: DatabaseSchema = {
  organization: {
    id: 'org-001',
    name: 'Global Innovation & Leadership Institute',
    description: 'Empowering delegates and professionals worldwide through high-impact conferences and workshops.',
    createdAt: '2025-01-15',
    settings: {
      allowWaitlist: true,
      requirePhone: true,
      defaultCurrency: 'USD',
    },
  },

  users: [
    {
      id: 'usr-admin',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@gili-institute.org',
      phone: '+1 (555) 234-5678',
      role: 'ADMIN',
      organizationId: 'org-001',
      assignedEvents: ['*'],
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      id: 'usr-coord',
      name: 'David Chen',
      email: 'david.chen@gili-institute.org',
      phone: '+1 (555) 876-5432',
      role: 'EVENT_COORDINATOR',
      organizationId: 'org-001',
      assignedEvents: ['evt-101', 'evt-102', 'evt-103'],
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      id: 'usr-checkin',
      name: 'Alex Rivera',
      email: 'alex.rivera@gili-institute.org',
      phone: '+1 (555) 345-6789',
      role: 'CHECKIN_STAFF',
      organizationId: 'org-001',
      assignedEvents: ['evt-101', 'evt-102'],
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  ],

  events: [
    {
      id: 'evt-101',
      name: 'Global Youth Innovation Summit 2026',
      location: 'Grand Horizon Convention Center, San Francisco, CA',
      type: 'Conference',
      isMultiDay: true,
      startDate: '2026-09-15',
      endDate: '2026-09-18',
      capacity: 50,
      registrationStatus: 'Open',
      accommodationEnabled: true,
      status: 'Active',
      createdAt: '2026-06-01',
      updatedAt: '2026-09-01',
      description: 'Annual gathering of young innovators, tech entrepreneurs, and policy leaders.',
    },
    {
      id: 'evt-102',
      name: 'Advanced Web Security & DevSecOps Workshop',
      location: 'TechHub Innovation Lab, Austin, TX',
      type: 'Workshop',
      isMultiDay: false,
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      capacity: 5, // Small capacity to showcase waitlist mechanism!
      registrationStatus: 'Open',
      accommodationEnabled: false,
      status: 'Active',
      createdAt: '2026-07-10',
      updatedAt: '2026-09-02',
      description: 'Hands-on intensive workshop covering modern application security controls and threat modeling.',
    },
    {
      id: 'evt-103',
      name: 'Executive Leadership & Governance Seminar',
      location: 'Beacon Center, Chicago, IL',
      type: 'Training',
      isMultiDay: true,
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      capacity: 30,
      registrationStatus: 'Open',
      accommodationEnabled: true,
      status: 'Active',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-25',
      description: 'Strategic leadership program tailored for senior executives and board directors.',
    },
    {
      id: 'evt-104',
      name: 'Annual AI & Ethics Symposium 2026',
      location: 'Metro Center Hall, New York, NY',
      type: 'Meeting',
      isMultiDay: false,
      startDate: '2026-08-20',
      endDate: '2026-08-20',
      capacity: 40,
      registrationStatus: 'Closed',
      accommodationEnabled: false,
      status: 'Completed',
      createdAt: '2026-05-10',
      updatedAt: '2026-08-21',
      description: 'Completed symposium reviewing ethical frameworks in high-stakes artificial intelligence deployment.',
    },
  ],

  questions: [
    // Event 101 Questions
    { id: 'q-101-1', eventId: 'evt-101', label: 'Full Name', type: 'short_text', required: true, position: 1, isSystemQuestion: true },
    { id: 'q-101-2', eventId: 'evt-101', label: 'Email Address', type: 'email', required: true, position: 2, isSystemQuestion: true },
    { id: 'q-101-3', eventId: 'evt-101', label: 'Phone Number', type: 'phone', required: true, position: 3, isSystemQuestion: true },
    { id: 'q-101-4', eventId: 'evt-101', label: 'Gender', type: 'dropdown', required: true, options: ['Male', 'Female', 'Other', 'Prefer not to say'], position: 4, isSystemQuestion: true },
    { id: 'q-101-5', eventId: 'evt-101', label: 'Do you need accommodation?', type: 'multiple_choice', required: true, options: ['Yes', 'No'], position: 5, isSystemQuestion: true },
    { id: 'q-101-6', eventId: 'evt-101', label: 'Organization or Institution', type: 'short_text', required: true, position: 6 },
    { id: 'q-101-7', eventId: 'evt-101', label: 'Dietary Restrictions', type: 'checkboxes', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'None'], position: 7 },
    { id: 'q-101-8', eventId: 'evt-101', label: 'Brief Statement of Purpose', type: 'paragraph', required: false, position: 8 },

    // Event 102 Questions
    { id: 'q-102-1', eventId: 'evt-102', label: 'Full Name', type: 'short_text', required: true, position: 1, isSystemQuestion: true },
    { id: 'q-102-2', eventId: 'evt-102', label: 'Email Address', type: 'email', required: true, position: 2, isSystemQuestion: true },
    { id: 'q-102-3', eventId: 'evt-102', label: 'Phone Number', type: 'phone', required: true, position: 3, isSystemQuestion: true },
    { id: 'q-102-4', eventId: 'evt-102', label: 'Current Role & Technical Stack', type: 'short_text', required: true, position: 4 },
  ],

  participants: [
    { id: 'prt-001', fullName: 'Elena Rostova', email: 'elena.rostova@techspark.io', phone: '+1 (555) 912-3456', gender: 'Female', organization: 'TechSpark Labs', jobTitle: 'Lead Software Architect', createdAt: '2026-06-10' },
    { id: 'prt-002', fullName: 'Marcus Vance', email: 'marcus.vance@apexglobal.com', phone: '+1 (555) 823-4567', gender: 'Male', organization: 'Apex Global Partners', jobTitle: 'VP of Product Strategy', createdAt: '2026-06-12' },
    { id: 'prt-003', fullName: 'Amara Okafor', email: 'amara.okafor@innovateafrica.org', phone: '+1 (555) 734-5678', gender: 'Female', organization: 'Innovate Africa', jobTitle: 'Program Director', createdAt: '2026-06-15' },
    { id: 'prt-004', fullName: 'Liam O\'Connor', email: 'liam.oconnor@dublintech.ie', phone: '+1 (555) 645-6789', gender: 'Male', organization: 'Dublin Tech Hub', jobTitle: 'DevSecOps Specialist', createdAt: '2026-06-18' },
    { id: 'prt-005', fullName: 'Sophia Chen', email: 'sophia.chen@quantumventures.com', phone: '+1 (555) 556-7890', gender: 'Female', organization: 'Quantum Ventures', jobTitle: 'Investment Associate', createdAt: '2026-06-20' },
    { id: 'prt-006', fullName: 'Tariq Al-Mansoor', email: 'tariq.mansoor@futuregen.ae', phone: '+1 (555) 467-8901', gender: 'Male', organization: 'FutureGen Dubai', jobTitle: 'Innovation Analyst', createdAt: '2026-06-22' },
    { id: 'prt-007', fullName: 'Chloe Dubois', email: 'chloe.dubois@paris-ai.fr', phone: '+1 (555) 378-9012', gender: 'Female', organization: 'Paris AI Collective', jobTitle: 'Research Fellow', createdAt: '2026-06-25' },
    { id: 'prt-008', fullName: 'Benjamin Hayes', email: 'ben.hayes@cyberdefense.gov', phone: '+1 (555) 289-0123', gender: 'Male', organization: 'National Cyber Defense', jobTitle: 'Security Researcher', createdAt: '2026-06-28' },
  ],

  registrations: [
    // Event 101 (Summit) Registrations
    {
      id: 'reg-101-01',
      eventId: 'evt-101',
      participantId: 'prt-001',
      status: 'Confirmed',
      registrationDate: '2026-06-10T10:30:00Z',
      checkInStatus: 'Checked In',
      checkInTimestamp: '2026-09-15T08:45:12Z',
      qrIdentifier: 'QR-PIMS-EVT101-PRT001-REG01',
      accommodationRequired: true,
      roomAssignmentId: 'room-101',
      responses: {
        'q-101-1': 'Elena Rostova',
        'q-101-2': 'elena.rostova@techspark.io',
        'q-101-3': '+1 (555) 912-3456',
        'q-101-4': 'Female',
        'q-101-5': 'Yes',
        'q-101-6': 'TechSpark Labs',
        'q-101-7': ['Vegetarian'],
      },
    },
    {
      id: 'reg-101-02',
      eventId: 'evt-101',
      participantId: 'prt-002',
      status: 'Confirmed',
      registrationDate: '2026-06-12T14:15:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT101-PRT002-REG02',
      accommodationRequired: true,
      roomAssignmentId: 'room-102',
      responses: {
        'q-101-1': 'Marcus Vance',
        'q-101-2': 'marcus.vance@apexglobal.com',
        'q-101-3': '+1 (555) 823-4567',
        'q-101-4': 'Male',
        'q-101-5': 'Yes',
        'q-101-6': 'Apex Global Partners',
        'q-101-7': ['None'],
      },
    },
    {
      id: 'reg-101-03',
      eventId: 'evt-101',
      participantId: 'prt-003',
      status: 'Confirmed',
      registrationDate: '2026-06-15T09:00:00Z',
      checkInStatus: 'Checked In',
      checkInTimestamp: '2026-09-15T09:12:05Z',
      qrIdentifier: 'QR-PIMS-EVT101-PRT003-REG03',
      accommodationRequired: true,
      roomAssignmentId: 'room-101',
      responses: {
        'q-101-1': 'Amara Okafor',
        'q-101-2': 'amara.okafor@innovateafrica.org',
        'q-101-3': '+1 (555) 734-5678',
        'q-101-4': 'Female',
        'q-101-5': 'Yes',
        'q-101-6': 'Innovate Africa',
        'q-101-7': ['Gluten-Free'],
      },
    },
    {
      id: 'reg-101-04',
      eventId: 'evt-101',
      participantId: 'prt-005',
      status: 'Confirmed',
      registrationDate: '2026-06-20T11:20:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT101-PRT005-REG04',
      accommodationRequired: true,
      roomAssignmentId: 'room-103',
      responses: {
        'q-101-1': 'Sophia Chen',
        'q-101-2': 'sophia.chen@quantumventures.com',
        'q-101-3': '+1 (555) 556-7890',
        'q-101-4': 'Female',
        'q-101-5': 'Yes',
        'q-101-6': 'Quantum Ventures',
      },
    },

    // Event 102 (Security Workshop - Capacity 5 limit)
    {
      id: 'reg-102-01',
      eventId: 'evt-102',
      participantId: 'prt-004',
      status: 'Confirmed',
      registrationDate: '2026-07-11T08:00:00Z',
      checkInStatus: 'Checked In',
      checkInTimestamp: '2026-09-10T08:50:00Z',
      qrIdentifier: 'QR-PIMS-EVT102-PRT004-REG01',
      accommodationRequired: false,
      responses: { 'q-102-1': 'Liam O\'Connor', 'q-102-2': 'liam.oconnor@dublintech.ie' },
    },
    {
      id: 'reg-102-02',
      eventId: 'evt-102',
      participantId: 'prt-008',
      status: 'Confirmed',
      registrationDate: '2026-07-11T08:05:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT102-PRT008-REG02',
      accommodationRequired: false,
      responses: { 'q-102-1': 'Benjamin Hayes', 'q-102-2': 'ben.hayes@cyberdefense.gov' },
    },
    {
      id: 'reg-102-03',
      eventId: 'evt-102',
      participantId: 'prt-001',
      status: 'Confirmed',
      registrationDate: '2026-07-11T08:10:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT102-PRT001-REG03',
      accommodationRequired: false,
      responses: { 'q-102-1': 'Elena Rostova', 'q-102-2': 'elena.rostova@techspark.io' },
    },
    {
      id: 'reg-102-04',
      eventId: 'evt-102',
      participantId: 'prt-002',
      status: 'Confirmed',
      registrationDate: '2026-07-11T08:15:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT102-PRT002-REG04',
      accommodationRequired: false,
      responses: { 'q-102-1': 'Marcus Vance', 'q-102-2': 'marcus.vance@apexglobal.com' },
    },
    {
      id: 'reg-102-05',
      eventId: 'evt-102',
      participantId: 'prt-006',
      status: 'Confirmed',
      registrationDate: '2026-07-11T08:20:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT102-PRT006-REG05',
      accommodationRequired: false,
      responses: { 'q-102-1': 'Tariq Al-Mansoor', 'q-102-2': 'tariq.mansoor@futuregen.ae' },
    },
    // Waitlisted participants for Event 102!
    {
      id: 'reg-102-06',
      eventId: 'evt-102',
      participantId: 'prt-007',
      status: 'Waitlisted',
      waitlistPosition: 1,
      registrationDate: '2026-07-11T09:30:00Z',
      checkInStatus: 'Not Checked In',
      qrIdentifier: 'QR-PIMS-EVT102-PRT007-REG06',
      accommodationRequired: false,
      responses: { 'q-102-1': 'Chloe Dubois', 'q-102-2': 'chloe.dubois@paris-ai.fr' },
    },

    // Event 104 (Completed event stats)
    {
      id: 'reg-104-01',
      eventId: 'evt-104',
      participantId: 'prt-001',
      status: 'Confirmed',
      registrationDate: '2026-05-15T10:00:00Z',
      checkInStatus: 'Checked In',
      checkInTimestamp: '2026-08-20T08:40:00Z',
      qrIdentifier: 'QR-PIMS-EVT104-PRT001-REG01',
      accommodationRequired: false,
      responses: {},
    },
    {
      id: 'reg-104-02',
      eventId: 'evt-104',
      participantId: 'prt-003',
      status: 'Confirmed',
      registrationDate: '2026-05-16T11:00:00Z',
      checkInStatus: 'Checked In',
      checkInTimestamp: '2026-08-20T08:50:00Z',
      qrIdentifier: 'QR-PIMS-EVT104-PRT003-REG02',
      accommodationRequired: false,
      responses: {},
    },
    {
      id: 'reg-104-03',
      eventId: 'evt-104',
      participantId: 'prt-005',
      status: 'Confirmed',
      registrationDate: '2026-05-17T12:00:00Z',
      checkInStatus: 'Not Checked In', // No show
      qrIdentifier: 'QR-PIMS-EVT104-PRT005-REG03',
      accommodationRequired: false,
      responses: {},
    },
  ],

  rooms: [
    {
      id: 'room-101',
      eventId: 'evt-101',
      roomNumber: 'Suite 204',
      capacity: 2,
      genderGroup: 'Female',
      assignedParticipantIds: ['prt-001', 'prt-003'],
    },
    {
      id: 'room-102',
      eventId: 'evt-101',
      roomNumber: 'Suite 205',
      capacity: 2,
      genderGroup: 'Male',
      assignedParticipantIds: ['prt-002'],
    },
    {
      id: 'room-103',
      eventId: 'evt-101',
      roomNumber: 'Executive Suite 301',
      capacity: 3,
      genderGroup: 'Female',
      assignedParticipantIds: ['prt-005'],
    },
  ],

  logs: [
    {
      id: 'log-001',
      eventId: 'evt-101',
      participantId: 'prt-001',
      participantName: 'Elena Rostova',
      participantEmail: 'elena.rostova@techspark.io',
      type: 'Confirmation',
      channel: 'Email',
      sentAt: '2026-06-10T10:31:00Z',
      status: 'Simulated',
      subject: 'Registration Confirmed: Global Youth Innovation Summit 2026',
      content: 'Thank you for registering! Your Digital ID Badge and QR Code are ready.',
    },
    {
      id: 'log-002',
      eventId: 'evt-102',
      participantId: 'prt-007',
      participantName: 'Chloe Dubois',
      participantEmail: 'chloe.dubois@paris-ai.fr',
      type: 'Reminder',
      channel: 'Email',
      sentAt: '2026-07-11T09:31:00Z',
      status: 'Simulated',
      subject: 'Waitlist Confirmation #1 - Web Security Workshop',
      content: 'You have been placed on the waitlist at position #1. We will notify you if a slot opens up.',
    },
  ],
};

class StorageService {
  private data: DatabaseSchema;
  private isApplyingSync = false;

  constructor() {
    this.data = this.loadFromStorage();
    this.initSyncSubscription();
  }

  private initSyncSubscription() {
    syncService.subscribeDataChange((remoteData) => {
      if (remoteData) {
        this.applyRemoteData(remoteData);
      }
    });
  }

  private loadFromStorage(): DatabaseSchema {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse PIMS localStorage data, initializing seed data', err);
    }
    this.saveToStorage(INITIAL_SEED_DATA, true);
    return INITIAL_SEED_DATA;
  }

  private saveToStorage(data: DatabaseSchema, isFromSync: boolean = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.data = data;
      if (!isFromSync && !this.isApplyingSync) {
        syncService.broadcastUpdate(data);
      }
    } catch (err) {
      console.error('Failed to save PIMS data to localStorage', err);
    }
  }

  public applyRemoteData(remoteData: DatabaseSchema) {
    this.isApplyingSync = true;
    try {
      this.data = remoteData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
      // Dispatch custom window event so AppContext triggers refreshData
      window.dispatchEvent(new CustomEvent('PIMS_LOCAL_DATA_REFRESH'));
    } catch (err) {
      console.error('Failed to apply remote sync data', err);
    } finally {
      this.isApplyingSync = false;
    }
  }

  public exportFullDatabase(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public importFullDatabase(jsonString: string): DatabaseSchema {
    try {
      const parsed = JSON.parse(jsonString) as DatabaseSchema;
      if (!parsed.organization || !Array.isArray(parsed.events) || !Array.isArray(parsed.participants)) {
        throw new Error('Invalid DatabaseSchema structure.');
      }
      this.saveToStorage(parsed);
      return this.data;
    } catch (err) {
      throw new Error(`Failed to import dataset: ${(err as Error).message}`);
    }
  }

  public resetToSeed(): DatabaseSchema {
    this.saveToStorage(INITIAL_SEED_DATA);
    return this.data;
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public updateData(updater: (prev: DatabaseSchema) => DatabaseSchema): DatabaseSchema {
    const updated = updater(this.data);
    this.saveToStorage(updated);
    return this.data;
  }

  // --- EVENTS ---
  public getEvents(): Event[] {
    return this.data.events;
  }

  public saveEvent(event: Partial<Event> & { name: string; location: string }): Event {
    const isNew = !event.id;
    const now = new Date().toISOString();
    const eventId = event.id || `evt-${Date.now()}`;

    const newEvent: Event = {
      id: eventId,
      name: event.name,
      location: event.location,
      type: event.type || 'Workshop',
      customType: event.customType,
      isMultiDay: event.isMultiDay || false,
      startDate: event.startDate || now.split('T')[0],
      endDate: event.endDate || now.split('T')[0],
      capacity: event.capacity || undefined,
      registrationStatus: event.registrationStatus || 'Open',
      accommodationEnabled: event.accommodationEnabled || false,
      status: event.status || 'Active',
      createdAt: isNew ? now : (event.createdAt || now),
      updatedAt: now,
      description: event.description || '',
    };

    let events = [...this.data.events];
    if (isNew) {
      events.unshift(newEvent);
      // Auto-create default registration questions for the event
      this.ensureDefaultQuestions(eventId, newEvent.accommodationEnabled);
    } else {
      events = events.map(e => (e.id === eventId ? newEvent : e));
    }

    this.saveToStorage({ ...this.data, events });
    return newEvent;
  }

  public deleteEvent(eventId: string): void {
    const events = this.data.events.filter(e => e.id !== eventId);
    const registrations = this.data.registrations.filter(r => r.eventId !== eventId);
    const questions = this.data.questions.filter(q => q.eventId !== eventId);
    const rooms = this.data.rooms.filter(rm => rm.eventId !== eventId);

    this.saveToStorage({ ...this.data, events, registrations, questions, rooms });
  }

  // --- QUESTIONS ---
  public getQuestionsForEvent(eventId: string): RegistrationQuestion[] {
    return this.data.questions
      .filter(q => q.eventId === eventId)
      .sort((a, b) => a.position - b.position);
  }

  public saveQuestionsForEvent(eventId: string, questions: RegistrationQuestion[]): void {
    const otherQuestions = this.data.questions.filter(q => q.eventId !== eventId);
    this.saveToStorage({ ...this.data, questions: [...otherQuestions, ...questions] });
  }

  public ensureDefaultQuestions(eventId: string, accommodationEnabled: boolean): void {
    const existing = this.getQuestionsForEvent(eventId);
    if (existing.length > 0) {
      // Update system question for accommodation if needed
      let updated = [...existing];
      const hasAccom = updated.some(q => q.id === `sys-accom-${eventId}`);
      if (accommodationEnabled && !hasAccom) {
        updated.push({
          id: `sys-accom-${eventId}`,
          eventId,
          label: 'Do you need accommodation?',
          type: 'multiple_choice',
          required: true,
          options: ['Yes', 'No'],
          position: updated.length + 1,
          isSystemQuestion: true,
        });
      }
      this.saveQuestionsForEvent(eventId, updated);
      return;
    }

    const defaultQuestions: RegistrationQuestion[] = [
      { id: `sys-name-${eventId}`, eventId, label: 'Full Name', type: 'short_text', required: true, position: 1, isSystemQuestion: true },
      { id: `sys-email-${eventId}`, eventId, label: 'Email Address', type: 'email', required: true, position: 2, isSystemQuestion: true },
      { id: `sys-phone-${eventId}`, eventId, label: 'Phone Number', type: 'phone', required: true, position: 3, isSystemQuestion: true },
      { id: `sys-gender-${eventId}`, eventId, label: 'Gender', type: 'dropdown', required: true, options: ['Male', 'Female', 'Other', 'Prefer not to say'], position: 4, isSystemQuestion: true },
    ];

    if (accommodationEnabled) {
      defaultQuestions.push({
        id: `sys-accom-${eventId}`,
        eventId,
        label: 'Do you need accommodation?',
        type: 'multiple_choice',
        required: true,
        options: ['Yes', 'No'],
        position: 5,
        isSystemQuestion: true,
      });
    }

    this.saveQuestionsForEvent(eventId, defaultQuestions);
  }

  // --- PARTICIPANTS & REGISTRATIONS ---
  public getParticipants(): Participant[] {
    return this.data.participants;
  }

  public getRegistrations(): Registration[] {
    return this.data.registrations;
  }

  public registerParticipant(
    eventId: string,
    participantData: { fullName: string; email: string; phone: string; gender: string; organization?: string; jobTitle?: string },
    responses: Record<string, string | string[]>,
    accommodationRequired: boolean = false
  ): { registration: Registration; participant: Participant; isDuplicate: boolean; isWaitlisted: boolean; waitlistPosition?: number } {
    const normalizedEmail = participantData.email.trim().toLowerCase();
    const normalizedPhone = participantData.phone.trim();

    // Check Duplicate Registration per Event
    const existingRegistrationsForEvent = this.data.registrations.filter(r => r.eventId === eventId && r.status !== 'Cancelled');
    const existingParticipants = this.data.participants;

    const duplicateParticipant = existingParticipants.find(
      p => p.email.toLowerCase() === normalizedEmail || (normalizedPhone && p.phone === normalizedPhone)
    );

    if (duplicateParticipant) {
      const isAlreadyRegistered = existingRegistrationsForEvent.some(r => r.participantId === duplicateParticipant.id);
      if (isAlreadyRegistered) {
        const existingReg = existingRegistrationsForEvent.find(r => r.participantId === duplicateParticipant.id)!;
        return {
          registration: existingReg,
          participant: duplicateParticipant,
          isDuplicate: true,
          isWaitlisted: existingReg.status === 'Waitlisted',
          waitlistPosition: existingReg.waitlistPosition,
        };
      }
    }

    // Save or update participant profile
    let participant: Participant;
    if (duplicateParticipant) {
      participant = duplicateParticipant;
    } else {
      participant = {
        id: `prt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fullName: participantData.fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        gender: (participantData.gender as any) || 'Prefer not to say',
        organization: participantData.organization,
        jobTitle: participantData.jobTitle,
        createdAt: new Date().toISOString(),
      };
      this.data.participants.unshift(participant);
    }

    // Check Capacity & Waitlist Logic
    const event = this.data.events.find(e => e.id === eventId);
    let status: Registration['status'] = 'Confirmed';
    let waitlistPosition: number | undefined = undefined;

    if (event?.capacity) {
      const confirmedCount = existingRegistrationsForEvent.filter(r => r.status === 'Confirmed').length;
      if (confirmedCount >= event.capacity) {
        status = 'Waitlisted';
        const currentWaitlistedCount = existingRegistrationsForEvent.filter(r => r.status === 'Waitlisted').length;
        waitlistPosition = currentWaitlistedCount + 1;
      }
    }

    const regId = `reg-${eventId.replace('evt-', '')}-${Date.now().toString().slice(-4)}`;
    const qrIdentifier = `QR-PIMS-${eventId.toUpperCase()}-${participant.id.toUpperCase()}-${regId.toUpperCase()}`;

    const newRegistration: Registration = {
      id: regId,
      eventId,
      participantId: participant.id,
      status,
      registrationDate: new Date().toISOString(),
      checkInStatus: 'Not Checked In',
      waitlistPosition,
      qrIdentifier,
      accommodationRequired,
      responses,
    };

    // Instant Room Assignment on Registration
    if (status === 'Confirmed' && accommodationRequired) {
      const eventRooms = this.data.rooms.filter(r => r.eventId === eventId);
      for (const room of eventRooms) {
        if (room.assignedParticipantIds.length < room.capacity) {
          const currentOccupants = room.assignedParticipantIds
            .map(id => this.data.participants.find(p => p.id === id))
            .filter(Boolean);

          const hasFemale = currentOccupants.some(p => p?.gender === 'Female');
          const hasMale = currentOccupants.some(p => p?.gender === 'Male');
          const pGender = participant.gender;

          if (pGender === 'Female' && (room.genderGroup === 'Female' || room.genderGroup === 'Mixed' || room.assignedParticipantIds.length === 0)) {
            if (!hasMale) {
              if (room.assignedParticipantIds.length === 0 && room.genderGroup !== 'Mixed') room.genderGroup = 'Female';
              room.assignedParticipantIds.push(participant.id);
              newRegistration.roomAssignmentId = room.id;
              break;
            }
          } else if (pGender === 'Male' && (room.genderGroup === 'Male' || room.genderGroup === 'Mixed' || room.assignedParticipantIds.length === 0)) {
            if (!hasFemale) {
              if (room.assignedParticipantIds.length === 0 && room.genderGroup !== 'Mixed') room.genderGroup = 'Male';
              room.assignedParticipantIds.push(participant.id);
              newRegistration.roomAssignmentId = room.id;
              break;
            }
          } else if (room.genderGroup === 'Mixed') {
            room.assignedParticipantIds.push(participant.id);
            newRegistration.roomAssignmentId = room.id;
            break;
          }
        }
      }
    }

    this.data.registrations.unshift(newRegistration);

    // Save Communication Log
    this.data.logs.unshift({
      id: `log-${Date.now()}`,
      eventId,
      participantId: participant.id,
      participantName: participant.fullName,
      participantEmail: participant.email,
      type: status === 'Waitlisted' ? 'Reminder' : 'Confirmation',
      channel: 'Email',
      sentAt: new Date().toISOString(),
      status: 'Simulated',
      subject: status === 'Waitlisted'
        ? `Waitlist Confirmation #${waitlistPosition}: ${event?.name}`
        : `Registration Confirmed: ${event?.name}`,
      content: status === 'Waitlisted'
        ? `You have been added to the waitlist at position #${waitlistPosition}.`
        : `Your registration is confirmed! Unique Badge ID: ${regId}`,
    });

    this.saveToStorage(this.data);

    return {
      registration: newRegistration,
      participant,
      isDuplicate: false,
      isWaitlisted: status === 'Waitlisted',
      waitlistPosition,
    };
  }

  public updateCheckInStatus(registrationId: string, checkIn: boolean): { success: boolean; registration?: Registration; message: string } {
    const regIndex = this.data.registrations.findIndex(r => r.id === registrationId);
    if (regIndex === -1) {
      return { success: false, message: 'Registration record not found.' };
    }

    const reg = this.data.registrations[regIndex];
    if (reg.status === 'Cancelled') {
      return { success: false, message: 'Cannot check in a cancelled registration.' };
    }
    if (reg.status === 'Waitlisted') {
      return { success: false, message: 'Participant is currently on the waitlist.' };
    }

    const newCheckInStatus: Registration['checkInStatus'] = checkIn ? 'Checked In' : 'Not Checked In';
    const checkInTimestamp = checkIn ? new Date().toISOString() : undefined;

    const updatedReg = {
      ...reg,
      checkInStatus: newCheckInStatus,
      checkInTimestamp,
    };

    this.data.registrations[regIndex] = updatedReg;
    this.saveToStorage(this.data);

    return {
      success: true,
      registration: updatedReg,
      message: checkIn ? 'Participant successfully checked in!' : 'Check-in status removed.',
    };
  }

  // --- AUTOMATIC WAITLIST PROMOTION ---
  public cancelRegistration(registrationId: string): { cancelledReg: Registration; promotedReg?: Registration } {
    const regIndex = this.data.registrations.findIndex(r => r.id === registrationId);
    if (regIndex === -1) throw new Error('Registration not found');

    const targetReg = this.data.registrations[regIndex];
    const eventId = targetReg.eventId;

    // Update status to Cancelled
    this.data.registrations[regIndex] = {
      ...targetReg,
      status: 'Cancelled',
      checkInStatus: 'Not Checked In',
    };

    // Remove from accommodation room if assigned
    if (targetReg.roomAssignmentId) {
      this.removeParticipantFromRoom(targetReg.roomAssignmentId, targetReg.participantId);
    }

    let promotedReg: Registration | undefined = undefined;

    // If the cancelled registration was 'Confirmed', promote the top waitlisted participant!
    if (targetReg.status === 'Confirmed') {
      const waitlisted = this.data.registrations
        .filter(r => r.eventId === eventId && r.status === 'Waitlisted')
        .sort((a, b) => (a.waitlistPosition || 999) - (b.waitlistPosition || 999));

      if (waitlisted.length > 0) {
        const topWaitlisted = waitlisted[0];
        const promotedIndex = this.data.registrations.findIndex(r => r.id === topWaitlisted.id);

        promotedReg = {
          ...topWaitlisted,
          status: 'Confirmed',
          waitlistPosition: undefined,
        };

        this.data.registrations[promotedIndex] = promotedReg;

        // Re-calculate remaining waitlist positions
        let pos = 1;
        this.data.registrations.forEach((r, idx) => {
          if (r.eventId === eventId && r.status === 'Waitlisted' && r.id !== topWaitlisted.id) {
            this.data.registrations[idx].waitlistPosition = pos++;
          }
        });

        // Add Log for Promoted Participant
        const participant = this.data.participants.find(p => p.id === promotedReg!.participantId);
        const event = this.data.events.find(e => e.id === eventId);
        if (participant && event) {
          this.data.logs.unshift({
            id: `log-${Date.now()}`,
            eventId,
            participantId: participant.id,
            participantName: participant.fullName,
            participantEmail: participant.email,
            type: 'Confirmation',
            channel: 'Email',
            sentAt: new Date().toISOString(),
            status: 'Simulated',
            subject: `Waitlist Promotion! You are confirmed for ${event.name}`,
            content: `A spot has opened up and your registration is now confirmed!`,
          });
        }
      }
    }

    this.saveToStorage(this.data);
    return { cancelledReg: this.data.registrations[regIndex], promotedReg };
  }

  // --- ACCOMMODATION ROOMS ---
  public getRoomsForEvent(eventId: string): AccommodationRoom[] {
    return this.data.rooms.filter(r => r.eventId === eventId);
  }

  public saveRoom(room: Partial<AccommodationRoom> & { eventId: string; roomNumber: string; capacity: number }): AccommodationRoom {
    const isNew = !room.id;
    const roomId = room.id || `room-${Date.now()}-${Math.floor(Math.random() * 100)}`;

    const newRoom: AccommodationRoom = {
      id: roomId,
      eventId: room.eventId,
      roomNumber: room.roomNumber,
      capacity: room.capacity || 1,
      genderGroup: room.genderGroup || 'Mixed',
      assignedParticipantIds: room.assignedParticipantIds || [],
    };

    let rooms = [...this.data.rooms];
    if (isNew) {
      rooms.push(newRoom);
    } else {
      rooms = rooms.map(r => (r.id === roomId ? newRoom : r));
    }

    this.saveToStorage({ ...this.data, rooms });
    return newRoom;
  }

  public importRooms(eventId: string, roomItems: Array<{ roomNumber: string; capacity: number; genderGroup?: 'Male' | 'Female' | 'Mixed' }>): AccommodationRoom[] {
    const created: AccommodationRoom[] = roomItems.map((item, idx) => ({
      id: `room-${Date.now()}-${idx}`,
      eventId,
      roomNumber: item.roomNumber,
      capacity: item.capacity || 1,
      genderGroup: item.genderGroup || 'Mixed',
      assignedParticipantIds: [],
    }));

    const rooms = [...this.data.rooms, ...created];
    this.saveToStorage({ ...this.data, rooms });
    return created;
  }

  public assignParticipantToRoom(roomId: string, participantId: string): boolean {
    const roomIndex = this.data.rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return false;

    const room = this.data.rooms[roomIndex];
    if (room.assignedParticipantIds.includes(participantId)) return true;
    if (room.assignedParticipantIds.length >= room.capacity) return false;

    const participant = this.data.participants.find(p => p.id === participantId);
    if (!participant) return false;

    // Strict Gender Check: Enforce zero co-ed / no mix genders in a room
    const currentOccupants = room.assignedParticipantIds
      .map(id => this.data.participants.find(p => p.id === id))
      .filter(Boolean);

    const hasFemale = currentOccupants.some(p => p?.gender === 'Female');
    const hasMale = currentOccupants.some(p => p?.gender === 'Male');

    if (participant.gender === 'Female' && hasMale) {
      return false;
    }
    if (participant.gender === 'Male' && hasFemale) {
      return false;
    }

    // Remove participant from any existing room for this event
    this.data.rooms.forEach((r, idx) => {
      if (r.eventId === room.eventId && r.assignedParticipantIds.includes(participantId)) {
        this.data.rooms[idx].assignedParticipantIds = r.assignedParticipantIds.filter(id => id !== participantId);
      }
    });

    // If room is empty, lock room genderGroup to participant's gender
    if (room.assignedParticipantIds.length === 0 && (participant.gender === 'Female' || participant.gender === 'Male')) {
      this.data.rooms[roomIndex].genderGroup = participant.gender;
    }

    // Assign to new room
    this.data.rooms[roomIndex].assignedParticipantIds.push(participantId);

    // Update registration roomAssignmentId
    const regIndex = this.data.registrations.findIndex(r => r.eventId === room.eventId && r.participantId === participantId);
    if (regIndex !== -1) {
      this.data.registrations[regIndex].roomAssignmentId = roomId;
    }

    this.saveToStorage(this.data);
    return true;
  }

  public removeParticipantFromRoom(roomId: string, participantId: string): void {
    const roomIndex = this.data.rooms.findIndex(r => r.id === roomId);
    if (roomIndex !== -1) {
      this.data.rooms[roomIndex].assignedParticipantIds = this.data.rooms[roomIndex].assignedParticipantIds.filter(id => id !== participantId);
    }

    const regIndex = this.data.registrations.findIndex(r => r.roomAssignmentId === roomId && r.participantId === participantId);
    if (regIndex !== -1) {
      this.data.registrations[regIndex].roomAssignmentId = undefined;
    }

    this.saveToStorage(this.data);
  }

  // --- SMART ROOM ASSIGNMENT ALGORITHM WITH INSTITUTION & GENDER GROUPING ---
  public runSmartRoomAssignment(eventId: string): { assignedCount: number; unassignedCount: number; matchedInstitutionsCount: number } {
    const rooms = this.data.rooms.filter(r => r.eventId === eventId);
    const registrations = this.data.registrations.filter(
      r => r.eventId === eventId && r.status === 'Confirmed' && r.accommodationRequired
    );

    if (rooms.length === 0 || registrations.length === 0) {
      return { assignedCount: 0, unassignedCount: registrations.length, matchedInstitutionsCount: 0 };
    }

    // Reset existing assignments for a clean, optimal calculation pass
    rooms.forEach(r => {
      r.assignedParticipantIds = [];
    });
    registrations.forEach(r => {
      r.roomAssignmentId = undefined;
    });

    const participantMap = new Map(this.data.participants.map(p => [p.id, p]));

    // Helper to extract institution/school name for a participant
    const getInstitutionKey = (reg: Registration): string => {
      const p = participantMap.get(reg.participantId);
      if (p?.organization && p.organization.trim()) {
        return p.organization.trim().toLowerCase();
      }
      for (const [key, val] of Object.entries(reg.responses)) {
        if (typeof val === 'string' && val.trim()) {
          const q = this.data.questions.find(quest => quest.id === key);
          if (q && /organization|institution|school|university|company|college/i.test(q.label)) {
            return val.trim().toLowerCase();
          }
        }
      }
      return 'unaffiliated';
    };

    // Helper: Group list of registrations so delegates from the same institution are contiguous
    const groupByInstitution = (regs: Registration[]): Registration[] => {
      const instGroups = new Map<string, Registration[]>();
      regs.forEach(r => {
        const inst = getInstitutionKey(r);
        if (!instGroups.has(inst)) instGroups.set(inst, []);
        instGroups.get(inst)!.push(r);
      });

      // Sort institutions by cohort size descending (largest school/institution groups first)
      const sortedEntries = Array.from(instGroups.entries()).sort((a, b) => {
        if (a[0] === 'unaffiliated') return 1;
        if (b[0] === 'unaffiliated') return -1;
        return b[1].length - a[1].length;
      });

      return sortedEntries.flatMap(([, regList]) => regList);
    };

    // Categorize delegates by gender and group by institution
    const femaleRegs = groupByInstitution(registrations.filter(r => {
      const p = participantMap.get(r.participantId);
      return p?.gender === 'Female';
    }));

    const maleRegs = groupByInstitution(registrations.filter(r => {
      const p = participantMap.get(r.participantId);
      return p?.gender === 'Male';
    }));

    const otherRegs = groupByInstitution(registrations.filter(r => {
      const p = participantMap.get(r.participantId);
      return p?.gender !== 'Female' && p?.gender !== 'Male';
    }));

    // Helper to attempt room placement, prioritizing rooms that ALREADY contain delegates from the SAME institution
    const placeParticipantWithInstitutionalPreference = (
      reg: Registration,
      candidateRooms: AccommodationRoom[],
      targetGender: 'Female' | 'Male' | 'Mixed'
    ): boolean => {
      const regInst = getInstitutionKey(reg);

      // Sort candidate rooms so rooms ALREADY occupied by peers from the SAME institution come FIRST!
      const sortedRooms = [...candidateRooms].sort((roomA, roomB) => {
        const instMatchA = regInst !== 'unaffiliated' && roomA.assignedParticipantIds.some(id => {
          const p = participantMap.get(id);
          return p?.organization?.trim().toLowerCase() === regInst;
        }) ? 1 : 0;

        const instMatchB = regInst !== 'unaffiliated' && roomB.assignedParticipantIds.some(id => {
          const p = participantMap.get(id);
          return p?.organization?.trim().toLowerCase() === regInst;
        }) ? 1 : 0;

        return instMatchB - instMatchA; // Higher institution match priority first
      });

      for (const room of sortedRooms) {
        if (room.assignedParticipantIds.length < room.capacity) {
          const currentOccupants = room.assignedParticipantIds
            .map(id => participantMap.get(id))
            .filter(Boolean);

          const hasFemale = currentOccupants.some(p => p?.gender === 'Female');
          const hasMale = currentOccupants.some(p => p?.gender === 'Male');

          if (targetGender === 'Female') {
            if (!hasMale && (room.genderGroup === 'Female' || room.assignedParticipantIds.length === 0)) {
              if (room.assignedParticipantIds.length === 0) {
                room.genderGroup = 'Female';
              }
              room.assignedParticipantIds.push(reg.participantId);
              reg.roomAssignmentId = room.id;
              return true;
            }
          } else if (targetGender === 'Male') {
            if (!hasFemale && (room.genderGroup === 'Male' || room.assignedParticipantIds.length === 0)) {
              if (room.assignedParticipantIds.length === 0) {
                room.genderGroup = 'Male';
              }
              room.assignedParticipantIds.push(reg.participantId);
              reg.roomAssignmentId = room.id;
              return true;
            }
          } else {
            // For flexible gender, do not mix with opposite genders if occupants exist
            if ((!hasFemale || !hasMale) && (room.genderGroup === 'Mixed' || room.assignedParticipantIds.length === 0)) {
              room.assignedParticipantIds.push(reg.participantId);
              reg.roomAssignmentId = room.id;
              return true;
            }
          }
        }
      }
      return false;
    };

    // 1. Assign Female Delegates (Grouped by Institution)
    for (const reg of femaleRegs) {
      const femaleRooms = rooms.filter(r => r.genderGroup === 'Female');
      const mixedRooms = rooms.filter(r => r.genderGroup === 'Mixed');
      const emptyRooms = rooms.filter(r => r.assignedParticipantIds.length === 0);

      placeParticipantWithInstitutionalPreference(reg, femaleRooms, 'Female') ||
        placeParticipantWithInstitutionalPreference(reg, mixedRooms, 'Female') ||
        placeParticipantWithInstitutionalPreference(reg, emptyRooms, 'Female');
    }

    // 2. Assign Male Delegates (Grouped by Institution)
    for (const reg of maleRegs) {
      const maleRooms = rooms.filter(r => r.genderGroup === 'Male');
      const mixedRooms = rooms.filter(r => r.genderGroup === 'Mixed');
      const emptyRooms = rooms.filter(r => r.assignedParticipantIds.length === 0);

      placeParticipantWithInstitutionalPreference(reg, maleRooms, 'Male') ||
        placeParticipantWithInstitutionalPreference(reg, mixedRooms, 'Male') ||
        placeParticipantWithInstitutionalPreference(reg, emptyRooms, 'Male');
    }

    // 3. Assign Other/Flexible Delegates
    for (const reg of otherRegs) {
      const mixedRooms = rooms.filter(r => r.genderGroup === 'Mixed');
      const availableRooms = rooms.filter(r => r.assignedParticipantIds.length < r.capacity);

      placeParticipantWithInstitutionalPreference(reg, mixedRooms, 'Mixed') ||
        placeParticipantWithInstitutionalPreference(reg, availableRooms, 'Mixed');
    }

    // Save updated state to localStorage
    this.saveToStorage(this.data);

    const assignedCount = registrations.filter(r => !!r.roomAssignmentId).length;
    const unassignedCount = registrations.length - assignedCount;

    // Count rooms with institution peer pairings
    let matchedInstitutionsCount = 0;
    rooms.forEach(r => {
      const insts = r.assignedParticipantIds
        .map(id => participantMap.get(id)?.organization?.trim().toLowerCase())
        .filter(Boolean);
      const uniqueInsts = new Set(insts);
      if (insts.length > 1 && uniqueInsts.size === 1 && !uniqueInsts.has('unaffiliated')) {
        matchedInstitutionsCount++;
      }
    });

    return { assignedCount, unassignedCount, matchedInstitutionsCount };
  }

  // --- LOGS & COMMUNICATIONS ---
  public getLogs(eventId?: string): CommunicationLog[] {
    if (eventId) {
      return this.data.logs.filter(l => l.eventId === eventId);
    }
    return this.data.logs;
  }

  public addLog(log: Omit<CommunicationLog, 'id' | 'sentAt'>): CommunicationLog {
    const newLog: CommunicationLog = {
      ...log,
      id: `log-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
    this.data.logs.unshift(newLog);
    this.saveToStorage(this.data);
    return newLog;
  }
}

export const db = new StorageService();

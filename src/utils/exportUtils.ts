import type { DatabaseSchema } from '../services/db';
import type { Participant, Registration } from '../types';

export interface ParticipantExportRow {
  participantId: string;
  fullName: string;
  designatedTitle: string;
  email: string;
  phone: string;
  gender: string;
  organization: string;
  jobTitle: string;
  eventId: string;
  eventName: string;
  registrationStatus: string;
  checkInStatus: string;
  checkInTimestamp: string;
  accommodationRequired: string;
  assignedRoomNumber: string;
  qrIdentifier: string;
}

/**
 * Resolves the designated title/role for a participant based on registration,
 * participant profile, user team roles, or job title indications.
 */
export const resolveParticipantTitle = (
  p: Participant,
  reg?: Registration,
  users?: DatabaseSchema['users']
): string => {
  if (reg?.badgeType) return reg.badgeType;
  if (p.badgeType) return p.badgeType;

  // Check if participant is a user with a coordinator or staff role
  if (users && p.email) {
    const userMatch = users.find(u => u.email.toLowerCase() === p.email.toLowerCase());
    if (userMatch) {
      if (userMatch.role === 'EVENT_COORDINATOR') return 'Coordinator';
      if (userMatch.role === 'CHECKIN_STAFF' || userMatch.role === 'ADMIN') return 'Staff';
    }
  }

  // Infer from job title keywords if present
  if (p.jobTitle) {
    const jt = p.jobTitle.toLowerCase();
    if (jt.includes('coordinator')) return 'Coordinator';
    if (jt.includes('contestant') || jt.includes('competitor')) return 'Contestant';
    if (jt.includes('volunteer')) return 'Volunteer';
    if (jt.includes('speaker') || jt.includes('panelist') || jt.includes('keynote')) return 'Speaker';
    if (jt.includes('staff') || jt.includes('organizer') || jt.includes('admin')) return 'Staff';
  }

  return 'Delegate';
};

export const generateParticipantExportData = (
  data: DatabaseSchema,
  targetEventId: string = 'all',
  filteredParticipants?: Participant[],
  titleFilter: string = 'all',
  checkInStatusFilter: string = 'all'
): ParticipantExportRow[] => {
  const participantsToExport = filteredParticipants || data.participants;
  const rows: ParticipantExportRow[] = [];

  participantsToExport.forEach(p => {
    const pRegs = data.registrations.filter(r => r.participantId === p.id);
    
    // Filter registrations by event if targetEventId is not 'all'
    const matchingRegs = targetEventId === 'all'
      ? pRegs
      : pRegs.filter(r => r.eventId === targetEventId);

    if (matchingRegs.length > 0) {
      matchingRegs.forEach(reg => {
        const title = resolveParticipantTitle(p, reg, data.users);

        // Filter by designated title
        if (titleFilter !== 'all' && title.toLowerCase() !== titleFilter.toLowerCase()) {
          return;
        }

        // Filter by check-in / attendance status
        if (checkInStatusFilter !== 'all' && reg.checkInStatus !== checkInStatusFilter) {
          return;
        }

        const event = data.events.find(e => e.id === reg.eventId);
        const room = data.rooms.find(rm => rm.id === reg.roomAssignmentId);

        rows.push({
          participantId: p.id,
          fullName: p.fullName,
          designatedTitle: title,
          email: p.email,
          phone: p.phone || '',
          gender: p.gender || '',
          organization: p.organization || '',
          jobTitle: p.jobTitle || '',
          eventId: reg.eventId,
          eventName: event?.name || reg.eventId,
          registrationStatus: reg.status,
          checkInStatus: reg.checkInStatus,
          checkInTimestamp: reg.checkInTimestamp ? new Date(reg.checkInTimestamp).toLocaleString() : '',
          accommodationRequired: reg.accommodationRequired ? 'Yes' : 'No',
          assignedRoomNumber: room?.roomNumber || '',
          qrIdentifier: reg.qrIdentifier || '',
        });
      });
    } else if (targetEventId === 'all') {
      const title = resolveParticipantTitle(p, undefined, data.users);

      if (titleFilter !== 'all' && title.toLowerCase() !== titleFilter.toLowerCase()) {
        return;
      }

      if (checkInStatusFilter !== 'all') {
        return;
      }

      rows.push({
        participantId: p.id,
        fullName: p.fullName,
        designatedTitle: title,
        email: p.email,
        phone: p.phone || '',
        gender: p.gender || '',
        organization: p.organization || '',
        jobTitle: p.jobTitle || '',
        eventId: 'N/A',
        eventName: 'Unregistered',
        registrationStatus: 'None',
        checkInStatus: 'N/A',
        checkInTimestamp: '',
        accommodationRequired: 'No',
        assignedRoomNumber: '',
        qrIdentifier: '',
      });
    }
  });

  return rows;
};

export const exportParticipantsCSV = (
  data: DatabaseSchema,
  targetEventId: string = 'all',
  filteredParticipants?: Participant[],
  customFilename?: string,
  titleFilter: string = 'all',
  checkInStatusFilter: string = 'all'
) => {
  const rows = generateParticipantExportData(data, targetEventId, filteredParticipants, titleFilter, checkInStatusFilter);

  if (rows.length === 0) {
    alert(`No participants found matching the selected export filters (Title: ${titleFilter}, Event: ${targetEventId === 'all' ? 'All' : targetEventId}).`);
    return;
  }

  const headers = [
    'Participant ID',
    'Full Name',
    'Designated Title / Role',
    'Email Address',
    'Phone Number',
    'Gender',
    'Organization',
    'Job Title',
    'Event ID',
    'Event Name',
    'Registration Status',
    'Check-In Status',
    'Check-In Timestamp',
    'Accommodation Required',
    'Room Number',
    'QR Code Pass ID'
  ];

  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  rows.forEach(row => {
    const values = [
      `"${row.participantId.replace(/"/g, '""')}"`,
      `"${row.fullName.replace(/"/g, '""')}"`,
      `"${row.designatedTitle.replace(/"/g, '""')}"`,
      `"${row.email.replace(/"/g, '""')}"`,
      `"${row.phone.replace(/"/g, '""')}"`,
      `"${row.gender.replace(/"/g, '""')}"`,
      `"${row.organization.replace(/"/g, '""')}"`,
      `"${row.jobTitle.replace(/"/g, '""')}"`,
      `"${row.eventId.replace(/"/g, '""')}"`,
      `"${row.eventName.replace(/"/g, '""')}"`,
      `"${row.registrationStatus.replace(/"/g, '""')}"`,
      `"${row.checkInStatus.replace(/"/g, '""')}"`,
      `"${row.checkInTimestamp.replace(/"/g, '""')}"`,
      `"${row.accommodationRequired.replace(/"/g, '""')}"`,
      `"${row.assignedRoomNumber.replace(/"/g, '""')}"`,
      `"${row.qrIdentifier.replace(/"/g, '""')}"`
    ];
    csvRows.push(values.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const eventObj = targetEventId !== 'all' ? data.events.find(e => e.id === targetEventId) : null;
  const eventSanitized = eventObj ? eventObj.name.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Events';
  const titleSanitized = titleFilter !== 'all' ? `_${titleFilter}` : '';
  const fileName = customFilename || `PIMS_Participants_${eventSanitized}${titleSanitized}_${new Date().toISOString().split('T')[0]}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportParticipantsJSON = (
  data: DatabaseSchema,
  targetEventId: string = 'all',
  filteredParticipants?: Participant[],
  customFilename?: string,
  titleFilter: string = 'all',
  checkInStatusFilter: string = 'all'
) => {
  const rows = generateParticipantExportData(data, targetEventId, filteredParticipants, titleFilter, checkInStatusFilter);

  if (rows.length === 0) {
    alert(`No participants found matching the selected export filters (Title: ${titleFilter}, Event: ${targetEventId === 'all' ? 'All' : targetEventId}).`);
    return;
  }

  const jsonString = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const eventObj = targetEventId !== 'all' ? data.events.find(e => e.id === targetEventId) : null;
  const eventSanitized = eventObj ? eventObj.name.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Events';
  const titleSanitized = titleFilter !== 'all' ? `_${titleFilter}` : '';
  const fileName = customFilename || `PIMS_Participants_${eventSanitized}${titleSanitized}_${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

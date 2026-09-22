import type { User, Event } from '../types';
import { resetUserPassword } from './firebase';

export interface EmailDispatchResult {
  success: boolean;
  channel: 'mailto' | 'firebase_reset' | 'clipboard' | 'webhook';
  message: string;
}

export const PORTAL_PRODUCTION_URL = 'https://yinpims.vercel.app';

export const getPortalUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.includes('localhost') 
      ? PORTAL_PRODUCTION_URL 
      : window.location.origin;
  }
  return PORTAL_PRODUCTION_URL;
};

export const resolveEventNames = (assignedEvents: string[] | undefined, allEvents: Event[]): string => {
  if (!assignedEvents || assignedEvents.includes('*') || assignedEvents.length === 0) {
    return 'All Events (Global Operations)';
  }
  return assignedEvents
    .map(id => allEvents.find(e => e.id === id)?.name || id)
    .join(', ');
};

export const generateStaffInviteText = (
  user: User, 
  provisionalPassword: string, 
  events: Event[] = []
): { subject: string; body: string } => {
  const portalUrl = getPortalUrl();
  const assignedScope = resolveEventNames(user.assignedEvents, events);
  const subject = `Welcome to YIN-PIMS - Staff Portal Access Credentials for ${user.name}`;

  const body = `Dear ${user.name},
You have been granted official operational access to the Youth Impact Network Participant Information Management System (YIN-PIMS).

===================================================
YOUR ACCESS CREDENTIALS
===================================================
Portal URL:           ${portalUrl}
Login Email:          ${user.email}
Provisional Password: ${provisionalPassword}
System Role:          ${user.role}
Assigned Events:      ${assignedScope}
===================================================

GETTING STARTED IN 3 EASY STEPS:
1. Navigate to the portal: ${portalUrl}
2. Enter your login email and the provisional password shown above.
3. Upon first sign-in, you will be prompted to set your permanent private password.

SECURITY NOTICE:
Your provisional password is valid for first-time account initialization only. For security reasons, please do not share these credentials.

If you encounter any difficulty accessing the system, please contact your Super Administrator.

Best regards,
Youth Impact Network (YIN) Operations Team
YIN-PIMS Administration
`;

  return { subject, body };
};

export const dispatchViaMailto = (
  user: User, 
  provisionalPassword: string, 
  events: Event[] = []
): EmailDispatchResult => {
  try {
    const { subject, body } = generateStaffInviteText(user, provisionalPassword, events);
    const mailtoUrl = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return {
      success: true,
      channel: 'mailto',
      message: `Email client opened with credentials for ${user.email}`,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: 'mailto',
      message: err?.message || 'Failed to trigger email client',
    };
  }
};

export const dispatchFirebasePasswordSetup = async (email: string): Promise<EmailDispatchResult> => {
  try {
    await resetUserPassword(email.trim().toLowerCase());
    return {
      success: true,
      channel: 'firebase_reset',
      message: `Official Firebase password setup email dispatched to ${email}`,
    };
  } catch (err: any) {
    return {
      success: false,
      channel: 'firebase_reset',
      message: err?.message || 'Failed to dispatch Firebase password setup email',
    };
  }
};

export const copyInviteToClipboard = async (
  user: User, 
  provisionalPassword: string, 
  events: Event[] = []
): Promise<EmailDispatchResult> => {
  try {
    const { subject, body } = generateStaffInviteText(user, provisionalPassword, events);
    const fullText = `Subject: ${subject}\n\n:${body}`;
    await navigator.clipboard.writeText(fullText);
    return {
      success: true,
      channel: 'clipboard',
      message: 'Invitation and credentials copied to clipboard!',
    };
  } catch (err: any) {
    return {
      success: false,
      channel: 'clipboard',
      message: err?.message || 'Failed to copy to clipboard',
    };
  }
};

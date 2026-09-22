import type { Registration, Participant, Event } from '../types';

/**
 * QR Code & Event Pass Utilities for YIN-PIMS
 */

export interface PassPayload {
  rId: string;       // Registration ID
  pId: string;       // Participant ID
  eId: string;       // Event ID
  fn: string;        // Full Name
  org?: string;      // Organization / Institution / School
  bt: string;        // Badge Type (Delegate, Speaker, etc.)
  st?: string;       // Registration Status (Confirmed, etc.)
  ci?: boolean;      // Check-in status
  eNm?: string;      // Event Name
}

/**
 * Encodes attendee details into a compact, URL-safe base64 string
 * that guarantees the pass can be rendered instantly even on cold or offline devices.
 */
export const encodePassPayload = (payload: PassPayload): string => {
  try {
    const json = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return encodeURIComponent(encoded);
  } catch (e) {
    console.warn('Failed to encode pass payload:', e);
    return '';
  }
};

/**
 * Decodes the optional URL payload into PassPayload
 */
export const decodePassPayload = (rawPayload: string): PassPayload | null => {
  if (!rawPayload) return null;
  try {
    const clean = decodeURIComponent(rawPayload.trim());
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(clean), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(decoded) as PassPayload;
  } catch {
    try {
      return JSON.parse(atob(decodeURIComponent(rawPayload.trim()))) as PassPayload;
    } catch {
      return null;
    }
  }
};

/**
 * Generate a universally functional public verification URL for a pass QR code.
 * Using query parameter format `/?pass=...` guarantees compatibility across all
 * static hosting platforms (Vercel, Netlify, Firebase, GitHub Pages) without 404 rewrite issues.
 * Optionally includes compact encoded attendee payload so any device scanning will instantly
 * display the verified pass without depending solely on remote database connectivity.
 */
export const getPassUrl = (
  qrIdentifier: string,
  extraPayload?: {
    registration?: Registration;
    participant?: Participant;
    event?: Event | null;
  }
): string => {
  if (!qrIdentifier) return '';
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://yinpims.vercel.app';

  let url = `${origin}/?pass=${encodeURIComponent(qrIdentifier.trim())}`;

  if (extraPayload?.registration && extraPayload?.participant) {
    const { registration, participant, event } = extraPayload;
    const payload: PassPayload = {
      rId: registration.id,
      pId: participant.id,
      eId: registration.eventId,
      fn: participant.fullName,
      org: participant.organization,
      bt: registration.badgeType || participant.badgeType || 'Delegate',
      st: registration.status,
      ci: registration.checkInStatus === 'Checked In',
      eNm: event?.name,
    };
    const encoded = encodePassPayload(payload);
    if (encoded) {
      url += `&d=${encoded}`;
    }
  }

  return url;
};

/**
 * Extract pass payload from any URL or string if present (&d=... or ?d=...)
 */
export const extractPayloadFromUrl = (raw: string): PassPayload | null => {
  if (!raw) return null;
  try {
    const match = raw.match(/[?&]d=([^&#]+)/i);
    if (match && match[1]) {
      return decodePassPayload(match[1]);
    }
    if (raw.includes('#')) {
      const hashPart = raw.split('#')[1] || '';
      const hashMatch = hashPart.match(/[?&]d=([^&#]+)/i);
      if (hashMatch && hashMatch[1]) {
        return decodePassPayload(hashMatch[1]);
      }
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Robustly extract a pass identifier or registration ID from arbitrary scanner inputs:
 * Handles:
 *  - Full URLs: `https://yinpims.vercel.app/?pass=QR-PIMS-EVT-001...`
 *  - Hash-based URLs: `https://yinpims.vercel.app/#/?pass=QR-PIMS-EVT-001...`
 *  - Query strings: `?pass=QR-PIMS...` or `&pass=...` or `?badge=...`
 *  - Path-based URLs: `https://yinpims.vercel.app/pass/QR-PIMS...` or `/badge/QR-PIMS...`
 *  - Raw QR strings: `QR-PIMS-EVT-001-PRT-001-REG-001`
 *  - Raw Registration IDs: `REG-001`
 */
export const extractPassIdentifier = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();

  // 1. Check URL query parameters in search or hash
  if (trimmed.includes('pass=') || trimmed.includes('badge=') || trimmed.includes('qr=') || trimmed.includes('id=')) {
    try {
      // First check standard URL searchParams
      const dummyUrl = trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed.startsWith('?') || trimmed.startsWith('/') ? trimmed : '?' + trimmed}`;
      const parsed = new URL(dummyUrl);
      const val = parsed.searchParams.get('pass') ||
                  parsed.searchParams.get('badge') ||
                  parsed.searchParams.get('qr') ||
                  parsed.searchParams.get('id');
      if (val) return decodeURIComponent(val).trim();

      // Check hash params if present
      if (parsed.hash && (parsed.hash.includes('pass=') || parsed.hash.includes('badge='))) {
        const hashQuery = parsed.hash.includes('?') ? parsed.hash.split('?')[1] : parsed.hash.replace(/^#\/?/, '');
        const hashParams = new URLSearchParams(hashQuery);
        const hashVal = hashParams.get('pass') || hashParams.get('badge') || hashParams.get('qr') || hashParams.get('id');
        if (hashVal) return decodeURIComponent(hashVal).trim();
      }
    } catch {
      // fallback regex
      const match = trimmed.match(/[?&](?:pass|badge|qr|id)=([^&#]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
  }

  // 2. Check URL paths like /badge/:id or /pass/:id
  const pathMatch = trimmed.match(/\/(?:badge|pass|verify)\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]).trim();
  }

  return trimmed;
};

/**
 * Detects pass parameters from the current browser location (search, hash, or pathname)
 */
export const detectPassUrlFromLocation = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;

    // 1. Check window.location.search
    const searchParams = new URLSearchParams(window.location.search);
    const passFromSearch = searchParams.get('pass') || searchParams.get('badge') || searchParams.get('qr') || searchParams.get('id');
    if (passFromSearch) return decodeURIComponent(passFromSearch).trim();

    // 2. Check window.location.hash
    if (window.location.hash) {
      const hashContent = window.location.hash.includes('?') 
        ? window.location.hash.split('?')[1] 
        : window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashContent);
      const passFromHash = hashParams.get('pass') || hashParams.get('badge') || hashParams.get('qr') || hashParams.get('id');
      if (passFromHash) return decodeURIComponent(passFromHash).trim();

      const hashMatch = window.location.hash.match(/\/(?:badge|pass|verify)\/([^/?#]+)/i);
      if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]).trim();
    }

    // 3. Check window.location.pathname
    const pathMatch = window.location.pathname.match(/\/(?:badge|pass|verify)\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) return decodeURIComponent(pathMatch[1]).trim();

    // 4. Try extractPassIdentifier on full href as ultimate fallback
    const extracted = extractPassIdentifier(window.location.href);
    if (extracted && extracted !== window.location.href && extracted.length > 3) {
      return extracted;
    }
  } catch (e) {
    console.warn('detectPassUrlFromLocation note:', e);
  }
  return null;
};

/**
 * Resiliently find a registration and participant across memory using any identifier:
 * exact qrIdentifier, registration ID, embedded tokens, participant ID, email, phone, or name.
 */
export const findRegistrationFromInput = (
  registrations: Registration[],
  participants: Participant[],
  input: string
): { registration: Registration; participant?: Participant } | null => {
  if (!input || !registrations || registrations.length === 0) return null;

  const raw = input.trim();
  const cleanId = extractPassIdentifier(raw).trim();
  const lowerClean = cleanId.toLowerCase();
  const lowerRaw = raw.toLowerCase();

  // Helper to find participant
  const resolveParticipant = (r: Registration): Participant | undefined => {
    return participants.find(p => (p.id || '').toLowerCase() === (r.participantId || '').toLowerCase());
  };

  // 1. Exact match on qrIdentifier or registration id
  for (const r of registrations) {
    const qId = (r.qrIdentifier || '').trim().toLowerCase();
    const rId = (r.id || '').trim().toLowerCase();
    if (
      (qId && (qId === lowerClean || qId === lowerRaw)) ||
      (rId && (rId === lowerClean || rId === lowerRaw))
    ) {
      return { registration: r, participant: resolveParticipant(r) };
    }
  }

  // 2. Extract embedded registration ID token (e.g. "reg-...")
  const regMatch = lowerClean.match(/reg-[a-z0-9-]+/i) || lowerRaw.match(/reg-[a-z0-9-]+/i);
  if (regMatch) {
    const extractedRegId = regMatch[0].toLowerCase();
    for (const r of registrations) {
      if ((r.id || '').toLowerCase() === extractedRegId) {
        return { registration: r, participant: resolveParticipant(r) };
      }
    }
  }

  // 3. Substring containment between cleanId and registration.id or qrIdentifier
  for (const r of registrations) {
    const qId = (r.qrIdentifier || '').toLowerCase();
    const rId = (r.id || '').toLowerCase();
    if (
      (rId && rId.length >= 4 && (lowerClean.includes(rId) || rId.includes(lowerClean))) ||
      (qId && qId.length >= 6 && (lowerClean.includes(qId) || qId.includes(lowerClean)))
    ) {
      return { registration: r, participant: resolveParticipant(r) };
    }
  }

  // 4. Match via Participant ID (e.g. "prt-...")
  const prtMatch = lowerClean.match(/prt-[a-z0-9-]+/i) || lowerRaw.match(/prt-[a-z0-9-]+/i);
  const targetPrtId = prtMatch ? prtMatch[0].toLowerCase() : (lowerClean.startsWith('prt-') ? lowerClean : null);
  if (targetPrtId) {
    for (const r of registrations) {
      if ((r.participantId || '').toLowerCase() === targetPrtId) {
        const p = participants.find(part => (part.id || '').toLowerCase() === targetPrtId);
        return { registration: r, participant: p };
      }
    }
  }

  // 5. Match via participant email, phone, or name
  for (const p of participants) {
    const pEmail = (p.email || '').toLowerCase().trim();
    const pPhone = (p.phone || '').replace(/\D/g, '');
    const cleanPhone = lowerClean.replace(/\D/g, '');
    const pName = (p.fullName || '').toLowerCase().trim();

    const matchesEmail = pEmail && (pEmail === lowerClean || lowerClean.includes(pEmail));
    const matchesPhone = pPhone && cleanPhone && cleanPhone.length >= 7 && (pPhone === cleanPhone || pPhone.includes(cleanPhone) || cleanPhone.includes(pPhone));
    const matchesName = pName && pName.length >= 4 && (pName === lowerClean || lowerClean.includes(pName));

    if (matchesEmail || matchesPhone || matchesName) {
      const r = registrations.find(reg => reg.participantId === p.id);
      if (r) {
        return { registration: r, participant: p };
      }
    }
  }

  return null;
};

/**
 * Play a crisp, pleasant two-tone check-in confirmation chime using Web Audio API.
 * Does not require external audio assets.
 */
export const playSuccessBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    // Tone 1: 587.33 Hz (D5) -> Tone 2: 880 Hz (A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.debug('Audio chime unable to play:', e);
  }
};

/**
 * Trigger subtle haptic vibration feedback on supported mobile devices.
 */
export const triggerHapticFeedback = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {
    // ignore
  }
};

/**
 * QR Code & Event Pass Utilities for YIN-PIMS
 */

/**
 * Generate a universally functional public verification URL for a pass QR code.
 * Using query parameter format `/?pass=...` guarantees compatibility across all
 * static hosting platforms (Vercel, Netlify, Firebase, GitHub Pages) without 404 rewrite issues.
 */
export const getPassUrl = (qrIdentifier: string): string => {
  if (!qrIdentifier) return '';
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://yinpims.vercel.app';
  return `${origin}/?pass=${encodeURIComponent(qrIdentifier.trim())}`;
};

/**
 * Robustly extract a pass identifier or registration ID from arbitrary scanner inputs:
 * Handles:
 *  - Full URLs: `https://yinpims.vercel.app/?pass=QR-PIMS-EVT-001...`
 *  - Query strings: `?pass=QR-PIMS...` or `&pass=...` or `?badge=...`
 *  - Path-based URLs: `https://yinpims.vercel.app/pass/QR-PIMS...` or `/badge/QR-PIMS...`
 *  - Raw QR strings: `QR-PIMS-EVT-001-PRT-001-REG-001`
 *  - Raw Registration IDs: `REG-001`
 */
export const extractPassIdentifier = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Check URL query parameters
  if (trimmed.includes('pass=') || trimmed.includes('badge=') || trimmed.includes('qr=') || trimmed.includes('id=')) {
    try {
      const dummyUrl = trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed.startsWith('?') || trimmed.startsWith('/') ? trimmed : '?' + trimmed}`;
      const parsed = new URL(dummyUrl);
      const val = parsed.searchParams.get('pass') ||
                  parsed.searchParams.get('badge') ||
                  parsed.searchParams.get('qr') ||
                  parsed.searchParams.get('id');
      if (val) return decodeURIComponent(val).trim();
    } catch {
      // fallback regex
      const match = trimmed.match(/[?&](?:pass|badge|qr|id)=([^&#]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
  }

  // Check URL paths like /badge/:id or /pass/:id
  const pathMatch = trimmed.match(/\/(?:badge|pass|verify)\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]).trim();
  }

  return trimmed;
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
    // Silently ignore if AudioContext autoplay is restricted
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

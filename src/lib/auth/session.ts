const SESSION_SECRET = process.env.SESSION_SECRET || 'sih_2026_secure_secret_key_rguktn_internal_hackathon';
export const SESSION_COOKIE_NAME = 'sih_auth_session';

export interface SessionData {
  email: string;
  name: string;
  authRole: 'admin' | 'coordinator' | 'jury' | 'team_lead' | 'team_member' | 'user' | 'unregistered';
  user_id?: string;
  jury_id?: string;
  panel?: string;
  team_id?: string;
  timestamp: number;
}

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64url');
  }
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf8');
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
}

function simpleHash(str: string, secret: string): string {
  let hash = 0x811c9dc5;
  const combined = str + ':' + secret;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export function createSessionToken(data: Omit<SessionData, 'timestamp'>): string {
  const sessionData: SessionData = {
    ...data,
    email: data.email.trim().toLowerCase(),
    timestamp: Date.now()
  };
  const payloadBase64 = base64UrlEncode(JSON.stringify(sessionData));
  const signature = simpleHash(payloadBase64, SESSION_SECRET);
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionData | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSignature = simpleHash(payloadBase64, SESSION_SECRET);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const jsonStr = base64UrlDecode(payloadBase64);
    const data: SessionData = JSON.parse(jsonStr);
    
    // Session expires after 30 days
    if (Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

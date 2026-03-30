/* global Buffer, process */
import crypto from 'node:crypto';

const ADMIN_COOKIE_NAME = 'euangelion_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function readEnv(name) {
  return process.env[name]?.trim();
}

function requireEnv(name) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAdminSecret() {
  return readEnv('ADMIN_SESSION_SECRET') || readEnv('CRON_SECRET') || requireEnv('ADMIN_PASSWORD');
}

function isSecureRequest(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (!forwardedProto) return false;
  return String(forwardedProto).split(',')[0].trim() === 'https';
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload) {
  return crypto.createHmac('sha256', getAdminSecret()).update(payload).digest('base64url');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf('=');
      if (index === -1) return acc;
      const key = part.slice(0, index);
      const value = part.slice(index + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function timingSafeEqual(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function buildSessionToken(email) {
  const payload = {
    email,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadPart);
  return `${payloadPart}.${signature}`;
}

function parseSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payloadPart, signature] = token.split('.');
  if (!payloadPart || !signature) return null;

  const expectedSignature = signPayload(payloadPart);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    if (!payload?.email || !payload?.exp) return null;
    if (Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function buildAdminCookie(req, token) {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function buildClearAdminCookie(req) {
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

export function verifyAdminCredentials(email, password) {
  const expectedEmail = requireEnv('ADMIN_EMAIL');
  const expectedPassword = requireEnv('ADMIN_PASSWORD');
  return email === expectedEmail && password === expectedPassword;
}

export function setAdminSessionCookie(req, res, email) {
  const token = buildSessionToken(email);
  res.setHeader('Set-Cookie', buildAdminCookie(req, token));
}

export function clearAdminSessionCookie(req, res) {
  res.setHeader('Set-Cookie', buildClearAdminCookie(req));
}

export function getAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[ADMIN_COOKIE_NAME];
  return parseSessionToken(token);
}

export function requireAdminSession(req, res) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }
  return session;
}

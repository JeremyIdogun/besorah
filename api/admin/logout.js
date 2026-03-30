import { clearAdminSessionCookie } from '../_lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearAdminSessionCookie(req, res);
  return res.status(200).json({ ok: true });
}


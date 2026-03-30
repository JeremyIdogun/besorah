import { setAdminSessionCookie, verifyAdminCredentials } from '../_lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!verifyAdminCredentials(email, password)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  setAdminSessionCookie(req, res, email);
  return res.status(200).json({ ok: true });
}


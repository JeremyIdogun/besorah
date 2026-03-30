import { getAdminSession } from '../_lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getAdminSession(req);
  return res.status(200).json({
    authenticated: Boolean(session),
    email: session?.email || null,
  });
}


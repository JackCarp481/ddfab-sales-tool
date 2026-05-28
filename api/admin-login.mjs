import { makeInboxToken, INBOX_COOKIE, cookieMaxAge } from './_lib/admin.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const expected = process.env.ADMIN_PASSWORD ?? '';
  const secret = process.env.AUTH_SECRET ?? '';

  // Vercel auto-parses urlencoded bodies into req.body; fall back if needed.
  let password = '';
  if (req.body && typeof req.body === 'object') {
    password = String(req.body.password ?? '');
  } else if (typeof req.body === 'string') {
    password = String(new URLSearchParams(req.body).get('password') ?? '');
  }

  if (!expected || !secret || password !== expected) {
    res.statusCode = 302;
    res.setHeader('Location', '/admin?error=1');
    return res.end();
  }

  const token = await makeInboxToken(secret);
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https');
  const parts = [
    `${INBOX_COOKIE}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${cookieMaxAge()}`,
  ];
  if (secure) parts.push('Secure');

  res.setHeader('Set-Cookie', parts.join('; '));
  res.statusCode = 302;
  res.setHeader('Location', '/admin');
  return res.end();
}

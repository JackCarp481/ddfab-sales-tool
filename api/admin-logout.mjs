import { INBOX_COOKIE } from './_lib/admin.mjs';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', `${INBOX_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.statusCode = 302;
  res.setHeader('Location', '/admin');
  return res.end();
}

import { buildZip } from './_lib/zip.mjs';
import {
  getSubmissionByFolder,
  fetchObject,
  buildSubmissionReadme,
  verifyInboxToken,
  slugify,
  INBOX_COOKIE,
} from './_lib/admin.mjs';

export default async function handler(req, res) {
  const secret = process.env.AUTH_SECRET ?? '';
  const authed = await verifyInboxToken(req.cookies?.[INBOX_COOKIE], secret);
  if (!authed) return res.status(401).send('Unauthorized');

  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).send('Server is missing Supabase credentials');

  const folder = (req.query?.folder ?? '').trim();
  if (!folder) return res.status(400).send('Missing folder');

  const sub = await getSubmissionByFolder(url, key, folder);
  if (!sub) return res.status(404).send('Submission not found');

  const enc = new TextEncoder();
  const files = [];
  const missing = [];

  // 1. Full structured record — every form answer.
  files.push({ name: 'submission.json', data: enc.encode(JSON.stringify(sub, null, 2)) });

  // 2. Logo.
  if (sub.logo_path) {
    try {
      const bytes = await fetchObject(url, key, sub.logo_path);
      const ext = sub.logo_path.split('.').pop() || 'png';
      files.push({ name: `logo.${ext}`, data: bytes });
    } catch {
      missing.push(sub.logo_path);
    }
  }

  // 3. Gallery photos — named with their service tag for easy sorting.
  for (let i = 0; i < (sub.gallery?.length ?? 0); i++) {
    const g = sub.gallery[i];
    if (!g.path) continue;
    try {
      const bytes = await fetchObject(url, key, g.path);
      const ext = g.path.split('.').pop() || 'jpg';
      const tag = slugify(g.service || g.alt || '') || `photo-${i + 1}`;
      files.push({ name: `gallery/${String(i + 1).padStart(2, '0')}-${tag}.${ext}`, data: bytes });
    } catch {
      missing.push(g.path);
    }
  }

  // 4. Human-readable summary.
  files.push({ name: 'README.txt', data: enc.encode(buildSubmissionReadme(sub, missing)) });

  const zip = buildZip(files);
  const safe = slugify(sub.company_name) || folder;
  const buf = Buffer.from(zip);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}-submission.zip"`);
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('Cache-Control', 'no-store');
  return res.end(buf);
}

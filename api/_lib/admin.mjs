// Server-only helpers for the /admin submissions viewer.
// These use the Supabase service_role key, which bypasses Row Level Security —
// so this module must NEVER be imported into client-side code.

const BUCKET = 'submissions';

function authHeaders(serviceKey) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

export async function listSubmissions(url, serviceKey) {
  const res = await fetch(`${url}/rest/v1/submissions?select=*&order=created_at.desc`, {
    headers: authHeaders(serviceKey),
  });
  if (!res.ok) throw new Error(`Could not load submissions (${res.status}). ${await res.text().catch(() => '')}`);
  return await res.json();
}

export async function getSubmissionByFolder(url, serviceKey, folder) {
  const res = await fetch(
    `${url}/rest/v1/submissions?folder=eq.${encodeURIComponent(folder)}&limit=1`,
    { headers: authHeaders(serviceKey) }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

// Batch-sign storage paths → returns a path→URL map of the ones that succeeded.
// Signed URLs are time-limited and safe to embed in the (admin-only) page HTML.
export async function signUrls(url, serviceKey, paths, expiresIn = 3600) {
  const map = {};
  if (!paths.length) return map;
  const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}`, {
    method: 'POST',
    headers: { ...authHeaders(serviceKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn, paths }),
  });
  if (!res.ok) return map;
  const signed = await res.json();
  signed.forEach((item, i) => {
    if (item.signedURL) map[paths[i]] = `${url}/storage/v1${item.signedURL}`;
  });
  return map;
}

export async function fetchObject(url, serviceKey, path) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    headers: authHeaders(serviceKey),
  });
  if (!res.ok) throw new Error(`Could not fetch ${path} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

// ── Cookie gate (HMAC-signed, reuses AUTH_SECRET) ───────────────────────────
export const INBOX_COOKIE = 'inbox_auth';
const TTL_SECONDS = 12 * 60 * 60;

function b64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

export async function makeInboxToken(secret) {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  return `${exp}.${await hmac(secret, exp)}`;
}

export async function verifyInboxToken(token, secret) {
  if (!token || !secret) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (sig !== (await hmac(secret, exp))) return false;
  const expNum = Number(exp);
  return Number.isFinite(expNum) && expNum > Math.floor(Date.now() / 1000);
}

export function cookieMaxAge() {
  return TTL_SECONDS;
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// HTML-escape for safely interpolating dealer-supplied text into hand-built
// HTML strings (Astro auto-escaped; manual template strings do not).
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildSubmissionReadme(s, missing) {
  const lines = [
    'DDFAB DEALER SUBMISSION',
    '=======================',
    '',
    `Company:      ${s.company_name}`,
    `Tagline:      ${s.tagline || '—'}`,
    `Template:     ${s.template}`,
    `Status:       ${s.status || '—'}`,
    `Submitted:    ${s.created_at}`,
    '',
    'CONTACT',
    '-------',
    `Owner email:  ${s.email}`,
    `Phone:        ${s.phone}`,
    `Address:      ${[s.street, s.city, s.state, s.zip].filter(Boolean).join(', ')}`,
    `Hours:        ${s.hours || '—'}`,
    `Service area: ${s.service_area || '—'}`,
    `Facebook:     ${s.facebook || '—'}`,
    `Instagram:    ${s.instagram || '—'}`,
    '',
    'DOMAIN',
    '------',
    `Has domain:   ${s.has_domain ? 'yes' : 'no'}`,
    `Domain:       ${s.domain || '—'}`,
    `Live site:    ${s.domain_has_live_site ? 'yes (cutover needed)' : 'no'}`,
    '',
    'ABOUT',
    '-----',
    s.about || '—',
    '',
    `SERVICES (${s.services?.length ?? 0})`,
    '--------',
    ...(s.services?.length ? s.services.map((x) => `  - ${x}`) : ['  (none selected)']),
    '',
    `GALLERY (${s.gallery?.length ?? 0} image${s.gallery?.length === 1 ? '' : 's'})`,
    '-------',
    ...(s.gallery?.length
      ? s.gallery.map((g, i) =>
          `  ${String(i + 1).padStart(2, '0')}. [${g.service || 'untagged'}] ${g.alt || ''}`.trimEnd()
        )
      : ['  (none uploaded)']),
    '',
  ];
  if (missing.length) {
    lines.push(`WARNING: ${missing.length} media file(s) referenced but not found in storage:`);
    for (const m of missing) lines.push(`  - ${m}`);
    lines.push('');
  }
  return lines.join('\n');
}

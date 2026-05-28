import {
  listSubmissions,
  signUrls,
  verifyInboxToken,
  INBOX_COOKIE,
  esc,
} from './_lib/admin.mjs';

const HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Submissions — DDFAB</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --accent: #B5451B; --accent-hover: #D0562A;
      --bg: #0A0A0A; --bg-card: #1A1A1A; --bg-alt: #141414;
      --border: #2A2A2A; --text: #fff; --text-muted: #AAA; --text-dim: #666;
      --radius: 6px;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; line-height: 1.5; }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; text-decoration: none; }

    /* Login */
    .login { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .login-card { width: 100%; max-width: 340px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px; text-align: center; }
    .login-card h1 { font-size: 28px; font-weight: 800; letter-spacing: 1px; }
    .login-card .sub { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
    .login-card input { width: 100%; padding: 12px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 15px; margin-bottom: 12px; }
    .login-card input:focus { outline: none; border-color: var(--accent); }
    .login-card button { width: 100%; padding: 12px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 15px; font-weight: 600; cursor: pointer; }
    .login-card button:hover { background: var(--accent-hover); }
    .error { color: #ff6b6b; font-size: 13px; margin-bottom: 12px; }

    /* Dashboard */
    header { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(10,10,10,0.9); backdrop-filter: blur(8px); z-index: 5; }
    header h1 { font-size: 20px; font-weight: 700; }
    header .count { color: var(--text-dim); font-weight: 500; }
    .logout { color: var(--text-muted); font-size: 13px; border: 1px solid var(--border); padding: 7px 14px; border-radius: var(--radius); }
    .logout:hover { color: var(--text); border-color: var(--text-dim); }

    main { max-width: 980px; margin: 0 auto; padding: 28px; }
    .empty, main > .error { text-align: center; color: var(--text-muted); padding: 48px 0; }

    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 20px; overflow: hidden; }
    .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px; border-bottom: 1px solid var(--border); }
    .card-head h2 { font-size: 18px; font-weight: 700; }
    .card-head .meta { color: var(--text-dim); font-size: 13px; margin-top: 2px; }
    .btn { white-space: nowrap; background: var(--accent); color: #fff; padding: 10px 16px; border-radius: var(--radius); font-size: 14px; font-weight: 600; }
    .btn:hover { background: var(--accent-hover); }

    .body { display: grid; grid-template-columns: 1fr auto; gap: 22px; padding: 20px 22px; }
    .info { display: grid; gap: 10px; align-content: start; }
    .info > div { display: grid; grid-template-columns: 90px 1fr; gap: 12px; font-size: 14px; }
    .info dt { color: var(--text-dim); }
    .info dd { color: var(--text); word-break: break-word; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: var(--bg-alt); border: 1px solid var(--border); border-radius: 100px; padding: 3px 10px; font-size: 12px; color: var(--text-muted); }
    .logo { text-align: center; }
    .logo .label { display: block; color: var(--text-dim); font-size: 12px; margin-bottom: 8px; }
    .logo img { max-height: 70px; width: auto; margin: 0 auto; background: #fff; border-radius: var(--radius); padding: 6px; }

    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; padding: 0 22px 22px; }
    .thumb { position: relative; aspect-ratio: 4/3; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .thumb .tag { position: absolute; left: 0; bottom: 0; right: 0; background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 3px 6px; }

    @media (max-width: 640px) { .body { grid-template-columns: 1fr; } }
  </style>
</head>
<body>`;

const FOOT = `</body>
</html>`;

function loginPage(loginError) {
  return `${HEAD}
  <main class="login">
    <form class="login-card" method="POST" action="/api/admin-login">
      <h1>DDFAB</h1>
      <p class="sub">Submissions</p>
      ${loginError ? '<p class="error">Incorrect password.</p>' : ''}
      <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required />
      <button type="submit">Enter</button>
    </form>
  </main>
${FOOT}`;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function addr(s) {
  return [s.street, s.city, s.state, s.zip].filter(Boolean).join(', ');
}

function infoRow(label, value) {
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function submissionCard(s, signed) {
  const services = (s.services && s.services.length > 0)
    ? `<div><dt>Services</dt><dd><span class="chips">${s.services.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</span></dd></div>`
    : '';

  const logo = (s.logo_path && signed[s.logo_path])
    ? `<div class="logo">
        <span class="label">Logo</span>
        <a href="${esc(signed[s.logo_path])}" target="_blank" rel="noopener"><img src="${esc(signed[s.logo_path])}" alt="Logo" /></a>
      </div>`
    : '';

  const gallery = (s.gallery && s.gallery.length > 0)
    ? `<div class="gallery">${s.gallery.map((g, i) => {
        if (!signed[g.path]) return '';
        const title = [g.service, g.alt].filter(Boolean).join(' — ');
        return `<a class="thumb" href="${esc(signed[g.path])}" target="_blank" rel="noopener" title="${esc(title)}">
            <img src="${esc(signed[g.path])}" alt="${esc(g.alt || `Photo ${i + 1}`)}" loading="lazy" />
            ${g.service ? `<span class="tag">${esc(g.service)}</span>` : ''}
          </a>`;
      }).join('')}</div>`
    : '';

  return `<article class="card">
    <div class="card-head">
      <div>
        <h2>${esc(s.company_name || '(no name)')}</h2>
        <p class="meta">${esc(fmtDate(s.created_at))} · ${esc(s.template)}${s.status ? ` · ${esc(s.status)}` : ''}</p>
      </div>
      <a class="btn" href="/api/admin-zip?folder=${encodeURIComponent(s.folder)}">Download all (.zip)</a>
    </div>

    <div class="body">
      <dl class="info">
        ${infoRow('Email', s.email || '—')}
        ${infoRow('Phone', s.phone || '—')}
        ${infoRow('Address', addr(s) || '—')}
        ${s.tagline ? infoRow('Tagline', s.tagline) : ''}
        ${s.service_area ? infoRow('Service area', s.service_area) : ''}
        ${services}
        ${s.domain ? infoRow('Domain', `${s.domain}${s.domain_has_live_site ? ' (live)' : ''}`) : ''}
      </dl>
      ${logo}
    </div>
    ${gallery}
  </article>`;
}

function dashboardPage(submissions, signed, loadError) {
  const body = loadError
    ? `<p class="error">${esc(loadError)}</p>`
    : (submissions.length === 0
        ? '<p class="empty">No submissions yet.</p>'
        : submissions.map((s) => submissionCard(s, signed)).join('\n'));

  return `${HEAD}
  <header>
    <h1>Submissions <span class="count">(${submissions.length})</span></h1>
    <a class="logout" href="/api/admin-logout">Log out</a>
  </header>
  <main>
    ${body}
  </main>
${FOOT}`;
}

export default async function handler(req, res) {
  const secret = process.env.AUTH_SECRET ?? '';
  const cookie = req.cookies?.[INBOX_COOKIE];
  const authed = await verifyInboxToken(cookie, secret);
  const loginError = req.query?.error === '1';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (!authed) {
    return res.status(200).send(loginPage(loginError));
  }

  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(200).send(
      dashboardPage([], {}, 'Server is missing Supabase credentials (PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
    );
  }

  try {
    const submissions = await listSubmissions(url, key);
    const paths = submissions.flatMap((s) =>
      [s.logo_path, ...(s.gallery ?? []).map((g) => g.path)].filter(Boolean)
    );
    const signed = await signUrls(url, key, paths, 3600);
    return res.status(200).send(dashboardPage(submissions, signed, ''));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load submissions.';
    return res.status(200).send(dashboardPage([], {}, msg));
  }
}

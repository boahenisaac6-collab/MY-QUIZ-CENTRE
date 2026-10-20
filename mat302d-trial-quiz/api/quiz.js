// MAT 302D — same-origin web gateway for secure quiz and admin pages.
// Password validation and persistent access settings remain on the Supabase backend.
const UPSTREAM = 'https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/mat302d-access';
const STATUS_API = 'https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/mat302d-public-status';
const CHECK_INTERVAL = 20000;
function sessionCookies(raw, opts = {}) {
  return (raw || '').split(';').map(x => x.trim()).filter(item => {
    if (/^mat302d_admin=/.test(item)) return !!opts.admin;
    if (/^mat302d_student=/.test(item)) return !!opts.student;
    return false;
  }).join('; ');
}
function pageIsQuiz(html) { return html.includes('id="q80"'); }
function pageIsGate(html) { return html.includes('Access is currently password-protected'); }
async function statusNow() {
  const result = await fetch(STATUS_API, {
    headers: { accept: 'application/json' }, cache: 'no-store',
    signal: AbortSignal.timeout(10000)
  });
  if (!result.ok) throw Error('Settings unavailable');
  const data = await result.json();
  if (!Number.isSafeInteger(data.revision) || typeof data.passwordRequired !== 'boolean')
    throw Error('Invalid settings reply');
  return data;
}
function refreshScript(state) {
  if (!state) return '';
  // Check even when the page has already been opened on a phone.
  // A changed revision indicates that student access or the student password changed.
  return '<script>(function(){var revision=' + JSON.stringify(state.revision) +
    ';var busy=false;function check(){if(busy)return;busy=true;fetch("/api/quiz?action=status",{cache:"no-store",credentials:"same-origin"})' +
    '.then(function(r){if(!r.ok)throw Error("status");return r.json()})' +
    '.then(function(s){if(s.revision!==revision)location.reload()})' +
    '.catch(function(){}).finally(function(){busy=false})}' +
    'document.addEventListener("visibilitychange",function(){if(!document.hidden)check()});' +
    'window.addEventListener("focus",check);setInterval(check,' + CHECK_INTERVAL + ');' +
    '})();</script>';
}
function improveAdmin(html, saved) {
  // The original admin button referred to Supabase's internal URL rather than the
  // same-origin Vercel quiz address, which resulted in a broken destination.
  let result=html.replace(/href=["']\/functions\/v1\/mat302d-access["']/g,
      'href="/api/quiz?as_admin=1"');
  result=result.replace('Open students’ quiz','Open Quiz (administrator access)');
  const actions='<p><a href="/api/quiz?preview=student" target="_blank" rel="noopener" ' +
       'style="display:inline-block;background:#eaf0ff;padding:12px 15px;border-radius:10px;' +
       'text-decoration:none;font-weight:750">Test Exactly What Students See</a></p>' +
       '<p style="font-size:14px">The student preview ignores your administrator login, so ' +
       'password protection is visible when ON. Changes take effect immediately for newly ' +
       'opened pages and automatically refresh already-open quiz pages.</p>';
  result=result.replace('</footer>',actions+'</footer>');
  if (saved) result=result.replace('<h1>Quiz control centre</h1>',
    '<h1>Quiz control centre</h1><p style="padding:12px;border-radius:10px;' +
    'background:#e7f6e9;color:#14602f;font-weight:700">Settings saved online. ' +
    'Use "Test Exactly What Students See" to verify your change.</p>');
  return result;
}
function setSessionCookies(res, upstream) {
  const setCookies = typeof upstream.headers.getSetCookie === 'function'
    ? upstream.headers.getSetCookie()
    : (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : []);
  const list = setCookies
    .map(c => c.trim())
    .filter(c => /^mat302d_(admin|student)=/.test(c))
    .map(c => c.replace(/;\s*Path=\/functions\/v1\/mat302d-access/gi, '; Path=/api/quiz'));
  if (list.length) res.setHeader('Set-Cookie',list);
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Vary','Cookie');
  try {
    if (!['GET','POST'].includes(req.method)) {
      res.setHeader('Allow','GET, POST'); return res.status(405).send('Method not allowed');
    }
    const host = req.headers.host;
    const current = new URL(req.url,'https://'+host);
    if (req.method === 'POST' && req.headers.origin &&
        req.headers.origin !== 'https://'+host && req.headers.origin !== 'http://'+host)
      return res.status(403).send('Invalid request origin');
    if (req.method === 'GET' && current.searchParams.get('action') === 'status') {
      const data = await statusNow();
      res.setHeader('Content-Type','application/json; charset=utf-8');
      return res.status(200).json(data);
    }
    const action=current.searchParams.get('action') || '';
    // Ordinary student URL does NOT inherit administrator privileges. A separate,
    // explicitly labelled administrator entry point does.
    const adminRoute = current.searchParams.has('admin') ||
      current.searchParams.get('as_admin') === '1' ||
      ['admin-login','save','logout'].includes(action);
    const studentRoute = !(current.searchParams.get('preview') === 'student');
    const headers = { accept:'text/html,application/json' };
    const selectedCookies = sessionCookies(req.headers.cookie,
      {admin:adminRoute,student:studentRoute});
    if (selectedCookies) headers.cookie = selectedCookies;
    let body;
    if (req.method === 'POST') {
      if (typeof req.body === 'string') body=req.body;
      else if (req.body instanceof Buffer) body=req.body.toString('utf8');
      else body=new URLSearchParams(req.body && typeof req.body === 'object' ? req.body : {}).toString();
      headers['content-type']='application/x-www-form-urlencoded';
    }
    const upstreamUrl=new URL(UPSTREAM);
    // The Supabase function recognises query-string admin mode but never relies on
    // Vercel-only preview flags for access.
    upstreamUrl.search=current.search;
    const upstream=await fetch(upstreamUrl,{
      method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)
    });
    setSessionCookies(res,upstream);
    if (upstream.status >= 300 && upstream.status < 400) {
      const destinations = {
        'admin-login':'/api/quiz?admin=1',
        'save':'/api/quiz?admin=1&saved=1',
        'logout':'/api/quiz?admin=1',
        'student':'/api/quiz'
      };
      if (upstream.status !== 303 || req.method !== 'POST' || !destinations[action])
        return res.status(502).send('Unexpected authentication redirect');
      res.setHeader('Location', destinations[action]);
      return res.status(303).end();
    }
    let output=await upstream.text();
    res.setHeader('Content-Type','text/html; charset=utf-8');
    if (output.includes('<h1>Quiz control centre</h1>')) {
      output=improveAdmin(output,current.searchParams.get('saved')==='1');
    }
    if (pageIsQuiz(output) || pageIsGate(output)) {
      try {
        const state=await statusNow();
        output=output.replace(/<\/body>/i,refreshScript(state)+'</body>');
      } catch(error) {
        console.error('Status watch unavailable: '+String(error));
      }
    }
    return res.status(upstream.status).send(output);
  } catch(error) {
    console.error('MAT302D proxy error: '+String(error));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(503).send('<!doctype html><title>Connection error</title>' +
      '<p>We could not connect to the quiz settings. Please refresh this page.</p>');
  }
};

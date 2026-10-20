// MAT 302D quiz HTML gateway. Supabase Edge Functions enforce authentication and settings.
const UPSTREAM = 'https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/mat302d-access';
const COOKIE_PATTERN = /^mat302d_(?:admin|student)=/;
module.exports = async function handler(req,res) {
  try {
    if (!['GET','POST'].includes(req.method)) {
      res.setHeader('Allow','GET, POST'); return res.status(405).send('Method not allowed');
    }
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const inbound = new URL(req.url, proto + '://' + host);
    // This gateway performs its own origin check for state-changing requests.
    if(req.method === 'POST' && req.headers.origin &&
       req.headers.origin !== 'https://' + host && req.headers.origin !== 'http://' + host) {
      return res.status(403).send('Invalid request origin');
    }
    const url = new URL(UPSTREAM);
    url.search = inbound.search;
    const headers = {accept:'text/html,application/json'};
    if(req.headers.cookie) headers.cookie = req.headers.cookie;
    let body;
    if(req.method === 'POST') {
      body = typeof req.body === 'string'
        ? req.body
        : new URLSearchParams(req.body && typeof req.body === 'object' ? req.body : {}).toString();
      headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    const upstream = await fetch(url.toString(),{
      method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)
    });
    const clearCookies = typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : [];
    for(const item of clearCookies) {
      if(COOKIE_PATTERN.test(item)) {
        res.setHeader('Set-Cookie',item.replace(/Path=\/functions\/v1\/mat302d-access/ig,'Path=/api/quiz'));
      }
    }
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    if(upstream.status >= 300 && upstream.status < 400) {
      // Never use untrusted upstream Location headers as browser destinations.
      // The Edge Function returns 303 after these four form actions.
      // Translate each action to its one fixed same-origin destination.
      const action = inbound.searchParams.get('action');
      const allowedDestination = ({
        'admin-login':'/api/quiz?admin=1',
        'save':'/api/quiz?admin=1',
        'logout':'/api/quiz?admin=1',
        'student':'/api/quiz'
      })[action];
      if(upstream.status !== 303 || req.method !== 'POST' || !allowedDestination)
        return res.status(502).send('Unexpected upstream redirect');
      res.setHeader('Location', allowedDestination);
      return res.status(303).end();
    }
    const response = await upstream.text();
    const typ = upstream.headers.get('content-type') || '';
    // Supabase's gateway forcibly sets text/plain and a sandbox CSP on HTML responses.
    // Return HTML from Vercel with the correct media type and without the gateway CSP.
    res.setHeader('Content-Type',typ.includes('application/json')
       ? 'application/json; charset=utf-8'
       : 'text/html; charset=utf-8');
    return res.status(upstream.status).send(response);
  } catch(e) {
    console.error('MAT302D gateway:',e.message);
    res.setHeader('Cache-Control','no-store');
    return res.status(503).send('The quiz server is temporarily unavailable. Please retry.');
  }
};

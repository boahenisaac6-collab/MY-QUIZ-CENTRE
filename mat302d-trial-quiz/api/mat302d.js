// MAT 302D — preserved separate gateway for secure quiz and admin pages.
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
    ';var busy=false;function check(){if(busy)return;busy=true;fetch("/api/mat302d?action=status",{cache:"no-store",credentials:"same-origin"})' +
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
      'href="/api/mat302d?as_admin=1"');
  result=result.replace('Open students’ quiz','Open Quiz (administrator access)');
  const actions='<p><a href="/api/mat302d?preview=student" target="_blank" rel="noopener" ' +
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
    .map(c => c.replace(/;\s*Path=\/functions\/v1\/mat302d-access/gi, '; Path=/api/mat302d'));
  if (list.length) res.setHeader('Set-Cookie',list);
}
function tenQuestionPreview(html){
let h=html.replace(/<article class="q" id="q(?:1[1-9]|[2-7]\d|80)"[\s\S]*?<\/article>/g,'');
h=h.replace("var N = 80, KEY = 'mat302d-trial-quiz-v1'","var N = 10, KEY = 'mat302d-trial-quiz-free10-v1'");
h=h.replace(/<select([^>]*\bid="mSelect"[^>]*)>([\s\S]*?)<\/select>/,(_whole,atts,body)=>'<select'+atts+'>'+body.replace(/<option value="(?:1[0-9]|[2-7]\d|80)"[^>]*>[\s\S]*?<\/option>/g,'')+'</select>');
h=h.replace(/80 MAT 302D Advanced Calculus II trial questions/g,'10 free MAT 302D trial questions').replace(/80 questions/g,'10 free questions');
h=h.replace('<title>MAT 302D Trial Quiz</title>','<title>MAT 302D | First 10 Free Questions</title>');
const banner='<aside style="font-family:system-ui;background:#f3fbfc;border:2px solid #08a3aa;border-radius:14px;padding:15px;margin:15px auto;text-align:center;max-width:800px"><b>FIRST 10 QUESTIONS FREE</b><p>Subscribe for <b>GH₵30</b> to continue with questions 11–80.</p><a style="display:inline-block;padding:13px;background:#077e94;color:#fff;text-decoration:none;border-radius:10px;font-weight:800" href="/api/quiz?course=mat302d&unlock=1">Subscribe • Contact Sir Isaac</a><p>024 848 1762</p></aside>';
h=h.replace('</main>',banner+'</main>');
const client="<script>(function(){\n let offered=false;\n function invite(){if(offered)return;offered=true;let v=document.createElement('div');v.id='subPrompt10';\n v.style.cssText='position:fixed;inset:0;background:#061b3de8;z-index:100000;display:grid;place-items:center;overflow:auto;padding:17px';\n v.innerHTML='<div style=\"font-family:system-ui;text-align:center;color:#142f4d;background:white;border-radius:22px;padding:25px;width:100%;max-width:470px\"><h2>First 10 Free Questions Completed!</h2><p>Subscribe for <b>GH₵30</b> to continue from Question 11.</p><a style=\"display:block;padding:14px;background:#087e94;color:white;border-radius:12px;text-decoration:none;font-weight:bold\" href=\"/api/quiz?course=mat302d&unlock=1\">Contact Sir Isaac • Subscribe GH₵30</a><button type=\"button\" id=\"closeSubPrompt10\" style=\"margin-top:12px;padding:12px;border:0;border-radius:9px\">Review first 10 questions</button></div>';\n document.body.appendChild(v);document.getElementById('closeSubPrompt10').onclick=function(){v.remove()};}\n document.addEventListener('click',function(e){if(!e.target.closest('article.q .opt'))return;setTimeout(function(){if(document.querySelectorAll('article.q.done').length>=10)invite()},180)});\n})();</script>";
return h.replace('</body>',client+'</body>');
}

module.exports = async function handler(req,res) {
  // Independent student visibility/access is checked on the shared portal backend.
  // Existing MAT302D admin authentication and settings are preserved unchanged.
  let previewRequired=false;
  try{
    const u=new URL(req.url,'https://'+req.headers.host);
    const a=u.searchParams.get('action')||'';
    const administrator=u.searchParams.has('admin')||u.searchParams.get('as_admin')==='1'||['admin-login','save','logout'].includes(a);
    if(!administrator){
      const gate=await fetch('https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/quiz-multi-portal?action=permit&course=mat302d',{headers:{cookie:req.headers.cookie||'',accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!gate.ok)throw Error('Subscription status unavailable');
      const state=await gate.json();
      if(!state.enabled){res.statusCode=302;res.setHeader('Location','/api/quiz');return res.end();}
      if(!state.allowed){
        if(state.subscriptionEnabled)previewRequired=true;
        else{res.statusCode=302;res.setHeader('Location','/api/quiz?course=mat302d');return res.end();}
      }
    }
  }catch(error){console.error('MAT302D access check: '+String(error));return res.status(503).send('Access settings unavailable. Please refresh.');}

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
        'admin-login':'/api/mat302d?admin=1',
        'save':'/api/mat302d?admin=1&saved=1',
        'logout':'/api/mat302d?admin=1',
        'student':'/api/mat302d'
      };
      if (upstream.status !== 303 || req.method !== 'POST' || !destinations[action])
        return res.status(502).send('Unexpected authentication redirect');
      res.setHeader('Location', destinations[action]);
      return res.status(303).end();
    }
    let output=await upstream.text();
    if(previewRequired && pageIsQuiz(output))output=tenQuestionPreview(output);
    // Keep upstream form destinations within this independent mathematics gateway.
    output=output.replace(/\/api\/quiz/g,'/api/mat302d');
    output=output.replace(/\/functions\/v1\/mat302d-access/g,'/api/mat302d');
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

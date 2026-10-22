// Shared course-selector and access-control gateway.
// Sensitive passwords, session tokens and BIO202D source remain on the private backend.
const ENDPOINT='https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/quiz-portal-v2';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');return res.status(405).send('Method not allowed');
  }
  try{
    const host=req.headers.host;
    if(req.method==='POST'&&req.headers.origin&&req.headers.origin!=='https://'+host&&req.headers.origin!=='http://'+host){
      return res.status(403).send('Invalid request origin');
    }
    const original=new URL(req.url,'https://'+host);
    const target=new URL(ENDPOINT);target.search=original.search;
    const headers={accept:req.headers.accept||'text/html,application/json'};
    if(req.headers.cookie)headers.cookie=req.headers.cookie;
    if(req.headers['x-forwarded-for'])headers['x-forwarded-for']=req.headers['x-forwarded-for'];
    let body;
    if(req.method==='POST'){
      if(typeof req.body==='string')body=req.body;
      else if(Buffer.isBuffer(req.body))body=req.body.toString('utf8');
      else body=new URLSearchParams(req.body&&typeof req.body==='object'?req.body:{}).toString();
      headers['content-type']='application/x-www-form-urlencoded';
    }
    const upstream=await fetch(target,{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(25000)});
    const setCookies=typeof upstream.headers.getSetCookie==='function'?upstream.headers.getSetCookie():
        (upstream.headers.get('set-cookie')?[upstream.headers.get('set-cookie')]:[]);
    if(setCookies.length)res.setHeader('Set-Cookie',setCookies);
    if(upstream.headers.get('location'))res.setHeader('Location',upstream.headers.get('location'));
    // The shared backend is returned as text/plain by its edge intermediary.
    // These are HTML pages except for the explicitly defined status/permit JSON endpoints.
    const isJson = ['status','permit'].includes(original.searchParams.get('action'));
    res.setHeader('Content-Type',isJson?'application/json; charset=utf-8':'text/html; charset=utf-8');
    const payload=Buffer.from(await upstream.arrayBuffer());
    res.statusCode=upstream.status;
    // Do not use res.send(Buffer): it overrides text/html with text/plain in Vercel.
    return res.end(payload);
  }catch(err){
    console.error('Quiz portal proxy: '+String(err));
    return res.status(503).send('Temporary connection issue. Please refresh the page.');
  }
};
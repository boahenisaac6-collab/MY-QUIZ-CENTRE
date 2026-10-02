(()=>{
  const nativeFetch=window.fetch.bind(window);
  let accountStatus='free', currentUser=null;
  const KEY='promo_free_history_v2';
  const MOMO='0248481762', MOMO_NAME='ISAAC BOAHEN', WA='233248481762';
  const getHistory=()=>{try{return JSON.parse(localStorage.getItem(KEY+'_'+(currentUser?.id||'guest'))||'[]')}catch{return[]}};
  const saveHistory=(rows)=>localStorage.setItem(KEY+'_'+(currentUser?.id||'guest'),JSON.stringify(rows.slice(-100)));
  const settings=(s={})=>Object.assign(s,{free_sizes:'30',subscription_price:'30',contact_name:'Sir Isaac',contact_phone:'0248481762',momo_number:MOMO,momo_account_name:MOMO_NAME});
  const responseLike=(response,data,status=response.status)=>new Response(JSON.stringify(data),{status,statusText:response.statusText,headers:response.headers});

  function addFreeResult(data){
    const rows=getHistory();
    const previous=rows.length?rows[rows.length-1].percentage:null;
    rows.push({
      id:'free-'+Date.now(),question_count:Number(data.total||30),score:Number(data.score||0),
      total_answered:Number(data.answered||30),duration_seconds:Number(data.durationSeconds||0),
      started_at:new Date().toISOString(),completed_at:new Date().toISOString(),timed_out:false,
      rank_filter:'Sample Bank',topic_filter:'30-Question Practice',percentage:Number(data.percentage||0)
    });
    saveHistory(rows);
    data.freePreviousPercentage=previous;
    data.freeImprovement=previous===null?0:Number(data.percentage||0)-previous;
  }

  function freePerformance(){
    const attempts=getHistory();
    const p=attempts.map(x=>Number(x.percentage||0));
    const first=p[0]||0,latest=p[p.length-1]||0;
    return {attempts,summary:{attempts:p.length,average:p.length?Math.round(p.reduce((a,b)=>a+b,0)/p.length):0,best:p.length?Math.max(...p):0,first,latest,improvement:p.length>1?latest-first:0}};
  }

  function paymentPopup(result){
    const root=document.getElementById('modalRoot'); if(!root||accountStatus==='approved')return;
    const history=getHistory(),prev=history.length>1?history[history.length-2].percentage:null;
    const imp=prev===null?'This is your first recorded practice.':`${result.percentage-prev>=0?'+':''}${result.percentage-prev}% compared with your previous practice.`;
    const name=encodeURIComponent(currentUser?.fullName||currentUser?.full_name||'');
    const phone=encodeURIComponent(currentUser?.phone||'');
    const msg=encodeURIComponent(`Hello Sir Isaac, I want full access to the Promotion Exam Preparation Practice platform. My name is ${decodeURIComponent(name)||'________'} and my phone number is ${decodeURIComponent(phone)||'________'}. I am paying GH₵30 to MTN MoMo ${MOMO} (${MOMO_NAME}). Please activate my full access.`);
    root.innerHTML=`<div class="modal-backdrop" id="upgradeBackdrop"><div class="modal" style="border-top:7px solid #ffdd00">
      <div class="handle"></div>
      <div style="text-align:center;font-size:2.6rem">🎉</div>
      <h3 style="text-align:center">Well done! Practice completed</h3>
      <p style="text-align:center">You completed the 30-question sample practice with <strong>${result.score}/${result.total} (${result.percentage}%)</strong>.<br>${imp}</p>
      <div style="background:#eef9f2;border:1px solid #cfe8d8;border-radius:16px;padding:14px;margin:14px 0">
        <div style="font-weight:950;color:#034d2b;margin-bottom:7px">Continue with the full practice bank</div>
        <div style="font-size:.9rem;line-height:1.5;color:#53645b">For flexible question numbers, the full question bank, full performance features and PDF/printing access, activate full access.</div>
      </div>
      <div style="background:linear-gradient(135deg,#fff9cf,#fff3a7);border:2px solid #ffdd00;border-radius:18px;padding:15px;text-align:center">
        <div style="font-size:.8rem;font-weight:900;color:#695500">FULL ACCESS FEE</div>
        <div style="font-size:2.35rem;font-weight:1000;color:#034d2b">GH₵30</div>
        <div style="margin-top:9px;font-size:.78rem;font-weight:900">MTN MOBILE MONEY</div>
        <div style="font-size:1.55rem;font-weight:1000;letter-spacing:.04em;color:#111">0248 481 762</div>
        <div style="font-weight:900;color:#4b574f">ISAAC BOAHEN</div>
        <button id="copyMomo" class="secondary block" style="margin-top:10px;min-height:43px">📋 Copy MoMo Number</button>
      </div>
      <a href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener" class="primary block" style="margin-top:12px;display:flex;align-items:center;justify-content:center;text-decoration:none;gap:8px">🟢 WhatsApp Sir Isaac</a>
      <button id="keepFree" class="secondary block" style="margin-top:8px">Continue with Free 30-Question Practice</button>
    </div></div>`;
    document.getElementById('copyMomo')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(MOMO);alert('MoMo number copied: '+MOMO)}catch{prompt('Copy the MoMo number:',MOMO)}});
    document.getElementById('keepFree')?.addEventListener('click',()=>{root.innerHTML=''});
  }

  window.fetch=async function(input,init={}){
    let action='',body=null,nextInit=init;
    try{if(init&&typeof init.body==='string'){body=JSON.parse(init.body);action=String(body.action||'');if(action==='start_attempt'&&accountStatus!=='approved'){body.count=30;body.rank='All';body.topic='All';nextInit={...init,body:JSON.stringify(body)}}}}catch(_e){}

    if(action==='performance'&&accountStatus!=='approved'){
      return new Response(JSON.stringify(freePerformance()),{status:200,headers:{'Content-Type':'application/json'}});
    }

    const response=await nativeFetch(input,nextInit);
    try{
      const data=await response.clone().json();
      if(data?.user){currentUser=data.user;accountStatus=data.user.status||accountStatus;}
      if(action==='public_config'){data.freeSizes=[30];data.settings=settings(data.settings||{});return responseLike(response,data)}
      if(data?.settings)data.settings=settings(data.settings);
      if(action==='submit_attempt'&&accountStatus!=='approved'&&response.ok){addFreeResult(data);data.paywall=false;setTimeout(()=>paymentPopup(data),650);return responseLike(response,data)}
      if(action==='start_attempt'&&response.status===402&&accountStatus!=='approved'){
        /* Backend may still have an old free-use flag; retry once because the sample bank is permanently reusable. */
        const retryBody={...(body||{}),action:'start_attempt',count:30,rank:'All',topic:'All'};
        return nativeFetch(input,{...init,body:JSON.stringify(retryBody)});
      }
      if(data?.settings)return responseLike(response,data);
    }catch(_e){}
    return response;
  };

  function tidy(){
    document.title='Promotion Exam Preparation Practice';
    document.querySelectorAll('.year-badge').forEach(e=>e.remove());
    document.querySelectorAll('.brand-text h1').forEach(e=>e.textContent='Promotion Exam Preparation Practice');
    document.querySelectorAll('.brand-text p').forEach(e=>e.textContent='Independent practice platform for Ghana Education Service promotion-exam preparation');
    const completed=getHistory().length>0;
    if(accountStatus!=='approved'&&!completed){
      document.querySelectorAll('.subscribe-card').forEach(e=>e.style.display='none');
      document.querySelectorAll('button,a,.card').forEach(e=>{
        const t=(e.textContent||'').toLowerCase();
        if(t.includes('subscribe')||t.includes('unlock full access')||t.includes('gh₵30')||t.includes('full access subscription')){
          if(!e.closest('#modalRoot'))e.style.display='none';
        }
      });
    }
    document.querySelectorAll('.note,p,small,span,div').forEach(el=>{
      if(el.children.length)return;let t=el.textContent||'';
      t=t.replace(/20\s*(or|\/|&)\s*30/gi,'30').replace(/GES Promotion Quiz 2027/gi,'Promotion Exam Preparation Practice');
      if(t!==el.textContent)el.textContent=t;
    });
  }
  new MutationObserver(tidy).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('DOMContentLoaded',tidy);
})();

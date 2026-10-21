(()=>{const API='https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/cmlp-access',KEY='cmlp_teacher_access_token_v1';
let token=localStorage.getItem(KEY);if(!token||token.length<45){token=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()].join('-');localStorage.setItem(KEY,token)}
let config=null,status='unregistered';
const css=document.createElement('style');css.textContent='.gate-overlay{position:fixed;inset:0;z-index:99999;background:#100c19c9;display:grid;place-items:center;padding:14px}.gate-overlay[hidden]{display:none!important}.gate-panel{background:white;color:#211a27;width:min(500px,100%);max-height:94vh;overflow-y:auto;border-radius:20px;padding:25px;font:15px/1.55 system-ui;box-shadow:0 20px 55px #0007}.gate-panel h2{margin:0;color:#5c1951;font-size:23px}.gate-panel input{display:block;width:100%;padding:12px;border-radius:10px;border:1px solid #c4b5c5;font:inherit;margin:5px 0 12px;color:#222;background:#fff}.gate-panel button{background:#69205e;color:white;border:0;border-radius:10px;padding:11px 14px;font:700 13px system-ui;cursor:pointer;margin:4px}.gate-panel button.alt{background:#eee6ee;color:#512147}.gate-panel .mtn{font-weight:900;font-size:25px;letter-spacing:.4px;color:#69205e}.gate-panel #gateStatus{font-weight:700;color:#6d1b63}';document.head.append(css);
const overlay=document.createElement('div');overlay.className='gate-overlay';overlay.hidden=true;overlay.innerHTML='<section class="gate-panel" role="dialog" aria-modal="true"><h2 id="gateTitle">Subscription required</h2><p id="gateExplain"></p><p><b>Subscription fee: GH₵<span id="gatePrice">100</span></b></p><p>MTN Mobile Money:</p><p class="mtn" id="gateMtn">0248 481 1762</p><p>Make payment, then request activation. Approval follows manual payment verification by the administrator.</p><label for="gateName">Teacher name</label><input id="gateName" placeholder="Your full name" autocomplete="name"><label for="gatePhone">Contact telephone</label><input id="gatePhone" type="tel" placeholder="024…"><p id="gateStatus" role="status"></p><button id="gateRequest">Request activation</button><button class="alt" id="gateRefresh">Check approval</button><button class="alt" id="gateClose">Close</button><p style="font-size:12px;color:#625764">One approval is linked to the current browser/device. Do not clear browser data before access is activated.</p></section>';document.body.append(overlay);
const $=s=>document.getElementById(s);
async function api(action,data={}){const resp=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,token,...data}),cache:'no-store'});let j=await resp.json();if(!resp.ok)throw Error(j.error||'Service unavailable');return j}
async function refresh(){const x=await api('status');config=x.config;status=x.status;syncPolicy();return x}

const freeYears=()=>Array.isArray(config?.free_years)?config.free_years.map(Number):[];
const freeWeeks=()=>config?.free_weeks||{"1":[1],"2":[1],"3":[1]};
function weekParts(id){
 const m=String(id||"").match(/^y([123])w0?(\d{1,2})$/i);
 return m?{year:Number(m[1]),week:Number(m[2])}:null;
}
function canPlan(id){
 if(config?.mode==="free"||config?.mode==="print"||status==="approved")return true;
 if(config?.mode!=="week1")return false;
 const p=weekParts(id);if(!p)return false;
 return freeYears().includes(p.year)||(Array.isArray(freeWeeks()[p.year])&&freeWeeks()[p.year].some(n=>Number(n)===p.week));
}
function freeLabel(y){
 if(freeYears().includes(y))return "All weeks free";
 const arr=Array.isArray(freeWeeks()[y])?freeWeeks()[y]:[];
 if(!arr.length)return "No free weeks";
 return arr.length===1?"Week "+arr[0]+" free":arr.length+" weeks free";
}
function policyText(){
 if(config?.mode==="free")return "";
 if(config?.mode==="print")return "All 68 weeks are free to prepare and preview. Word/PDF downloads require approval. Subscription: GH₵"+config.price+".";
 if(config?.mode==="locked")return "The administrator has locked lesson generation. Subscription approval is required. GH₵"+config.price+".";
 const s=[1,2,3].map(y=>{
   if(freeYears().includes(y))return "Year "+y+": all weeks free";
   const arr=Array.isArray(freeWeeks()[y])?freeWeeks()[y]:[];
   return "Year "+y+": "+(arr.length?arr.map(n=>"W"+n).join(", ")+" free":"no free weeks");
 });
 return "Free lesson previews — "+s.join(" · ")+". All other weeks require approval. Word/PDF downloads require approval. Subscription GH₵"+config.price+".";
}
const banner=document.createElement("div");
banner.className="gate-public-banner";
banner.id="gatePublicBanner";
banner.setAttribute("role","status");
banner.hidden=true;
const wizard=document.getElementById("guidedWizard");
if(wizard)wizard.insertBefore(banner,wizard.firstChild);
const styles=document.createElement("style");
styles.textContent='.gate-public-banner{background:#fff9e8;color:#554010;border:1px solid #e0c584;border-left:5px solid #be8624;padding:15px 17px;border-radius:14px;margin:0 0 16px;font:700 13.5px/1.65 system-ui;box-shadow:0 6px 18px #29200612}.guided-week[data-gate-access="free"]{border-color:#55a27e!important;background:color-mix(in srgb,#dcf4e4 32%,var(--surface-2))}.guided-week[data-gate-access="restricted"]{border-color:#c6bbc7;opacity:.86}.guided-week .gate-week-label{display:block;font-size:11px;font-weight:850;margin-top:3px}.guided-week[data-gate-access="free"] .gate-week-label{color:#14663d}.guided-week[data-gate-access="restricted"] .gate-week-label{color:#9a5614}.guided-choice .gate-year-label{display:block;font-size:11.5px;font-weight:800;color:var(--accent);grid-column:2}.wk[data-gate-access="restricted"]{background:#f2e9eb;border-color:#ad8e9e!important}.wk[data-gate-access="free"]{box-shadow:0 0 0 2px #56b486 inset}';
document.head.append(styles);
function markPolicy(){
 if(config?.mode==="free"||!config){banner.hidden=true;}else{banner.hidden=false;banner.textContent=policyText();}
 document.querySelectorAll("[data-gweek],[data-week]").forEach(btn=>{
   const id=btn.dataset.gweek||btn.dataset.week;
   const label=canPlan(id)?"✓ Free to plan":"🔒 Subscription required";
   const next=(status==="approved"||config?.mode==="free"||config?.mode==="print")?"free":canPlan(id)?"free":"restricted";
   if(btn.dataset.gateAccess!==next)btn.dataset.gateAccess=next;
   if(btn.hasAttribute("data-gweek")){
     let span=btn.querySelector(".gate-week-label");
     if(!span){span=document.createElement("span");span.className="gate-week-label";const last=btn.querySelector("small");(last?.parentElement||btn).append(span);}
     const expected=config?.mode==="free"?"✓ Available":label;
     if(span.textContent!==expected)span.textContent=expected;
   }
 });
 document.querySelectorAll("[data-gyear]").forEach(btn=>{
  let span=btn.querySelector(".gate-year-label");
  if(!span){span=document.createElement("span");span.className="gate-year-label";btn.append(span);}
  const y=Number(btn.dataset.gyear);
  const message=config?.mode==="free"?"All lessons free":config?.mode==="print"?"Free to plan":config?.mode==="locked"?"Subscription required":status==="approved"?"All lessons unlocked":freeLabel(y);
  if(span.textContent!==message)span.textContent=message;
 });
}
let observer;
if(wizard){
 observer=new MutationObserver(()=>markPolicy());
 for(const id of ["guidedWeeks","guidedYears","wgrid"]){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true});}
}
let replay=false;
document.addEventListener("click",async event=>{
 const button=event.target?.closest?.("button[data-gweek],button[data-week]");
 if(!button||replay)return;
 const id=button.dataset.gweek||button.dataset.week;
 if(!weekParts(id))return;
 // Check on click, not merely at lesson generation. Never select a restricted week first.
 event.preventDefault();
 event.stopImmediatePropagation();
 try{await refresh()}catch(e){show("locked");$("gateExplain").textContent="A connection is required to check available free weeks. "+e.message;return;}
 if(!canPlan(id)){show("week",id);return;}
 replay=true;try{button.click()}finally{replay=false;}
},true);

function show(kind,weekId){$('gateTitle').textContent=kind==='week'?'This week requires subscription':kind==='locked'?'Activate access':'Unlock Word and PDF downloads';$('gateExplain').textContent=kind==='week'?'You selected '+(weekParts(weekId)?'Year '+weekParts(weekId).year+', Week '+weekParts(weekId).week:'a restricted week')+'. '+policyText()+' Pay to unlock this week.':kind==='locked'?'The administrator has enabled subscription-only access.':'You can prepare and preview lessons. Downloading the plan requires approval.';$('gatePrice').textContent=config?.price??100;$('gateMtn').textContent=(config?.payment_phone||'02484811762').replace(/(\d{4})(\d{3})(\d{4})/,'$1 $2 $3');$('gateStatus').textContent=status==='pending'?'Your request is awaiting payment confirmation.':'';overlay.hidden=false;$('gateClose').hidden=kind==='locked';}
async function guard(kind,week){try{await refresh()}catch(e){show('locked');$('gateStatus').textContent='Internet connection required: '+e.message;return false}if(config.mode==='free'||status==='approved')return true;if(kind==='generate'&&canPlan(week))return true;show(kind==='generate'?(config.mode==='week1'?'week':'locked'):'print',week);return false}
$('gateRequest').onclick=async()=>{try{const j=await api('request',{name:$('gateName').value,phone:$('gatePhone').value});status=j.status;$('gateStatus').textContent=status==='approved'?'Subscription already approved.':'Request received. Please pay the displayed MTN number and contact the administrator for verification.'}catch(e){$('gateStatus').textContent=e.message}};
$('gateRefresh').onclick=async()=>{try{await refresh();$('gateStatus').textContent=status==='approved'?'Approved. Close this message and try again.':'Current status: '+status}catch(e){$('gateStatus').textContent=e.message}};
$('gateClose').onclick=()=>{if(config?.mode==='locked'&&status!=='approved')return;overlay.hidden=true;}

function syncPolicy(){
 if(!config)return;
 markPolicy();
 if(config.mode==='free'||status==='approved'){overlay.hidden=true;return;}
 if(config.mode==='locked'){show('locked');return;}
 if(!overlay.hidden){if($('gateTitle').textContent==='Activate access')overlay.hidden=true;}
}
function heartbeat(){if(!document.hidden)refresh().catch(e=>console.warn('Policy refresh failed',e))}
setInterval(heartbeat,6000);
document.addEventListener('visibilitychange',heartbeat);
window.addEventListener('focus',heartbeat);
window.CMLP={guardExport:()=>guard('export'),guardGeneration:week=>guard('generate',week),refresh,getState:()=>({config,status}),canPlan,markPolicy};
refresh().catch(()=>{});
})();
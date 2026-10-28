(()=>{
'use strict';
const API='https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/ges-quiz-api';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token='',users=[],stats={},settings={},tab='pending',search='',busy=false;
const toast=(msg,bad=false)=>{const t=$('toastRoot');t.innerHTML='<div class="toast '+(bad?'bad':'')+'">'+esc(msg)+'</div>';setTimeout(()=>{t.innerHTML=''},4800)};
async function api(action,body={}){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...body})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
async function decryptLegacyAdminKey(pass){
 const blob=window.GES_ADMIN_BLOB;if(!blob||!crypto?.subtle)return null;
 const bytes=v=>Uint8Array.from(atob(v),ch=>ch.charCodeAt(0));
 const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(blob.salt),iterations:blob.iterations,hash:'SHA-256'},keyMaterial,{name:'AES-GCM',length:256},false,['decrypt']);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(blob.iv),additionalData:new TextEncoder().encode(blob.aad)},key,bytes(blob.data));
 return new TextDecoder().decode(plain).trim();
}
let adminPolling=false,adminSnapshot='';
async function liveAdminSync(){
 if(!token||adminPolling||document.hidden||busy)return;
 adminPolling=true;
 try{
  const d=await api('admin_dashboard');
  const next=d.users||[];
  const signature=JSON.stringify(next.map(u=>[u.id,u.status,u.phone,u.fullName,u.attemptCount]));
  if(signature!==adminSnapshot){
   const oldPending=users.filter(u=>u.status==='pending').length;
   const initialized=!!adminSnapshot;
   users=next;stats=d.stats||{};settings=d.settings||{};adminSnapshot=signature;
   if(initialized&&stats.pending>oldPending)toast('New pending subscriber request received!');
   if($('adminDashboard')&&!$('adminDashboard').classList.contains('hidden')){
    if(document.activeElement===$('adminSearch')){renderList();document.querySelectorAll('[data-tab]').forEach(b=>{const label=b.querySelector('b');if(!label)return;const n={pending:stats.pending,approved:stats.approved,free:stats.free,all:stats.total};if(n[b.dataset.tab]!==undefined)label.textContent=n[b.dataset.tab]});}
    else render();
   }
  }
 }catch(e){console.warn('Live admin sync temporarily unavailable');}
 finally{adminPolling=false;}
}
setInterval(liveAdminSync,1200);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)liveAdminSync()});
function showLogin(){token='';$('adminLogin').classList.remove('hidden');$('adminDashboard').classList.add('hidden')}
async function refresh(){const d=await api('admin_dashboard');users=d.users||[];stats=d.stats||{};settings=d.settings||{};adminSnapshot=JSON.stringify(users.map(u=>[u.id,u.status,u.phone,u.fullName,u.attemptCount]));render();}
function activeUsers(){const set=tab==='approved'?['approved']:tab==='pending'?['pending']:tab==='free'?['free']:tab==='suspended'?['suspended']:[];return users.filter(u=>(!set.length||set.includes(u.status))&&((u.fullName||'')+' '+(u.phone||'')).toLowerCase().includes(search.toLowerCase()));}
function renderList(){const list=$('adminLearners');if(!list)return;const us=activeUsers();$('adminCount').textContent=us.length+' learner'+(us.length===1?'':'s');list.innerHTML=us.length?us.map(u=>'<div class="manager-learner"><div class="manager-identity"><b>'+esc(u.fullName)+'</b><span>'+esc(u.phone)+'</span><small>'+esc(u.status.toUpperCase())+' · '+(u.attemptCount||0)+' quiz attempts</small></div><div class="manager-buttons">'+(u.status!=='approved'?'<button type="button" data-act="approve" data-id="'+esc(u.id)+'">✓ Approve</button>':'')+'<button type="button" data-act="reset" data-id="'+esc(u.id)+'" class="manager-reset">🔑 Reset PIN</button><button type="button" data-act="status" data-id="'+esc(u.id)+'">Change status</button><button type="button" data-act="device" data-id="'+esc(u.id)+'">Reset device</button></div></div>').join(''):'<div class="manager-empty">No learners in this section. Try another section or search.</div>';
}
function render(){
$('adminLogin').classList.add('hidden');$('adminDashboard').classList.remove('hidden');
$('adminDashboard').innerHTML='<div class="manager-top"><div><small>GES PROMOTION · ADMINISTRATOR</small><h2>Subscriber Control Centre</h2><p>Review registrations, approve learners, and assist subscribers with login.</p></div><button type="button" id="adminExit">Log out</button></div><div class="manager-stats"><button data-tab="pending">⏳ <b>'+ (stats.pending||0) +'</b><small>Pending approval</small></button><button data-tab="approved">✓ <b>'+(stats.approved||0)+'</b><small>Approved subscribers</small></button><button data-tab="free">👤 <b>'+(stats.free||0)+'</b><small>Free registrations</small></button><button data-tab="all">📋 <b>'+(stats.total||users.length)+'</b><small>All accounts</small></button></div><nav class="manager-tabs"><button data-tab="pending">Pending</button><button data-tab="approved">Approved Subscribers</button><button data-tab="free">Free</button><button data-tab="suspended">Suspended</button><button data-tab="all">All</button></nav><section class="manager-list-head"><h3 id="adminListTitle"></h3><input id="adminSearch" placeholder="Search name or phone number" aria-label="Search learners" value="'+esc(search)+'"><div class="manager-meta"><span id="adminCount"></span><button type="button" id="adminRefresh">↻ Refresh</button></div></section><div id="adminLearners"></div><section class="manager-settings"><h3>Platform Settings</h3><p>Existing subscription settings are retained. You may update them here.</p><form id="adminSettingsForm"><label>Subscription price <input name="subscription_price" value="'+esc(settings.subscription_price||'')+'"></label><label>Contact name <input name="contact_name" value="'+esc(settings.contact_name||'')+'"></label><label>Contact phone <input name="contact_phone" value="'+esc(settings.contact_phone||'')+'"></label><button type="submit">Save settings</button></form></section>';
$('adminExit').onclick=showLogin;$('adminRefresh').onclick=()=>refresh().catch(e=>toast(e.message,true));
$('adminSearch').oninput=e=>{search=e.target.value;renderList()};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;setTab()});
$('adminLearners').onclick=onLearnerAction;
$('adminSettingsForm').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));try{await api('admin_update_settings',data);toast('Settings saved');await refresh()}catch(er){toast(er.message,true)}};
setTab();
}
function setTab(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));$('adminListTitle').textContent=({approved:'Approved Subscribers',pending:'Pending Approval',free:'Free Registrations',suspended:'Suspended Accounts',all:'All Learners'})[tab];renderList();}
async function onLearnerAction(e){
const btn=e.target.closest('[data-act]');if(!btn||busy)return;const u=users.find(x=>x.id===btn.dataset.id);if(!u)return;
const act=btn.dataset.act;let action,body={userId:u.id};
if(act==='reset'){
const pin=prompt('Assign a NEW 4-digit PIN for '+u.fullName+' ('+u.phone+'). Share it privately with the learner.');
if(pin===null)return;if(!/^\d{4}$/.test(pin)){toast('PIN must contain exactly four digits.',true);return;}
if(!confirm('Reset login PIN for '+u.fullName+'? Their subscription will remain unchanged.'))return;
action='admin_reset_pin';body.newPin=pin;
}else if(act==='approve'){if(!confirm('Approve subscription for '+u.fullName+'?'))return;action='admin_approve';
}else if(act==='device'){if(!confirm('Reset saved device bindings for '+u.fullName+'?'))return;action='admin_reset_devices';
}else if(act==='status'){const val=prompt('New status for '+u.fullName+': approved, pending, free or suspended',u.status);if(!val)return;if(!['approved','pending','free','suspended'].includes(val.trim().toLowerCase()))return toast('Invalid status',true);action='admin_set_status';body.status=val.trim().toLowerCase();if(!confirm('Change account status to '+body.status+'?'))return;
}else return;
busy=true;btn.disabled=true;
try{await api(action,body);toast(act==='reset'?'PIN updated. The learner can now sign in with the new PIN.':'Account successfully updated.');await refresh()}catch(err){toast(err.message,true)}finally{busy=false;if(btn.isConnected)btn.disabled=false}
}
$('adminLoginForm').addEventListener('submit',async e=>{
e.preventDefault();const pw=$('adminPassword').value;const alert=$('adminLoginAlert');alert.textContent='Checking administrator access…';
try{let d;try{d=await api('admin_login',{adminKey:pw})}catch(first){let alt=null;try{alt=await decryptLegacyAdminKey(pw)}catch{}if(!alt)throw first;d=await api('admin_login',{adminKey:alt})}token=d.token;alert.textContent='';$('adminPassword').value='';await refresh();}catch(err){token='';alert.textContent=err.message||'Unable to sign in.';}
});
})();
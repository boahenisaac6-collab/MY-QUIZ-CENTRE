(()=>{
'use strict';
const API='https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/ges-quiz-api';
const $=id=>document.getElementById(id);
const state={token:'',deviceId:'',user:null,settings:{},bank:window.FREE_BANK||[],attempt:null,quiz:[],answers:{},index:0,startedAt:0,timer:null,left:0};
try{state.token=localStorage.getItem('promo_token_v4')||localStorage.getItem('promo_token_v3')||''}catch{}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg,bad=false){const x=$('toastRoot');if(!x)return;x.innerHTML=`<div class="toast ${bad?'bad':''}">${esc(msg)}</div>`;setTimeout(()=>{if(x)x.innerHTML=''},3500)}
function setView(id){['authScreen','dashboardScreen','quizScreen','resultScreen','performanceScreen'].forEach(x=>$(x)?.classList.add('hidden'));$(id)?.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function showAuth(mode='register'){
 setView('authScreen');
 $('authChooser')?.classList.toggle('hidden',mode!=='chooser');
 $('registerPanel')?.classList.toggle('hidden',mode!=='register');
 $('loginPanel')?.classList.toggle('hidden',mode!=='login');
 if($('authTitle'))$('authTitle').textContent=mode==='register'?'Create your account':mode==='login'?'Welcome back':'Choose how to continue';
 if($('authSubtitle'))$('authSubtitle').textContent=mode==='register'?'First time here? Register once, then begin the free 30-question practice.':mode==='login'?'Already registered? Enter the same telephone number and 4-digit password.':'New users register first. Existing users log in and go straight to their practice dashboard.';
 setTimeout(()=>{(mode==='login'?$('loginPhone'):mode==='register'?$('regName'):null)?.focus({preventScroll:true})},80);
}
function randomDeviceId(){try{const a=new Uint8Array(16);crypto.getRandomValues(a);return 'dev_'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}catch{return 'dev_'+Date.now()+'_'+Math.random().toString(36).slice(2)}}
function storageRead(){try{return localStorage.getItem('promo_device_v4')||localStorage.getItem('promo_device_v3')||''}catch{return ''}}
function setupDeviceInBackground(){
 let id=storageRead()||randomDeviceId();state.deviceId=id;
 try{localStorage.setItem('promo_device_v4',id)}catch{}
 try{document.cookie=`promo_device_v4=${encodeURIComponent(id)}; Max-Age=157680000; Path=/; SameSite=Lax; Secure`}catch{}
 if(!('indexedDB' in window))return;
 try{const r=indexedDB.open('promo_secure_store_v4',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};r.onsuccess=()=>{try{const tx=r.result.transaction('kv','readwrite');tx.objectStore('kv').put(id,'deviceId')}catch{}}}catch{}
}
async function api(action,body={}){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
 try{
  const payload={action,...body};if(['register','login'].includes(action))payload.deviceId=state.deviceId||storageRead()||randomDeviceId();
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',...(state.token?{Authorization:'Bearer '+state.token}:{})},body:JSON.stringify(payload),signal:c.signal});
  const d=await r.json().catch(()=>({error:'The server returned an unreadable response.'}));
  if(!r.ok)throw Object.assign(new Error(d.error||'Request failed'),{data:d,status:r.status});return d;
 }catch(e){if(e?.name==='AbortError')throw new Error('The connection took too long. Check your internet and try again.');throw e}finally{clearTimeout(t)}
}
function saveSession(d){state.token=d.token||'';state.user=d.user||null;state.settings=d.settings||{};try{localStorage.setItem('promo_token_v4',state.token);localStorage.removeItem('promo_token_v3');if(state.user?.phone)localStorage.setItem('promo_saved_phone_v4',state.user.phone);localStorage.setItem('promo_registered_here_v4','yes')}catch{}}
function clearSession(){state.token='';state.user=null;try{localStorage.removeItem('promo_token_v4');localStorage.removeItem('promo_token_v3')}catch{}}
function bindImmediate(){
 $('newUserCard')?.addEventListener('click',()=>showAuth('register'));
 $('existingUserCard')?.addEventListener('click',()=>showAuth('login'));
 document.querySelectorAll('[data-back-auth]').forEach(b=>b.addEventListener('click',()=>showAuth('chooser')));
 $('registerGoLogin')?.addEventListener('click',()=>showAuth('login'));
 $('loginGoRegister')?.addEventListener('click',()=>showAuth('register'));
 $('registerForm')?.addEventListener('submit',register);
 $('loginForm')?.addEventListener('submit',login);
 $('prevBtn')?.addEventListener('click',()=>{if(state.index>0){state.index--;renderQuestion()}});
 $('nextBtn')?.addEventListener('click',()=>{if(state.index<state.quiz.length-1){state.index++;renderQuestion()}else finishQuiz(false)});
 $('exitQuiz')?.addEventListener('click',()=>{if(confirm('Leave this practice? Your current answers will not be submitted.')){clearInterval(state.timer);renderDashboard()}});
}
async function register(e){e.preventDefault();const b=$('registerBtn');if(!b)return;b.disabled=true;b.textContent='Creating account…';try{const d=await api('register',{fullName:$('regName').value.trim(),phone:$('regPhone').value.trim(),pin:$('regPin').value});saveSession(d);toast('Registration complete! Your free practice and full-access instructions are ready.');renderDashboard()}catch(err){if(err.status===409&&String(err.message).includes('already registered')){try{$('loginPhone').value=$('regPhone').value}catch{}showAuth('login');toast('This number already has an account. Please log in instead.',true)}else toast(err.message||'Registration failed.',true)}finally{b.disabled=false;b.textContent='Register & Continue'}}
async function login(e){e.preventDefault();const b=$('loginBtn');if(!b)return;b.disabled=true;b.textContent='Checking account…';try{const d=await api('login',{phone:$('loginPhone').value.trim(),pin:$('loginPin').value});saveSession(d);toast('Login successful');await prepareBank();renderDashboard()}catch(err){toast(err.message||'Login failed.',true)}finally{b.disabled=false;b.textContent='Log In & Open Quiz'}}
async function restoreSession(){if(!state.token)return showReturningAuth();try{const d=await api('me');state.user=d.user;state.settings=d.settings||{};await prepareBank();renderDashboard()}catch{clearSession();showReturningAuth()}}
function showReturningAuth(){
 let saved='';try{saved=localStorage.getItem('promo_saved_phone_v4')||''}catch{}
 showAuth(saved?'login':'register');
 if(saved&&$('loginPhone'))$('loginPhone').value=saved;
}
function b64Bytes(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function prepareBank(){state.bank=window.FREE_BANK||[];if(state.user?.status!=='approved')return;if(!window.PREMIUM_BANK_DATA||!window.PREMIUM_BANK_IV)return toast('Full question bank is still loading. Reload once.',true);try{const k=await api('get_full_key');const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(k.key));const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);const compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64Bytes(window.PREMIUM_BANK_IV)},key,b64Bytes(window.PREMIUM_BANK_DATA));if(!('DecompressionStream' in window))throw new Error('Please update your browser for full-access question loading.');const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));const bank=JSON.parse(await new Response(stream).text());if(!Array.isArray(bank)||bank.length<900)throw new Error('Question bank verification failed');state.bank=bank}catch(e){console.error(e);state.bank=window.FREE_BANK||[];toast(e.message||'Full question bank could not be opened.',true)}}
function historyKey(){return 'promo_hist_v4_'+(state.user?.id||'guest')}
function readHistory(){try{return JSON.parse(localStorage.getItem(historyKey())||'[]')}catch{return []}}
function addHistory(row){try{const h=readHistory();h.push(row);localStorage.setItem(historyKey(),JSON.stringify(h.slice(-50)))}catch{}}
function subTeaser(pending=false,completed=false){return `<section class="subscribe-card blink-border"><div class="sub-badge">✨ ${completed?'FREE PRACTICE COMPLETED':'FULL ACCESS AVAILABLE'}</div><h3>Full Access: GH₵30 Subscription</h3><p><strong>Your account is registered.</strong> You may practise the free 30 questions now. To unlock the study book, all promotion ranks and complete question banks, pay <strong>GH₵30</strong> by Mobile Money to <strong>0248 481 762 (ISAAC BOAHEN)</strong>. Then contact Sir Isaac on <strong>0248 481 762</strong> and tap <strong>I Have Paid / Request Activation</strong>. Your full access will open automatically after approval.</p><div class="price">GH₵30</div><div class="momo"><small>MTN MOBILE MONEY</small><strong>0248 481 762</strong><b>ISAAC BOAHEN</b><button id="copyMomo" type="button" class="ghost">📋 Copy MoMo Number</button></div><a class="whatsapp" target="_blank" rel="noopener" href="https://wa.me/233248481762?text=${encodeURIComponent('Hello Sir Isaac, I want full access to the Promotion Exam Preparation Practice platform. I will pay/have paid GH₵30 to 0248 481 762, ISAAC BOAHEN. Please activate my account.')}">🟢 WhatsApp Sir Isaac</a><button id="subscribeBtn" type="button" class="primary block">${pending?'Activation Request Sent':'I Have Paid / Request Activation'}</button>${pending?'<small class="pending-text">Your activation request has been recorded. You can still repeat the free 30-question practice while waiting.</small>':''}</section>`}
function renderDashboard(){
 setView('dashboardScreen');const u=state.user||{},premium=u.status==='approved',pending=u.status==='pending',topics=[...new Set(state.bank.map(q=>q.topic).filter(Boolean))].sort(),ranks=[...new Set(state.bank.map(q=>q.rank).filter(Boolean))].sort();
 $('dashboardScreen').innerHTML=`<div class="dash-head"><div><small>WELCOME</small><h2>${esc(u.fullName||u.full_name||'Learner')}</h2><p>${premium?'Full access is active.':'Your free 30-question practice is ready.'}</p></div><button id="logoutBtn" type="button" class="ghost">Log out</button></div><div class="status-pill ${premium?'ok':pending?'pending':'free'}">${premium?'✓ FULL ACCESS':pending?'⏳ ACTIVATION REQUESTED':'FREE PRACTICE'}</div><style id="subscriberCardsStyles">.subscriber-resource{position:relative;overflow:hidden;margin:14px 0;padding:3px;border-radius:21px;background:linear-gradient(120deg,#fbd56a,#2cc9aa,#6589fb,#fbd56a);background-size:280% 280%;animation:subscriberBorder 7s linear infinite;box-shadow:0 12px 28px #163d5c20}.subscriber-resource>.subscriber-inner{position:relative;border-radius:18px;padding:20px 17px;background:linear-gradient(140deg,#102a54,#174b86);color:#fff}.subscriber-resource.bank>.subscriber-inner{background:linear-gradient(140deg,#03492f,#08774e)}.subscriber-resource.practice>.subscriber-inner{background:linear-gradient(145deg,#fffef4,#e9f4fc);color:#133f39}.subscriber-resource h3{margin:8px 0;font-size:21px;line-height:1.3;color:inherit}.subscriber-resource p{font-size:14px;line-height:1.55;margin:8px 0 17px;opacity:.93}.subscriber-resource .subscriber-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;color:#ffdb85}.subscriber-resource.practice .subscriber-kicker{color:#076b46}.subscriber-resource button.subscriber-open{display:block;width:100%;padding:15px 11px;border:0;border-radius:12px;background:#fcd116;color:#132e25;font-size:15px;font-weight:900;box-shadow:0 5px 0 #b78507;cursor:pointer;animation:subscriberGlow 2.5s ease-in-out infinite}.subscriber-resource.bank button.subscriber-open{background:#f6fff5;box-shadow:0 5px 0 #a5cbbb}.subscriber-resource.practice button.subscriber-open{background:#006b3f;color:#fff;box-shadow:0 5px 0 #034b2c}.subscriber-resource.practice label{display:grid;gap:6px;margin:10px 0;font-weight:750;font-size:14px}.subscriber-resource.practice select{max-width:100%;width:100%;border:1px solid #d3e0e8;border-radius:10px;padding:11px;background:white;color:#123}.subscriber-resource.practice .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.subscriber-card-index{display:inline-block;background:#ffffff25;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:900}.subscriber-resource.practice .subscriber-card-index{background:#d8eadf}@keyframes subscriberBorder{to{background-position:280% 0}}@keyframes subscriberGlow{50%{filter:brightness(1.06);transform:translateY(-2px);box-shadow:0 8px 18px #f6d25555}}@media(max-width:480px){.subscriber-resource>.subscriber-inner{padding:17px 14px}.subscriber-resource.practice .grid2{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.subscriber-resource,.subscriber-resource button.subscriber-open{animation:none}}</style>${premium?'<section class="subscriber-resource book"><div class="subscriber-inner"><span class="subscriber-card-index">01 · STUDY FIRST</span><div class="subscriber-kicker" style="margin-top:10px">NEW · INCLUDED WITH YOUR SUBSCRIPTION</div><h3>📘 Animated Study Book + 140-Question Quiz</h3><p>Read the study chapters and practise 140 interactive questions. No extra payment or password.</p><button id="openStudyBookAddon" type="button" class="subscriber-open">📖 Open Study Book & Quiz →</button></div></section>':''}${premium?'<section class="subscriber-resource bank"><div class="subscriber-inner"><span class="subscriber-card-index">02 · QUESTION BANK</span><div class="subscriber-kicker" style="margin-top:10px">INCLUDED WITH YOUR SUBSCRIPTION</div><h3>📚 1,128 GES Promotion Questions</h3><p>Practice questions across all six promotion ranks with immediate explanations and live scoring.</p><button id="openExtraBank" type="button" class="subscriber-open">▶ Open Question Bank →</button></div></section>':''}<section class="practice-card subscriber-resource practice"><div class="subscriber-inner"><span class="subscriber-card-index">03 · CUSTOM PRACTICE</span><div class="card-icon">📝</div><div><h3>${premium?'Choose your practice':'Free 30-question practice'}</h3><p>${premium?'Choose a practice size and optional filters from the full question bank.':'Practise the free 30 questions, see your score, and repeat them as often as you need.'}</p></div>${premium?`<div class="grid2"><label>Questions<select id="countSel"><option>20</option><option selected>30</option><option>50</option><option>100</option><option>200</option></select></label><label>Rank<select id="rankSel"><option>All</option>${ranks.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label></div><label>Topic<select id="topicSel"><option>All</option>${topics.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`:''}<button id="startPractice" type="button" class="primary block pulse-soft subscriber-open">▶ ${premium?'Start Practice':'Start Free 30 Questions'}</button></div></section><div class="dash-actions"><button id="performanceBtn" type="button" class="action-card"><span>📈</span><b>My Performance</b><small>Scores and improvement</small></button></div>${premium?'':subTeaser(pending,false)}<div class="independent-note">Independent study and revision platform. Not an official Ghana Education Service examination portal.</div>`;
 $('openExtraBank')?.addEventListener('click',openExtraBank);$('openStudyBookAddon')?.addEventListener('click',openStudyBookAddon);
 $('logoutBtn').onclick=logout;$('startPractice').onclick=startPractice;$('performanceBtn').onclick=showPerformance;$('subscribeBtn')?.addEventListener('click',requestSubscription);$('copyMomo')?.addEventListener('click',copyMomo);
}
async function openExtraBank(){
 if(state.user?.status!=='approved'){toast('Subscriber approval required.',true);return;}
 if(document.getElementById('extraBankOverlay'))return;
 const host=document.createElement('div');host.id='extraBankOverlay';
 host.style.cssText='position:fixed;inset:0;z-index:99999;background:#f1f7f3;display:flex;flex-direction:column';
 host.innerHTML='<div style="min-height:54px;padding:8px 12px;padding-top:max(8px,env(safe-area-inset-top));display:flex;align-items:center;gap:12px;background:#034d2f;color:white"><button id="closeExtraBank" type="button" style="padding:10px 13px;background:white;color:#034d2f;border:0;border-radius:10px;font-weight:800">← Back</button><strong style="font-size:14px">GES Promotion · 984 Questions</strong></div><div id="extraBankContent" style="flex:1;display:grid;place-items:center;padding:18px">Verifying your approved subscription…</div>';
 document.body.appendChild(host);
 host.querySelector('#closeExtraBank').onclick=()=>host.remove();
 try{
  const response=await fetch('https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/ges-promotion-bank-addon',{method:'GET',headers:{Authorization:'Bearer '+state.token},cache:'no-store'});
  if(!response.ok)throw new Error(response.status===401?'Please sign in again.':response.status===403?'Approved subscription required.':'Unable to load the question bank.');
  const html=await response.text();
  if(!html.includes('id="bank"')||!html.includes('id="startBtn"'))throw new Error('Question bank verification failed.');
  if(!host.isConnected)return;
  const frame=document.createElement('iframe');frame.title='GES Promotion Question Bank — 984 Questions';frame.setAttribute('allow','autoplay');frame.style.cssText='width:100%;flex:1;min-height:0;border:0;background:#fff';frame.srcdoc=html;
  host.querySelector('#extraBankContent').replaceWith(frame);
 }catch(e){if(host.isConnected)host.querySelector('#extraBankContent').textContent=e.message||'Unable to verify your subscription.';}
}
async function openStudyBookAddon(){
 if(state.user?.status!=='approved'){toast('Approved subscription required.',true);return;}
 if(document.getElementById('studyBookSubscriberOverlay'))return;
 const host=document.createElement('div');host.id='studyBookSubscriberOverlay';
 host.style.cssText='position:fixed;inset:0;z-index:99999;background:#0e1b34;display:flex;flex-direction:column';
 host.innerHTML='<div style="flex:none;min-height:49px;padding:7px 12px;padding-top:max(7px,env(safe-area-inset-top));display:flex;align-items:center;gap:10px;background:#102a54;color:white"><button id="closeStudyBookAddon" type="button" style="padding:9px 13px;border:0;border-radius:9px;background:white;color:#102a54;font-weight:850">← Back</button><strong style="font-size:13px">GES Promotion · Study Book & 140 Questions</strong></div><div id="studyBookLoading" style="flex:1;display:grid;place-items:center;color:white;text-align:center;padding:20px">Verifying your subscription and opening your book…</div>';
 document.body.appendChild(host);
 host.querySelector('#closeStudyBookAddon').onclick=()=>host.remove();
 try{
  const response=await fetch('https://dhnrrruishllmnhafjdd.supabase.co/functions/v1/ges-promotion-study-book-addon',{method:'GET',headers:{Authorization:'Bearer '+state.token},cache:'no-store'});
  if(!response.ok)throw new Error(response.status===401?'Please log in again.':response.status===403?'Approved subscription required.':'Study book temporarily unavailable.');
  const html=await response.text();
  if(!html.includes('id="homeView"')||!html.includes('id="quizView"'))throw new Error('Study book data verification failed.');
  if(!host.isConnected)return;
  const frame=document.createElement('iframe');frame.title='GES Promotion Animated Study Book and Quiz';frame.setAttribute('allow','autoplay');frame.style.cssText='width:100%;flex:1;min-height:0;border:0;background:#0c1423';frame.srcdoc=html;
  host.querySelector('#studyBookLoading').replaceWith(frame);
 }catch(e){if(host.isConnected)host.querySelector('#studyBookLoading').textContent=e.message||'Unable to open the study book.';}
}
async function copyMomo(){try{await navigator.clipboard.writeText('0248481762');toast('MoMo number copied')}catch{toast('MoMo: 0248 481 762')}}
async function requestSubscription(){if(state.user?.status==='approved')return;try{const d=await api('request_subscription');state.user.status=d.status||'pending';toast('Activation request sent');renderDashboard()}catch(e){toast(e.message,true)}}
async function logout(){try{await api('logout')}catch{}clearSession();showAuth('chooser')}
async function startPractice(){const premium=state.user?.status==='approved';let count=premium?Number($('countSel')?.value||30):30,rank=premium?$('rankSel')?.value||'All':'All',topic=premium?$('topicSel')?.value||'All':'All';let pool=state.bank.filter(q=>(rank==='All'||q.rank===rank)&&(topic==='All'||q.topic===topic));if(!pool.length)return toast('No questions match those filters.',true);count=Math.min(count,pool.length);pool=[...pool].sort(()=>Math.random()-.5);state.quiz=pool.slice(0,count);state.answers={};state.index=0;state.startedAt=Date.now();try{state.attempt=await api('start_attempt',{count,rank,topic})}catch(e){return toast(e.message||'Could not start practice.',true)}state.left=count*60;setView('quizScreen');startTimer();renderQuestion()}
function startTimer(){clearInterval(state.timer);tick();state.timer=setInterval(()=>{state.left--;tick();if(state.left<=0){clearInterval(state.timer);finishQuiz(true)}},1000)}
function tick(){const m=Math.floor(Math.max(0,state.left)/60),s=Math.max(0,state.left)%60;if($('timerText'))$('timerText').textContent=`${m}:${String(s).padStart(2,'0')}`}
function renderQuestion(){const q=state.quiz[state.index];if(!q)return;const picked=state.answers[q.id];$('qProgress').textContent=`Question ${state.index+1} of ${state.quiz.length}`;$('answeredCount').textContent=`${Object.keys(state.answers).length} answered`;$('progressBar').style.width=`${((state.index+1)/state.quiz.length)*100}%`;$('qTags').innerHTML=`${q.rank?`<span class="tag">${esc(q.rank)}</span>`:''}${q.topic?`<span class="tag">${esc(q.topic)}</span>`:''}`;$('qNo').textContent=`QUESTION ${state.index+1}`;$('qText').innerHTML=q.q||q.question||'';$('options').innerHTML=(q.options||[]).map((o,i)=>`<button class="option ${picked!==undefined?(i===q.answer?'correct':i===picked?'wrong':''):''}" data-i="${i}" ${picked!==undefined?'disabled':''}><span class="letter">${String.fromCharCode(65+i)}</span><span class="otxt">${o}</span><span class="mark">${picked!==undefined?(i===q.answer?'✓':i===picked?'✕':''):''}</span></button>`).join('');$('explanation').classList.toggle('hidden',picked===undefined);$('explanation').innerHTML=picked===undefined?'':`<strong>Explanation:</strong> ${q.explanation||'Correct answer: '+((q.options||[])[q.answer]||'')}`;document.querySelectorAll('#options .option').forEach(b=>b.onclick=()=>answer(q,Number(b.dataset.i)));$('prevBtn').disabled=state.index===0;$('nextBtn').textContent=state.index===state.quiz.length-1?'Submit Practice':'Next →'}
function answer(q,i){if(state.answers[q.id]!==undefined)return;state.answers[q.id]=i;renderQuestion()}
async function finishQuiz(timedOut){clearInterval(state.timer);const score=state.quiz.reduce((n,q)=>n+(state.answers[q.id]===q.answer?1:0),0),answered=Object.keys(state.answers).length,duration=Math.round((Date.now()-state.startedAt)/1000);let r={score,total:state.quiz.length,answered,percentage:Math.round(score*100/state.quiz.length)};try{r=await api('submit_attempt',{attemptId:state.attempt?.attemptId,score,answered,durationSeconds:duration,timedOut})}catch(e){toast('Result saved on this device; server confirmation failed.',true)}addHistory({date:new Date().toISOString(),score:r.score??score,total:r.total??state.quiz.length,percentage:r.percentage??Math.round(score*100/state.quiz.length)});renderResult(r,state.user?.status!=='approved')}
function renderResult(r,free=false){setView('resultScreen');const pct=r.percentage??0;$('resultScreen').innerHTML=`<section class="result-card"><div class="result-ring"><strong>${pct}%</strong><span>${r.score}/${r.total}</span></div><h2>${pct>=80?'Excellent work!':pct>=60?'Good progress!':'Keep practising!'}</h2><p>You answered ${r.answered??Object.keys(state.answers).length} questions. ${free?'You can repeat the free 30 questions or activate full access below.':''}</p><button id="againBtn" type="button" class="primary block">${free?'Practise Free 30 Again':'Start Another Practice'}</button><button id="perfBtn2" type="button" class="ghost block">View Performance</button><button id="dashBtn" type="button" class="ghost block">Back to Dashboard</button></section>${free?subTeaser(state.user?.status==='pending',true):''}`;$('againBtn').onclick=startPractice;$('perfBtn2').onclick=showPerformance;$('dashBtn').onclick=renderDashboard;$('subscribeBtn')?.addEventListener('click',requestSubscription);$('copyMomo')?.addEventListener('click',copyMomo)}
async function showPerformance(){const local=readHistory();setView('performanceScreen');let rows=local,summary=null;if(state.user?.status==='approved'){try{const d=await api('performance');if(Array.isArray(d.attempts))rows=d.attempts.map(x=>({date:x.completed_at,score:x.score,total:x.question_count,percentage:x.percentage}));summary=d.summary}catch{}}if(!summary&&rows.length){const p=rows.map(x=>Number(x.percentage)||0),first=p[0],latest=p[p.length-1];summary={attempts:rows.length,average:Math.round(p.reduce((a,b)=>a+b,0)/p.length),best:Math.max(...p),improvement:latest-first}}$('performanceScreen').innerHTML=`<section class="panel"><div class="panel-head"><button id="perfBack" type="button" class="back">←</button><div><h3>My Performance</h3><small>Your practice progress</small></div></div>${summary?`<div class="stats"><div><strong>${summary.attempts}</strong><span>Attempts</span></div><div><strong>${summary.average}%</strong><span>Average</span></div><div><strong>${summary.best}%</strong><span>Best</span></div><div><strong>${summary.improvement>=0?'+':''}${summary.improvement}%</strong><span>Improvement</span></div></div>`:'<div class="hint">Complete a practice to start building your performance history.</div>'}<div class="history">${rows.slice().reverse().map((x,i)=>`<div class="history-row"><b>${x.percentage}%</b><span>${x.score}/${x.total}</span><small>${x.date?new Date(x.date).toLocaleString():`Attempt ${rows.length-i}`}</small></div>`).join('')}</div></section>`;$('perfBack').onclick=renderDashboard}
let learnerSyncBusy=false,learnerSyncTick=0;
async function liveLearnerSync(){
 if(!state.token||!state.user||learnerSyncBusy||document.hidden)return;
 if(document.getElementById('extraBankOverlay')||document.getElementById('studyBookSubscriberOverlay'))return;
 learnerSyncBusy=true;
 try{
  const result=await api('me');
  if(!state.user||!state.token)return;
  const before=state.user.status,after=result.user?.status;
  if(after&&after!==before){
   state.user=result.user;state.settings=result.settings||state.settings;
   if(after==='approved'){
    toast('🎉 Your subscription is approved! Full access is now active.');
    await prepareBank();
   }else toast('Your subscription status has been updated.');
   if($('dashboardScreen')&&!$('dashboardScreen').classList.contains('hidden'))renderDashboard();
  }
 }catch(e){if(e.status===401){console.warn('Learner session needs login');}}
 finally{learnerSyncBusy=false;}
}
setInterval(liveLearnerSync,1500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)liveLearnerSync()});
function boot(){bindImmediate();showReturningAuth();setupDeviceInBackground();restoreSession()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
(()=>{
  const nativeFetch=window.fetch.bind(window);
  const MOMO='0248481762';
  const MOMO_DISPLAY='0248 481 762';
  const MOMO_NAME='ISAAC BOAHEN';
  const WA='233248481762';
  let accountStatus='free';
  let currentUser=null;
  let lastPopupSignature='';

  const withSettings=(data)=>{
    if(!data || typeof data!=='object') return data;
    if(data.user){
      currentUser=data.user;
      accountStatus=data.user.status||accountStatus;
    }
    if(data.settings){
      data.settings.free_sizes='30';
      data.settings.subscription_price='30';
      data.settings.contact_name='Sir Isaac';
      data.settings.contact_phone=MOMO;
      data.settings.momo_number=MOMO;
      data.settings.momo_account_name=MOMO_NAME;
    }
    if(Array.isArray(data.freeSizes)) data.freeSizes=[30];
    return data;
  };

  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const cloned=response.clone();
      const data=withSettings(await cloned.json());
      return new Response(JSON.stringify(data),{
        status:response.status,
        statusText:response.statusText,
        headers:response.headers
      });
    }catch(_e){
      return response;
    }
  };

  function extractScore(){
    const root=document.getElementById('resultScreen');
    if(!root || root.classList.contains('hidden')) return null;
    const text=root.innerText||'';
    const pctMatch=text.match(/(\d{1,3})\s*%/);
    const fractionMatch=text.match(/(\d+)\s*\/\s*(30|[1-9]\d{1,2})/);
    const pct=pctMatch?Number(pctMatch[1]):null;
    const score=fractionMatch?Number(fractionMatch[1]):null;
    const total=fractionMatch?Number(fractionMatch[2]):30;
    if(total!==30) return null;
    return {pct:pct??(score!==null?Math.round(score/30*100):0),score:score??0,total:30};
  }

  function showUpgradePopup(result){
    if(accountStatus==='approved') return;
    const signature=`${result.score}-${result.pct}-${Date.now().toString().slice(0,-3)}`;
    if(lastPopupSignature && lastPopupSignature.startsWith(`${result.score}-${result.pct}-`)) return;
    lastPopupSignature=signature;
    const root=document.getElementById('modalRoot');
    if(!root) return;
    const fullName=(currentUser?.fullName||currentUser?.full_name||'').trim();
    const phone=(currentUser?.phone||'').trim();
    const msg=encodeURIComponent(`Hello Sir Isaac, I have completed the free 30-question practice and I want full access to the Promotion Exam Preparation Practice platform. Name: ${fullName||'________'}. Phone: ${phone||'________'}. I will pay GH₵30 to MTN MoMo ${MOMO_DISPLAY}, ${MOMO_NAME}. Please activate my full access.`);
    root.innerHTML=`<div class="modal-backdrop"><div class="modal upgrade-modal">
      <div class="handle"></div>
      <div class="upgrade-celebrate">🎉</div>
      <h3>Congratulations!</h3>
      <p class="upgrade-summary">You have completed the free 30-question practice with <strong>${result.score}/${result.total} (${result.pct}%)</strong>.</p>
      <div class="upgrade-box">
        <strong>Ready to continue?</strong>
        <span>Unlock the full question bank, flexible practice sizes, extended performance tools and PDF/printing features.</span>
      </div>
      <div class="momo-card">
        <small>FULL ACCESS</small>
        <div class="upgrade-price">GH₵30</div>
        <div class="momo-label">MTN MOBILE MONEY</div>
        <div class="momo-number">${MOMO_DISPLAY}</div>
        <div class="momo-name">${MOMO_NAME}</div>
        <button type="button" id="copyMomo" class="secondary block">📋 Copy MoMo Number</button>
      </div>
      <a class="primary block whatsapp-btn" href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener">🟢 WhatsApp Sir Isaac</a>
      <button type="button" id="closeUpgrade" class="secondary block">Practise the Free 30 Again</button>
    </div></div>`;
    document.getElementById('closeUpgrade')?.addEventListener('click',()=>root.innerHTML='');
    document.getElementById('copyMomo')?.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(MOMO);alert('MoMo number copied: '+MOMO_DISPLAY)}
      catch(_e){prompt('Copy the MoMo number:',MOMO_DISPLAY)}
    });
  }

  function tidy(){
    document.title='Promotion Exam Preparation Practice';
    document.querySelectorAll('.year-badge').forEach(e=>e.remove());
    document.querySelectorAll('.brand-text h1').forEach(e=>e.textContent='Promotion Exam Preparation Practice');
    document.querySelectorAll('.brand-text p').forEach(e=>e.textContent='Independent practice platform for Ghana Education Service promotion-exam preparation');

    const result=extractScore();
    if(result && !document.querySelector('#modalRoot .upgrade-modal')){
      setTimeout(()=>showUpgradePopup(result),350);
    }
  }

  const observer=new MutationObserver(()=>tidy());
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('DOMContentLoaded',tidy);
})();

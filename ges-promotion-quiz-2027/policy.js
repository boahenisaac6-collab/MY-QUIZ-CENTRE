(()=>{
  const MOMO_DISPLAY='0248 481 762';
  const WA='233248481762';
  let lastResultKey='';

  function isApproved(){
    if(document.querySelector('.status.approved')) return true;
    const d=document.getElementById('dashboardScreen');
    return /approved|full access active|subscriber/i.test(d?.innerText||'');
  }

  function readFreeResult(){
    const root=document.getElementById('resultScreen');
    if(!root || root.classList.contains('hidden')) return null;
    const text=root.innerText||'';
    const pctMatch=text.match(/(\d{1,3})\s*%/);
    const fractionMatch=text.match(/(\d+)\s*\/\s*(\d+)/);
    if(!fractionMatch) return null;
    const score=Number(fractionMatch[1]);
    const total=Number(fractionMatch[2]);
    if(total!==30) return null;
    return {score,total,pct:pctMatch?Number(pctMatch[1]):Math.round(score/30*100)};
  }

  function showUpgrade(result){
    if(isApproved()) return;
    const key=`${result.score}-${result.total}-${result.pct}`;
    if(lastResultKey===key || document.querySelector('#modalRoot .upgrade-modal')) return;
    lastResultKey=key;
    const root=document.getElementById('modalRoot');
    if(!root) return;
    const msg=encodeURIComponent(`Hello Sir Isaac, I have completed the free 30-question practice and I want full access to the Promotion Exam Preparation Practice platform. I will pay GH₵30 to MTN MoMo ${MOMO_DISPLAY}, ISAAC BOAHEN. Please activate my full access.`);
    root.innerHTML=`<div class="modal-backdrop"><div class="modal upgrade-modal">
      <div class="handle"></div>
      <div class="upgrade-celebrate">🎉</div>
      <h3>Congratulations!</h3>
      <p class="upgrade-summary">You completed the free 30-question practice with <strong>${result.score}/${result.total} (${result.pct}%)</strong>.</p>
      <div class="upgrade-box"><strong>Ready to continue?</strong><span>Unlock the full question bank, flexible practice sizes, extended performance tools and PDF/printing features.</span></div>
      <div class="momo-card"><small>FULL ACCESS</small><div class="upgrade-price">GH₵30</div><div class="momo-label">MTN MOBILE MONEY</div><div class="momo-number">${MOMO_DISPLAY}</div><div class="momo-name">ISAAC BOAHEN</div><button type="button" id="copyMomo" class="secondary block">📋 Copy MoMo Number</button></div>
      <a class="primary block whatsapp-btn" href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener">🟢 WhatsApp Sir Isaac</a>
      <button type="button" id="closeUpgrade" class="secondary block">Practise the Free 30 Again</button>
    </div></div>`;
    document.getElementById('closeUpgrade')?.addEventListener('click',()=>root.innerHTML='');
    document.getElementById('copyMomo')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('0248481762');alert('MoMo number copied: '+MOMO_DISPLAY)}catch(_e){prompt('Copy the MoMo number:',MOMO_DISPLAY)}});
  }

  function tidy(){
    document.title='Promotion Exam Preparation Practice';
    const r=readFreeResult();
    if(r) setTimeout(()=>showUpgrade(r),250);
  }

  document.addEventListener('DOMContentLoaded',tidy);
  new MutationObserver(tidy).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();

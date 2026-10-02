(()=>{
  const start=()=>{
    const status=document.createElement('div');
    status.id='bootStatus';
    status.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:999;background:#034d2b;color:white;padding:8px 12px;border-radius:999px;font:700 12px system-ui;box-shadow:0 5px 16px #0002';
    status.textContent='Preparing practice…';
    document.body.appendChild(status);
    setTimeout(()=>{
      const s=document.createElement('script');
      s.src='./app.js?v=20261002b';
      s.onload=()=>status.remove();
      s.onerror=()=>{status.textContent='Unable to start. Please reload.';status.style.background='#9c2020'};
      document.body.appendChild(s);
      setTimeout(()=>{if(document.getElementById('bootStatus')) status.remove()},6000);
    },1800);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();

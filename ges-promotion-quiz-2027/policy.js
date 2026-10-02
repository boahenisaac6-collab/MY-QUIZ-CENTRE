(()=>{
  const nativeFetch=window.fetch.bind(window);
  let accountStatus='free';

  window.fetch=async function(input,init={}){
    let action='';
    let nextInit=init;
    try{
      if(init && typeof init.body==='string'){
        const body=JSON.parse(init.body);
        action=String(body.action||'');
        if(action==='start_attempt' && accountStatus!=='approved'){
          body.count=30;
          nextInit={...init,body:JSON.stringify(body)};
        }
      }
    }catch(_e){}

    const response=await nativeFetch(input,nextInit);
    try{
      const data=await response.clone().json();
      if(data?.user?.status) accountStatus=data.user.status;
      if(action==='public_config'){
        data.freeSizes=[30];
        data.settings=data.settings||{};
        data.settings.free_sizes='30';
        data.settings.contact_name='Sir Isaac';
        data.settings.subscription_price='30';
        return new Response(JSON.stringify(data),{
          status:response.status,
          statusText:response.statusText,
          headers:response.headers
        });
      }
      if(data?.settings){
        data.settings.free_sizes='30';
        data.settings.contact_name='Sir Isaac';
        data.settings.subscription_price='30';
        return new Response(JSON.stringify(data),{
          status:response.status,
          statusText:response.statusText,
          headers:response.headers
        });
      }
    }catch(_e){}
    return response;
  };

  const tidy=()=>{
    document.querySelectorAll('button,.note,.mini-badge,.contact-box,p,li,small,span,div').forEach(el=>{
      if(el.children.length) return;
      const t=el.textContent||'';
      if(/20\s*(or|\/|&)\s*30/i.test(t)) el.textContent=t.replace(/20\s*(or|\/|&)\s*30/gi,'30');
    });
  };
  new MutationObserver(tidy).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('DOMContentLoaded',tidy);
})();

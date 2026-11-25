
/* =====================================================================
   제작자 관리 모듈 — 로그인 · 사용 권한 · 관리자 페이지 · 여러 기기 동기화
   Designed & Developed by Rat Rae Choi
   ---------------------------------------------------------------------
   ● 서버 주소·공개키는 저장소의 auth-config.json 에서 읽습니다.
     (아래 AUTH_EMBED 에 직접 넣어도 됩니다 — 넣으면 그 값이 우선)
   ● 비밀번호는 Supabase 서버에 암호화(bcrypt)되어 저장되므로 제작자도 볼 수 없습니다.
     대신 관리자 페이지에서 임시 비밀번호 발급·강제 로그아웃·차단을 합니다.
   ===================================================================== */
(function(){
'use strict';
const AUTH_CREATOR = 'Rat Rae Choi';
const AC = window.AUTH_APP_CONFIG || {};
const PFX = AC.prefix || 'app';
const AUTH_EMBED = { enabled:null, supabaseUrl:'', supabaseAnonKey:'' };
const CFG_SOURCES = [
  'auth-config.json',
  AC.cfgRaw
];
const LS = { cfg:PFX+'_auth_cfg', dev:PFX+'_device_id', devName:PFX+'_device_name', loginAt:PFX+'_login_at',
             okAt:PFX+'_auth_ok_at', okUser:PFX+'_auth_ok_user', meta:PFX+'_sync_meta', prof:PFX+'_auth_profile',
             lastEmail:PFX+'_last_email', syncOwner:PFX+'_sync_owner', reloaded:PFX+'_sync_reloaded', session:PFX+'_auth_session' };
const HOOKS = AC.hooks || [];                         /* [함수이름, 저장키] — 이 함수가 불리면 해당 키를 서버로 올림 */
const SYNC_KEYS = AC.syncKeys || HOOKS.map(h=>h[1]);
const KEEP_KEYS = AC.keepKeys || [];                  /* 다른 사람이 로그인해도 지우지 않는 키(화면 설정 등) */
const WEB_URL = () => (window.APP && (APP.shareUrl || APP.webUrl)) || AC.webUrl || '';
const REDIRECT = () => (/^https?:/.test(location.protocol) && !window.Capacitor) ? location.origin+location.pathname : (WEB_URL()||undefined);
const OFFLINE_GRACE_H = 24;
const g = id => document.getElementById(id);
const E = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const lsSet = (k,v) => { try{ localStorage.setItem(k,v); }catch(e){} };
const lsDel = k => { try{ localStorage.removeItem(k); }catch(e){} };
const jget = k => { try{ const v=lsGet(k); return v?JSON.parse(v):null; }catch(e){ return null; } };
const tip = m => { try{ (window.toast||alert)(m); }catch(e){} };
const fmtDT = s => { if(!s) return '-'; const d=new Date(s); if(isNaN(d)) return '-';
  const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const todayKST = () => new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
const ROLE_KO = {owner:'제작자', admin:'관리자', user:'사용자'};
const STATUS_KO = {pending:'승인 대기', active:'사용 중', suspended:'차단'};
const EV_KO = {login:'로그인', login_fail:'로그인 실패', logout:'로그아웃', blocked:'접속 거부', forced:'강제 로그아웃'};
const REASON_KO = {
  pending:['⏳','승인 대기 중','가입 신청이 접수되었습니다. 제작자(관리자)가 승인하면 바로 사용할 수 있습니다.<br>승인 후 이 화면에서 <b>다시 확인</b>을 누르세요.'],
  suspended:['⛔','사용이 중지된 계정','이 계정은 접속이 차단되었습니다. 필요하면 제작자에게 문의하세요.'],
  expired:['📅','사용기한 만료','사용기한이 지났습니다. 연장이 필요하면 제작자에게 요청하세요.'],
  device_blocked:['📵','이 기기는 사용 제한','이 기기에서는 사용할 수 없도록 설정되었습니다. 다른 기기를 쓰거나 제작자에게 문의하세요.'],
  locked:['🛠️','프로그램 점검 중',''],
  no_profile:['❓','계정 정보 없음','계정 정보가 아직 만들어지지 않았습니다. 잠시 뒤 다시 시도하거나 제작자에게 문의하세요.'],
  offline:['📶','인터넷 연결 필요','로그인 확인을 위해 인터넷 연결이 필요합니다. 연결 후 다시 시도하세요.'],
  server:['⚙️','서버 설정 확인 필요','서버에서 오류가 났습니다. 제작자는 Supabase에서 <b>supabase_setup.sql</b>을 실행했는지 확인하세요.']
};

let SB=null, CFG=null, PROFILE=null, LAST_RESULT=null, recoveryMode=false;

/* ---------- 기기 식별 ---------- */
function deviceId(){ let id=lsGet(LS.dev); if(!id){ id='d-'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)); lsSet(LS.dev,id);} return id; }
function guessDevice(){
  const u=navigator.userAgent||'';
  if(/iPad|Macintosh.*Mobile|Tablet/i.test(u) || (/Macintosh/.test(u)&&navigator.maxTouchPoints>1)) return '태블릿';
  if(/Android/i.test(u)) return /Mobile/i.test(u)?'안드로이드 폰':'안드로이드 태블릿';
  if(/iPhone/i.test(u)) return '아이폰';
  if(/Windows/i.test(u)) return 'Windows PC';
  if(/Mac/i.test(u)) return 'Mac';
  if(/Linux|X11|CrOS/i.test(u)) return 'PC';
  return '기기';
}
function deviceName(){ return lsGet(LS.devName) || guessDevice(); }
function ua(){ return (navigator.userAgent||'').slice(0,300); }

/* ---------- 설정 읽기 ---------- */
async function loadConfig(){
  if(AUTH_EMBED.supabaseUrl && AUTH_EMBED.supabaseAnonKey) return {enabled:AUTH_EMBED.enabled!==false, supabaseUrl:AUTH_EMBED.supabaseUrl, supabaseAnonKey:AUTH_EMBED.supabaseAnonKey, src:'embed'};
  const isFile = location.protocol==='file:';
  for(const src of CFG_SOURCES){
    if(isFile && !/^https?:/.test(src)) continue;
    try{
      const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),6000);
      const r=await fetch(src+(src.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store',signal:ctl.signal}); clearTimeout(t);
      if(!r.ok) continue;
      const j=await r.json();
      if(j && typeof j==='object'){ lsSet(LS.cfg,JSON.stringify(j)); return Object.assign({src},j); }
    }catch(e){}
  }
  const c=jget(LS.cfg); if(c) return Object.assign({src:'cache'},c);
  return null;
}
const cfgOn = c => !!(c && c.enabled && c.supabaseUrl && c.supabaseAnonKey && !/여기에|YOUR_|xxxx/i.test(c.supabaseUrl+c.supabaseAnonKey));

/* ---------- 화면: 로그인 게이트 ---------- */
function lock(){ document.body.classList.add('auth-locked'); g('authGate').classList.remove('hidden'); }
function unlock(){ document.body.classList.remove('auth-locked'); g('authGate').classList.add('hidden'); }
function brand(){ const ic=document.querySelector('.band .appicon'); return `<div class="ag-brand">${ic?`<img src="${ic.src}" alt="">`:''}<div><b>${E(AC.name||'')}</b><small>${E(AC.sub||'로그인')}</small></div></div>`; }
const SIGN = `<div class="ag-sign">Designed &amp; Developed by ${AUTH_CREATOR}</div>`;
function msg(type,html){ const m=g('agMsg'); if(!m) return; m.className='ag-msg on '+type; m.innerHTML=html; }
function busy(btn,on,label){ if(!btn) return; btn.disabled=on; if(label) btn.textContent=label; }

function viewLoading(text){ lock(); g('agBox').innerHTML = brand()+`<div class="ag-spin"></div><p class="ag-sub" style="text-align:center">${E(text||'접속 확인 중…')}</p>`+SIGN; }

let PUB={signup_open:true};
function viewLogin(note){
  lock();
  g('agBox').innerHTML = brand()+`
    <h2>로그인</h2><p class="ag-sub">하나의 아이디로 자택 PC · 회사 PC · 휴대폰 · 태블릿 어디서든 같은 ${E(AC.dataLabel||"기록")}을 씁니다.</p>
    <div id="agMsg" class="ag-msg"></div>
    <form id="agLogin" autocomplete="on">
      <label class="ag-f"><span>아이디 (이메일)</span><input id="agEmail" type="email" inputmode="email" autocomplete="username" required placeholder="name@example.com"></label>
      <label class="ag-f"><span>비밀번호</span><input id="agPw" type="password" autocomplete="current-password" required placeholder="비밀번호"></label>
      <label class="ag-f"><span>이 기기 이름 (접속기록에 표시)</span><input id="agDev" type="text" maxlength="30" value="${E(deviceName())}" placeholder="예: 자택 PC, 회사 PC, 휴대폰"></label>
      <button class="ag-btn" id="agGo" type="submit">로그인</button>
    </form>
    <div class="ag-links"><a id="agToSignup">${PUB.signup_open===false?'':'처음이세요? 가입 신청'}</a><a id="agToForgot">비밀번호를 잊었어요</a></div>`+SIGN;
  if(note) msg(note[0],note[1]);
  const last=lsGet(LS.lastEmail); if(last) g('agEmail').value=last;
  g('agLogin').onsubmit=async e=>{ e.preventDefault(); await doLogin(); };
  g('agToSignup').onclick=()=>{ if(PUB.signup_open!==false) viewSignup(); };
  g('agToForgot').onclick=viewForgot;
}
function viewSignup(){
  lock();
  g('agBox').innerHTML = brand()+`
    <h2>가입 신청</h2><p class="ag-sub">신청 후 <b>제작자가 승인</b>해야 사용할 수 있습니다. 비밀번호는 암호화되어 저장되며 제작자도 볼 수 없습니다.</p>
    <div id="agMsg" class="ag-msg"></div>
    <form id="agSignup">
      <label class="ag-f"><span>이름</span><input id="suName" required maxlength="30" placeholder="홍길동"></label>
      <label class="ag-f"><span>소속 · 부서</span><input id="suDept" maxlength="40" placeholder="예: 동부지사 영업팀"></label>
      <label class="ag-f"><span>연락처</span><input id="suPhone" inputmode="tel" maxlength="20" placeholder="010-0000-0000"></label>
      <label class="ag-f"><span>아이디 (이메일)</span><input id="suEmail" type="email" required autocomplete="username"></label>
      <label class="ag-f"><span>비밀번호 (8자 이상)</span><input id="suPw" type="password" required minlength="8" autocomplete="new-password"></label>
      <label class="ag-f"><span>비밀번호 확인</span><input id="suPw2" type="password" required minlength="8" autocomplete="new-password"></label>
      <button class="ag-btn" id="suGo" type="submit">가입 신청</button>
    </form>
    <div class="ag-links"><a id="agToLogin">← 로그인으로</a><span></span></div>`+SIGN;
  g('agToLogin').onclick=()=>viewLogin();
  g('agSignup').onsubmit=async e=>{ e.preventDefault(); await doSignup(); };
}
function viewForgot(){
  lock();
  g('agBox').innerHTML = brand()+`
    <h2>비밀번호를 잊었을 때</h2>
    <p class="ag-sub">① 가입한 이메일로 <b>재설정 메일</b>을 받거나, ② 제작자(관리자)에게 <b>임시 비밀번호</b>를 요청하세요.</p>
    <div id="agMsg" class="ag-msg"></div>
    <label class="ag-f"><span>가입한 이메일</span><input id="fgEmail" type="email" value="${E(lsGet(LS.lastEmail)||'')}"></label>
    <button class="ag-btn" id="fgGo">재설정 메일 보내기</button>
    <div class="ag-links"><a id="agToLogin">← 로그인으로</a><span></span></div>`+SIGN;
  g('agToLogin').onclick=()=>viewLogin();
  g('fgGo').onclick=async()=>{
    const em=g('fgEmail').value.trim(); if(!em){ msg('err','이메일을 입력하세요.'); return; }
    busy(g('fgGo'),true,'보내는 중…');
    const redirectTo = REDIRECT();
    const {error}=await SB.auth.resetPasswordForEmail(em,{redirectTo});
    busy(g('fgGo'),false,'재설정 메일 보내기');
    if(error) msg('err','메일을 보내지 못했습니다: '+E(error.message));
    else msg('ok','메일을 보냈습니다. 메일의 링크를 누르면 새 비밀번호를 정하는 화면이 열립니다. (스팸함도 확인하세요)');
  };
}
function viewChangePw(forced){
  lock();
  g('agBox').innerHTML = brand()+`
    <h2>${forced?'새 비밀번호 정하기':'비밀번호 변경'}</h2>
    <p class="ag-sub">${forced?'임시 비밀번호로 로그인했습니다. 계속하려면 <b>본인만 아는 새 비밀번호</b>로 바꾸세요.':'새 비밀번호를 입력하세요.'}</p>
    <div id="agMsg" class="ag-msg"></div>
    <label class="ag-f"><span>새 비밀번호 (8자 이상)</span><input id="cpPw" type="password" minlength="8" autocomplete="new-password"></label>
    <label class="ag-f"><span>새 비밀번호 확인</span><input id="cpPw2" type="password" minlength="8" autocomplete="new-password"></label>
    <button class="ag-btn" id="cpGo">비밀번호 저장</button>
    ${forced?'':'<button class="ag-btn sec" id="cpCancel">취소</button>'}`+SIGN;
  if(g('cpCancel')) g('cpCancel').onclick=()=>{ unlock(); };
  g('cpGo').onclick=async()=>{
    const a=g('cpPw').value, b=g('cpPw2').value;
    if(a.length<8){ msg('err','8자 이상으로 입력하세요.'); return; }
    if(a!==b){ msg('err','두 비밀번호가 다릅니다.'); return; }
    busy(g('cpGo'),true,'저장 중…');
    const {error}=await SB.auth.updateUser({password:a});
    if(error){ busy(g('cpGo'),false,'비밀번호 저장'); msg('err','저장하지 못했습니다: '+E(error.message)); return; }
    try{ await SB.rpc('mark_pw_changed'); }catch(e){}
    recoveryMode=false;
    lsSet(LS.loginAt,new Date().toISOString());
    tip('비밀번호를 바꿨습니다');
    await checkin('resume');
  };
}
function viewBlocked(reason, extra){
  lock();
  const r=REASON_KO[reason]||['⚠️','사용할 수 없음','사용 권한을 확인할 수 없습니다.'];
  let body=r[2];
  if(reason==='locked') body=E(extra&&extra.lock_message||'점검 중입니다.');
  if(reason==='server' && extra&&extra.detail) body+=`<br><small>${E(extra.detail)}</small>`;
  if(reason==='expired' && extra&&extra.profile&&extra.profile.expires_at) body+=`<br>사용기한: <b>${E(extra.profile.expires_at)}</b>`;
  const who = extra&&extra.profile ? `<p class="ag-sub" style="text-align:center">${E(extra.profile.name||'')} · ${E(extra.profile.email||'')}</p>`:'';
  g('agBox').innerHTML = brand()+`<div class="ag-big">${r[0]}</div><h2 style="text-align:center">${r[1]}</h2>${who}
    <div class="ag-msg on info" style="text-align:center">${body}</div>
    <button class="ag-btn" id="bkRetry">다시 확인</button>
    <button class="ag-btn sec" id="bkOut">${reason==='offline'?'다른 계정으로 로그인':'로그아웃'}</button>`+SIGN;
  g('bkRetry').onclick=()=>boot(true);
  g('bkOut').onclick=()=>logout(true);
}

/* ---------- 동작: 로그인 / 가입 / 로그아웃 ---------- */
function errKo(m){
  m=String(m||'');
  if(/Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않습니다.';
  if(/Email not confirmed/i.test(m)) return '이메일 인증이 아직 안 되었습니다. 메일함에서 인증 링크를 먼저 누르세요.';
  if(/already registered|already exists/i.test(m)) return '이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용하세요.';
  if(/Password should be/i.test(m)) return '비밀번호가 너무 짧거나 단순합니다.';
  if(/rate limit|too many/i.test(m)) return '시도가 너무 많습니다. 잠시 후 다시 해 주세요.';
  if(/fetch|network/i.test(m)) return '인터넷 연결을 확인하세요.';
  return m;
}
async function doLogin(){
  const em=g('agEmail').value.trim().toLowerCase(), pw=g('agPw').value, dn=g('agDev').value.trim();
  if(dn) lsSet(LS.devName,dn);
  const btn=g('agGo'); busy(btn,true,'확인 중…');
  const {error}=await SB.auth.signInWithPassword({email:em,password:pw});
  if(error){
    busy(btn,false,'로그인'); msg('err',E(errKo(error.message)));
    if(/Invalid login/i.test(error.message)) { try{ await SB.rpc('log_login_fail',{p_email:em,p_device:deviceId(),p_device_name:deviceName()}); }catch(e){} }
    return;
  }
  lsSet(LS.lastEmail,em);
  lsSet(LS.loginAt,new Date().toISOString());
  await checkin('login');
}
async function doSignup(){
  const name=g('suName').value.trim(), dept=g('suDept').value.trim(), phone=g('suPhone').value.trim();
  const em=g('suEmail').value.trim().toLowerCase(), pw=g('suPw').value, pw2=g('suPw2').value;
  if(pw!==pw2){ msg('err','두 비밀번호가 다릅니다.'); return; }
  const btn=g('suGo'); busy(btn,true,'신청 중…');
  const emailRedirectTo = REDIRECT();
  const {data,error}=await SB.auth.signUp({email:em,password:pw,options:{data:{name,dept,phone},emailRedirectTo}});
  busy(btn,false,'가입 신청');
  if(error){ msg('err',E(errKo(error.message))); return; }
  lsSet(LS.lastEmail,em);
  if(data && data.session){ lsSet(LS.loginAt,new Date().toISOString()); await checkin('login'); }
  else viewLogin(['ok','가입 신청이 접수되었습니다. <b>메일함의 인증 링크</b>를 먼저 누른 뒤 로그인하세요. 제작자가 승인하면 사용할 수 있습니다.']);
}
async function logout(showLogin){
  try{ if(SB){ await SB.rpc('log_logout',{p_device:deviceId(),p_device_name:deviceName()}); await SB.auth.signOut({scope:'local'}); } }catch(e){}
  PROFILE=null; lsDel(LS.okAt); lsDel(LS.okUser); lsDel(LS.loginAt); lsDel(LS.prof);
  renderAcct(); closePop(); closeAdmin();
  if(showLogin!==false) viewLogin(['info','로그아웃했습니다.']);
}

/* ---------- 접속 확인 (서버에 물어봄) ---------- */
async function checkin(event){
  let res;
  try{
    const {data,error}=await SB.rpc('client_checkin',{p_device:deviceId(),p_device_name:deviceName(),p_ua:ua(),p_event:event,p_login_at:lsGet(LS.loginAt)||null});
    if(error) throw error; res=data;
  }catch(e){
    const em=String(e&&e.message||e);
    if(!/fetch|network|load failed|timeout|abort/i.test(em) && navigator.onLine!==false){ viewBlocked('server',{detail:em}); return false; }
    const okAt=+lsGet(LS.okAt)||0, prof=jget(LS.prof);
    if(prof && Date.now()-okAt < OFFLINE_GRACE_H*3600e3){ PROFILE=prof; renderAcct('오프라인'); unlock(); return true; }
    viewBlocked('offline'); return false;
  }
  LAST_RESULT=res;
  if(res && res.ok){
    PROFILE=res.profile; lsSet(LS.prof,JSON.stringify(PROFILE)); lsSet(LS.okAt,String(Date.now())); lsSet(LS.okUser,PROFILE.id);
    if(PROFILE.must_change_pw || recoveryMode){ viewChangePw(!recoveryMode); return false; }
    renderAcct(); unlock(); guardViewOnly();
    if(event==='login'||event==='boot'){ await syncPull(event==='login');
      if(isShared() && !canEditShared() && event==='login') tip('👁 보기 전용 권한입니다 — 관리 범위의 근태를 볼 수만 있습니다'); }
    return true;
  }
  const reason=res&&res.reason||'no_profile';
  if(reason==='forced'||reason==='no_session'){
    try{ await SB.auth.signOut({scope:'local'}); }catch(e){}
    lsDel(LS.okAt); lsDel(LS.prof); PROFILE=null; renderAcct();
    viewLogin(reason==='forced'?['info','관리자 요청으로 로그아웃되었습니다. 다시 로그인하세요.']:null);
    return false;
  }
  PROFILE=null; lsDel(LS.okAt); lsDel(LS.prof); renderAcct();
  viewBlocked(reason,res); return false;
}

/* ---------- v2.15 관리 범위 · 공유 근태 ----------
   제작자(전체)와 관리 범위를 받은 사용자는 하나의 공유 근태를 함께 씁니다.
   서버에는 'base'(조직·근무조 코드·근태기호·공휴일·설정)와 'site:사업장ID'(사업장·인원·근태)로 나눠 저장하고,
   각 사용자는 자기 범위(회사·지사·사업장)의 사업장만 받아 보고 고칠 수 있습니다. 범위 확인은 서버가 합니다. */
const SH_KEY = AC.sharedKey || 'ams_v1_state';
const SH_LOCAL = ['managers','activeMgr','manager'];          /* 기기·사람마다 따로 두는 항목(근태 담당 지정) */
const LSH = { hash:PFX+'_sh_hash', init:PFX+'_sh_init', warn:PFX+'_sh_warn' };
const scopeOf = () => PROFILE ? (PROFILE.role==='owner' ? {level:'all'} : (PROFILE.scope||{})) : {};
const isShared = () => !!(AC.sharedKey && PROFILE && scopeOf().level);   /* Complaint 프로그램: sharedKey 미설정 → 공유 근태 모드 사용 안 함 */
const scopeLabel = sc => { sc=sc||{}; if(!sc.level) return '개인 자료'; if(sc.level==='all') return '전체'+(sc.perm==='view'?' · 👁 보기만':'');
  if(sc.level==='multi') return sc.label || '조직별 권한';
  const pv = sc.perm==='view' ? ' · 👁 보기만' : '';
  if(sc.level==='org') return (sc.label||sc.org||'조직')+' 전체'+pv; return (sc.label || ((sc.sites||[]).length+'개 사업장'))+pv; };
const fnv = str => { let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0).toString(36)+'.'+str.length; };
function splitState(st){
  const base={}; Object.keys(st||{}).forEach(k=>{ if(k!=='emps' && k!=='sites' && !SH_LOCAL.includes(k)) base[k]=st[k]; });
  base.siteOrder=(st.sites||[]).map(x=>x.id);
  const parts={base}; (st.sites||[]).forEach(x=>{ parts['site:'+x.id]={site:x, emps:[]}; });
  (st.emps||[]).forEach(e=>{ const p=parts['site:'+e.site]; if(p) p.emps.push(e); });
  return parts; }
function joinState(items, local){
  const st=Object.assign({}, items.base||{}); SH_LOCAL.forEach(f=>{ if(local && local[f]!==undefined) st[f]=local[f]; });
  const order=(items.base&&items.base.siteOrder)||[]; delete st.siteOrder;
  const keys=Object.keys(items).filter(k=>k.startsWith('site:')).sort((a,b)=>{ const ia=order.indexOf(a.slice(5)), ib=order.indexOf(b.slice(5)); return (ia<0?1e9:ia)-(ib<0?1e9:ib) || (a<b?-1:1); });
  st.sites=keys.map(k=>items[k].site); st.emps=[].concat(...keys.map(k=>items[k].emps||[]));
  return st; }
/* ---------- v2.16 공유 근태 실시간 반영 ----------
   · 같은 관리 범위 사용자끼리 서로 고친 근태가 약 20초 안에 화면에 반영됩니다(바뀐 사업장만 받아옴).
   · 같은 사업장을 여러 사람이 동시에 고쳐도 "사람·날짜 단위"로 합쳐 저장합니다(버전 확인 저장 → 충돌 시 합치고 다시 저장).
   · 보기 전용(perm:'view') 사용자는 고쳐도 저장되지 않고 서버 자료로 되돌아갑니다(서버도 저장을 거부).
   Designed & Developed by Rat Rae Choi */
const LSB = PFX+'_sh_base', LSS = PFX+'_sh_since';
/* v2.17 조직별 권한: 사업장 권한 = 사업장 규칙 → 가장 가까운 상위 조직 규칙 → 그 외(rest) */
const curOrgs = () => { try{ if(typeof S!=='undefined' && S && S.orgs) return S.orgs; }catch(e){} const b=shb().base; return (b&&b.v&&b.v.orgs)||[]; };
const orgChain = (oid,orgs) => { const a=[]; let c=oid, n=0; while(c && n<30 && !a.includes(c)){ a.push(c); const o=(orgs||[]).find(x=>x.id===c); c=o?(o.parent||''):''; n++; } return a; };
function sitePerm(siteId, orgId, sc, orgs){
  sc=sc||scopeOf(); orgs=orgs||curOrgs(); const pv = sc.perm==='view' ? 'view' : 'edit';
  if(sc.level==='all') return pv;
  if(sc.level==='site') return (sc.sites||[]).includes(siteId) ? pv : null;
  if(sc.level==='org') return orgChain(orgId,orgs).includes(sc.org) ? pv : null;
  if(sc.level==='multi'){ const R=sc.rules||[], ok=p=>(p==='edit'||p==='view')?p:null;
    const r0=R.find(x=>x.t==='site'&&x.id===siteId); if(r0) return ok(r0.perm);
    for(const o of orgChain(orgId,orgs)){ const r=R.find(x=>x.t==='org'&&x.id===o); if(r) return ok(r.perm); }
    return sc.rest==='view' ? 'view' : null; }
  return null; }
const canEditShared = () => { const sc=scopeOf(); return sc.level==='multi' ? (sc.rules||[]).some(r=>r.perm==='edit') : sc.perm!=='view'; };
function canEditKey(k, vals, orgs){
  const sc=scopeOf();
  if(k==='base') return sc.level==='all' && sc.perm!=='view';
  if(!k.startsWith('site:')) return false;
  const id=k.slice(5); const os=vals.filter(v=>v && v.site).map(v=>v.site.org||'');
  if(!os.length) os.push('');
  return os.every(o=>sitePerm(id,o,sc,orgs)==='edit'); }
const SH_POLL_MS = 20000;
let SHB = null;
const shb = () => SHB || (SHB = jget(LSB) || {});
const saveB = () => { try{ localStorage.setItem(LSB, JSON.stringify(SHB||{})); }catch(e){ console.warn('공유 근태 기준본 저장 실패', e); } };
const J = x => JSON.stringify(x===undefined?null:x), eqJ = (a,b) => J(a)===J(b);
/* 3-way 합치기: b=마지막으로 서버와 맞춘 기준본, m=내 기기, t=서버 최신본 */
function mergeObj(b,m,t,deep){
  b=b||{}; m=m||{}; t=t||{}; const out=Object.assign({},t);
  new Set([...Object.keys(b),...Object.keys(m)]).forEach(k=>{
    if(eqJ(m[k],b[k])) return;                                   /* 내가 안 바꾼 항목 → 서버 것 */
    if(deep && deep[k] && m[k] && t[k] && typeof m[k]==='object' && !Array.isArray(m[k])) out[k]=mergeObj(b[k],m[k],t[k]);
    else if(m[k]===undefined) delete out[k]; else out[k]=m[k];  /* 내가 바꾼 항목 → 내 것 */
  });
  return out;
}
function mergeEmps(b,m,t){
  const ix=a=>{ const o={}; (a||[]).forEach(e=>{ if(e&&e.id) o[e.id]=e; }); return o; };
  const B=ix(b), M=ix(m), T=ix(t), out=[], seen=new Set();
  const ids=[...(t||[]).map(e=>e.id), ...(m||[]).map(e=>e.id).filter(id=>!T[id])];
  for(const id of ids){ if(seen.has(id)) continue; seen.add(id);
    const be=B[id], me=M[id], te=T[id];
    if(!me && be){ if(te && !eqJ(be,te)) out.push(te); continue; }      /* 내가 지움(남이 고쳤으면 남김) */
    if(!te && be){ if(me && !eqJ(be,me)) out.push(me); continue; }      /* 남이 지움(내가 고쳤으면 남김) */
    if(!be){ out.push(me||te); continue; }                               /* 새 인원 */
    if(eqJ(me,be)) out.push(te); else if(eqJ(te,be)) out.push(me);
    else out.push(mergeObj(be,me,te,{ov:1}));                            /* 둘 다 고침 → 항목·날짜별로 합침 */
  }
  return out;
}
function merge3(k,b,m,t){
  if(m==null) return (b!=null && t!=null && !eqJ(b,t)) ? t : null;
  if(t==null) return (b!=null && eqJ(b,m)) ? null : m;
  if(k==='base') return mergeObj(b||{},m,t,{settings:1});
  b=b||{site:{},emps:[]};
  return {site:mergeObj(b.site,m.site,t.site,{info:1,times:1,pat:1}), emps:mergeEmps(b.emps,m.emps,t.emps)};
}
const editorBusy = () => !!document.querySelector('.pop,.scrim,.modal-bg') ||
  (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !!document.activeElement.closest('#view'));
function applyLive(st){
  /* 열려 있는 화면에 바로 반영(다시 그리기) */
  applying=true; lsSet(SH_KEY, JSON.stringify(st)); applying=false;
  try{
    const sc=document.querySelector('.scroller'), keep=sc?[sc.scrollLeft,sc.scrollTop]:null, wy=window.scrollY;
    S = st; if(typeof reindex==='function') reindex(); if(typeof syncMgr==='function') syncMgr();
    if(typeof renderHeader==='function') renderHeader(); if(typeof render==='function') render();
    const sc2=document.querySelector('.scroller'); if(sc2&&keep){ sc2.scrollLeft=keep[0]; sc2.scrollTop=keep[1]; } window.scrollTo(0,wy);
  }catch(e){ console.warn('공유 근태 화면 반영 실패', e); }
}
/* 서버에 v2.16 SQL을 아직 실행하지 않았을 때는 v2.15 방식(shared_pull/shared_push)으로 자동 전환 */
const noFn = e => e && /Could not find the function|PGRST202|does not exist/i.test(e.message||'');
async function rpcChanges(since){
  const r=await SB.rpc('shared_changes',{p_since:since});
  if(!noFn(r.error)) return r;
  const r2=await SB.rpc('shared_pull'); if(r2.error) return r2;
  const items=(r2.data&&r2.data.items)||[];
  return {data:{scope:r2.data.scope, keys:items.map(i=>({k:i.k,updated_at:i.updated_at})), items}};
}
async function rpcPut(k,v,expect){
  const r=await SB.rpc('shared_put',{p_k:k,p_v:v,p_expect:expect,p_device:deviceId()});
  if(!noFn(r.error)) return r;
  const r2=await SB.rpc('shared_push',{p_k:k,p_v:v,p_device:deviceId()}); if(r2.error) return r2;
  return {data:{ok:true,updated_at:r2.data}};
}
let shBusy=false, shAgain=false, shLastBy='', OWN_CLOUD=null;
/* (v2.15.1) 근태 자료 요약 · 백업 */
function stSum(st){ let n=0,o=0,s=0; try{ n=(st.emps||[]).length; s=(st.sites||[]).length; (st.emps||[]).forEach(e=>{ o+=Object.keys(e.ov||{}).length; }); }catch(e){} return {n,o,s}; }
const sumTxt = x => `인원 ${x.n}명 · 사업장 ${x.s}곳 · 변경근태 ${x.o}건`;
async function backupState(st, why){
  if(!st || !SB || !PROFILE) return false;
  try{ if(!(st.emps||[]).length && !(st.sites||[]).length) return false;
    const slot = lsGet(PFX+'_bak_slot')==='a' ? 'b' : 'a';
    const v={at:new Date().toISOString(), why:why||'', device:deviceName(), sum:stSum(st), state:st};
    const {error}=await SB.rpc('sync_push',{p_k:'ams_bak_'+slot,p_v:v,p_device:deviceId()});
    if(error) throw error; lsSet(PFX+'_bak_slot',slot); return true;
  }catch(e){ console.warn('backup',e); try{ localStorage.setItem(PFX+'_bak_local', JSON.stringify({at:new Date().toISOString(),why,state:st})); }catch(e2){} return false; }
}
function askChoice(title, html, btns){        /* btns: [{id,label,sec}] → 누른 id */
  return new Promise(res=>{
    pop(`<h2>${title}</h2><div class="ag-sub">${html}</div>`+btns.map(b=>`<button class="ag-btn${b.sec?' sec':''}" id="ch_${b.id}">${b.label}</button>`).join(''));
    btns.forEach(b=>{ g('ch_'+b.id).onclick=()=>{ closePop(); res(b.id); }; });
  });
}
async function syncShared(opts){
  opts=opts||{};
  if(!PROFILE||!SB||!isShared()) return false;
  if(opts.live && editorBusy()) { shAgain=true; return false; }          /* 입력 중이면 끝난 뒤에 */
  if(shBusy){ shAgain=true; return false; } shBusy=true;
  const B0=JSON.stringify(shb()), since0=lsGet(LSS);
  let changedLocal=false;
  try{
    const first = lsGet(LSH.init)!==PROFILE.id || !Object.keys(shb()).length;
    let local=null; try{ local=JSON.parse(lsGet(SH_KEY)); }catch(e){}
    const {data,error}=await rpcChanges(first ? null : (since0||null));
    if(error){ syncState='공유 근태 오류'; renderAcct(); if(!opts.quiet) tip('공유 근태를 불러오지 못했습니다: '+error.message); return false; }
    const allowed=new Map((data.keys||[]).map(r=>[r.k,r.updated_at]));
    const remote={}; (data.items||[]).forEach(r=>{ remote[r.k]=r; });
    const maxTs=[...allowed.values()].reduce((a,x)=>x>a?x:a,'');
    const setSince=()=>{ if(maxTs) lsSet(LSS, new Date(Date.parse(maxTs)-15000).toISOString()); };
    SHB=shb();

    if(first){
      if(!allowed.has('base')){
        if(scopeOf().level==='all' && canEditShared() && (local || OWN_CLOUD)){   /* 처음: 제작자 자료를 공유 근태로 올림 (v2.15.1 확인 후) */
          const cl=OWN_CLOUD && OWN_CLOUD.v, ls=local;
          const opts=[];
          if(cl) opts.push({id:'cloud',label:`☁️ 서버에 저장된 내 자료 올리기 (${fmtDT(new Date(OWN_CLOUD.updated_at)).slice(0,16)})`});
          if(ls) opts.push({id:'local',label:'💻 이 기기의 자료 올리기',sec:!!cl});
          opts.push({id:'later',label:'나중에 (지금은 올리지 않음)',sec:true});
          const pick=await askChoice('공유 근태 처음 만들기',
            `아직 서버에 공유 근태가 없습니다. 어떤 자료로 공유 근태를 만들까요?<br><br>`+
            (cl?`<b>☁️ 서버 사본</b>: ${sumTxt(stSum(cl))}<br>`:'')+(ls?`<b>💻 이 기기</b>: ${sumTxt(stSum(ls))}<br>`:'')+
            `<br>잘 모르겠으면 <b>인원·변경근태가 더 많은 쪽</b>을 고르세요. 고르지 않은 쪽도 서버에 백업해 둡니다.`, opts);
          if(pick==='later'){ tip('공유 근태를 아직 만들지 않았습니다. 「내 계정 → 지금 동기화」로 다시 할 수 있습니다'); return false; }
          const src = pick==='cloud' ? cl : ls;
          if(pick==='cloud' && ls && !eqJ(ls,cl)) await backupState(ls,'공유 근태 처음 만들기 전 이 기기 자료');
          const parts=splitState(src); SHB={};
          for(const k of Object.keys(parts)){ const r=await rpcPut(k,parts[k],allowed.get(k)||null);
            if(!r.error && r.data && r.data.ok) SHB[k]={v:parts[k],ts:r.data.updated_at}; }
          saveB(); lsSet(LSH.init,PROFILE.id); lsDel(LSS);
          const st0=joinState(parts, src);
          if(!eqJ(st0, local)){ applying=true; lsSet(SH_KEY, JSON.stringify(st0)); applying=false; changedLocal=true; }
          tip('공유 근태를 만들었습니다 ('+sumTxt(stSum(src))+'). 관리 범위를 받은 사용자가 함께 보고 고칩니다'); return changedLocal; }
        tip('아직 공유 근태 자료가 없습니다. 제작자가 먼저 로그인해 자료를 올려야 합니다'); return false; }
      const items={}; SHB={};
      Object.values(remote).forEach(r=>{ items[r.k]=r.v; SHB[r.k]={v:r.v,ts:r.updated_at}; });
      const st=joinState(items, local);
      changedLocal = !eqJ(st, local);
      if(changedLocal && local) await backupState(local,'공유 근태 처음 받기 전 이 기기 자료');
      saveB(); lsSet(LSH.init,PROFILE.id); setSince();
      if(changedLocal){ if(opts.live) applyLive(st); else { applying=true; lsSet(SH_KEY, JSON.stringify(st)); applying=false; } }
      syncState=(canEditShared()?'공유 근태 ':'👁 보기 전용 ')+fmtDT(new Date()).slice(11); renderAcct();
      return changedLocal;
    }

    const missing=[...allowed.keys()].filter(k=>!SHB[k] && !remote[k]);
    if(missing.length){                                                    /* 범위가 넓어져 새로 보이는 사업장 → 전체 받기 */
      const r2=await rpcChanges(null);
      if(!r2.error) (r2.data.items||[]).forEach(r=>{ if(!SHB[r.k] && !remote[r.k]) remote[r.k]=r; }); }
    const parts = local ? splitState(local) : {};
    const orgsNow = ((parts.base) || (SHB.base && SHB.base.v) || (remote.base && remote.base.v) || {}).orgs || [];
    const out={}; let reverted=0, fail=0; const mergedBy=new Set(), recvBy=new Set();
    const keys=new Set([...Object.keys(SHB), ...Object.keys(parts), ...Object.keys(remote)]);
    for(const k of keys){
      const bE=SHB[k], b=bE?bE.v:undefined, bts=bE?bE.ts:null, m=parts[k];
      let t, tts;
      if(remote[k]){ t=remote[k].v; tts=remote[k].updated_at; if(tts!==bts && remote[k].by && remote[k].by!==(PROFILE.name||PROFILE.email)) recvBy.add(remote[k].by); }
      else if(allowed.has(k)){ t=b; tts=bts; }
      else { t=null; tts=null; }
      const localChanged = m!==undefined ? !eqJ(m,b) : b!==undefined;
      let res=t;
      if(localChanged){
        if(!canEditKey(k, [m,b], orgsNow)){ reverted++; }
        else {
          let val=merge3(k,b,m===undefined?null:m,t==null?null:t), expect=tts, tries=0;
          while(tries++<5){
            if(eqJ(val,t) && (val!=null)) { res=t; break; }
            const r=await rpcPut(k,val,expect);
            if(r.error){ fail++; console.warn(k, r.error.message); res=t; break; }
            const d=r.data;
            if(d.ok){ res=val; tts=d.updated_at; break; }
            if(d.by) mergedBy.add(d.by);                                    /* 남이 먼저 고침 → 합쳐서 다시 */
            t=d.v; tts=d.updated_at; res=t; val=merge3(k,b,m===undefined?null:m,t==null?null:t); expect=tts;
          }
        }
      }
      if(res==null){ delete SHB[k]; } else { SHB[k]={v:res,ts:tts}; out[k]=res; }
    }
    if(!out.base && local){ /* 서버에 base 가 없을 때(이상 상황) 내 것 유지 */ const p=splitState(local); if(p.base) out.base=p.base; }
    const st=joinState(out, local);
    changedLocal = !eqJ(st, local);
    if(changedLocal && opts.live && editorBusy()){                         /* 그사이 입력을 시작했으면 다음 번에 */
      SHB=JSON.parse(B0); saveB(); if(since0) lsSet(LSS,since0); shAgain=true; return false; }
    saveB(); setSince();
    if(changedLocal){ if(opts.live) applyLive(st); else { applying=true; lsSet(SH_KEY, JSON.stringify(st)); applying=false; } }
    if(recvBy.size){ shLastBy=[...recvBy].join(', '); }
    syncState=(canEditShared()?'공유 근태 ':'👁 보기 전용 ')+fmtDT(new Date()).slice(11)+(shLastBy?' · '+shLastBy+' 수정 반영':''); renderAcct();
    if(reverted) tip(canEditShared() ? (scopeOf().level==='multi' ? '👁 보기만 권한인 사업장이나 공통 설정(조직·근무조 코드·공휴일)은 저장되지 않습니다 — 고친 내용을 되돌렸습니다' : '조직·근무조 코드·공휴일 같은 공통 설정은 전체 권한만 저장됩니다 — 고친 내용을 되돌렸습니다')
                                     : '👁 보기 전용 권한입니다 — 고친 내용은 저장되지 않고 되돌렸습니다');
    if(fail) tip('관리 범위 밖의 사업장은 저장되지 않았습니다');
    if(mergedBy.size) tip(`${[...mergedBy].join(', ')} 님이 같은 사업장을 동시에 고쳐서 두 사람 내용을 합쳤습니다`);
    return changedLocal;
  } finally {
    shBusy=false;
    if(shAgain){ shAgain=false; setTimeout(()=>syncShared({live:true,quiet:true}), editorBusy()?3000:400); }
  }
}
/* 예전 이름 호환 */
const pushShared = () => syncShared({live:true,quiet:true});
const pullShared = () => syncShared({live:false});
/* 열려 있는 동안 주기적으로 받아오기 · 창으로 돌아오면 바로 */
setInterval(()=>{ if(document.visibilityState==='visible' && PROFILE && isShared()) syncShared({live:true,quiet:true}); }, SH_POLL_MS);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && PROFILE && isShared()) setTimeout(()=>syncShared({live:true,quiet:true}),800); });
/* 보기 전용: 근태 칸 편집창을 열지 않음 */
function guardViewOnly(){
  const siteOfEmp = e => { try{ return e && (S.sites||[]).find(x=>x.id===e.site); }catch(_){ return null; } };
  const blocked = e => { if(!(PROFILE && isShared())) return false; const st=siteOfEmp(e); if(!st) return !canEditShared();
    return sitePerm(st.id, st.org||'')!=='edit'; };
  const msg = e => { const st=siteOfEmp(e); return canEditShared() && st ? `👁 ${st.name||'이 사업장'}은(는) 보기만 할 수 있습니다 — 근태를 고칠 수 없습니다` : '👁 보기 전용 권한입니다 — 근태를 고칠 수 없습니다'; };
  if(typeof window.openEditor==='function' && !window.openEditor.__vo){
    const orig=window.openEditor;
    const g2=function(td){ let e=null; try{ e=(S.emps||[]).find(x=>x.id===td.dataset.e); }catch(_){}
      if(blocked(e)){ tip(msg(e)); return; } return orig.apply(this,arguments); };
    g2.__vo=true; window.openEditor=g2;
  }
  if(typeof window.openEmpSetup==='function' && !window.openEmpSetup.__vo){
    const orig2=window.openEmpSetup;
    const g3=function(e){ if(e && blocked(e)){ tip(msg(e)); return; } return orig2.apply(this,arguments); };
    g3.__vo=true; window.openEmpSetup=g3;
  }
  document.body.classList.toggle('ams-viewonly', !!(PROFILE && isShared() && !canEditShared()));
  window.__billReadOnly = st => !!(st && PROFILE && isShared() && sitePerm(st.id, st.org||'')!=='edit');
  window.__payAllowed = st => !(st && PROFILE && isShared() && sitePerm(st.id, st.org||'')!=='edit');
}

/* ---------- 여러 기기 동기화 ---------- */
let pushTimers={}, syncState='', applying=false, BAKS=[];
const meta = () => jget(LS.meta)||{};
function setMeta(k,ts){ const m=meta(); m[k]=ts; lsSet(LS.meta,JSON.stringify(m)); }
function hookStore(){
  /* 프로그램의 저장 함수(예: save)를 감싸서, 저장할 때마다 서버에도 올림 */
  HOOKS.forEach(([fn,key])=>{
    const orig=window[fn]; if(typeof orig!=='function' || orig.__hooked) return;
    const hooked=function(...a){ const r=orig.apply(this,a);
      const k = typeof key==='function' ? key(...a) : key;
      if(!applying && k && SYNC_KEYS.includes(k)){ setMeta(k,new Date().toISOString()); schedulePush(k); }
      return r; };
    hooked.__hooked=true; window[fn]=hooked;
  });
}
function schedulePush(k){ if(!PROFILE||!SB) return; clearTimeout(pushTimers[k]); pushTimers[k]=setTimeout(()=>pushKey(k), (k===SH_KEY && isShared() && !canEditShared()) ? 300 : 1500); }
async function pushKey(k){
  if(!PROFILE||!SB) return;
  if(k===SH_KEY && isShared()) return syncShared({live:true,quiet:true});
  let v=null; try{ v=JSON.parse(lsGet(k)); }catch(e){}
  const {data,error}=await SB.rpc('sync_push',{p_k:k,p_v:v,p_device:deviceId()});
  if(!error){ setMeta(k,data); syncState='동기화 '+fmtDT(new Date()).slice(11); renderAcct(); }
  else { syncState='동기화 대기'; renderAcct(); }
}
async function syncPull(isLogin){
  const {data,error}=await SB.rpc('sync_pull'); if(error||!Array.isArray(data)) return;
  { const i=data.findIndex(r=>r.k===SH_KEY); OWN_CLOUD = i>=0 ? data[i] : null; if(isShared() && i>=0) data.splice(i,1); }
  BAKS = data.filter(r=>/^ams_bak_/.test(r.k)); for(let i=data.length-1;i>=0;i--) if(/^ams_bak_/.test(data[i].k)) data.splice(i,1);
  const cloud={}; data.forEach(r=>cloud[r.k]=r);
  let changed=false;
  applying=true;
  const owner=lsGet(LS.syncOwner);
  if(owner && owner!==PROFILE.id){            /* 같은 기기에서 다른 사람이 로그인 → 이전 사람 기록은 화면에서 지움(서버에는 남아 있음) */
    try{ const prev=lsGet(SH_KEY); if(prev) localStorage.setItem(PFX+'_bak_prev_user', JSON.stringify({at:new Date().toISOString(), owner, state:JSON.parse(prev)})); }catch(e){}
    SYNC_KEYS.filter(k=>!KEEP_KEYS.includes(k)).forEach(k=>lsDel(k)); lsDel(LS.meta); lsDel(LSH.init); lsDel(LSS); lsDel(LSB); lsDel(LSH.hash); SHB=null; changed=true;
  }
  lsSet(LS.syncOwner,PROFILE.id);
  const m=meta();
  for(const k of SYNC_KEYS){
    if(k===SH_KEY && isShared()) continue;
    const c=cloud[k], localTs=m[k]?Date.parse(m[k]):0, hasLocal=lsGet(k)!=null;
    if(c && (!hasLocal || Date.parse(c.updated_at)>localTs)){
      if(c.v===null) lsDel(k); else lsSet(k,JSON.stringify(c.v));
      setMeta(k,c.updated_at); changed=true;
    }
  }
  applying=false;
  if(isShared() && await pullShared()) changed=true;
  for(const k of SYNC_KEYS){ if(k===SH_KEY && isShared()) continue; const c=cloud[k]; if(lsGet(k)!=null && (!c || Date.parse(meta()[k]||0)>Date.parse(c.updated_at))) await pushKey(k); }
  syncState=(isShared() ? (canEditShared()?'공유 근태 ':'👁 보기 전용 ') : '동기화 ')+fmtDT(new Date()).slice(11); renderAcct();
  if(changed && !sessionStorage.getItem(LS.reloaded)){
    sessionStorage.setItem(LS.reloaded,'1');
    tip('다른 기기의 기록을 불러왔습니다'); setTimeout(()=>location.reload(),400);
  } else sessionStorage.removeItem(LS.reloaded);
}

/* ---------- 헤더 계정 카드 ---------- */
function renderAcct(note){
  let c=g('acctCard');
  const cards=document.querySelector('.band .cards'); if(!cards) return;
  if(!c){ c=document.createElement('button'); c.type='button'; c.id='acctCard'; c.className='bcard acct'; c.setAttribute('aria-label','내 계정');
    const seg=cards.querySelector('.seg'); cards.insertBefore(c,seg||null); c.onclick=openAcctMenu; }
  if(!cfgOn(CFG)){
    c.innerHTML=`<span class="ph">🔓</span><span><span class="t1">계정</span><span class="t2">로그인 설정 전</span><span class="t3">눌러서 안내 보기</span></span>`; return;
  }
  if(!PROFILE){ c.innerHTML=`<span class="ph">👤</span><span><span class="t1">계정</span><span class="t2">로그인 필요</span><span class="t3">눌러서 로그인</span></span>`; return; }
  const ini=(PROFILE.name||PROFILE.email||'?').trim().slice(0,1);
  c.innerHTML=`<span class="ph">${E(ini)}</span><span><span class="t1">내 계정<span class="acct-role">${E(ROLE_KO[PROFILE.role]||'')}</span></span><span class="t2">${E(PROFILE.name||PROFILE.email)}</span><span class="t3">${E(note||syncState||deviceName())}</span></span>`;
}
function pop(html){ g('agPopBox').innerHTML=html+SIGN; g('agPop').classList.remove('hidden'); }
function closePop(){ g('agPop').classList.add('hidden'); g('agPopBox').innerHTML=''; }
g('agPop').addEventListener('click',e=>{ if(e.target.id==='agPop') closePop(); });
function openAcctMenu(){
  if(!cfgOn(CFG)){
    pop(`<h2>로그인 기능 설정 전</h2><p class="ag-sub">지금은 누구나 바로 쓰는 상태입니다. 제작자가 <b>Supabase 서버</b>를 만들고 저장소의 <b>auth-config.json</b>에 주소·공개키를 넣고 <code>"enabled": true</code> 로 바꾸면, 다음 실행부터 로그인·승인·차단·여러 기기 동기화가 켜집니다.<br><br>자세한 순서는 <b>제작자 관리 사용매뉴얼</b>을 보세요.</p><button class="ag-btn sec" id="ppClose">닫기</button>`);
    g('ppClose').onclick=closePop; return;
  }
  if(!PROFILE){ viewLogin(); return; }
  const isAdm = PROFILE.role==='owner'||PROFILE.role==='admin';
  pop(`<h2>내 계정</h2>
    <dl class="ag-kv"><dt>이름</dt><dd>${E(PROFILE.name||'-')}</dd><dt>아이디</dt><dd>${E(PROFILE.email)}</dd>
      <dt>역할</dt><dd>${E(ROLE_KO[PROFILE.role])}</dd><dt>관리 범위</dt><dd>${E(scopeLabel(scopeOf()))}${isShared()?' · 공유 근태':''}</dd><dt>사용기한</dt><dd>${E(PROFILE.expires_at||'무기한')}</dd>
      <dt>이 기기</dt><dd>${E(deviceName())}</dd><dt>동기화</dt><dd>${E(syncState||'-')}</dd></dl>
    <div class="ag-menu">
      ${(window.STEC_BAR&&STEC_BAR.consoleLabel())?'<button id="mnAdmin">'+(STEC_BAR.consoleKind()==='mgr'?'🧑‍💼 ':'🛡️ ')+STEC_BAR.consoleLabel()+'</button>':''}
      <button id="mnSync">🔄 지금 동기화</button>
      <button id="mnBak">🗂️ 백업에서 근태 되살리기</button>
      <button id="mnProfile">✏️ 내 정보 수정</button>
      <button id="mnPw">🔑 비밀번호 변경</button>
      <button id="mnOut">🚪 로그아웃</button>
    </div>`);
  if(g('mnAdmin')) g('mnAdmin').onclick=()=>{ closePop(); if(window.STEC_BAR) STEC_BAR.openConsole(); else openAdmin(); };
  g('mnSync').onclick=async()=>{ closePop(); await syncPull(false); for(const k of SYNC_KEYS) if(lsGet(k)!=null) await pushKey(k); tip('동기화했습니다'); };
  g('mnPw').onclick=()=>{ closePop(); viewChangePw(false); };
  g('mnBak').onclick=openBackups;
  g('mnOut').onclick=()=>logout(true);
  g('mnProfile').onclick=()=>{
    pop(`<h2>내 정보 수정</h2>
      <label class="ag-f"><span>이름</span><input id="mpName" value="${E(PROFILE.name)}"></label>
      <label class="ag-f"><span>소속 · 부서</span><input id="mpDept" value="${E(PROFILE.dept||'')}"></label>
      <label class="ag-f"><span>연락처</span><input id="mpPhone" value="${E(PROFILE.phone||'')}"></label>
      <label class="ag-f"><span>이 기기 이름</span><input id="mpDev" value="${E(deviceName())}"></label>
      <button class="ag-btn" id="mpGo">저장</button><button class="ag-btn sec" id="mpX">취소</button>`);
    g('mpX').onclick=closePop;
    g('mpGo').onclick=async()=>{
      lsSet(LS.devName,g('mpDev').value.trim()||guessDevice());
      const {error}=await SB.rpc('update_my_profile',{p_name:g('mpName').value.trim(),p_phone:g('mpPhone').value.trim(),p_dept:g('mpDept').value.trim()});
      if(error){ tip('저장 실패: '+error.message); return; }
      closePop(); await checkin('resume'); tip('저장했습니다');
    };
  };
}

function openBackups(){
  const list=[];
  if(OWN_CLOUD && OWN_CLOUD.v) list.push({id:'own', t:'☁️ 서버에 저장된 내 자료', at:OWN_CLOUD.updated_at, st:OWN_CLOUD.v});
  (BAKS||[]).forEach(r=>{ if(r.v&&r.v.state) list.push({id:r.k, t:'🗂️ 자동 백업'+(r.v.why?' — '+r.v.why:''), at:r.v.at||r.updated_at, st:r.v.state}); });
  try{ const b=JSON.parse(localStorage.getItem(PFX+'_bak_local')||'null'); if(b&&b.state) list.push({id:'loc', t:'💻 이 기기 백업'+(b.why?' — '+b.why:''), at:b.at, st:b.state}); }catch(e){}
  list.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const cur=(()=>{ try{ return JSON.parse(lsGet(SH_KEY)); }catch(e){ return null; } })();
  pop(`<h2>백업에서 근태 되살리기</h2><p class="ag-sub">지금: ${cur?E(sumTxt(stSum(cur))):'자료 없음'}<br>되살리기 전에 지금 자료도 자동으로 백업합니다.${isShared()&&!canEditShared()?'<br><b>보기 전용 권한이라 되살릴 수 없습니다.</b>':''}</p>
    <div class="ag-menu">${list.length?list.map((x,i)=>`<button data-i="${i}">${E(x.t)}<br><small>${E(fmtDT(new Date(x.at)).slice(0,16))} · ${E(sumTxt(stSum(x.st)))}</small></button>`).join(''):'<p class="ag-sub">아직 백업이 없습니다.</p>'}</div>
    <button class="ag-btn sec" id="bkX">닫기</button>`);
  g('bkX').onclick=closePop;
  document.querySelectorAll('#agPopBox .ag-menu button[data-i]').forEach(b=>b.onclick=async()=>{
    if(isShared()&&!canEditShared()){ tip('👁 보기 전용 권한입니다'); return; }
    const x=list[+b.dataset.i];
    const ok=await askChoice('이 백업으로 되살릴까요?', `${E(x.t)}<br>${E(fmtDT(new Date(x.at)).slice(0,16))} · ${E(sumTxt(stSum(x.st)))}<br><br>${isShared()?'공유 근태 중 <b>내 관리 범위</b>에 해당하는 사업장이 이 백업 내용으로 바뀝니다.':''}`,
      [{id:'go',label:'되살리기'},{id:'no',label:'취소',sec:true}]);
    if(ok!=='go') return;
    if(cur) await backupState(cur,'되살리기 전 자료');
    lsSet(SH_KEY, JSON.stringify(x.st)); setMeta(SH_KEY,new Date().toISOString());
    if(isShared()) await syncShared({live:false}); else await pushKey(SH_KEY);
    tip('백업으로 되살렸습니다'); setTimeout(()=>location.reload(),600);
  });
}

/* =====================================================================
   관리자 페이지
   ===================================================================== */
let ADM={tab:'users', users:[], filter:'all', q:'', logUser:'', devices:[], settings:null};
function closeAdmin(){ g('admPanel').classList.add('hidden'); g('admPanel').innerHTML=''; document.body.classList.remove('auth-locked'); }
function admErr(e){ tip('처리하지 못했습니다: '+(e&&e.message||e)); }
async function openAdmin(tab){
  if(!PROFILE||!['owner','admin'].includes(PROFILE.role)) return;
  ADM.tab=tab||ADM.tab;
  const p=g('admPanel'); p.classList.remove('hidden'); document.body.classList.add('auth-locked');
  p.innerHTML=`<div class="adm-top"><div class="adm-top-in"><h2>🛡️ 관리자 페이지<small>${E(PROFILE.name||PROFILE.email)} · ${E(ROLE_KO[PROFILE.role])} — ${E(AC.name||'')}</small></h2>
      <button class="adm-x" id="admRefresh">새로고침</button><button class="adm-x" id="admClose">✕ 닫기</button></div>
    <div class="adm-tabs" id="admTabs">
      <button data-t="users">👥 사용자</button><button data-t="logs">🕘 접속기록</button><button data-t="devices">💻 기기</button>
      <button data-t="alogs">📝 관리작업</button><button data-t="settings">⚙️ 앱 설정</button></div></div>
    <div class="adm-body" id="admBody"><div class="ag-spin"></div></div>`;
  g('admClose').onclick=closeAdmin;
  g('admRefresh').onclick=()=>admTab(ADM.tab);
  g('admTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>admTab(b.dataset.t));
  admTab(ADM.tab);
}
async function admTab(t){
  ADM.tab=t;
  g('admTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  const body=g('admBody'); body.innerHTML='<div class="ag-spin"></div>';
  try{
    if(t==='users') await admUsers();
    else if(t==='logs') await admLogs();
    else if(t==='devices') await admDevices();
    else if(t==='alogs') await admAlogs();
    else await admSettings();
  }catch(e){ body.innerHTML=`<div class="adm-empty">불러오지 못했습니다: ${E(e.message||e)}</div>`; }
  body.insertAdjacentHTML('beforeend',`<div class="adm-sign">Designed &amp; Developed by ${AUTH_CREATOR}</div>`);
}
const isExpired = u => u.expires_at && u.expires_at < todayKST();
function badge(u){
  const st = isExpired(u)&&u.status==='active' ? `<span class="adm-badge b-expired">기한 만료</span>` : `<span class="adm-badge b-${u.status}">${STATUS_KO[u.status]}</span>`;
  const sc=u.role==='owner'?{level:'all'}:(u.scope||{});
  return st+`<span class="adm-badge b-${u.role}">${ROLE_KO[u.role]}</span><span class="adm-badge b-scope ${sc.level?'on':''}" title="근태 관리 범위">🏢 ${E(scopeLabel(sc))}</span>`;
}
async function admUsers(){
  const {data,error}=await SB.rpc('admin_list_users'); if(error) throw error;
  ADM.users=data||[]; drawUsers();
}
function drawUsers(){
  const U=ADM.users, me=PROFILE;
  const cnt={all:U.length,pending:U.filter(u=>u.status==='pending').length,active:U.filter(u=>u.status==='active'&&!isExpired(u)).length,
             suspended:U.filter(u=>u.status==='suspended').length,expired:U.filter(u=>u.status==='active'&&isExpired(u)).length};
  const f=ADM.filter, q=ADM.q.toLowerCase();
  const list=U.filter(u=>(f==='all'||(f==='expired'?(u.status==='active'&&isExpired(u)):f==='active'?(u.status==='active'&&!isExpired(u)):u.status===f))
    && (!q || [u.name,u.email,u.dept,u.phone,u.memo].join(' ').toLowerCase().includes(q)));
  const canTouch = u => u.role!=='owner' && (u.role!=='admin' || me.role==='owner');
  const body=g('admBody');
  body.innerHTML=`
    <div class="adm-stats">${[['all','전체'],['pending','승인 대기'],['active','사용 중'],['suspended','차단'],['expired','기한 만료']].map(([k,n])=>
      `<div class="adm-stat ${f===k?'on':''}" data-f="${k}"><b>${cnt[k]}</b><span>${n}</span></div>`).join('')}</div>
    <div class="adm-note">🔒 비밀번호는 서버에 <b>암호화되어 저장</b>되므로 제작자·관리자도 볼 수 없습니다(개인정보 보호 기준). 비밀번호를 잊은 직원에게는 <b>임시 비밀번호 발급</b>을 쓰세요 — 그 직원은 다음 로그인 때 새 비밀번호로 바꾸게 됩니다.</div>
    <div class="adm-tool"><input id="admQ" placeholder="이름 · 이메일 · 부서 · 메모 검색" value="${E(ADM.q)}"></div>
    <div class="adm-users">${list.length?list.map(u=>`
      <div class="adm-u" data-id="${u.id}">
        <div><h4>${E(u.name||'(이름 없음)')}<small>${E(u.email)}</small></h4>
          <div class="meta">${badge(u)} ${u.dept?'· '+E(u.dept):''} ${u.phone?'· '+E(u.phone):''}<br>
            가입 ${fmtDT(u.created_at)} · 마지막 로그인 <b>${fmtDT(u.last_login_at)}</b> · 최근 사용 ${fmtDT(u.last_seen_at)}<br>
            사용기한 <b>${E(u.expires_at||'무기한')}</b> · 기기 ${u.device_count}대 ${u.fail_7d>0?`· <span style="color:#9b2222;font-weight:800">7일간 로그인 실패 ${u.fail_7d}회</span>`:''}
            ${u.must_change_pw?' · <span style="color:#8a4b0f;font-weight:800">임시 비밀번호 사용 중</span>':''}
            ${u.memo?`<br>📝 ${E(u.memo)}`:''}</div></div>
        <div></div>
        <div class="acts">${canTouch(u)?`
          ${u.status!=='active'?`<button class="adm-sbtn grn" data-a="${u.status==='pending'?'approve':'activate'}">✅ ${u.status==='pending'?'승인':'차단 해제'}</button>`:''}
          ${u.status==='active'?`<button class="adm-sbtn red" data-a="suspend">⛔ 접속 차단</button>`:''}
          <button class="adm-sbtn grn" data-a="scope">🏢 관리 범위</button>
          <button class="adm-sbtn" data-a="expires">📅 사용기한</button>
          <button class="adm-sbtn" data-a="temp_pw">🔑 임시 비밀번호</button>
          <button class="adm-sbtn" data-a="force_logout">🚪 강제 로그아웃</button>
          <button class="adm-sbtn" data-a="devices">💻 기기</button>
          <button class="adm-sbtn" data-a="logs">🕘 접속기록</button>
          ${me.role==='owner'?`<button class="adm-sbtn" data-a="role">👑 ${u.role==='admin'?'관리자 해제':'관리자로 지정'}</button>`:''}
          <button class="adm-sbtn" data-a="memo">📝 메모</button>
          ${me.role==='owner'?`<button class="adm-sbtn red" data-a="delete">🗑 계정 삭제</button>`:''}`
          :`<span class="meta">${u.role==='owner'?'제작자 계정 — 보호됨 (변경 불가)':'관리자 계정 — 제작자만 변경할 수 있습니다'}</span>
            <button class="adm-sbtn" data-a="logs">🕘 접속기록</button><button class="adm-sbtn" data-a="devices">💻 기기</button>`}
        </div></div>`).join(''):'<div class="adm-empty">해당하는 사용자가 없습니다.</div>'}</div>`;
  body.querySelectorAll('.adm-stat').forEach(s=>s.onclick=()=>{ ADM.filter=s.dataset.f; drawUsers(); });
  const qi=g('admQ'); qi.oninput=()=>{ ADM.q=qi.value; const pos=qi.selectionStart; drawUsers(); const n=g('admQ'); n.focus(); n.setSelectionRange(pos,pos); };
  body.querySelectorAll('.adm-u').forEach(card=>{
    const u=ADM.users.find(x=>x.id===card.dataset.id);
    card.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>userAction(u,b.dataset.a));
  });
}
/* v2.15 관리 범위 지정 — 회사 · 지사(조직) · 사업장 단위 */
/* (v1.3.2) 조직·사업장 목록 — 이 프로그램에는 근태 자료(S)가 없으므로
   근태관리 프로그램이 서버에 올려 둔 공유 조직·사업장 목록을 불러와 씀 (불러온 목록은 이 기기에 보관) */
const LSO = PFX+'_org_cache';
function localOrgData(){
  try{ if(typeof S!=='undefined' && S && ((S.orgs||[]).length || (S.sites||[]).length)) return {orgs:S.orgs||[], sites:S.sites||[]}; }catch(e){}
  const b=shb().base; if(b && b.v && ((b.v.orgs||[]).length)) return {orgs:b.v.orgs||[], sites:[]};
  return null; }
async function fetchOrgData(){
  const r=await SB.rpc('shared_pull'); if(r.error) throw r.error;
  const items=(r.data&&r.data.items)||[], base=(items.find(i=>i.k==='base')||{}).v||{};
  const order=base.siteOrder||[];
  const sites=items.filter(i=>(i.k||'').startsWith('site:') && i.v && i.v.site).map(i=>i.v.site)
    .sort((a,b)=>{ const ia=order.indexOf(a.id), ib=order.indexOf(b.id); return (ia<0?1e9:ia)-(ib<0?1e9:ib); });
  const D={orgs:base.orgs||[], sites, at:new Date().toISOString()};
  if(D.orgs.length || D.sites.length){ try{ localStorage.setItem(LSO, JSON.stringify(D)); }catch(e){} }
  return D; }
async function scopeEditor(u){
  let D=localOrgData();
  if(!D){
    pop(`<h2>관리 범위</h2><p class="ag-sub">조직·사업장 목록을 서버에서 불러오는 중입니다…</p>`);
    let err=null;
    try{ D=await fetchOrgData(); }catch(e){ err=e; }
    if(!D || (!(D.orgs||[]).length && !(D.sites||[]).length)){
      const c=jget(LSO);
      if(c && ((c.orgs||[]).length || (c.sites||[]).length)){ D=c; tip(`서버 연결이 안 되어 이 기기에 보관한 목록(${String(c.at||'').slice(0,10)})을 씁니다`); }
      else{
        pop(`<h2>관리 범위</h2><p class="ag-sub">조직·사업장 목록을 불러오지 못했습니다.<br>${err?`서버 응답: ${E(err.message||String(err))}<br>`:'서버에 등록된 조직·사업장이 없습니다.<br>'}
          조직·사업장은 <b>근태관리 프로그램(Attendance Management Software)</b>에 등록되어 서버에 공유된 목록을 씁니다. 근태관리 프로그램에서 조직·사업장을 등록하고 동기화한 뒤 다시 여세요.</p>
          <button class="ag-btn" id="scRe">다시 불러오기</button><button class="ag-btn sec" id="scX">닫기</button>`);
        g('scX').onclick=closePop; g('scRe').onclick=()=>scopeEditor(u); return;
      }
    }
  }
  return scopeEditorDraw(u, D);
}
function scopeEditorDraw(u, D){
  const orgs=D.orgs||[], sites=D.sites||[], me=PROFILE;
  const kids=id=>orgs.filter(o=>(o.parent||'')===(id||''));
  const tree=[]; const walk=(id,dep)=>kids(id).forEach(o=>{ tree.push({o,dep}); walk(o.id,dep+1); }); walk('',0);
  orgs.forEach(o=>{ if(!tree.some(t=>t.o.id===o.id)) tree.push({o,dep:0}); });
  const path=id=>{ const a=[]; let c=orgs.find(o=>o.id===id), n=0; while(c&&n<20){ a.unshift(c.name); c=orgs.find(o=>o.id===c.parent); n++; } return a.join(' › '); };
  const under=(id,oid)=>{ let c=orgs.find(o=>o.id===id), n=0; while(c&&n<30){ if(c.id===oid) return true; c=orgs.find(o=>o.id===c.parent); n++; } return false; };
  const cur=u.scope||{}; let lv=cur.level||''; let perm=cur.perm==='view'?'view':'edit'; let org=cur.org||((tree[0]||{}).o||{}).id||''; let pick=new Set(cur.sites||[]); let q='';
  /* v2.17 조직별 권한 — 처음 열 때 기존 범위를 규칙으로 옮겨 둠 */
  const R=new Map(); let rest='none'; const siteRules=[];
  if(cur.level==='multi'){ (cur.rules||[]).forEach(r=>{ if(r.t==='org') R.set(r.id,r.perm); else siteRules.push(r); }); rest=cur.rest==='view'?'view':'none'; }
  else if(cur.level==='org' && cur.org) R.set(cur.org, perm);
  else if(cur.level==='site') (cur.sites||[]).forEach(id=>siteRules.push({t:'site',id,perm}));
  const effOrg = oid => { for(const o of orgChain(oid,orgs)){ if(R.has(o)) return R.get(o); } return rest; };
  const effSite = x => { const r=siteRules.find(z=>z.id===x.id); return r ? r.perm : effOrg(x.org||''); };
  const multiSc = () => { const rules=[...[...R].map(([id,p])=>({t:'org',id,perm:p})), ...siteRules];
    const nm=id=>(orgs.find(o=>o.id===id)||{}).name||id;
    const ed=[...R].filter(([,p])=>p==='edit').map(([id])=>nm(id)), vw=[...R].filter(([,p])=>p==='view').map(([id])=>nm(id));
    const cut=a=>a.length>3?a.slice(0,3).join('·')+` 외 ${a.length-3}`:a.join('·');
    const label=[ed.length?cut(ed)+' ✏️수정':'', vw.length?cut(vw)+' 👁보기':'', rest==='view'?'그 외 👁보기':''].filter(Boolean).join(' / ') || '조직별 권한';
    return {level:'multi', rules, rest, label}; };
  const siteCnt=oid=>sites.filter(x=>under(x.org,oid)).length;
  const draw=()=>{
    const list=sites.filter(x=>!q || (x.name+' '+path(x.org)).toLowerCase().includes(q.toLowerCase()));
    pop(`<h2>🏢 관리 범위</h2><p class="ag-sub">${E(u.name||'')} (${E(u.email)})<br>이 사람이 보거나 고칠 수 있는 근태 범위와 권한을 정합니다. 같은 범위를 받은 사람끼리는 서로 고친 근태가 바로(약 20초 안에) 보입니다. 저장하면 그 사람은 다시 로그인한 뒤 새 범위로 열립니다.</p>
      <div class="sc-opt">${[['','개인 자료','공유 안 함 — 자기 기기·계정 자료만(예전 방식)'],...(me.role==='owner'?[['all','전체','모든 회사·지사·사업장 + 조직·근무조 코드 등 공통 설정 저장']]:[]),['multi','조직별 권한 따로 주기','회사·지사마다 ✏️ 수정 / 👁 보기만 / 없음을 따로 정함 (예: 동부지사 수정, 서부·남부·중부 보기만)'],['org','회사 · 지사 단위','고른 조직(회사·본부·지사·지점…) 아래 모든 사업장'],['site','사업장 단위','고른 사업장만']]
        .map(([k,t,d])=>`<label class="sc-r ${lv===k?'on':''}"><input type="radio" name="scLv" value="${k}" ${lv===k?'checked':''}><b>${t}</b><small>${d}</small></label>`).join('')}</div>
      ${lv==='multi'?(()=>{ const nE=sites.filter(x=>effSite(x)==='edit').length, nV=sites.filter(x=>effSite(x)==='view').length;
        const seg=(id,v,inh)=>`<span class="sc-seg" data-o="${E(id)}">${[['','따름'],['edit','✏️ 수정'],['view','👁 보기'],['none','⛔ 없음']].map(([k,t])=>`<button type="button" data-p="${k}" class="p-${k} ${(v||'')===k?'on':''}" title="${k?'':'상위 조직(없으면 「그 외」) 권한을 따름'}">${t}</button>`).join('')}</span>`;
        const effTxt={edit:'수정',view:'보기',none:'없음'};
        return `<p class="sc-sum">사업장 <b>${nE}곳 ✏️ 수정</b> · <b>${nV}곳 👁 보기만</b> · ${sites.length-nE-nV}곳 없음 (전체 ${sites.length}곳)</p>
        <div class="sc-quick"><button type="button" data-q="clear">모두 「따름」으로</button><button type="button" data-q="top-view">최상위 회사 모두 보기만</button></div>
        <div class="sc-tree">${tree.map(({o,dep})=>{ const v=R.has(o.id)?R.get(o.id):''; const ef=effOrg(o.id);
          return `<div class="sc-row" style="padding-left:${dep*16}px"><div class="nm">${E(o.name)}<small>${E(o.type?o.type+' · ':'')}사업장 ${siteCnt(o.id)}곳${v?'':' · 따름'}</small></div><span class="sc-eff ${ef}">${effTxt[ef]}</span>${seg(o.id,v)}</div>`; }).join('')}
          <div class="sc-row"><div class="nm">그 외 모든 회사·조직<small>위에서 정하지 않은 조직, 나중에 새로 만드는 회사·조직</small></div><span class="sc-eff ${rest}">${effTxt[rest]}</span><span class="sc-seg" data-rest="1">${[['view','👁 보기'],['none','⛔ 없음']].map(([k,t])=>`<button type="button" data-p="${k}" class="p-${k} ${rest===k?'on':''}">${t}</button>`).join('')}</span></div></div>
        ${siteRules.length?`<p class="ag-sub">개별 사업장 규칙 ${siteRules.length}곳은 그대로 유지됩니다(사업장 규칙이 조직 규칙보다 우선). <a href="#" id="scSrX">개별 규칙 지우기</a></p>`:''}
        <p class="ag-sub">하위 조직은 따로 정하지 않으면 <b>상위 조직의 권한</b>을 따릅니다. 새 사업장·새 지사도 속한 조직의 권한을 그대로 받습니다. 조직·근무조 코드 같은 공통 설정은 「전체」 권한만 바꿀 수 있습니다.</p>`; })():''}
      ${lv==='org'?`<label class="ag-f"><span>조직 고르기 (회사 · 지사 · 지점 …)</span><select id="scOrg">${tree.map(({o,dep})=>`<option value="${E(o.id)}" ${o.id===org?'selected':''}>${'　'.repeat(dep)}${E(o.type?'['+o.type+'] ':'')}${E(o.name)} · 사업장 ${siteCnt(o.id)}곳</option>`).join('')}</select></label>
        <p class="ag-sub" id="scInfo">${E(path(org))} 아래 사업장 ${siteCnt(org)}곳 (나중에 이 조직에 추가되는 사업장도 포함)</p>`:''}
      ${lv==='site'?`<label class="ag-f"><span>사업장 고르기 · ${pick.size}곳 선택</span><input id="scQ" placeholder="사업장·지사 검색" value="${E(q)}"></label>
        <div class="sc-list">${list.map(x=>`<label class="sc-s"><input type="checkbox" value="${E(x.id)}" ${pick.has(x.id)?'checked':''}><span>${E(x.name)}</span><small>${E(path(x.org))}</small></label>`).join('')||'<p class="ag-sub">사업장이 없습니다</p>'}</div>`:''}
      ${lv&&lv!=='multi'?`<div class="sc-perm"><span>권한</span>${[['edit','✏️ 보고 고치기','범위 안의 근태를 같은 범위 사용자와 함께 보고 고칩니다'],['view','👁 보기만','범위 안의 근태를 볼 수만 있고 고칠 수 없습니다']]
        .map(([k,t,d])=>`<label class="sc-r ${perm===k?'on':''}"><input type="radio" name="scPm" value="${k}" ${perm===k?'checked':''}><b>${t}</b><small>${d}</small></label>`).join('')}</div>`:''}
      ${lv==='all'?`<p class="ag-sub" style="color:#8a4b0f">전체 권한은 조직·근무조 코드·공휴일 같은 공통 설정까지 저장할 수 있습니다. 믿을 수 있는 사람에게만 주세요.</p>`:''}
      <div class="ag-err" id="scErr"></div>
      <button class="ag-btn" id="scGo">저장</button><button class="ag-btn sec" id="scX">취소</button>`);
    document.querySelectorAll('#agPopBox input[name=scLv]').forEach(r=>r.onchange=()=>{ lv=r.value; draw(); });
    document.querySelectorAll('#agPopBox input[name=scPm]').forEach(r=>r.onchange=()=>{ perm=r.value; draw(); });
    document.querySelectorAll('#agPopBox .sc-seg button').forEach(b=>b.onclick=()=>{ const sg=b.parentElement, p=b.dataset.p, st=document.querySelector('#agPopBox .sc-tree'), top=st?st.scrollTop:0;
      if(sg.dataset.rest) rest=p; else { if(p) R.set(sg.dataset.o,p); else R.delete(sg.dataset.o); }
      draw(); const st2=document.querySelector('#agPopBox .sc-tree'); if(st2) st2.scrollTop=top; });
    document.querySelectorAll('#agPopBox .sc-quick button').forEach(b=>b.onclick=()=>{ if(b.dataset.q==='clear') R.clear(); else tree.filter(t=>t.dep===0).forEach(t=>{ if(!R.has(t.o.id)) R.set(t.o.id,'view'); }); draw(); });
    const srx=g('scSrX'); if(srx) srx.onclick=ev=>{ ev.preventDefault(); siteRules.length=0; draw(); };
    const so=g('scOrg'); if(so) so.onchange=()=>{ org=so.value; g('scInfo').textContent=`${path(org)} 아래 사업장 ${siteCnt(org)}곳 (나중에 이 조직에 추가되는 사업장도 포함)`; };
    const sq=g('scQ'); if(sq){ sq.oninput=()=>{ q=sq.value; const p0=sq.selectionStart; draw(); const n=g('scQ'); n.focus(); n.setSelectionRange(p0,p0); }; }
    document.querySelectorAll('#agPopBox .sc-s input').forEach(cb=>cb.onchange=()=>{ if(cb.checked) pick.add(cb.value); else pick.delete(cb.value); const sp=document.querySelector('#agPopBox .ag-f span'); if(sp) sp.textContent=`사업장 고르기 · ${pick.size}곳 선택`; });
    g('scX').onclick=closePop;
    g('scGo').onclick=async()=>{
      let sc={};
      if(lv==='all') sc={level:'all',label:'전체'};
      if(lv==='org'){ if(!org){ g('scErr').textContent='조직을 고르세요'; return; } const o=orgs.find(x=>x.id===org); sc={level:'org',org,label:o?o.name:org}; }
      if(lv==='site'){ if(!pick.size){ g('scErr').textContent='사업장을 하나 이상 고르세요'; return; } const ids=[...pick]; const nm=ids.map(id=>(sites.find(x=>x.id===id)||{}).name||id); sc={level:'site',sites:ids,label:nm.length>1?`${nm[0]} 외 ${nm.length-1}곳`:nm[0]}; }
      if(lv==='multi'){ sc=multiSc(); if(!sc.rules.some(r=>r.perm==='edit'||r.perm==='view') && sc.rest!=='view'){ g('scErr').textContent='조직을 하나 이상 「✏️ 수정」 또는 「👁 보기」로 정하세요'; return; } }
      if(sc.level && sc.level!=='multi' && perm==='view') sc.perm='view';
      closePop(); await upd(u,'scope',JSON.stringify(sc),`${u.name||u.email} 님의 관리 범위: ${scopeLabel(sc)}`);
    };
  };
  draw();
}
async function upd(u,action,value,okMsg){
  const {error}=await SB.rpc('admin_update_user',{p_user:u.id,p_action:action,p_value:value==null?null:String(value)});
  if(error){ admErr(error); return false; }
  tip(okMsg||'처리했습니다'); await admUsers(); return true;
}
function randPw(){ const cs='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const a=new Uint32Array(10); crypto.getRandomValues(a); return Array.from(a,x=>cs[x%cs.length]).join('').replace(/^(.{4})(.{3})/,'$1-$2'); }
async function userAction(u,a){
  const who=`${u.name||''} (${u.email})`;
  if(a==='approve'){ const ok=await upd(u,'approve',null,`${u.name||u.email} 님을 승인했습니다 — 이어서 관리 범위를 정하세요`); if(ok){ const nu=ADM.users.find(x=>x.id===u.id)||u; return scopeEditor(nu); } return; }
  if(a==='scope') return scopeEditor(u);
  if(a==='activate') return upd(u,'activate',null,'차단을 해제했습니다');
  if(a==='suspend'){ if(confirmBox(`${who}\n\n접속을 차단할까요? 쓰고 있는 모든 기기에서 즉시(최대 5분 안에) 로그아웃됩니다.`)) return upd(u,'suspend',null,'접속을 차단했습니다'); return; }
  if(a==='force_logout'){ if(confirmBox(`${who}\n\n모든 기기에서 로그아웃시킬까요? (계정은 그대로, 다시 로그인하면 사용 가능)`)) return upd(u,'force_logout',null,'강제 로그아웃했습니다'); return; }
  if(a==='delete'){ if(confirmBox(`${who}\n\n계정과 동기화된 기록을 완전히 삭제합니다. 되돌릴 수 없습니다. 삭제할까요?`)) return upd(u,'delete',null,'계정을 삭제했습니다'); return; }
  if(a==='role') return upd(u,'role',u.role==='admin'?'user':'admin',u.role==='admin'?'관리자에서 해제했습니다':'관리자로 지정했습니다');
  if(a==='logs'){ ADM.logUser=u.id; return admTab('logs'); }
  if(a==='devices'){ ADM.devUser=u.id; return admTab('devices'); }
  if(a==='memo'){
    pop(`<h2>메모</h2><p class="ag-sub">${E(who)}</p><label class="ag-f"><span>관리용 메모 (본인에게 보이지 않음)</span><textarea id="mmT" rows="3">${E(u.memo||'')}</textarea></label>
      <button class="ag-btn" id="mmGo">저장</button><button class="ag-btn sec" id="mmX">취소</button>`);
    g('mmX').onclick=closePop;
    const t=g('mmT'); g('mmGo').onclick=async()=>{ const v=t.value; closePop(); await upd(u,'memo',v,'메모를 저장했습니다'); };
    return;
  }
  if(a==='expires'){
    const addDays=n=>{ const d=new Date(Date.now()+9*3600e3); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
    pop(`<h2>사용기한 설정</h2><p class="ag-sub">${E(who)}<br>정한 날짜까지 사용할 수 있고, 다음 날부터 자동으로 막힙니다.</p>
      <label class="ag-f"><span>사용기한 (이 날까지)</span><input id="exD" type="date" value="${E(u.expires_at||'')}"></label>
      <div class="adm-tool">${[[7,'+1주'],[30,'+1개월'],[90,'+3개월'],[180,'+6개월'],[365,'+1년']].map(([n,l])=>`<button class="adm-sbtn" data-d="${n}">${l}</button>`).join('')}</div>
      <button class="ag-btn" id="exGo">저장</button><button class="ag-btn sec" id="exNo">무기한으로</button><button class="ag-btn sec" id="exX">취소</button>`);
    g('agPopBox').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{ g('exD').value=addDays(+b.dataset.d); });
    g('exX').onclick=closePop;
    g('exNo').onclick=async()=>{ closePop(); await upd(u,'expires','', '무기한으로 바꿨습니다'); };
    g('exGo').onclick=async()=>{ const v=g('exD').value; if(!v){ tip('날짜를 고르세요'); return; } closePop(); await upd(u,'expires',v,`사용기한을 ${v}로 정했습니다`); };
    return;
  }
  if(a==='temp_pw'){
    const pw=randPw();
    pop(`<h2>임시 비밀번호 발급</h2><p class="ag-sub">${E(who)}<br>아래 임시 비밀번호로 바꾸고, 쓰던 기기는 모두 로그아웃됩니다. 직원은 이 비밀번호로 로그인한 뒤 <b>새 비밀번호로 바꿔야</b> 계속 쓸 수 있습니다.</p>
      <label class="ag-f"><span>임시 비밀번호 (직접 바꿔도 됨, 8자 이상)</span><input id="tpV" value="${pw}"></label>
      <button class="ag-btn" id="tpGo">발급하기</button><button class="ag-btn sec" id="tpX">취소</button>`);
    g('tpX').onclick=closePop;
    g('tpGo').onclick=async()=>{
      const v=g('tpV').value.trim(); if(v.length<8){ tip('8자 이상'); return; }
      busy(g('tpGo'),true,'발급 중…');
      const {error}=await SB.rpc('admin_set_temp_password',{p_user:u.id,p_password:v});
      if(error){ busy(g('tpGo'),false,'발급하기'); admErr(error); return; }
      pop(`<h2>임시 비밀번호가 발급되었습니다</h2><p class="ag-sub">${E(who)} 님에게 전달하세요. 이 창을 닫으면 다시 볼 수 없습니다.</p>
        <div class="tmp-pw">${E(v)}</div><button class="ag-btn" id="tpCopy">복사</button><button class="ag-btn sec" id="tpDone">닫기</button>`);
      g('tpCopy').onclick=()=>{ try{ navigator.clipboard.writeText(v); tip('복사했습니다'); }catch(e){} };
      g('tpDone').onclick=closePop; admUsers();
    };
  }
}
function confirmBox(t){ try{ return window.confirm(t); }catch(e){ return true; } }

async function admLogs(){
  if(!ADM.users.length){ const r=await SB.rpc('admin_list_users'); ADM.users=r.data||[]; }
  const {data,error}=await SB.rpc('admin_list_logs',{p_user:ADM.logUser||null,p_limit:500}); if(error) throw error;
  const rows=data||[];
  g('admBody').innerHTML=`
    <div class="adm-tool"><select id="lgU"><option value="">전체 사용자</option>${ADM.users.map(u=>`<option value="${u.id}" ${ADM.logUser===u.id?'selected':''}>${E(u.name||'')} · ${E(u.email)}</option>`).join('')}</select>
      <select id="lgE"><option value="">모든 기록</option>${Object.entries(EV_KO).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
      <span class="meta" style="font-size:12.5px;color:var(--muted)">최근 500건 · 서버에 계속 보관됩니다</span></div>
    <div class="adm-tblwrap"><table class="adm-tbl"><thead><tr><th>일시</th><th>사용자</th><th>기록</th><th>기기</th><th>IP</th><th>비고</th></tr></thead>
    <tbody id="lgB"></tbody></table></div>`;
  const draw=()=>{ const ev=g('lgE').value; const R=rows.filter(r=>!ev||r.event===ev);
    g('lgB').innerHTML=R.length?R.map(r=>`<tr><td style="white-space:nowrap">${fmtDT(r.created_at)}</td><td>${E(r.email)}</td><td class="ev-${E(r.event)}">${E(EV_KO[r.event]||r.event)}</td><td>${E(r.device)}</td><td>${E(r.ip)}</td><td>${E(REASON_KO[r.detail]?REASON_KO[r.detail][1]:r.detail)}</td></tr>`).join(''):'<tr><td colspan="6" class="adm-empty">기록이 없습니다</td></tr>'; };
  draw(); g('lgE').onchange=draw;
  g('lgU').onchange=()=>{ ADM.logUser=g('lgU').value; admTab('logs'); };
}
async function admDevices(){
  const {data,error}=await SB.rpc('admin_list_devices',{p_user:ADM.devUser||null}); if(error) throw error;
  const rows=data||[];
  g('admBody').innerHTML=`
    <div class="adm-note">💻 직원이 로그인한 기기 목록입니다. 휴대폰 분실 등으로 <b>특정 기기만</b> 막으려면 "이 기기 차단"을 누르세요(계정은 다른 기기에서 계속 사용 가능).</div>
    <div class="adm-tool">${ADM.devUser?`<button class="adm-sbtn" id="dvAll">← 전체 기기 보기</button>`:''}</div>
    <div class="adm-tblwrap"><table class="adm-tbl"><thead><tr><th>사용자</th><th>기기 이름</th><th>처음 사용</th><th>마지막 사용</th><th>IP</th><th>상태</th><th></th></tr></thead><tbody>
    ${rows.length?rows.map((d,i)=>`<tr><td>${E(d.user_name||'')}<br><small>${E(d.email)}</small></td><td>${E(d.name||'-')}<br><small style="color:var(--muted)">${E((d.ua||'').slice(0,60))}</small></td>
      <td style="white-space:nowrap">${fmtDT(d.first_seen)}</td><td style="white-space:nowrap">${fmtDT(d.last_seen)}</td><td>${E(d.last_ip)}</td>
      <td>${d.blocked?'<span class="adm-badge b-suspended">차단</span>':'<span class="adm-badge b-active">허용</span>'}</td>
      <td><button class="adm-sbtn ${d.blocked?'grn':'red'}" data-i="${i}">${d.blocked?'차단 해제':'이 기기 차단'}</button></td></tr>`).join(''):'<tr><td colspan="7" class="adm-empty">기기 기록이 없습니다</td></tr>'}
    </tbody></table></div>`;
  if(g('dvAll')) g('dvAll').onclick=()=>{ ADM.devUser=''; admTab('devices'); };
  g('admBody').querySelectorAll('[data-i]').forEach(b=>b.onclick=async()=>{
    const d=rows[+b.dataset.i];
    const {error}=await SB.rpc('admin_set_device_block',{p_user:d.user_id,p_device:d.id,p_blocked:!d.blocked});
    if(error) admErr(error); else { tip(d.blocked?'기기 차단을 해제했습니다':'기기를 차단했습니다'); admTab('devices'); }
  });
}
const ACT_KO={approve:'승인',activate:'차단 해제',suspend:'접속 차단',expires:'사용기한 변경',role:'역할 변경',memo:'메모',force_logout:'강제 로그아웃',delete:'계정 삭제',temp_password:'임시 비밀번호 발급',device_block:'기기 차단',device_unblock:'기기 차단 해제',settings:'앱 설정 변경'};
async function admAlogs(){
  const {data,error}=await SB.rpc('admin_list_admin_logs',{p_limit:300}); if(error) throw error;
  const rows=data||[];
  g('admBody').innerHTML=`<div class="adm-note">📝 누가 언제 누구를 승인·차단했는지 등 관리 작업이 모두 남습니다(지울 수 없음).</div>
    <div class="adm-tblwrap"><table class="adm-tbl"><thead><tr><th>일시</th><th>처리한 사람</th><th>대상</th><th>작업</th><th>내용</th></tr></thead><tbody>
    ${rows.length?rows.map(r=>`<tr><td style="white-space:nowrap">${fmtDT(r.created_at)}</td><td>${E(r.admin_email)}</td><td>${E(r.target_email)}</td><td><b>${E(ACT_KO[r.action]||r.action)}</b></td><td>${E(r.detail)}</td></tr>`).join(''):'<tr><td colspan="5" class="adm-empty">기록이 없습니다</td></tr>'}
    </tbody></table></div>`;
}
async function admSettings(){
  const {data,error}=await SB.rpc('admin_get_settings'); if(error) throw error;
  const s=ADM.settings=data||{}; const own=PROFILE.role==='owner';
  g('admBody').innerHTML=`
    <div class="adm-card"><h3>앱 전체 설정</h3><p>${own?'제작자만 바꿀 수 있습니다. 저장하면 모든 사용자에게 바로 적용됩니다.':'제작자만 바꿀 수 있어 보기만 가능합니다.'}</p>
      <div class="adm-sw"><div><b>가입 신청 받기</b><small>끄면 로그인 화면에서 "가입 신청"이 사라집니다</small></div><input type="checkbox" id="stSignup" ${s.signup_open?'checked':''} ${own?'':'disabled'}></div>
      <div class="adm-sw"><div><b>가입 후 제작자 승인 필요</b><small>켜 두면 승인 전에는 사용할 수 없습니다 (권장)</small></div><input type="checkbox" id="stAppr" ${s.require_approval?'checked':''} ${own?'':'disabled'}></div>
      <div class="adm-sw"><div><b>승인 시 기본 사용기간 (일)</b><small>0 = 무기한 · 예: 365 → 승인일부터 1년</small></div><input type="number" id="stDays" min="0" max="3650" style="width:90px" value="${+s.default_days||0}" ${own?'':'disabled'}></div>
      <div class="adm-sw"><div><b style="color:var(--danger)">앱 전체 잠금 (점검 모드)</b><small>켜면 제작자·관리자 외 모든 사용자가 사용 불가</small></div><input type="checkbox" id="stLock" ${s.global_lock?'checked':''} ${own?'':'disabled'}></div>
      <div class="adm-sw" style="display:block"><div><b>잠금 안내 문구</b></div><input type="text" id="stMsg" style="width:100%;box-sizing:border-box;margin-top:6px" value="${E(s.lock_message||'')}" ${own?'':'disabled'}></div>
      ${own?'<button class="ag-btn" id="stSave" style="max-width:240px">설정 저장</button>':''}</div>
    <div class="adm-card"><h3>서버 연결 정보</h3>
      <p>제작자 이메일(owner): <b>${E(s.owner_email||'')}</b><br>서버 주소: <b>${E(CFG&&CFG.supabaseUrl||'')}</b><br>설정 읽은 곳: ${E(CFG&&CFG.src||'')} · 이 기기: ${E(deviceName())}</p>
      <p>로그인 기능 전체를 끄려면 저장소의 <b>auth-config.json</b>에서 <code>"enabled": false</code> 로 바꾸면 됩니다.</p></div>`;
  if(g('stSave')) g('stSave').onclick=async()=>{
    const {error}=await SB.rpc('admin_save_settings',{p_signup_open:g('stSignup').checked,p_require_approval:g('stAppr').checked,p_global_lock:g('stLock').checked,p_lock_message:g('stMsg').value,p_default_days:+g('stDays').value||0});
    if(error) admErr(error); else { tip('앱 설정을 저장했습니다'); admTab('settings'); }
  };
}

/* ---------- 시작 ---------- */
async function boot(retry){
  CFG = await loadConfig();
  if(!cfgOn(CFG)){ unlock(); renderAcct(); return; }          /* 로그인 기능 꺼짐 → 기존처럼 바로 사용 */
  viewLoading(retry?'다시 확인 중…':'접속 확인 중…');
  if(!window.supabase||!window.supabase.createClient){ viewBlocked('offline'); return; }
  if(!SB){
    SB = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:LS.session}});
    SB.auth.onAuthStateChange((ev)=>{ if(ev==='PASSWORD_RECOVERY'){ recoveryMode=true; viewChangePw(false); } });
    window.APP_AUTH = window[(AC.globalName||'APP_AUTH')] = {get profile(){return PROFILE}, openAdmin, logout, client:SB};
  }
  hookStore();
  try{ const r=await SB.rpc('public_settings'); if(r.data) PUB=r.data; }catch(e){}
  let session=null;
  try{ const r=await SB.auth.getSession(); session=r.data&&r.data.session; }catch(e){}
  if(recoveryMode) return;
  if(!session){
    const prof=jget(LS.prof), okAt=+lsGet(LS.okAt)||0;
    if(!navigator.onLine && prof && Date.now()-okAt<OFFLINE_GRACE_H*3600e3){ PROFILE=prof; renderAcct('오프라인'); unlock(); return; }
    renderAcct(); viewLogin(); return;
  }
  if(!lsGet(LS.loginAt)) lsSet(LS.loginAt,new Date().toISOString());
  await checkin('boot');
}
function resumeCheck(){ if(SB && PROFILE && cfgOn(CFG)) checkin('resume'); }
setInterval(resumeCheck, 5*60*1000);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') resumeCheck(); });
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>boot()); else boot();
})();

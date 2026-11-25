/* =====================================================================
 * 에스텍 통합 로그인 · 프로그램별 사용 권한 (app-access) v1.0
 * 에스텍 프로그램 공통 — Safety & Health · Performance Management · Proposal Production · Legal Response · Complaint · short estimate · Site-Overview · Quotation · WBE
 * 사용법: 이 스크립트 앞에 window.APP_ACCESS_CFG = { app:'stcr', auth:'STCR_AUTH', name:'...' } 를 둡니다.
 *  ● 로그인 후 서버 함수 app_check(app) 로 이 프로그램 사용 권한을 확인 → 없으면 잠금 화면
 *  ● 제작자·관리자: 관리자 페이지에 「🔐 프로그램별 권한」 탭 추가(사용/사용 안 함 · 사용기한 · 관리 범위(지사))
 *  ● 서버에 SQL(server/supabase_app_access.sql)을 아직 실행하지 않았으면 기존처럼 그대로 사용(제작자에게만 안내)
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_ACCESS_CFG || {};
  const APP = CFG.app, AUTHNAME = CFG.auth;
  if (!APP || !AUTHNAME) return;
  const APPS = [
    { id: 'stsh', name: '안전보건 관리', full: 'S-Tec Safety & Health Management System (에스텍 안전보건 관리 시스템)' },
    { id: 'stpm', name: '성과 관리', full: 'S-Tec Performance Management System (에스텍 성과 관리 시스템)' },
    { id: 'stpp', name: '제안서 제작', full: 'S-Tec Proposal Production System (에스텍 제안서 제작시스템)' },
    { id: 'stlr', name: '법률 대응', full: 'Legal Response System (법률 대응 시스템)' },
    { id: 'stcr', name: 'Complaint 대응', full: 'S-Tec Complaint Response System' },
    { id: 'stse', name: '단기 견적', full: 'S-Tec short estimate' },
    { id: 'stso', name: '사업장 지도', full: 'S-Tec-Business-Site-Overview' },
    { id: 'stqs', name: '용역 견적', full: 'S-Tec-Quotation-System' },
    { id: 'wbe', name: '업무량 산정', full: 'Workload-Based Cost and Labor Estimation' }
  ];
  const BR = ['동부', '서부', '남부', '중부'];
  try{ if(window.StecMaster) StecMaster.branchKeys(BR); }catch(e){} /*sm-brk*/
  const ROLE = { owner: '제작자', admin: '관리자', user: '사용자' };
  const STAT = { pending: '승인 대기', active: '사용 중', suspended: '차단' };
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => window[AUTHNAME];
  const tip = m => { try { (window.toast || alert)(m); } catch (e) { } };
  const SIGN = '<div class="aa-sign">Designed &amp; Developed by Rat Rae Choi</div>';
  const thisApp = APPS.find(a => a.id === APP) || { name: CFG.name || APP };

  /* ---------- 스타일 ---------- */
  const css = `
#aaLock{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(1200px 600px at 20% -10%,#2a3fa8 0,transparent 60%),linear-gradient(160deg,#0b1757,#14267e)}
#aaLock.hidden,#aaPop.hidden{display:none}
.aa-box{width:100%;max-width:420px;background:#fff;color:#141a3a;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:26px 24px 18px;text-align:center;font-family:inherit}
.aa-box .ic{font-size:44px;margin-bottom:4px}.aa-box h2{margin:0 0 6px;font-size:18px}.aa-box p{margin:0 0 14px;color:#59617f;font-size:13.5px;line-height:1.6}
.aa-btn{display:block;width:100%;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:800;font-size:15px;cursor:pointer;background:#1530a0;color:#fff;margin-top:8px}
.aa-btn.sec{background:#e3e8fa;color:#1530a0}
.aa-sign{margin-top:12px;font-size:11px;color:#8a93a3;font-style:italic;text-align:right}
.aa-note{margin:0 0 10px;padding:9px 12px;border-radius:10px;background:#eef3ff;color:#26357a;font-size:12.5px;line-height:1.6}
.aa-note.warn{background:#fff4e5;color:#8a4b00}
.aa-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
.aa-tools input{flex:1;min-width:160px;padding:8px 10px;border:1px solid #d3d9ea;border-radius:9px;font:inherit}
.aa-wrap{overflow:auto;border:1px solid #dde2f1;border-radius:12px}
table.aa-t{border-collapse:collapse;width:100%;font-size:12.5px;min-width:820px}
.aa-t th,.aa-t td{border-bottom:1px solid #eceff6;padding:7px 8px;text-align:center;vertical-align:middle}
.aa-t th{background:#f5f7fc;color:#3a4366;font-weight:800;position:sticky;top:0;z-index:1}
.aa-t th.me{background:#e7f6ec;color:#17552f}
.aa-t td.u{text-align:left;min-width:190px}.aa-t td.u b{display:block}.aa-t td.u small{color:#6b7391}
.aa-cell{border:1px solid #d3d9ea;background:#fff;border-radius:9px;padding:5px 8px;cursor:pointer;font:inherit;font-size:12px;min-width:92px;line-height:1.35}
.aa-cell.on{background:#e7f6ec;border-color:#9fd3ae;color:#17552f;font-weight:700}
.aa-cell.off{color:#8a93a3}
.aa-cell.exp{background:#fdf1ef;border-color:#f2b8ae;color:#b3261e}
.aa-cell small{display:block;font-weight:400;font-size:10.5px}
.aa-all{color:#1530a0;font-weight:700;font-size:12px}
#aaPop{position:fixed;inset:0;z-index:9700;background:rgba(6,10,40,.55);display:flex;align-items:center;justify-content:center;padding:16px}
#aaPop .aa-box{text-align:left;max-width:400px}
.aa-f{margin:10px 0}.aa-f>span{display:block;font-size:12.5px;font-weight:700;color:#59617f;margin-bottom:5px}
.aa-seg{display:flex;gap:6px}.aa-seg label,.aa-chk label{border:1px solid #d3d9ea;border-radius:9px;padding:7px 12px;cursor:pointer;font-size:13px;display:inline-flex;gap:6px;align-items:center}
.aa-chk{display:flex;gap:6px;flex-wrap:wrap}
.aa-f input[type=date]{padding:8px;border:1px solid #d3d9ea;border-radius:9px;font:inherit}
.aa-row{display:flex;gap:8px}.aa-row .aa-btn{margin-top:14px}
#aaBanner{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:8000;background:#fff4e5;color:#8a4b00;border:1px solid #f0c27a;border-radius:12px;padding:9px 14px;font-size:12.5px;box-shadow:0 6px 20px rgba(0,0,0,.18);max-width:92vw}
#aaBanner button{margin-left:8px;border:0;background:none;color:#8a4b00;font-weight:800;cursor:pointer}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- 사용 권한 확인 ---------- */
  let lastUser = null, checking = false, notInstalled = false;
  window.APP_ACCESS = null;
  function lockView(html) {
    let d = document.getElementById('aaLock');
    if (!d) { d = document.createElement('div'); d.id = 'aaLock'; document.body.appendChild(d); }
    d.className = ''; d.innerHTML = `<div class="aa-box">${html}${SIGN}</div>`;
    document.body.classList.add('auth-locked');
  }
  function unlockView() { const d = document.getElementById('aaLock'); if (d) d.className = 'hidden'; if (!document.getElementById('authGate') || document.getElementById('authGate').classList.contains('hidden')) document.body.classList.remove('auth-locked'); }
  async function check(force) {
    const au = A(); if (!au || !au.client) return;
    const pf = au.profile; if (!pf) { lastUser = null; unlockView(); return; }
    const gate = document.getElementById('authGate'); if (gate && !gate.classList.contains('hidden')) return;
    if (!force && lastUser === pf.id) return;
    if (checking) return; checking = true;
    try {
      const { data, error } = await au.client.rpc('app_check', { p_app: APP });
      if (error) {
        if (/PGRST202|Could not find the function/i.test((error.code || '') + ' ' + (error.message || ''))) { notInstalled = true; grant({ ok: true, perm: 'use', branches: [], notInstalled: true }, pf); }
        else if (!navigator.onLine) grant({ ok: true, perm: 'use', branches: [], offline: true }, pf);
        else throw error;
      } else if (data && data.ok) grant(data, pf);
      else deny(data || {}, pf);
      lastUser = pf.id;
    } catch (e) { console.warn('app_check', e); }
    finally { checking = false; }
  }
  function grant(d, pf) {
    window.APP_ACCESS = d; unlockView();
    window.dispatchEvent(new CustomEvent('app-access', { detail: d }));
    if (d.notInstalled && pf && ['owner', 'admin'].includes(pf.role) && !sessionStorage.getItem('aa_banner')) {
      const b = document.createElement('div'); b.id = 'aaBanner';
      b.innerHTML = '프로그램별 권한 기능을 켜려면 Supabase SQL Editor에서 <b>supabase_app_access.sql</b>을 한 번 실행하세요. (지금은 승인된 사용자 모두 사용 가능) <button>닫기</button>';
      b.querySelector('button').onclick = () => { b.remove(); sessionStorage.setItem('aa_banner', '1'); };
      document.body.appendChild(b);
    }
  }
  function deny(d, pf) {
    window.APP_ACCESS = d;
    if (d.reason === 'org_closed') {   /* 회사·조직별 공개: 소속 조직에 이 프로그램이 열려 있지 않음 */
      lockView(`<div class="ic">🏢</div><h2>소속 조직에 공개되지 않은 프로그램입니다</h2>
        <p><b>${E(pf.name || pf.email)}</b> 님의 소속 「${E(d.org || '미지정')}」에는<br>「${E(thisApp.full || thisApp.name)}」이(가) 아직 공개되지 않았습니다.<br>소속 조직 관리자 또는 제작자에게 공개를 요청해 주세요.</p>
        <button class="aa-btn" id="aaRe">다시 확인</button><button class="aa-btn sec" id="aaOut">다른 계정으로 로그인</button>`);
      document.getElementById('aaRe').onclick = () => { lastUser = null; check(true); };
      document.getElementById('aaOut').onclick = () => { try { A().logout(); } catch (e) { location.reload(); } };
      return;
    }
    const exp = d.reason === 'app_expired';
    lockView(`<div class="ic">${exp ? '📅' : '🔐'}</div><h2>${exp ? '이 프로그램 사용기한이 지났습니다' : '이 프로그램 사용 권한이 없습니다'}</h2>
      <p><b>${E(pf.name || pf.email)}</b> 님의 계정은 승인되었지만<br>「${E(thisApp.full || thisApp.name)}」 사용 권한이 ${exp ? `<b>${E(d.expires_at)}</b>에 끝났습니다` : '아직 지정되지 않았습니다'}.<br>제작자(관리자)에게 <b>프로그램별 권한</b>을 요청하세요.</p>
      <button class="aa-btn" id="aaRe">다시 확인</button><button class="aa-btn sec" id="aaOut">다른 계정으로 로그인</button>`);
    document.getElementById('aaRe').onclick = () => { lastUser = null; check(true); };
    document.getElementById('aaOut').onclick = () => { try { A().logout(); } catch (e) { location.reload(); } };
  }
  setInterval(() => check(false), 1500);
  setInterval(() => { lastUser = null; check(true); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { lastUser = null; check(true); } });

  /* ---------- 관리자 페이지: 🔐 프로그램별 권한 탭 ---------- */
  let ROWS = [], Q = '';
  function injectTab() {
    const tabs = document.getElementById('admTabs'); if (!tabs || tabs.querySelector('[data-t="appacc"]')) return;
    const b = document.createElement('button'); b.dataset.t = 'appacc'; b.textContent = '🔐 프로그램별 권한';
    b.onclick = () => { tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderTab(); };
    tabs.appendChild(b);
  }
  new MutationObserver(injectTab).observe(document.documentElement, { childList: true, subtree: true });
  function cellHtml(u, ap) {
    if (u.role === 'owner' || u.role === 'admin') return `<span class="aa-all">전체 (${ROLE[u.role]})</span>`;
    const x = (u.apps || {})[ap.id];
    if (!x || x.perm !== 'use') return `<button class="aa-cell off" data-u="${u.id}" data-a="${ap.id}">사용 안 함<small>눌러서 지정</small></button>`;
    const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const ex = x.expires_at && x.expires_at < today;
    const br = (x.branches && x.branches.length) ? x.branches.join('·') : '전체 지사';
    return `<button class="aa-cell ${ex ? 'exp' : 'on'}" data-u="${u.id}" data-a="${ap.id}">${ex ? '기한 만료' : '사용'}<small>${E(br)}${x.expires_at ? ' · ~' + E(x.expires_at) : ''}</small></button>`;
  }
  async function renderTab() {
    const body = document.getElementById('admBody'); if (!body) return;
    body.innerHTML = '<div class="ag-spin"></div>';
    const { data, error } = await A().client.rpc('admin_list_app_access');
    if (error) {
      body.innerHTML = `<div class="aa-note warn"><b>프로그램별 권한 서버 설정이 아직 없습니다.</b><br>Supabase 프로젝트 → SQL Editor → <b>supabase_app_access.sql</b> 전체를 붙여넣고 Run 하세요(한 번만).<br>파일 위치: GitHub S-Tec-Proposal-Production-System 저장소 › server 폴더<br><small>${E(error.message || '')}</small></div>${SIGN}`;
      return;
    }
    ROWS = data || []; draw();
  }
  function draw() {
    const body = document.getElementById('admBody'); if (!body) return;
    const q = Q.trim().toLowerCase();
    const rows = ROWS.filter(u => !q || (u.name + ' ' + u.email + ' ' + (u.dept || '')).toLowerCase().includes(q));
    body.innerHTML = `<div class="aa-note">하나의 아이디(통합 로그인)로 쓰는 <b>5개 프로그램</b>의 사용 권한을 사람마다 따로 줍니다. 칸을 누르면 <b>사용 / 사용 안 함 · 사용기한 · 관리 범위(담당 지사)</b>를 정합니다.<br>
      제작자·관리자는 모든 프로그램을 씁니다. 가입 승인·차단·계정 기한은 「👥 사용자」 탭에서 관리하며 모든 프로그램에 함께 적용됩니다. (근태관리 프로그램은 자체 「관리 범위」를 씁니다.)</div>
      <div class="aa-tools"><input id="aaQ" placeholder="🔍 이름·이메일·부서 검색" value="${E(Q)}"><span style="font-size:12px;color:#6b7391">${rows.length}명</span></div>
      <div class="aa-wrap"><table class="aa-t"><thead><tr><th style="text-align:left">사용자</th>${APPS.map(a => `<th class="${a.id === APP ? 'me' : ''}">${E(a.name)}${a.id === APP ? '<br><small>(이 프로그램)</small>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(u => `<tr><td class="u"><b>${E(u.name || '(이름 없음)')}</b><small>${E(u.email)} · ${E(ROLE[u.role] || '')} · ${E(STAT[u.status] || '')}${u.dept ? ' · ' + E(u.dept) : ''}</small></td>${APPS.map(a => `<td>${cellHtml(u, a)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="6">사용자가 없습니다</td></tr>'}</tbody></table></div>${SIGN}`;
    const qi = document.getElementById('aaQ'); qi.oninput = () => { Q = qi.value; const pos = qi.selectionStart; draw(); const n = document.getElementById('aaQ'); n.focus(); n.setSelectionRange(pos, pos); };
    body.querySelectorAll('.aa-cell').forEach(b => b.onclick = () => edit(b.dataset.u, b.dataset.a));
  }
  function edit(uid, app) {
    const u = ROWS.find(x => x.id === uid), ap = APPS.find(a => a.id === app); if (!u || !ap) return;
    const x = (u.apps || {})[app] || { perm: 'none', expires_at: null, branches: [] };
    let pop = document.getElementById('aaPop');
    if (!pop) { pop = document.createElement('div'); pop.id = 'aaPop'; document.body.appendChild(pop); pop.addEventListener('click', e => { if (e.target === pop) pop.className = 'hidden'; }); }
    pop.className = '';
    pop.innerHTML = `<div class="aa-box"><h2>🔐 ${E(ap.full)}</h2><p style="margin:0">${E(u.name || u.email)} · ${E(u.email)}</p>
      <div class="aa-f"><span>사용 권한</span><div class="aa-seg"><label><input type="radio" name="aaP" value="use" ${x.perm === 'use' ? 'checked' : ''}> 사용</label><label><input type="radio" name="aaP" value="none" ${x.perm !== 'use' ? 'checked' : ''}> 사용 안 함</label></div></div>
      <div class="aa-f"><span>이 프로그램 사용기한 (비우면 계정 기한만 적용)</span><input type="date" id="aaE" value="${E(x.expires_at || '')}"></div>
      <div class="aa-f"><span>관리 범위 — 담당 지사 (모두 비우면 전체 지사)</span><div class="aa-chk">${BR.map(b => `<label><input type="checkbox" value="${b}" ${(x.branches || []).includes(b) ? 'checked' : ''}> ${b}지사</label>`).join('')}</div></div>
      <div class="aa-row"><button class="aa-btn sec" id="aaC">취소</button><button class="aa-btn" id="aaS">저장</button></div>${SIGN}</div>`;
    document.getElementById('aaC').onclick = () => pop.className = 'hidden';
    document.getElementById('aaS').onclick = async () => {
      const perm = pop.querySelector('input[name=aaP]:checked').value;
      const ex = document.getElementById('aaE').value || null;
      const brs = [...pop.querySelectorAll('.aa-chk input:checked')].map(i => i.value);
      const btn = document.getElementById('aaS'); btn.disabled = true; btn.textContent = '저장 중…';
      const { error } = await A().client.rpc('admin_set_app_access', { p_user: uid, p_app: app, p_perm: perm, p_expires: ex, p_branches: brs });
      if (error) { tip('저장하지 못했습니다: ' + error.message); btn.disabled = false; btn.textContent = '저장'; return; }
      u.apps = Object.assign({}, u.apps, { [app]: { perm, expires_at: ex, branches: brs } });
      pop.className = 'hidden'; draw(); tip('프로그램별 권한을 저장했습니다');
    };
  }
})();

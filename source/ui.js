/* =====================================================================
 * S-Tec Safety & Health Management System — 상단 기능
 * (통합관리 시스템 12개 프로그램 공통: 담당 카드 · 다운로드 QR · 친구추천 · 내 계정 · 주간/야간/시스템)
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const UI_KEY = 'stec_sh_ui';
let UI = { theme: 'system', manager: null, tab: 'dash', site: '', per: 'm', ref: '', F: {}, vol: 0.6, muted: true, mask: false };
try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { }
function saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch (e) { } }   // 로그인 시 여러 기기 동기화

/* ---------- 테마 ---------- */
const MQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme(t) {
  if (!['light', 'dark', 'system'].includes(t)) t = 'system';
  const dark = t === 'dark' || (t === 'system' && MQ && MQ.matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  UI.theme = t; saveUI();
  $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
  if (window.drawCharts) drawCharts();
}
if (MQ && MQ.addEventListener) MQ.addEventListener('change', () => { if (UI.theme === 'system') applyTheme('system'); });

/* ---------- 모달 ---------- */
function closeModal() { $$('.modal-bg').forEach(n => n.remove()); }
function openModal(html, bind, wide) {
  closeModal(); const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal${wide ? ' wide' : ''}${wide === 2 ? ' xwide' : ''}" role="dialog" aria-modal="true">${html}<div class="m-sign">Designed &amp; Developed by Rat Rae Choi</div></div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); }); bg.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.body.appendChild(bg); const md = bg.querySelector('.modal'); bind && bind(md); return md;
}
function copyText(t, ok) {
  const done = () => toast(ok || '복사했습니다');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  function fallback() { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사하지 못했습니다'); } x.remove(); }
}
function confirmBox(msg) { return window.confirm(msg); }

/* ---------- QR ---------- */
function makeQR(el, text, size) {
  el.innerHTML = '';
  try {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = Math.max(2, Math.floor(size / (n + 4)));
    const img = new Image(); img.alt = 'QR'; img.src = q.createDataURL(cell, cell * 2); img.style.width = size + 'px'; img.style.height = size + 'px'; img.style.imageRendering = 'pixelated';
    el.appendChild(img);
  } catch (e) { el.innerHTML = '<b style="color:#0b1757">QR</b>'; }
}
const shareUrl = () => APP.shareUrl;
function urlBox(id, v) { return `<div class="urlbox"><input id="${id}" readonly value="${esc(v || shareUrl())}" aria-label="주소"><button class="btn" data-copy="${id}">주소 복사</button></div>`; }
function bindCopies(md) { md.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(md.querySelector('#' + b.dataset.copy).value, '복사했습니다')); }
function openQR() {
  let mode = 'web';
  const draw = md => {
    const url = mode === 'web' ? shareUrl() : APP.apkUrl;
    makeQR(md.querySelector('#qrBig'), url, 240); md.querySelector('#qrUrl').value = url;
    md.querySelectorAll('[data-qm]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.qm === mode)));
    md.querySelector('#qrTip').innerHTML = mode === 'web' ? '북마크: PC는 Ctrl+D · 휴대폰은 브라우저 메뉴 → 홈 화면에 추가(앱 아이콘으로 설치)' : '안드로이드 앱(APK) 설치 파일입니다. 내려받은 뒤 「출처를 알 수 없는 앱 설치」를 허용하고 설치하세요. Play 프로텍트 경고가 뜨면 「무시하고 설치」를 누릅니다.';
  };
  openModal(`<h2>다운로드 QR</h2><div class="sub">휴대폰 카메라로 찍으면 바로 열립니다. 현장 반장은 휴대폰으로 작업 전 TBM · 아차사고를 바로 기록합니다.</div>
    <div class="subtabs" role="group" aria-label="QR 종류"><button data-qm="web" aria-pressed="true">웹 버전 (사이트 주소)</button><button data-qm="apk" aria-pressed="false">안드로이드 앱 (APK)</button></div>
    <div class="qrbig" id="qrBig"></div>${urlBox('qrUrl')}<p class="hint" id="qrTip"></p>
    <div class="mrow"><button class="btn pri" id="mClose">닫기</button></div>`, md => {
    bindCopies(md); md.querySelector('#mClose').onclick = closeModal;
    md.querySelectorAll('[data-qm]').forEach(b => b.onclick = () => { mode = b.dataset.qm; draw(md); }); draw(md);
  });
}
function openRef() {
  const mg = UI.manager || {};
  const msg = `[에스텍 그룹] S-Tec Safety & Health Management System(에스텍 안전보건 관리 시스템) ${APP.version}\n위험성평가 · TBM · 안전점검 · 아차사고 · 교육 · 보호구 기록을 사업장별로 전자화해 중대재해처벌법 안전보건 확보의무 이행을 기록으로 남깁니다.\n${shareUrl()}${mg.name ? `\n추천: ${mg.name}${mg.title ? ' ' + mg.title : ''}${mg.org ? ' (' + mg.org + ')' : ''}` : ''}`;
  openModal(`<h2>친구 추천</h2><div class="sub">QR을 보여주거나 주소·추천 메시지를 복사해 카카오톡·문자로 보내세요.</div>
    <div class="qrbig" id="refQr"></div>${urlBox('refUrl')}
    <div class="field"><label for="refMsg">추천 메시지</label><textarea id="refMsg" rows="5">${esc(msg)}</textarea></div>
    <div class="mrow"><button class="btn" data-copy="refMsg">메시지 복사</button><button class="btn pri" id="mClose">닫기</button></div>`, md => {
    makeQR(md.querySelector('#refQr'), shareUrl(), 220); bindCopies(md); md.querySelector('#mClose').onclick = closeModal;
  });
}

/* ---------- 안전보건 담당 (지정되어야 프로그램 구동) ---------- */
function readPhoto(file, cb) { shrinkPhoto(file, 128).then(cb).catch(() => toast('사진을 읽을 수 없습니다. JPG나 PNG를 선택하세요')); }
function mgrFormHtml() {
  const m = UI.manager || { name: '', title: '', org: APP.branch, phone: '', email: '', photo: '', br: '' };
  return `<div class="avatar-edit"><div class="av" id="mgAv">${m.photo ? `<img src="${m.photo}" alt="">` : esc((m.name || '담')[0])}</div>
    <div><label class="btn sm" for="mgFile">사진 선택</label><input type="file" id="mgFile" accept="image/*" hidden> <button class="btn sm" id="mgNoPh" type="button">사진 빼기</button></div></div>
    <div class="grid2"><div class="field"><label for="mgName">성명 (필수)</label><input id="mgName" value="${esc(m.name)}" autocomplete="name"></div>
    <div class="field"><label for="mgTitle">직책</label><input id="mgTitle" value="${esc(m.title)}" placeholder="예: 반장, 소장, 안전관리자, 지사장"></div></div>
    <div class="grid2"><div class="field"><label for="mgBr">담당 지사 (사업장 목록을 이 지사로 시작)</label><select id="mgBr"><option value="">회사 전체</option>${BRANCHES.map(b => `<option value="${b.key}" ${b.key === m.br ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="mgOrg">소속</label><input id="mgOrg" value="${esc(m.org)}"></div></div>
    <div class="grid2"><div class="field"><label for="mgPhone">연락처</label><input id="mgPhone" value="${esc(m.phone)}" inputmode="tel"></div>
    <div class="field"><label for="mgMail">이메일</label><input id="mgMail" value="${esc(m.email || '')}" inputmode="email"></div></div>
    <div class="err" id="mgErr"></div>`;
}
function bindMgrForm(root, done) {
  let photo = (UI.manager && UI.manager.photo) || '';
  root.querySelector('#mgFile').onchange = ev => { const f = ev.target.files[0]; if (f) readPhoto(f, d => { photo = d; root.querySelector('#mgAv').innerHTML = `<img src="${d}" alt="">`; }); };
  root.querySelector('#mgNoPh').onclick = () => { photo = ''; root.querySelector('#mgAv').textContent = (root.querySelector('#mgName').value || '담')[0]; };
  return () => {
    const name = root.querySelector('#mgName').value.trim();
    if (!name) { root.querySelector('#mgErr').textContent = '안전보건 담당 성명을 입력해야 프로그램이 시작됩니다.'; root.querySelector('#mgName').focus(); return false; }
    UI.manager = { name, title: root.querySelector('#mgTitle').value.trim(), br: root.querySelector('#mgBr').value, org: root.querySelector('#mgOrg').value.trim(), phone: root.querySelector('#mgPhone').value.trim(), email: root.querySelector('#mgMail').value.trim(), photo, since: (UI.manager && UI.manager.since) || today() };
    if (UI.manager.br && !UI.F.org) { UI.F.org = 'best'; UI.F.br = UI.manager.br; }
    saveUI(); renderHeader(); done && done(); if (window.renderAll) renderAll(); return true;
  };
}
function openMgr() {
  openModal(`<h2>안전보건 담당 지정</h2><div class="sub">안전보건 담당이 지정되어 있어야 프로그램이 구동됩니다. TBM 진행자 · 보고서 작성자 · 결재란에 들어갑니다.</div>${mgrFormHtml()}
    <div class="mrow"><span id="mgCf"></span>${UI.manager ? '<button class="btn warn" id="mgOff">담당 해제</button>' : ''}<button class="btn" id="mClose">취소</button><button class="btn pri" id="mgOk">저장</button></div>`, md => {
    const commit = bindMgrForm(md, () => { closeModal(); toast('안전보건 담당을 저장했습니다'); });
    md.querySelector('#mgOk').onclick = commit; md.querySelector('#mClose').onclick = closeModal;
    const off = md.querySelector('#mgOff');
    if (off) off.onclick = () => {
      md.querySelector('#mgCf').innerHTML = `<span class="confirm">해제하면 프로그램이 잠깁니다. <button class="btn sm warn" id="mgY">해제</button></span>`;
      md.querySelector('#mgY').onclick = () => { UI.manager = null; saveUI(); closeModal(); renderHeader(); showGate(); };
    };
  });
}
function renderHeader() {
  const m = UI.manager;
  $('#mgrPh').innerHTML = m && m.photo ? `<img src="${m.photo}" alt="">` : `<b class="ini">${esc(m ? m.name[0] : '?')}</b>`;
  $('#mgrName').innerHTML = m ? `<em>${esc(m.name)}</em> ${esc(m.title || '')}` : '미지정';
  makeQR($('#qrMini'), shareUrl(), 40);
  const hi = $('#heroHi'); if (hi) hi.textContent = m ? `${m.name}${m.title ? ' ' + m.title : ''}님, 오늘도 수고 많으십니다` : '안녕하세요';
}
function showGate() {
  const gt = $('#mgrGate');
  if (UI.manager) { gt.classList.add('hidden'); document.body.classList.remove('gate-locked'); return; }
  gt.classList.remove('hidden'); document.body.classList.add('gate-locked');
  $('#gateForm').innerHTML = mgrFormHtml() + '<button class="btn pri" id="gateGo" style="width:100%;padding:11px;font-size:15px">안전보건 담당 지정하고 시작</button>';
  const commit = bindMgrForm($('#gateForm'), () => { showGate(); toast('에스텍 안전보건 관리 시스템을 시작합니다'); });
  $('#gateGo').onclick = commit;
  $('#mgName').addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
}

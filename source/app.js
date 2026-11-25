/* =====================================================================
 * S-Tec Safety & Health Management System (에스텍 안전보건 관리 시스템) v1.0.0 — 핵심 로직
 *  · 위험성평가 · TBM · 안전점검 · 아차사고/재해 보고 · 종사자 의견 · 교육 · 보호구 · 도급인 협의를 사업장별로 전자화
 *  · 사업장별 이행률(TBM 실시율 · 점검 이행률 · 위험성평가 · 조치 완료율 · 교육 이수율 · 보호구) → 안전보건 이행지수(SHI)
 *  · 저장: 이 기기(localStorage) → 로그인 시 여러 기기 동기화(통합 로그인 user_data) → 공유 서버(sh_records)
 *  · 연동: 성과관리·고객사 포털(월간 안전 지표) · 법률 대응(사업주 의무 이행 증빙 묶음) · 사건·사고 보고(수시 위험성평가)
 * Program & Design by Rat Rae Choi (제작자 서명 — 하드코딩)
 * ===================================================================== */
const APP = {
  name: 'S-Tec Safety & Health Management System',
  ko: '에스텍 안전보건 관리 시스템',
  sub: '중대재해처벌법 대응',
  code: 'stsh',
  version: 'v1.1.0',
  build: '2026-11-25',
  shareUrl: 'https://sadness500-boop.github.io/S-Tec-Safety-and-Health-Management-System/',
  apkUrl: 'https://github.com/sadness500-boop/S-Tec-Safety-and-Health-Management-System/releases/download/app-latest/stsh-latest.apk',
  repo: 'https://github.com/sadness500-boop/S-Tec-Safety-and-Health-Management-System',
  mainUrl: 'https://sadness500-boop.github.io/S-Tec-Operations-and-Sales-Integrated-Management-System/',
  maker: 'Rat Rae Choi',
  org: '에스텍 그룹',
  branch: '에스텍베스트 동부지사'
};

/* ---------- 유틸 ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const WKK = ['일', '월', '화', '수', '목', '금', '토'];
function kstNow() { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 540) * 60000); }
function isoD(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseD(s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(s, n) { const d = parseD(s); if (!d) return ''; const x = new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); return isoD(x); }
function fmtD(d) { if (typeof d === 'string') d = parseD(d); return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}(${WKK[d.getDay()]})` : '-'; }
function fmtDs(d) { if (typeof d === 'string') d = parseD(d); return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '-'; }
const today = () => isoD(kstNow());
const nowHM = () => { const d = kstNow(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dayDiff = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const nf = (n, dg = 0) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: dg, minimumFractionDigits: 0 });
const pct = n => (n == null || isNaN(n)) ? '-' : nf(n, 1) + '%';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function toast(msg, ms = 2600) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms); }
function busy(on, msg) { const b = $('#busy'); if (!b) return; b.classList.toggle('on', !!on); if (msg) $('#busyMsg').textContent = msg; }
function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 50); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function b64ToU8(b64) { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
const dataUrlB64 = u => String(u).split(',')[1];
const maskName = n => { n = String(n || ''); return n.length <= 1 ? n : n[0] + '○'.repeat(Math.min(2, n.length - 1)); };
async function download(blob, name) {
  if (window.__CAPTURE) { window.__CAPTURE(blob, name); return; }   // 시험용(자동 출력 확인)
  const P = window.Capacitor && window.Capacitor.Plugins;
  if (P && P.Filesystem) {
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
      const w = await P.Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' });
      if (P.Share) await P.Share.share({ title: name, files: [w.uri], dialogTitle: '파일 저장·보내기' }); else toast('파일을 만들었습니다: ' + name);
      return;
    } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
/* 사진: 긴 변 560px · JPEG 0.62로 줄여 저장(기기·서버 용량 절약) — 얼굴·차량번호가 찍히지 않게 촬영 */
function shrinkPhoto(file, max = 560) {
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const r = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .62)); }; im.onerror = rej; im.src = rd.result; };
    rd.onerror = rej; rd.readAsDataURL(file);
  });
}
async function sha256(obj) {
  try { const b = new TextEncoder().encode(typeof obj === 'string' ? obj : JSON.stringify(obj)); const h = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return ''; }
}

/* =====================================================================
 * 저장소
 * ===================================================================== */
const SH_KEY = 'stec_sh_data';
const KINDS = ['ra', 'tbm', 'chk', 'ev', 'op', 'edu', 'ppe', 'co'];
const KIND_N = { ra: '위험성평가', tbm: 'TBM', chk: '안전점검', ev: '사고·아차사고 보고', op: '종사자 의견', edu: '안전보건교육', ppe: '보호구 지급', co: '도급인 협의·합동점검' };
let SH = { ra: {}, tbm: {}, chk: {}, ev: {}, op: {}, edu: {}, ppe: {}, co: {}, wk: {}, cfg: {}, usites: [], law: {}, ver: 1 };
try { SH = Object.assign(SH, JSON.parse(localStorage.getItem(SH_KEY) || '{}')); } catch (e) { }
KINDS.concat(['wk', 'cfg', 'law']).forEach(k => { if (!SH[k] || typeof SH[k] !== 'object') SH[k] = {}; });
if (!Array.isArray(SH.usites)) SH.usites = [];
const CALC = new Map();
function saveSH() {                                             // 로그인 시 여러 기기 동기화(auth 모듈이 감쌈)
  CALC.clear();
  try { localStorage.setItem(SH_KEY, JSON.stringify(SH)); }
  catch (e) { toast('이 기기 저장 공간이 부족합니다 — 오래된 사진을 지우거나 「☁ 공유 서버」에 올려 두세요', 5000); }
}
function storeBytes() { try { return (localStorage.getItem(SH_KEY) || '').length * 2; } catch (e) { return 0; } }
const whoAmI = () => (UI.manager && [UI.manager.title, UI.manager.name].filter(Boolean).join(' ')) || '';

/* 기록 저장 — 변경 이력 · 원본 해시(위변조 대비) · 공유 서버 대기열 */
function putRec(kind, r, act) {
  const box = SH[kind], now = new Date().toISOString();
  if (!r.id) r.id = kind + '_' + uid();
  const old = box[r.id];
  r.kind = kind; r.at = now; r.first = (old && old.first) || now; r.by = r.by || whoAmI();
  r.log = ((old && old.log) || []).concat([{ at: now, by: whoAmI(), act: act || (old ? 'edit' : 'new') }]).slice(-40);
  box[r.id] = r; saveSH(); queueShare(r.id);
  const base = Object.assign({}, r); delete base.log; delete base.hash; delete base.at;
  sha256(base).then(h => { if (h && box[r.id] === r) { r.hash = h; saveSH(); } });
  return r;
}
function delRec(kind, id) { delete SH[kind][id]; saveSH(); queueShare(id, true); }
const kindOf = id => (String(id).match(/^([a-z]+)_/) || [])[1];
function recById(id) { const k = kindOf(id); return k && SH[k] ? SH[k][id] : null; }

/* =====================================================================
 * 사업장 레지스트리 — 에스텍 그룹 전체(사업장 지도 151곳 + 그룹 미화 26곳 + 직접 추가)
 * ===================================================================== */
function indOf(name, type) {
  const t = (type || '') + ' ' + (name || '');
  const map = [['공장', 'mfg'], ['병원', 'hosp'], ['대학', 'univ'], ['학교', 'univ'], ['아파트', 'apt'], ['영사관', 'embassy'], ['물류', 'logi'], ['빌딩', 'office'], ['관공서', 'pub'], ['호텔', 'hotel'], ['리조트', 'hotel']];
  const f = map.find(([k]) => t.includes(k)); if (f) return f[1];
  for (const [k, v] of Object.entries(INDS)) if (v.kw.some(w => t.includes(w))) return k;
  return 'office';
}
function jobsOf(work, st) {
  const w = work || '', out = [];
  if (/보안|경비/.test(w) || (st && st.sec)) out.push('sec'); if (/미화/.test(w) || (st && st.cln)) out.push('cln');
  if (/시설/.test(w)) out.push('fac'); if (/주차/.test(w)) out.push('prk'); if (/안내/.test(w)) out.push('info'); if (/조리|급식|식당/.test(w)) out.push('cook');
  return out.length ? [...new Set(out)] : ['sec'];
}
const orgName = k => (ORGS.find(o => o.k === k) || { n: k }).n;
let SITE_LIST = [], SITE = {};
function buildSites() {
  const a = [];
  SITES.forEach(s => { const og = (s.company && !/베스트/.test(s.company)) ? ((ORGS.find(o => o.n === s.company) || {}).k || 'best') : 'best'; a.push({ key: 'b' + s.id, name: s.name, org: og, br: s.br, ind: indOf(s.name, s.type), jobs: jobsOf(s.work, s), total: s.total || 0, hc: { sec: s.sec || 0, cln: s.cln || 0, etc: s.etc || 0 }, addr: s.addr || '', head: [s.pos, s.mgr].filter(Boolean).join(' '), shift: s.shift || '', work: s.work || '' }); });
  GROUP_SITES.forEach((g, i) => a.push({ key: 'g' + i, name: g[1], org: g[0], br: '', ind: g[2], jobs: ['cln'], total: g[4], hc: { cln: g[4] }, addr: '', head: g[3], work: '미화', shift: '주간' }));
  (SH.usites || []).forEach(u => a.push(Object.assign({ jobs: ['sec'], total: 0, addr: '', head: '', shift: '' }, u, { user: true })));
  a.forEach(s => { const c = SH.cfg[s.key]; if (c) { if (c.jobs && c.jobs.length) s.jobs = c.jobs; if (c.ind) s.ind = c.ind; if (c.shift) s.shift = c.shift; if (c.client) s.client = c.client; if (c.total) s.total = +c.total; } });
  SITE_LIST = a; SITE = {}; a.forEach(s => SITE[s.key] = s);
}
/* ---------- 에스텍 그룹 회사 · 조직 트리(통합관리 시스템 「회사·조직」과 같은 표) ---------- */
const OU_KEY = 'stec_ou_list';
let OU = [], OU_ID = {}, OU_KIDS = {};
function ouBuild(list) {
  OU = (list || []).map(o => Array.isArray(o) ? { id: o[0], name: o[1], kind: o[2], parent: o[3] || '' } : { id: o.id, name: o.name, kind: o.kind || '', parent: o.parent || '' }).filter(o => o.id && o.name);
  OU_ID = {}; OU_KIDS = {}; OU.forEach(o => { OU_ID[o.id] = o; (OU_KIDS[o.parent] = OU_KIDS[o.parent] || []).push(o); });
  const rank = { '그룹': 0, '회사': 1, '부문': 2, '사업부': 3, '본부': 4, '실': 5, '센터': 6, '지사': 7, '팀': 8, '파트': 9, '연구소': 9 };
  Object.values(OU_KIDS).forEach(a => a.sort((x, y) => x.parent === 'G000' && y.parent === 'G000' ? 0 : (rank[x.kind] ?? 6) - (rank[y.kind] ?? 6) || x.name.localeCompare(y.name, 'ko')));
}
(function () { let c = null; try { c = JSON.parse(localStorage.getItem(OU_KEY) || 'null'); } catch (e) { } ouBuild(c && c.length ? c : OU_BASE); })();
/* 서버의 최신 회사·조직 표(public_org_list) — 로그인 전에도 공개 함수로 읽음 */
async function ouRefresh() {
  const sb = (window.STSH_AUTH && STSH_AUTH.client) || null; if (!sb) return false;
  try { const { data, error } = await sb.rpc('public_org_list'); if (error || !Array.isArray(data) || !data.length) return false;
    const s = JSON.stringify(data); if (s === localStorage.getItem(OU_KEY)) return false; localStorage.setItem(OU_KEY, s); ouBuild(data); return true; } catch (e) { return false; }
}
function ouRoots() { return (OU_KIDS[''] || []).length ? OU_KIDS[''] : OU.filter(o => !OU_ID[o.parent]); }
function ouChain(id) { const out = []; let o = OU_ID[id], n = 0; while (o && n++ < 20) { out.unshift(o); o = OU_ID[o.parent]; } return out; }
function ouUnder(id, root) { if (!root) return true; let o = OU_ID[id], n = 0; while (o && n++ < 20) { if (o.id === root) return true; o = OU_ID[o.parent]; } return false; }
function ouCompany(id) { const c = ouChain(id); return c.find(o => o.kind === '회사') || c[1] || c[0] || null; }
function ouLabel(id) { const c = ouChain(id).filter(o => o.kind !== '그룹'); return c.length ? c.map(o => o.name).join(' ') : ''; }
/* 사업장이 속한 조직 */
function siteOu(s) {
  if (!s) return ''; const c = SH.cfg[s.key]; if (c && c.ou && OU_ID[c.ou]) return c.ou; if (s.ou && OU_ID[s.ou]) return s.ou;
  const m = OU_MAP[s.org]; const id = typeof m === 'object' ? (m[s.br || ''] || m['']) : m; return id && OU_ID[id] ? id : (s.org === 'best' ? 'O01' : 'G000');
}
function siteOrgLabel(s) { if (!s) return ''; const l = ouLabel(siteOu(s)); return l || (s.org === 'best' ? `에스텍베스트 ${s.br}지사` : s.user ? (s.orgN || '직접 추가') : orgName(s.org)); }
function siteOk(s, F) {
  if (!s) return false;
  if (F.site && s.key !== F.site) return false;
  if (F.ou && !ouUnder(siteOu(s), F.ou)) return false;
  if (F.org && (F.org === 'u' ? !s.user : s.org !== F.org)) return false;
  if (F.br && s.br !== F.br) return false;
  if (F.job && !s.jobs.includes(F.job)) return false;
  const allow = window.APP_ACCESS && APP_ACCESS.branches && APP_ACCESS.branches.length ? APP_ACCESS.branches : null;
  if (allow && s.org === 'best' && !allow.includes(s.br)) return false;
  return true;
}
/* 관리 대상(기록을 시작한) 사업장 — 기록이 하나라도 있거나 설정에서 「관리 시작」한 곳 */
function activeSiteKeys() {
  if (CALC.has('active')) return CALC.get('active');
  const st = new Set(); KINDS.forEach(k => Object.values(SH[k]).forEach(r => r.site && st.add(r.site)));
  Object.entries(SH.cfg).forEach(([k, c]) => { if (c && c.on) st.add(k); }); Object.keys(SH.wk).forEach(k => (SH.wk[k] || []).length && st.add(k));
  CALC.set('active', st); return st;
}
function siteStart(key) {   // 이행률 계산 시작일 — 설정한 「관리 시작일」 또는 첫 기록일
  const c = SH.cfg[key]; if (c && c.start) return c.start;
  let m = ''; KINDS.forEach(k => Object.values(SH[k]).forEach(r => { if (r.site === key && r.d && (!m || r.d < m)) m = r.d; }));
  return m || today();
}
const tbmEveryDay = s => !/주5일|주간|통상/.test((SH.cfg[s.key] && SH.cfg[s.key].shift) || s.shift || '');

/* ---------- 근무자 명부 (사업장별) — 근태관리 연동 전에는 여기서 관리 ---------- */
function workers(key, d) { return (SH.wk[key] || []).filter(w => !w.out || !d || w.out >= d).filter(w => !w.hired || !d || w.hired <= d); }
function workerById(key, id) { return (SH.wk[key] || []).find(w => w.id === id); }
function putWorkers(key, list) { SH.wk[key] = list; saveSH(); queueShare('wk_' + key); }

/* ---------- 기간 ---------- */
function periodRange(kind, ref) {
  const d = parseD(ref) || kstNow();
  if (kind === 'm') { const s = new Date(d.getFullYear(), d.getMonth(), 1), e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return { kind, from: isoD(s), to: isoD(e), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` }; }
  if (kind === 'q') { const qn = Math.floor(d.getMonth() / 3), s = new Date(d.getFullYear(), qn * 3, 1), e = new Date(d.getFullYear(), qn * 3 + 3, 0); return { kind, from: isoD(s), to: isoD(e), label: `${d.getFullYear()}년 ${qn + 1}분기` }; }
  if (kind === 'h') { const h = d.getMonth() < 6 ? 0 : 1, s = new Date(d.getFullYear(), h * 6, 1), e = new Date(d.getFullYear(), h * 6 + 6, 0); return { kind, from: isoD(s), to: isoD(e), label: `${d.getFullYear()}년 ${h ? '하' : '상'}반기` }; }
  const s = new Date(d.getFullYear(), 0, 1), e = new Date(d.getFullYear(), 11, 31); return { kind: 'y', from: isoD(s), to: isoD(e), label: `${d.getFullYear()}년` };
}
function shiftRange(r, n) { const d = parseD(r.from); const k = r.kind; const m = k === 'm' ? 1 : k === 'q' ? 3 : k === 'h' ? 6 : 12; return periodRange(k, isoD(new Date(d.getFullYear(), d.getMonth() + m * n, 1))); }
function daysIn(r) { return Math.round((parseD(r.to) - parseD(r.from)) / 86400000) + 1; }
const inR = (d, r) => d && d >= r.from && d <= r.to;

/* =====================================================================
 * 위험성 · 조치 항목
 * ===================================================================== */
const riskOf = it => (+it.p || 0) * (+it.s || 0);
const risk2Of = it => (+it.p2 || 0) * (+it.s2 || 0);
/* 모든 「조치가 필요한 일」을 한 목록으로 — 위험성평가 감소대책 · 점검 불량 · 사고·아차사고 · 종사자 의견 · 도급인 협의 */
function allActions(F = {}) {
  const key = 'act|' + JSON.stringify(F); if (CALC.has(key)) return CALC.get(key);
  const out = [], td = today();
  const push = (o) => { if (!siteOk(SITE[o.site], F)) return; o.over = !o.done && o.due && o.due < td; o.soon = !o.done && o.due && o.due >= td && dayDiff(td, o.due) <= 7; out.push(o); };
  Object.values(SH.ra).forEach(r => (r.items || []).forEach(it => { const lv = riskLv(riskOf(it)); if (!['mid', 'high', 'vhigh'].includes(lv.k)) return; push({ src: 'ra', ref: r.id, sub: it.id, site: r.site, d: r.d, title: `[${lv.n}] ${it.task} — ${it.hz}`, ctrl: it.ctrl, owner: it.owner, due: it.due, done: !!it.doneD, doneD: it.doneD, lv: lv.k, job: r.job }); }));
  Object.values(SH.chk).forEach(c => Object.entries(c.res || {}).forEach(([k, v]) => { if (v !== 'ng') return; const a = (c.act || {})[k] || {}; push({ src: 'chk', ref: c.id, sub: k, site: c.site, d: c.d, title: `[점검 불량] ${chkName(k)}`, ctrl: (c.memo || {})[k] || '', owner: a.owner, due: a.due, done: !!a.doneD, doneD: a.doneD, job: c.job }); }));
  Object.values(SH.ev).forEach(e => { const a = e.act || {}; push({ src: 'ev', ref: e.id, site: e.site, d: e.d, title: `[${EV_K[e.type] ? EV_K[e.type].n : '보고'}] ${e.title}`, ctrl: a.plan || '', owner: a.owner, due: a.due, done: !!a.doneD, doneD: a.doneD, lv: e.grade === 'A' ? 'vhigh' : e.grade === 'B' ? 'high' : 'mid' }); });
  Object.values(SH.op).forEach(o => { const a = o.act || {}; push({ src: 'op', ref: o.id, site: o.site, d: o.d, title: `[${OP_CAT[o.cat] || '의견'}] ${o.text}`, ctrl: a.plan || '', owner: a.owner, due: a.due, done: !!a.doneD, doneD: a.doneD }); });
  Object.values(SH.co).forEach(c => (c.acts || []).forEach((a, i) => push({ src: 'co', ref: c.id, sub: String(i), site: c.site, d: c.d, title: `[${CO_K[c.type] ? CO_K[c.type].n : '협의'}] ${a.t}`, ctrl: '', owner: a.owner, due: a.due, done: !!a.doneD, doneD: a.doneD })));
  out.sort((a, b) => (a.done - b.done) || ((a.due || '9') < (b.due || '9') ? -1 : 1));
  CALC.set(key, out); return out;
}
function chkName(k) { for (const j of Object.keys(CHK)) { const f = CHK[j].find(x => x[0] === k); if (f) return f[1]; } return k; }
function chkItems(job) { return CHK.common.concat(CHK[job] || []); }
function setActionDone(a, doneD, result) {
  const d = doneD || today();
  if (a.src === 'ra') { const r = SH.ra[a.ref]; const it = (r.items || []).find(x => x.id === a.sub); if (it) { it.doneD = d; if (result) it.result = result; putRec('ra', r, 'action'); } }
  else if (a.src === 'chk') { const c = SH.chk[a.ref]; c.act = c.act || {}; c.act[a.sub] = Object.assign(c.act[a.sub] || {}, { doneD: d, result }); putRec('chk', c, 'action'); }
  else if (a.src === 'co') { const c = SH.co[a.ref]; const x = (c.acts || [])[+a.sub]; if (x) { x.doneD = d; x.result = result; putRec('co', c, 'action'); } }
  else { const k = a.src, r = SH[k][a.ref]; r.act = Object.assign(r.act || {}, { doneD: d, result }); putRec(k, r, 'action'); }
}

/* =====================================================================
 * 이행률 · 안전보건 이행지수(SHI)
 * ===================================================================== */
function siteKpi(key, r) {
  const ck = 'kpi|' + key + '|' + r.from + '|' + r.to; if (CALC.has(ck)) return CALC.get(ck);
  const s = SITE[key], td = today(); if (!s) return null;
  const from = [r.from, siteStart(key)].sort()[1], to = [r.to, td].sort()[0];
  const K = { key, site: s, from, to, live: from <= to };
  // ① TBM 실시율 — 근무일(격일·교대 사업장은 매일, 주5일은 평일) 대비 TBM 기록일
  let need = 0; if (K.live) for (let d = parseD(from); isoD(d) <= to; d = addDays(d, 1)) { if (tbmEveryDay(s) || (d.getDay() % 6 !== 0)) need++; }
  const tb = Object.values(SH.tbm).filter(x => x.site === key && inR(x.d, { from, to }));
  const tbDays = new Set(tb.map(x => x.d)).size;
  K.tbmN = tb.length; K.tbmDays = tbDays; K.tbmNeed = need; K.tbm = need ? Math.min(100, tbDays / need * 100) : null;
  K.tbmAtt = tb.reduce((a, x) => a + (x.att || []).length, 0);
  // ② 안전점검 이행률 — 업종마다 주간 1회 + 월간 1회
  const weeks = K.live ? Math.max(1, Math.ceil((dayDiff(from, to) + 1) / 7)) : 0, months = K.live ? (parseD(to).getFullYear() - parseD(from).getFullYear()) * 12 + parseD(to).getMonth() - parseD(from).getMonth() + 1 : 0;
  const ck2 = Object.values(SH.chk).filter(x => x.site === key && inR(x.d, { from, to }));
  let cNeed = 0, cDone = 0;
  s.jobs.forEach(j => { cNeed += weeks + months; const w = ck2.filter(x => x.job === j && x.cyc === 'w').length, m = ck2.filter(x => x.job === j && x.cyc === 'm').length; cDone += Math.min(w, weeks) + Math.min(m, months); });
  K.chkN = ck2.length; K.chkNg = ck2.reduce((a, x) => a + Object.values(x.res || {}).filter(v => v === 'ng').length, 0);
  K.chk = cNeed ? Math.min(100, cDone / cNeed * 100) : null;
  // ③ 위험성평가 — 업종별 최근 1년 내 최초·정기 평가(50) + 위험 「보통」 이상 감소대책 이행률(50)
  const ras = Object.values(SH.ra).filter(x => x.site === key);
  const yearAgo = isoD(addDays(parseD(to), -365));
  const covered = s.jobs.filter(j => ras.some(x => x.job === j && ['first', 'reg'].includes(x.type) && x.d >= yearAgo && x.d <= to)).length;
  const its = ras.flatMap(x => (x.items || []).map(it => Object.assign({ raD: x.d }, it))).filter(it => ['mid', 'high', 'vhigh'].includes(riskLv(riskOf(it)).k) && it.raD <= to);
  const itDue = its.filter(it => !it.due || it.due <= to), itDone = itDue.filter(it => it.doneD && it.doneD <= to);
  K.raN = ras.length; K.raItems = ras.reduce((a, x) => a + (x.items || []).length, 0); K.raHigh = its.filter(it => !it.doneD && ['high', 'vhigh'].includes(riskLv(riskOf(it)).k)).length;
  K.raCover = s.jobs.length ? covered / s.jobs.length * 100 : null; K.raCtl = itDue.length ? itDone.length / itDue.length * 100 : (its.length ? 100 : null);
  K.ra = ras.length ? (K.raCover * .5 + (K.raCtl == null ? K.raCover : K.raCtl) * .5) : (K.live ? 0 : null);
  K.raLast = ras.filter(x => ['first', 'reg'].includes(x.type)).map(x => x.d).sort().pop() || '';
  // ④ 조치 완료율 — 이 기간까지 생긴 조치 항목 중 완료
  const acts = allActions({ site: key }).filter(a => a.d <= to);
  K.actN = acts.length; K.actDone = acts.filter(a => a.done && (!a.doneD || a.doneD <= to)).length; K.actOpen = acts.filter(a => !a.done).length;
  K.actOver = acts.filter(a => a.over).length; K.actSoon = acts.filter(a => a.soon).length;
  K.act = acts.length ? K.actDone / acts.length * 100 : (K.live ? 100 : null);
  // ⑤ 교육 이수율 — 반기 정기교육(그 기간 경과 비율만큼) + 신규 배치자 채용 시 교육
  const W = workers(key, to), hr = periodRange('h', to), elapsed = Math.min(6, Math.max(1, (parseD(to).getMonth() % 6) + 1));
  const edus = Object.values(SH.edu).filter(e => e.site === key || !e.site);
  let eSum = 0; const miss = [];
  W.forEach(w => {
    const reqH = (w.type === 'off' ? 6 : (+((SH.cfg[key] || {}).regH) || EDU.reg.h)) * elapsed / 6;
    const got = edus.filter(e => e.type === 'reg' && inR(e.d, { from: hr.from, to }) && (e.att || []).includes(w.id)).reduce((a, e) => a + (+e.h || 0), 0);
    let sc = reqH ? Math.min(1, got / reqH) : 1;
    if (w.hired && w.hired >= addMonths(to, -2)) { const hired = edus.some(e => e.type === 'hire' && (e.att || []).includes(w.id)); if (!hired) { sc = Math.min(sc, 0); miss.push({ w, t: '채용 시 교육 미이수' }); } }
    if (sc < 1 && !miss.find(m => m.w === w)) miss.push({ w, t: `정기교육 ${nf(got, 1)} / ${nf(reqH, 1)}시간` });
    eSum += sc;
  });
  K.eduMiss = miss; K.workers = W.length; K.eduN = edus.filter(e => inR(e.d, { from, to })).length;
  K.edu = W.length ? eSum / W.length * 100 : null;
  // ⑥ 보호구 — 교체주기가 있는 품목 중 교체 기한이 지나지 않은 비율
  const pp = latestPpe(key), pOk = pp.filter(p => !p.next || p.next >= to).length;
  K.ppeN = pp.length; K.ppeOver = pp.filter(p => p.next && p.next < td).length; K.ppeSoon = pp.filter(p => p.next && p.next >= td && dayDiff(td, p.next) <= 30).length;
  K.ppe = pp.length ? pOk / pp.length * 100 : null;
  // 보고 · 의견 · 도급인 협의
  const inP = x => x.site === key && inR(x.d, r);
  K.evN = Object.values(SH.ev).filter(inP).length; K.nmN = Object.values(SH.ev).filter(x => inP(x) && x.type === 'nm').length; K.accN = Object.values(SH.ev).filter(x => inP(x) && x.type !== 'nm').length;
  K.opN = Object.values(SH.op).filter(inP).length; K.coN = Object.values(SH.co).filter(inP).length;
  K.drillN = Object.values(SH.edu).filter(e => (e.site === key || !e.site) && e.type === 'drill' && inR(e.d, r)).length;
  if (!K.live) ['tbm', 'chk', 'ra', 'act', 'edu', 'ppe'].forEach(k => K[k] = null);
  // 종합 — 측정되지 않은 영역은 빼고 가중 평균
  let ws = 0, sum = 0; SHI_W.forEach(([k, , w]) => { if (K[k] != null) { ws += w; sum += K[k] * w; } });
  K.shi = ws ? sum / ws : null;
  CALC.set(ck, K); return K;
}
function latestPpe(key) {
  const m = {}; Object.values(SH.ppe).filter(p => p.site === key && PPE[p.item] && PPE[p.item].m).forEach(p => { const k = p.wid + '|' + p.item; if (!m[k] || m[k].d < p.d) m[k] = p; });
  return Object.values(m).filter(p => { const w = workerById(key, p.wid); return !w || !w.out; });
}
function groupKpi(r, F = {}) {
  const keys = [...activeSiteKeys()].filter(k => siteOk(SITE[k], F));
  const rows = keys.map(k => siteKpi(k, r)).filter(Boolean);
  const avg = f => { const v = rows.map(x => x[f]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const sum = f => rows.reduce((a, x) => a + (x[f] || 0), 0);
  return { rows, n: rows.length, shi: avg('shi'), tbm: avg('tbm'), chk: avg('chk'), ra: avg('ra'), act: avg('act'), edu: avg('edu'), ppe: avg('ppe'),
    tbmN: sum('tbmN'), tbmAtt: sum('tbmAtt'), chkN: sum('chkN'), chkNg: sum('chkNg'), raN: sum('raN'), raHigh: sum('raHigh'), actN: sum('actN'), actOpen: sum('actOpen'), actOver: sum('actOver'), actSoon: sum('actSoon'),
    evN: sum('evN'), nmN: sum('nmN'), accN: sum('accN'), opN: sum('opN'), coN: sum('coN'), ppeOver: sum('ppeOver'), ppeSoon: sum('ppeSoon'), eduMiss: rows.reduce((a, x) => a + x.eduMiss.length, 0), drillN: sum('drillN') };
}

/* ---------- 중대재해처벌법 이행 현황(반기) — 기록으로 증빙되는 항목 + 본사 확인 항목 ---------- */
function lawStatus(r, F = {}) {
  const half = periodRange('h', r.to), hk = half.from.slice(0, 7);
  const inH = x => inR(x.d, half) && siteOk(SITE[x.site], F);
  const cnt = { ra: Object.values(SH.ra).filter(inH).length, nm: Object.values(SH.ev).filter(x => inH(x) && x.type === 'nm').length, op: Object.values(SH.op).filter(inH).length, tbm: Object.values(SH.tbm).filter(inH).length,
    drill: Object.values(SH.edu).filter(e => e.type === 'drill' && inR(e.d, half) && (!e.site || siteOk(SITE[e.site], F))).length, co: Object.values(SH.co).filter(inH).length,
    chk: Object.values(SH.chk).filter(inH).length, ppe: Object.values(SH.ppe).filter(inH).length, edu: Object.values(SH.edu).filter(e => inR(e.d, half) && (!e.site || siteOk(SITE[e.site], F))).length };
  const hq = SH.law[hk] || {};
  return { half, hk, items: LAW.map(L => {
    const h = hq[L.k];
    if (L.ev === '본사 확인') return Object.assign({}, L, { ok: !!h, cnt: null, note: h ? `${fmtDs(h.d)} ${h.by || ''} 확인${h.note ? ' — ' + h.note : ''}` : '본사 확인 전' });
    const ks = L.ev.split(','), n = ks.reduce((a, k) => a + (cnt[k] || 0), 0);
    return Object.assign({}, L, { ok: n > 0 || !!h, cnt: n, note: ks.map(k => `${({ ra: '위험성평가', nm: '아차사고', op: '의견청취', tbm: 'TBM', drill: '비상훈련', co: '도급인 협의', chk: '안전점검', ppe: '보호구 지급', edu: '교육' })[k]} ${nf(cnt[k] || 0)}건`).join(' · ') + (h ? ` · 본사 확인 ${fmtDs(h.d)}` : '') });
  }) };
}

/* =====================================================================
 * 서명 — 터치 서명을 작은 경로(SVG path)로 저장해 용량을 줄이고, 출력할 때 그림으로 바꿉니다
 * ===================================================================== */
const SIG_W = 240, SIG_H = 90, SIG_IMG = new Map();
function sigToPng(path, w = SIG_W * 2, h = SIG_H * 2) {
  if (!path) return ''; const k = path + w; if (SIG_IMG.has(k)) return SIG_IMG.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.scale(w / SIG_W, h / SIG_H); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0B1F8A';
  try { g.stroke(new Path2D(path)); } catch (e) { }
  const u = c.toDataURL('image/png'); SIG_IMG.set(k, u); return u;
}
function sigPad(host, init, onChange) {
  host.innerHTML = `<canvas width="${SIG_W * 2}" height="${SIG_H * 2}" class="sigpad"></canvas><button type="button" class="btn sm sigclr">지우기</button>`;
  const cv = host.querySelector('canvas'), g = cv.getContext('2d'); let path = init || '', cur = null;
  const draw = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(2, 0, 0, 2, 0, 0); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0B1F8A'; if (path) try { g.stroke(new Path2D(path)); } catch (e) { } };
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * SIG_W), Math.round((e.clientY - r.top) / r.height * SIG_H)]; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); cur = `M${x} ${y}`; path += (path ? ' ' : '') + cur; draw(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; const [x, y] = pt(e); path += ` L${x} ${y}`; draw(); });
  const end = () => { if (cur) { cur = null; onChange && onChange(path); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
  host.querySelector('.sigclr').onclick = () => { path = ''; draw(); onChange && onChange(''); };
  draw(); return { get: () => path };
}

/* =====================================================================
 * 공유 서버(sh_records) — 로그인 시 현장 기록을 회사 서버에 올려 본사·지사·연동 프로그램이 함께 씀
 *  (server/supabase_stsh.sql 실행 후 동작 · 실행 전에는 이 기기 + 계정 동기화만)
 * ===================================================================== */
const SHARE = { q: new Set(), del: new Set(), t: null, ok: null, last: '' };
function sbClient() { const A = window.STSH_AUTH; return A && A.client ? A.client : null; }
function queueShare(id, del) { (del ? SHARE.del : SHARE.q).add(id); if (del) SHARE.q.delete(id); clearTimeout(SHARE.t); SHARE.t = setTimeout(flushShare, 2500); }
function shareObj(id) { if (/^wk_/.test(id)) { const k = id.slice(3); return { id, kind: 'wk', site: k, d: today(), list: SH.wk[k] || [], at: new Date().toISOString() }; } return recById(id); }
function rowOf(r) { const s = SITE[r.site] || {}; return { id: r.id, site_key: r.site || '', site_name: s.name || '', org: s.org || '', br: s.br || '', kind: r.kind || kindOf(r.id) || 'x', d: r.d || today(), data: r }; }
async function flushShare() {
  const sb = sbClient(); if (!sb || SHARE.ok === false) return;
  const ids = [...SHARE.q].filter(i => { const o = shareObj(i); return o && !o.sample && !(SITE[o.site] || {}).sample; }), dels = [...SHARE.del]; SHARE.q.clear(); SHARE.del.clear();
  try {
    if (ids.length) { const { error } = await sb.rpc('sh_put', { p_rows: ids.map(i => rowOf(shareObj(i))) }); if (error) throw error; }
    if (dels.length) await sb.rpc('sh_delete', { p_ids: dels });
    SHARE.ok = true; SHARE.last = new Date().toISOString(); renderShareState();
  } catch (e) { if (/sh_put|function|schema/i.test(String(e.message || e))) SHARE.ok = false; renderShareState(); }
}
async function pullShare(r) {
  const sb = sbClient(); if (!sb) { toast('로그인하면 공유 서버의 현장 기록을 함께 집계합니다'); return 0; }
  busy(true, '공유 서버에서 현장 기록을 받는 중…');
  try {
    const { data, error } = await sb.rpc('sh_list', { p_from: r.from, p_to: r.to }); if (error) throw error;
    let n = 0; (data || []).forEach(row => {
      const d = row.data; if (!d || !d.id) return;
      if (row.kind === 'wk') { if (!SH.wk[d.site] || !SH.wk[d.site].length) { SH.wk[d.site] = d.list || []; n++; } return; }
      const box = SH[row.kind]; if (!box) return; const cur = box[d.id]; if (!cur || (cur.at || '') < (d.at || '')) { box[d.id] = d; n++; }
    });
    saveSH(); SHARE.ok = true; renderShareState(); return n;
  } catch (e) { SHARE.ok = false; renderShareState(); toast('공유 서버가 아직 준비되지 않았습니다 — server/supabase_stsh.sql 실행 필요', 4500); return 0; }
  finally { busy(false); }
}
async function pushAllShare() { KINDS.forEach(k => Object.keys(SH[k]).forEach(id => SHARE.q.add(id))); Object.keys(SH.wk).forEach(k => SHARE.q.add('wk_' + k)); SHARE.ok = null; await flushShare(); }
function renderShareState() {
  const el = $('#shareState'); if (!el) return;
  const sb = sbClient();
  el.innerHTML = !sb ? '☁ 공유 서버: 로그인 전(이 기기에 저장)' : SHARE.ok === false ? '☁ 공유 서버: 준비 전(SQL 실행 필요) · 이 기기+계정 동기화' : SHARE.ok ? `☁ 공유 서버 연결됨${SHARE.last ? ' · ' + SHARE.last.slice(11, 16) + ' 저장' : ''}` : '☁ 공유 서버: 확인 중';
}
/* 성과관리 · 고객사 포털로 보내는 월간 안전 지표(sh_kpi) — 그 달 화면을 열 때 사업장마다 1번 */
const KPI_SENT = new Set();
async function pushKpi(r) {
  const sb = sbClient(); if (!sb || SHARE.ok === false || r.kind !== 'm') return;
  const rows = [...activeSiteKeys()].map(k => siteKpi(k, r)).filter(K => K && K.live && !(K.site.sample)).filter(K => !KPI_SENT.has(K.key + r.from));
  if (!rows.length) return;
  try {
    const p = rows.map(K => ({ site_key: K.key, site_name: K.site.name, org: K.site.org, br: K.site.br || '', ym: r.from.slice(0, 7), data: { tbm_rate: K.tbm, check_rate: K.chk, ra_score: K.ra, action_rate: K.act, edu_rate: K.edu, ppe_rate: K.ppe, shi: K.shi, open_actions: K.actOpen, overdue: K.actOver, near_miss: K.nmN, accidents: K.accN, tbm_count: K.tbmN, attendees: K.tbmAtt } }));
    const { error } = await sb.rpc('sh_kpi_put', { p_rows: p }); if (error) throw error; rows.forEach(K => KPI_SENT.add(K.key + r.from));
  } catch (e) { }
}
/* 법률 대응 시스템으로 보내는 「사업주 안전보건 확보의무 이행 증빙」 묶음 — 사건 전 90일 기록 */
function evidenceBundle(ev, days = 90) {
  const key = ev.site, to = ev.d, from = isoD(addDays(parseD(ev.d), -days)), r = { from, to };
  const by = k => Object.values(SH[k]).filter(x => x.site === key && inR(x.d, r)).sort((a, b) => a.d < b.d ? -1 : 1);
  const ras = Object.values(SH.ra).filter(x => x.site === key && x.d <= to).sort((a, b) => a.d < b.d ? -1 : 1);
  return { app: APP.code, made: new Date().toISOString(), by: whoAmI(), site: SITE[key] ? { key, name: SITE[key].name, org: siteOrgLabel(SITE[key]), jobs: SITE[key].jobs, client: SITE[key].client || '' } : { key }, event: ev, range: r,
    tbm: by('tbm'), edu: Object.values(SH.edu).filter(e => (e.site === key || !e.site) && inR(e.d, r)), ra: ras, chk: by('chk'), ppe: by('ppe'), co: by('co'), op: by('op'), prior: by('ev').filter(x => x.id !== ev.id), kpi: siteKpi(key, periodRange('m', to)) };
}
async function sendToLegal(ev) {
  const b = evidenceBundle(ev), sb = sbClient();
  if (sb) { try { const { error } = await sb.rpc('sh_link_push', { p_to: 'stlr', p_kind: 'evidence', p_site: ev.site, p_ref: ev.id, p_payload: b }); if (!error) { ev.legal = { at: new Date().toISOString(), by: whoAmI(), st: 'sent' }; putRec('ev', ev, 'legal'); toast('법률 대응 시스템으로 증빙 묶음을 보냈습니다'); return true; } } catch (e) { } }
  await download(new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' }), `${fileStamp()}_${safeName((SITE[ev.site] || {}).name)}_안전보건_이행증빙.json`);
  toast('공유 서버 연결 전이라 증빙 묶음 파일(JSON)로 내려받았습니다 — 법률 대응 시스템에서 불러오세요', 4500); return false;
}

/* =====================================================================
 * 사건·사고 → 수시 위험성평가 자동 열기(사건·사고 즉시 보고 시스템[16]과 같은 규칙)
 * ===================================================================== */
function openAdhocRa(ev) {
  if (ev.raId && SH.ra[ev.raId]) return SH.ra[ev.raId];
  const s = SITE[ev.site] || {}, job = ev.job || (s.jobs || ['sec'])[0];
  const ra = putRec('ra', { site: ev.site, job, type: 'adhoc', d: ev.d, title: `수시 위험성평가 — ${ev.title}`, ref: ev.id, st: 'draft', part: [],
    items: [{ id: uid(), task: ev.loc || '사고 작업', hz: ev.desc || ev.title, type: ev.acc || '기타', p: ev.type === 'nm' ? 3 : 4, s: ev.type === 'nm' ? 3 : 4, cur: '', ctrl: '', owner: '', due: isoD(addDays(parseD(ev.d), 14)) }] }, 'auto');
  ev.raId = ra.id; putRec('ev', ev, 'link'); return ra;
}

/* =====================================================================
 * 📅 시기별 작성 · 비치 서류 — 월 · 분기 · 반기 · 연 단위로 만들고 비치 / 누락 확인
 *   ledBox(사업장).per[문서][기간] = { gen:작성일, ok:비치, okD:비치일 }
 *   S-Tec Safety & Health Management System · Rat Rae Choi
 * ===================================================================== */
const perIn = (d, P) => d && d >= P.from && d <= P.to;
const perEv = (store, f) => (s, P) => Object.values(SH[store] || {}).filter(x => (x.site === s.key) && perIn(String(x.d || ''), P) && (!f || f(x))).length;
const PER = [
  { p: '2-3', id: '2-3', t: '근로자 정기교육 교육일지', cy: 'm', ev: perEv('edu', x => x.type === 'reg') },
  { p: '1-4w', id: '1-4', t: '관리감독자 순회점검표 (주 1회)', cy: 'm', pick: /순회/, skip: /지정서/ },
  { p: '7-2', id: '7-2', t: '사업장 안전점검 Check-list', cy: 'm', ev: perEv('chk') },
  { p: '7-3', id: '7-3', t: '안전사고 예방교육(TBM) 교육일지', cy: 'm', pick: /일지/, ev: perEv('tbm') },
  { p: '4-8', id: '4-8', t: '폭염 대비 체감온도 측정 · 점검', cy: 'm', months: [6, 7, 8, 9] },
  { p: '6-2', id: '6-2', t: '도급 협의체 회의록', cy: 'm', ev: perEv('co', x => x.type === 'council') },
  { p: '1-3q', id: '1-3', t: '안전보건관리책임자 순회점검표', cy: 'q', pick: /순회/, skip: /지정서/ },
  { p: '5-2', id: '5-2', t: '종사자 의견청취 회의록', cy: 'q', ev: perEv('op') },
  { p: '5-3', id: '5-3', t: '비상대응 훈련 계획 및 결과', cy: 'q', pick: /훈련/, ev: perEv('edu', x => x.type === 'drill') },
  { p: '4-7', id: '4-7', t: '휴게시설 설치 · 관리기준 점검표', cy: 'q', skip: /안내물/ },
  { p: '5-5', id: '5-5', t: '안전 · 보건 의무이행 점검표', cy: 'h' },
  { p: '5-1', id: '5-1', t: '안전보건관리비 집행 실적', cy: 'h' },
  { p: '3-1', id: '3-1', t: '정기 위험성평가', cy: 'y', due: s => +(ledInfo(s.key).raMonth || 7), ev: perEv('ra') },
  { p: '2-6', id: '2-6', t: 'MSDS 교육일지', cy: 'y', due: () => 3 },
  { p: '2-7', id: '2-7', t: '고객응대근로자(감정노동) 보호 교육일지', cy: 'y', due: () => 4 },
];
const PER_ID = Object.fromEntries(PER.map(e => [e.p, e]));
const PER_CY = { m: '월 1회', q: '분기 1회', h: '반기 1회', y: '연 1회' };
const PER_ST = { ok: ['✔', '비치', '#1B7A34'], rec: ['◐', '기록 있음 · 비치 확인 필요', '#2563EB'], gen: ['✎', '작성됨 · 비치 확인 필요', '#7C3AED'], miss: ['!', '누락', '#C62828'], now: ['●', '이번 기간', '#B45309'], plan: ['', '예정', '#9AA3B2'] };
const pd2 = n => String(n).padStart(2, '0'), perLast = (y, m) => new Date(y, m, 0).getDate();
/* 기간 목록 — { key, label, short, from, to, m|q|h } */
function perPeriods(e, s, y) {
  if (e.cy === 'm') return Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !e.months || e.months.includes(m)).map(m => ({ key: `${y}-${pd2(m)}`, label: `${y}년 ${m}월`, short: `${m}월`, from: `${y}-${pd2(m)}-01`, to: `${y}-${pd2(m)}-${perLast(y, m)}`, m }));
  if (e.cy === 'q') return [1, 2, 3, 4].map(q => ({ key: `${y}-Q${q}`, label: `${y}년 ${q}분기`, short: `${q}분기`, from: `${y}-${pd2(q * 3 - 2)}-01`, to: `${y}-${pd2(q * 3)}-${perLast(y, q * 3)}`, q }));
  if (e.cy === 'h') return [1, 2].map(h => ({ key: `${y}-H${h}`, label: `${y}년 ${h === 1 ? '상' : '하'}반기`, short: h === 1 ? '상반기' : '하반기', from: `${y}-${h === 1 ? '01' : '07'}-01`, to: `${y}-${h === 1 ? '06-30' : '12-31'}`, h }));
  const dm = Math.min(12, Math.max(1, (e.due && e.due(s)) || 12));
  return [{ key: `${y}`, label: `${y}년 (${dm}월 실시)`, short: `${dm}월`, from: `${y}-01-01`, to: `${y}-12-31`, open: `${y}-${pd2(dm)}-01`, due: `${y}-${pd2(dm)}-${perLast(y, dm)}`, m: dm }];
}
const perApplies = (s, e) => LED_ID[e.id] && ledApp(s, LED_ID[e.id]).v !== 'n';
function perRec(key, p, k, make) { const b = ledBox(key); if (!make) return ((b.per || {})[p] || {})[k] || {}; b.per = b.per || {}; b.per[p] = b.per[p] || {}; return b.per[p][k] || (b.per[p][k] = {}); }
function perSt(s, e, P) {
  const r = perRec(s.key, e.p, P.key), t = today(), due = P.due || P.to, open = P.open || P.from;
  if (r.ok) return 'ok';
  const ev = e.ev ? e.ev(s, P) : 0;
  if (t > due) return ev ? 'rec' : r.gen ? 'gen' : 'miss';
  if (r.gen) return 'gen';
  if (ev) return 'rec';
  return t >= open ? 'now' : 'plan';
}
function perStat(s, y) {
  const o = { need: 0, ok: 0, miss: 0, now: 0 };
  PER.filter(e => perApplies(s, e)).forEach(e => perPeriods(e, s, y).forEach(P => { const st = perSt(s, e, P); if (st === 'plan') return; o.need++; if (st === 'ok') o.ok++; else if (st === 'miss') o.miss++; else if (st === 'now') o.now++; }));
  return o;
}
function perItemNote(s, id, y) {
  const es = PER.filter(e => e.id === id && perApplies(s, e)); if (!es.length) return '';
  return es.map(e => { const ps = perPeriods(e, s, y), st = ps.map(P => perSt(s, e, P)), ok = st.filter(x => x === 'ok').length, miss = st.filter(x => x === 'miss').length;
    return `<small class="lper">📅 ${PER_CY[e.cy]} — ${ok}/${ps.length} 비치${miss ? ` · <b>누락 ${miss}</b>` : ''}</small>`; }).join('');
}

/* ---------- 간이 서식(회사 양식이 없을 때) — 기간 1개만 ---------- */
const perSub = (B, P) => { const t = B.find(b => b.k === 'title'); if (t) t.sub = [t.sub, P.label].filter(Boolean).join(' · '); return B; };
const PG = {};
PG['2-3'] = (c, P) => { const m = P.m, law = [LK.regLaw[(m * 2 - 2) % 8], LK.regLaw[(m * 2 - 1) % 8]], rec = Object.values(SH.edu).find(x => x.site === c.s.key && x.type === 'reg' && perIn(x.d, P));
  return ldEduLog(c, { when: P.label, kind: '근로자 정기교육', law: '산업안전보건법 제29조 · 시행규칙 제26조 · 별표 4·5', time: `사무직 외 근로자 매반기 12h 이상(전년도 무재해 시 6h) — 이번 달 ${c.info.half ? 1 : 2}h`, date: rec ? rec.d : '', inst: rec && rec.inst,
    content: law.concat(TBM_MONTH[m].map(x => `[계절] ${x}`), c.jobs.map(j => `[${JOBS[j].s}] ${(TBM_RULES[j] || [])[m % (TBM_RULES[j] || [1]).length] || ''}`)) }); };
PG['7-3'] = (c, P) => ldEduLog(c, { kind: '안전사고 예방교육 (월례 · TBM)', law: '회사 안전사고 예방관리 강화 지침 · TBM', time: '월 1회 이상 · 근무조별 10~30분', when: P.label,
  content: ['지난달 사고 · 아차사고 사례 공유'].concat(TBM_MONTH[P.m].map(x => `[이달 계절 위험] ${x}`), c.jobs.map(j => `[${JOBS[j].s}] ${(TBM_RULES[j] || [])[(P.m - 1) % (TBM_RULES[j] || [1]).length] || ''}`), ['넘어짐 · 떨어짐 예방(통로 · 계단 · 사다리)']) });
PG['1-4w'] = (c, P) => ldPatrolTable(c, ['1주', '2주', '3주', '4주', '5주'], `관리감독자 순회점검표 (${P.label})`, c.mgr || c.head || '', '주 1회').slice(1);
PG['1-3q'] = (c, P) => ldPatrolTable(c, [P.short], `안전보건관리책임자 순회점검표 (${P.label})`, `대표이사 ${c.co.ceo}`, '분기 1회').slice(1);
PG['5-2'] = (c, P) => { const qo = Object.values(SH.op).filter(o => o.site === c.s.key && perIn(o.d, P));
  return [{ k: 'title', t: `${P.label} 종사자 의견 청취 회의록`, approval: APPROVAL, sub: '중대재해처벌법 시행령 제4조 제7호 · 분기 1회' },
    { k: 'table', head: ['항목', '내용'], w: [1.3, 5], rows: [['사업장', `${c.label} ${c.s.name}`], ['일시 · 장소', `${c.y}.  .  .   (  :  ~  :  )   ${c.s.name}`], ['참석자', `사용자 측 ${c.headPos} ${c.head || ''} · ${c.mgrPos} ${c.mgr} / 근로자 측 ${c.jobsS} 근무자 대표`], ['안건', '1. 지난 분기 의견 조치 결과 공유\n2. 작업 중 위험 요인 · 아차사고 신고\n3. 보호구 · 휴게시설 · 근무 환경 개선 건의\n4. 다음 분기 안전보건 활동 계획']] },
    { k: 'table', head: ['No', '의견(위험 신고 · 건의)', '조치 계획', '담당 · 기한', '결과'], w: [.4, 2.6, 2, 1, .8], align: ['c', '', '', 'c', 'c'], rows: qo.map((o, i) => [i + 1, o.text || '', (o.act && o.act.plan) || '', (o.act && o.act.owner) || '', o.act && o.act.doneD ? '완료' : '진행']).concat(Array.from({ length: Math.max(0, 5 - qo.length) }, (_, i) => [qo.length + i + 1, '', '', '', ''])) },
    ldNote('※ 회의 결과(조치 계획)를 게시판 · TBM으로 근로자에게 알리고, 조치 결과를 다음 분기 회의에서 확인합니다.'), ldAttend(c, 8, '참석')]; };
PG['5-3'] = (c, P) => { const tag = [c.s.ind].concat(c.jobs), sc = LK.scen.filter(x => x[1] === '*' || x[1].split(',').some(t => tag.includes(t))), s = sc[(P.q - 1) % sc.length] || sc[0] || ['화재', '*', '', []], d = Object.values(SH.edu).find(e => e.type === 'drill' && e.site === c.s.key && perIn(e.d, P)), n = Math.max(c.names.length, c.total || 0);
  return [{ k: 'title', t: `${P.label} 비상사태 대응 훈련 계획 및 결과`, approval: APPROVAL, sub: '중대재해처벌법 시행령 제4조 제8호 · 분기 1회 이상' },
    { k: 'h2', t: '1. 훈련 계획' },
    { k: 'table', head: ['항목', '내용'], w: [1.3, 5], rows: [['훈련명', `${s[0]} 발생에 따른 비상 대응훈련`], ['훈련 일시', d ? fmtD(d.d) : `${c.y}년 ${P.q * 3}월    일 (  :  ~  :  )`], ['훈련 장소', c.s.name], ['주관자', `${c.mgrPos} ${c.mgr}`], ['참가자', `${c.mgr} 외 ${Math.max(0, n - 1)}명`], ['상황 부여', s[2]]] },
    { k: 'table', head: ['순서', '대응 활동', '담당'], w: [.5, 4.6, 1.2], align: ['c', '', 'c'], rows: s[3].map((t, i) => [i + 1, t, i ? '근무자' : '발견자']) },
    { k: 'h2', t: '2. 훈련 결과' },
    { k: 'table', head: ['항목', '내용'], w: [1.3, 5], rows: [['실시 결과', d ? (d.title || '') : ''], ['참여 인원', d ? (d.att || []).length + '명' : '     명'], ['문제점', ''], ['개선 방안', ''], ['매뉴얼 보완', '□ 필요 없음  □ 보완함(내용:            )']] },
    ldNote('※ 훈련 사진 2~4장 · 참석자 서명을 함께 보관합니다.'), ldAttend(c, 10, '참여')]; };
function perBlocks(c, e, P) { if (PG[e.p]) return PG[e.p](c, P); return perSub(LG[e.id] ? LG[e.id](c) : [{ k: 'title', t: e.t }], P); }

/* ---------- 만들기 ---------- */
async function perBuild(s, e, P) {
  let files = [];
  if (lpHas()) { const PP = e.p === '2-3' ? Object.assign({}, P, { origRe: new RegExp(`정기_${pd2(P.m)}월`) }) : P;
    try { files = (await lpBuildItem(s, e.id, PP)).filter(f => f.kind !== 'err'); } catch (er) { console.error(er); files = []; }
    const fm = files.filter(f => f.kind !== 'orig'); let keep = fm;
    if (e.pick && keep.some(f => e.pick.test(f.name))) keep = keep.filter(f => e.pick.test(f.name));
    if (e.skip && keep.some(f => !e.skip.test(f.name))) keep = keep.filter(f => !e.skip.test(f.name));
    files = keep.length ? keep.concat(files.filter(f => f.kind === 'orig').map(f => Object.assign(f, { name: '[원본] ' + f.name }))) : []; }
  if (!files.length) { const c = ledCtx(s); c.per = P; files = [{ name: `${e.t}.docx`, blob: await packDocx(blocksToDocx(perBlocks(c, e, P)), `${s.name} ${e.t} ${P.label}`), kind: 'simple' }]; }
  const dup = new RegExp(`^(\\d{2}월|${String(P.from).slice(0, 4)}년?\\s*(${P.q ? P.q + '분기' : P.m ? P.m + '월' : '-'})?)\\s*`);
  return files.map(f => ({ name: lpNm(`${P.label} ${f.name.replace(dup, '')}`), blob: f.blob }));
}
const perMark = (s, e, P) => { const r = perRec(s.key, e.p, P.key, true); r.gen = today(); };
async function perOne(s, e, P) {
  busy(true, `${e.t} ${P.label} 작성 중…`);
  try { const fs = await perBuild(s, e, P);
    if (fs.length === 1) await download(fs[0].blob, lpNm(`${e.id} ${s.name} ${fs[0].name}`));
    else { const z = new JSZip(); fs.forEach(f => z.file(f.name, f.blob)); await download(await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), lpNm(`${fileStamp()} ${s.name} ${e.id} ${e.t} ${P.label}.zip`)); }
    perMark(s, e, P); saveSH(); toast(`${e.t} (${P.label}) — 출력해 서명받고 비치한 뒤 「비치 확인」을 누르세요`, 4000);
  } catch (er) { console.error(er); toast('작성하지 못했습니다: ' + (er.message || er), 5000); }
  finally { busy(false); RENDER.led(); }
}
/* 여러 기간 묶음 — mode: 'now'(이번 기간 + 누락) · 'year'(1년치) */
function perTargets(s, y, mode) {
  const out = [];
  PER.filter(e => perApplies(s, e)).forEach(e => perPeriods(e, s, y).forEach(P => { const st = perSt(s, e, P); if (mode === 'year' ? st !== 'ok' : (st === 'now' || st === 'miss')) out.push([e, P]); }));
  const ix = id => LED.findIndex(x => x.id === id);
  return out.sort((a, b) => ix(a[0].id) - ix(b[0].id) || (a[1].from < b[1].from ? -1 : 1));
}
async function perZipSite(s, y, mode, zip, dir) {
  const T = perTargets(s, y, mode);
  for (const [e, P] of T) { const it = LED_ID[e.id];
    for (const f of await perBuild(s, e, P)) zip.file(`${dir}${lpChDir(it.ch)}/${lpItDir(it)}/${f.name}`, f.blob);
    perMark(s, e, P); await new Promise(r => setTimeout(r, 0)); }
  return T.length;
}
async function perZip(s, y, mode) {
  const n = perTargets(s, y, mode).length; if (!n) return toast(mode === 'year' ? '준비할 서류가 없습니다 — 모두 비치됨' : '이번 기간 · 누락 서류가 없습니다');
  busy(true, `시기별 서류 ${n}건 준비 중…`);
  try { const z = new JSZip(); await perZipSite(s, y, mode, z, ''); saveSH();
    z.file('00 시기별 서류 목록.txt', perListTxt(s, y));
    await download(await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), lpNm(`${fileStamp()} ${s.name} ${y}년 시기별 서류 ${mode === 'year' ? '1년치' : '이번 기간'}.zip`));
    toast(`${n}건을 준비했습니다 — 출력 · 서명 · 비치 후 「비치 확인」`, 4000);
  } catch (er) { console.error(er); toast('준비하지 못했습니다: ' + (er.message || er), 5000); }
  finally { busy(false); RENDER.led(); }
}
function perListTxt(s, y) {
  const L = [`${s.name} — ${y}년 시기별 작성 · 비치 서류 (${fmtD(today())} 기준)`, 'S-Tec Safety & Health Management System · Rat Rae Choi', ''];
  PER.filter(e => perApplies(s, e)).forEach(e => { L.push(`[${e.id}] ${e.t} (${PER_CY[e.cy]})`); perPeriods(e, s, y).forEach(P => { const st = perSt(s, e, P); L.push(`   ${P.label.padEnd(16)} ${PER_ST[st][1]}`); }); });
  return L.join('\r\n');
}
async function perBatch(sites, y) {
  const L = sites.filter(s => perTargets(s, y, 'now').length); if (!L.length) return toast('이번 기간 · 누락 서류가 없습니다');
  const n = L.reduce((a, s) => a + perTargets(s, y, 'now').length, 0);
  if (!confirmBox(`${L.length}곳 사업장의 이번 기간 · 누락 서류 ${n}건을 만들어 ZIP으로 묶습니다. 계속할까요?`)) return;
  const zip = new JSZip();
  try { for (let i = 0; i < L.length; i++) { const s = L[i]; busy(true, `시기별 서류 준비 중… ${i + 1}/${L.length} ${s.name}`); await perZipSite(s, y, 'now', zip, `${lpNm(siteOrgLabel(s) || '기타')}/${lpNm(s.name)}/`); }
    saveSH(); busy(true, 'ZIP 묶는 중…'); await download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), lpNm(`${fileStamp()} 시기별 서류 ${L.length}곳 ${n}건.zip`)); toast(`${L.length}곳 ${n}건을 준비했습니다`);
  } catch (er) { console.error(er); toast('준비하지 못했습니다: ' + (er.message || er), 5000); }
  finally { busy(false); RENDER.led(); }
}

/* ---------- 화면 ---------- */
const perY = () => LV.perY || +today().slice(0, 4);
function perCardHtml(s) {
  const y = perY(), st = perStat(s, y), es = PER.filter(e => perApplies(s, e));
  const rows = es.map(e => `<div class="prow"><div class="pt"><b><span class="lno">${e.id}</span> ${esc(e.t)}</b><small>${PER_CY[e.cy]}${e.months ? ` (${e.months[0]}~${e.months[e.months.length - 1]}월)` : ''}</small></div><div class="pchips">${perPeriods(e, s, y).map(P => { const k = perSt(s, e, P), V = PER_ST[k]; return `<button type="button" class="pc ${k}" style="--c:${V[2]}" data-pp="${e.p}" data-pk="${P.key}" title="${esc(P.label)} — ${V[1]}">${esc(P.short)}${V[0] ? `<i>${V[0]}</i>` : ''}</button>`; }).join('')}</div></div>`).join('');
  return `<div class="card" style="--c:#7C3AED"><h2>📅 시기별 작성 · 비치 서류 <span class="r"><button class="btn sm" data-py="-1">◀</button> ${y}년 <button class="btn sm" data-py="1">▶</button></span></h2><div class="body">
    <p class="hint">월 · 분기 · 반기 · 연 단위로 작성해 비치해야 하는 서류입니다. 칸을 눌러 그 기간 서류를 ${lpHas() ? '회사 양식으로' : '간이 서식으로'} 만들고, 출력 · 서명 · 비치한 뒤 「비치 확인」을 누릅니다. 기간이 지났는데 비치 확인이 없으면 <b style="color:#C62828">누락</b>으로 표시합니다.</p>
    <div class="psum"><span style="--c:#1B7A34">✔ 비치 <b>${st.ok}</b></span><span style="--c:#C62828">! 누락 <b>${st.miss}</b></span><span style="--c:#B45309">● 이번 기간 <b>${st.now}</b></span><span style="--c:#555">대상(지금까지) <b>${st.need}</b></span></div>
    <div class="row" style="margin:8px 0"><button class="btn pri" id="pNow">🗂 이번 기간 + 누락 서류 준비 (ZIP)</button><button class="btn" id="pYear">📆 ${y}년 1년치 미리 준비 (ZIP)</button></div>
    <div class="pgrid">${rows || '<p class="empty">이 사업장은 시기별 서류 대상이 없습니다</p>'}</div>
    <p class="plg">${['ok', 'rec', 'gen', 'miss', 'now', 'plan'].map(k => `<span style="--c:${PER_ST[k][2]}"><i>${PER_ST[k][0] || '○'}</i> ${PER_ST[k][1]}</span>`).join('')}</p>
  </div></div>`;
}
function perBind(host, s) {
  host.querySelectorAll('[data-py]').forEach(b => b.onclick = () => { LV.perY = perY() + +b.dataset.py; RENDER.led(); });
  host.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { const e = PER_ID[b.dataset.pp], P = perPeriods(e, s, perY()).find(x => x.key === b.dataset.pk); if (P) perModal(s, e, P); });
  const n = host.querySelector('#pNow'); if (n) n.onclick = () => perZip(s, perY(), 'now');
  const yv = host.querySelector('#pYear'); if (yv) yv.onclick = () => perZip(s, perY(), 'year');
}
function perModal(s, e, P) {
  const r = perRec(s.key, e.p, P.key), k = perSt(s, e, P), V = PER_ST[k], ev = e.ev ? e.ev(s, P) : 0;
  openModal(`<h2>📅 ${esc(e.t)} — ${esc(P.label)}</h2><div class="sub">${esc(s.name)} · ${PER_CY[e.cy]} · 대장 ${e.id}. ${esc(LED_ID[e.id].t)}</div>
    <p><span class="pc ${k}" style="--c:${V[2]};cursor:default">${V[0] || '○'} ${V[1]}</span></p>
    <ul class="hl"><li>기간: ${fmtDs(P.from)} ~ ${fmtDs(P.to)}${P.due ? ` (실시 월 ${P.m}월)` : ''}</li><li>작성: ${r.gen ? fmtDs(r.gen) : '-'} · 비치 확인: ${r.ok ? fmtDs(r.okD) : '-'}</li>${e.ev ? `<li>프로그램 기록: ${ev}건${ev ? ' — 기록으로 서류 내용을 채웁니다' : ''}</li>` : ''}</ul>
    <div class="mrow"><button class="btn" id="mClose">닫기</button><button class="btn" id="pGen">📄 ${lpHas() ? '회사 양식으로' : '간이 Word로'} 작성</button><button class="btn pri" id="pOk">${r.ok ? '비치 확인 취소' : '✔ 비치 확인'}</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal;
    md.querySelector('#pGen').onclick = () => { closeModal(); perOne(s, e, P); };
    md.querySelector('#pOk').onclick = () => { const x = perRec(s.key, e.p, P.key, true); x.ok = !x.ok; x.okD = x.ok ? today() : ''; saveSH(); closeModal(); RENDER.led(); };
  });
}
/* 조직 단위 — 문서별 누락 · 이번 기간 */
function perOrgCard() {
  const L = ledSitesInScope(), y = perY();
  const agg = PER.map(e => { let sites = 0, miss = 0, now = 0, ok = 0; const ms = [];
    L.forEach(s => { if (!perApplies(s, e)) return; sites++; let m = 0; perPeriods(e, s, y).forEach(P => { const k = perSt(s, e, P); if (k === 'miss') m++; else if (k === 'now') now++; else if (k === 'ok') ok++; }); miss += m; if (m) ms.push(s.name); });
    return { e, sites, miss, now, ok, ms }; }).filter(a => a.sites);
  const tot = agg.reduce((a, x) => a + x.miss, 0), nowT = agg.reduce((a, x) => a + x.now, 0);
  return `<div class="card" style="--c:#7C3AED"><h2>📅 시기별 서류 — 누락 현황 <span class="r">${y}년 · ${L.length}곳 · 누락 ${tot}건</span></h2><div class="body">
    <div class="tblw"><table class="t"><thead><tr><th>서류</th><th class="c">주기</th><th class="c">대상</th><th class="c">비치</th><th class="c">이번 기간</th><th class="c">누락</th></tr></thead><tbody>${agg.map(a => `<tr><td><span class="lno">${a.e.id}</span> ${esc(a.e.t)}</td><td class="c mini">${PER_CY[a.e.cy]}</td><td class="c">${a.sites}곳</td><td class="c">${a.ok}</td><td class="c">${a.now || ''}</td><td class="c" ${a.miss ? `style="color:#C62828;font-weight:700" title="${esc(a.ms.slice(0, 20).join(', '))}"` : ''}>${a.miss || ''}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">사업장이 없습니다</td></tr>'}</tbody></table></div>
    <div class="row" style="margin-top:10px"><button class="btn pri" id="pBatch" ${nowT + tot ? '' : 'disabled'}>🗂 ${L.length}곳 이번 기간 + 누락 서류 일괄 준비 (ZIP)</button></div>
  </div></div>`;
}
function perBindOrg(host) { const b = host.querySelector('#pBatch'); if (b) b.onclick = () => perBatch(ledSitesInScope(), perY()); }

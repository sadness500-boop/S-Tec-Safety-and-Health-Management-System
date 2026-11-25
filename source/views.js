/* =====================================================================
 * S-Tec Safety & Health Management System — 화면 ①
 *  공통(사업장 선택 · 사진 · 근무자 고르기) · 📊 안전보건 현황 · ⚙ 사업장·설정 · 시작
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const V = { raId: '', tbmD: '', tbmJob: '', chkJob: '', chkCyc: 'w', chkD: '', eduTab: 'wk', coId: '', siteQ: '' };

/* ---------- 공통: 조직 · 지사 · 사업장 선택 ---------- */
function orgOptions(sel) { return `<option value="">전체 조직</option>` + ORGS.map(o => `<option value="${o.k}" ${o.k === sel ? 'selected' : ''}>${esc(o.n)}</option>`).join('') + `<option value="u" ${sel === 'u' ? 'selected' : ''}>직접 추가 사업장</option>`; }
function brOptions(sel) { return `<option value="">전체 지사</option>` + BRANCHES.map(b => `<option value="${b.key}" ${b.key === sel ? 'selected' : ''}>${esc(b.name)}</option>`).join(''); }
function jobOptions(sel, all = '전체 업종', only) { return (all ? `<option value="">${all}</option>` : '') + Object.entries(JOBS).filter(([k]) => !only || only.includes(k)).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.ic} ${esc(v.n)}</option>`).join(''); }
function sitesFiltered(F) { const q = (F.q || '').trim(); return SITE_LIST.filter(s => siteOk(s, { org: F.org, br: F.br }) && (!q || s.name.includes(q) || (s.addr || '').includes(q))); }
function siteBadge(s) { return s.org === 'best' ? `<span class="brb b-${s.br}">${s.br}</span>` : s.user ? '<span class="brb b-u">추가</span>' : `<span class="brb b-${s.org}">${esc(orgName(s.org).replace('에스텍', '').replace('사업본부', ''))}</span>`; }
function curSite() { return SITE[UI.site] || null; }
function siteBarHtml() {
  const F = UI.F || {}, s = curSite(), act = activeSiteKeys();
  const list = sitesFiltered(Object.assign({}, F, { q: V.siteQ })).sort((a, b) => (act.has(b.key) - act.has(a.key)) || a.name.localeCompare(b.name, 'ko'));
  return `<div class="sitebar">
    <label>조직<select data-sb="org">${orgOptions(F.org || '')}</select></label>
    ${F.org === 'best' || !F.org ? `<label>지사<select data-sb="br">${brOptions(F.br || '')}</select></label>` : ''}
    <label>사업장 찾기<input data-sb="q" value="${esc(V.siteQ)}" placeholder="이름·주소 일부"></label>
    <label class="wide">사업장 (● 기록 중)<select data-sb="site"><option value="">사업장을 고르세요 (${list.length}곳)</option>${list.map(x => `<option value="${x.key}" ${x.key === UI.site ? 'selected' : ''}>${act.has(x.key) ? '● ' : ''}${esc(x.name)} · ${esc(siteOrgLabel(x))} · ${x.jobs.map(j => JOBS[j] ? JOBS[j].s : j).join('/')}</option>`).join('')}</select></label>
    ${s ? `<div class="now"><b>${esc(s.name)} ${siteBadge(s)}</b><small>${esc(siteOrgLabel(s))} · ${s.jobs.map(j => JOBS[j] ? JOBS[j].ic + JOBS[j].s : j).join(' ')} · ${s.total ? s.total + '명' : '인원 미등록'}${s.shift ? ' · ' + esc(s.shift) : ''}${s.client && s.client.name ? ' · 고객사 담당 ' + esc(s.client.name) : ''}</small></div>` : ''}
  </div>`;
}
function bindSiteBar(root, rerender) {
  root.querySelectorAll('[data-sb]').forEach(el => {
    const k = el.dataset.sb;
    const go = () => {
      if (k === 'q') { V.siteQ = el.value; clearTimeout(V.qt); V.qt = setTimeout(() => { rerender(); const i = $(`#${root.id} [data-sb="q"]`); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 350); return; }
      if (k === 'site') { UI.site = el.value; V.raId = ''; V.coId = ''; }
      else { UI.F = Object.assign({}, UI.F, { [k]: el.value }); if (k === 'org' && el.value !== 'best') UI.F.br = ''; }
      saveUI(); rerender();
    };
    el.addEventListener(k === 'q' ? 'input' : 'change', go);
  });
}
function needSite(msg) { return `<div class="card"><div class="body empty">🏢 위에서 사업장을 먼저 고르세요.<br><span class="hint">${msg || '기록은 사업장별로 쌓입니다. 「● 」 표시는 이미 기록을 시작한 사업장입니다.'}</span></div></div>`; }

/* ---------- 공통: 사진 · 근무자 고르기 · 날짜 ---------- */
function photosHtml(arr, id, max = 3) {
  return `<div class="phs" id="${id}">${(arr || []).map((p, i) => `<figure><img src="${p}" alt="현장 사진 ${i + 1}"><button type="button" class="btn sm warn" data-phx="${i}">삭제</button></figure>`).join('')}${(arr || []).length < max ? `<label class="phadd">＋ 사진<input type="file" accept="image/*" capture="environment" hidden data-phadd></label>` : ''}</div>`;
}
function bindPhotos(root, id, arr, max, redraw) {
  const host = root.querySelector('#' + id); if (!host) return;
  host.querySelectorAll('[data-phx]').forEach(b => b.onclick = () => { arr.splice(+b.dataset.phx, 1); redraw(); });
  const inp = host.querySelector('[data-phadd]'); if (inp) inp.onchange = async ev => { const f = ev.target.files[0]; if (!f) return; try { arr.push(await shrinkPhoto(f)); if (arr.length > max) arr.length = max; redraw(); } catch (e) { toast('사진을 읽을 수 없습니다'); } };
}
function workerName(key, id) { const w = workerById(key, id); return w ? w.name : id; }
function workerPick(key, sel, d, job) {
  const W = workers(key, d).filter(w => !job || !w.job || w.job === job);
  if (!W.length) return `<div class="hint">근무자 명부가 비어 있습니다 — 「🎓 교육·보호구 › 👥 근무자 명부」에서 등록하세요.</div>`;
  return `<div class="chips">${W.map(w => `<button type="button" class="chip g" data-wk="${w.id}" aria-pressed="${(sel || []).includes(w.id)}">${esc(w.name)}${w.role ? ' · ' + esc(w.role) : ''}</button>`).join('')}</div>`;
}
function bindWorkerPick(root, arr) { root.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { const i = arr.indexOf(b.dataset.wk); if (i < 0) arr.push(b.dataset.wk); else arr.splice(i, 1); b.setAttribute('aria-pressed', String(i < 0)); }); }
const lvTag = v => { const L = riskLv(v); return `<span class="lv" style="background:${L.bg};color:${L.c}">${v || '-'} ${L.n}</span>`; };
const rateBar = v => v == null ? '<span class="mini">측정 전</span>' : `<div style="display:flex;gap:6px;align-items:center"><div class="bar" style="flex:1"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div><b style="font-size:12px;min-width:44px;text-align:right">${nf(v, 0)}%</b></div>`;
const gradeTag = v => { const g = shiGrade(v); return `<span class="gr" style="background:${g[2]}">${g[0]}</span>`; };

/* =====================================================================
 * 탭
 * ===================================================================== */
const RENDER = {};
function setTab(t) {
  if (!RENDER[t]) t = 'dash';
  UI.tab = t; saveUI();
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  RENDER[t]();
}
function renderAll() { buildSites(); CALC.clear(); renderHeroStats(); setTab(UI.tab || 'dash'); }
function renderHeroStats() {
  const td = today(), r = periodRange('m', td), G = groupKpi(r, {});
  const tbmSites = new Set(Object.values(SH.tbm).filter(x => x.d === td).map(x => x.site));
  $('#stTbm').textContent = nf(tbmSites.size) + '곳'; $('#stTbm2').textContent = `관리 사업장 ${nf(G.n)}곳`;
  $('#stOpen').textContent = nf(G.actOpen); $('#stOpen2').textContent = G.actOpen ? `높음 이상 ${nf(G.raHigh)}건` : '건';
  $('#stDue').textContent = nf(G.actOver + G.actSoon); $('#stDue2').textContent = `지남 ${nf(G.actOver)} · 7일 내 ${nf(G.actSoon)}`;
  const g = shiGrade(G.shi); $('#stShi').textContent = G.shi == null ? '-' : nf(G.shi, 1); $('#stShi2').textContent = G.shi == null ? '기록하면 계산' : `${g[0]} ${g[1]}`;
}

/* =====================================================================
 * 📊 안전보건 현황
 * ===================================================================== */
RENDER.dash = function renderDash() {
  const F = UI.F || {}, r = periodRange(UI.per || 'm', UI.ref || today()), G = groupKpi(r, F), host = $('#p-dash');
  const per = [['m', '월간'], ['q', '분기'], ['h', '반기'], ['y', '연간']];
  const g = shiGrade(G.shi);
  const acts = allActions(F).filter(a => !a.done && siteOk(SITE[a.site], F)).slice(0, 12);
  const L = lawStatus(r, F);
  host.innerHTML = `
  <div class="filters">
    <label class="per">기간<div class="chips">${per.map(([k, n]) => `<button class="chip" data-per="${k}" aria-pressed="${(UI.per || 'm') === k}">${n}</button>`).join('')}</div></label>
    <label class="per">기준<div class="nav"><button class="btn sm" data-nav="-1">◀</button><b style="padding:6px 4px;font-size:13px">${esc(r.label)}</b><button class="btn sm" data-nav="1">▶</button><button class="btn sm" data-nav="0">오늘</button></div></label>
    <label>조직<select data-f="org">${orgOptions(F.org || '')}</select></label>
    <label>지사<select data-f="br">${brOptions(F.br || '')}</select></label>
    <label>업종<select data-f="job">${jobOptions(F.job || '')}</select></label>
  </div>
  ${G.n ? '' : `<div class="sbn">아직 기록을 시작한 사업장이 없습니다. 사업장을 골라 TBM · 위험성평가 · 점검을 기록하면 여기에 이행률이 나타납니다. 화면을 먼저 보려면 <button class="btn sm" id="dDemo">🧪 예시 자료 넣기</button> (가상 사업장 2곳 · 언제든 지움)</div>`}
  <div class="kpis">
    <div class="kpi spi"><small>안전보건 이행지수 SHI</small><b>${G.shi == null ? '-' : nf(G.shi, 1)}</b><span>${g[0]} ${g[1]} · 관리 ${nf(G.n)}곳</span></div>
    <div class="kpi" style="--c:#0B1F8A"><small>TBM 실시율</small><b>${pct(G.tbm)}</b><span>TBM ${nf(G.tbmN)}회 · 참석 ${nf(G.tbmAtt)}명</span></div>
    <div class="kpi" style="--c:#1B7A34"><small>안전점검 이행률</small><b>${pct(G.chk)}</b><span>점검 ${nf(G.chkN)}회 · 불량 ${nf(G.chkNg)}건</span></div>
    <div class="kpi" style="--c:#7A2E8E"><small>위험성평가 관리</small><b>${pct(G.ra)}</b><span>평가 ${nf(G.raN)}건 · 높음 미조치 ${nf(G.raHigh)}</span></div>
    <div class="kpi" style="--c:#C0392B"><small>조치 완료율</small><b>${pct(G.act)}</b><span>미조치 ${nf(G.actOpen)} · 기한 지남 ${nf(G.actOver)}</span></div>
    <div class="kpi" style="--c:#2F6FD0"><small>교육 이수율</small><b>${pct(G.edu)}</b><span>미이수 ${nf(G.eduMiss)}명 · 보호구 교체 지남 ${nf(G.ppeOver)}</span></div>
  </div>
  <div class="two">
    <div class="card" style="--c:#0B1F8A"><h2>🏢 사업장별 이행률 <span class="r">${esc(r.label)} · 행을 누르면 그 사업장으로 이동</span></h2><div class="body">
      ${G.rows.length ? `<div class="tblw"><table class="t" style="min-width:920px"><thead><tr><th>사업장</th><th>SHI</th><th>TBM</th><th>점검</th><th>위험성평가</th><th>조치</th><th>교육</th><th>미조치</th><th>보고</th></tr></thead><tbody>
      ${G.rows.sort((a, b) => (a.shi ?? 999) - (b.shi ?? 999)).map(K => `<tr class="clk${K.actOver ? ' od' : ''}" data-site="${K.key}"><td style="min-width:170px"><b>${esc(K.site.name)}</b> ${siteBadge(K.site)}<br><span class="mini">${K.site.jobs.map(j => JOBS[j] ? JOBS[j].s : j).join('·')} · 근무자 ${nf(K.workers)}명</span></td><td class="c">${gradeTag(K.shi)} <b>${K.shi == null ? '-' : nf(K.shi, 0)}</b></td><td style="min-width:90px">${rateBar(K.tbm)}</td><td style="min-width:90px">${rateBar(K.chk)}</td><td style="min-width:90px">${rateBar(K.ra)}</td><td style="min-width:90px">${rateBar(K.act)}</td><td style="min-width:90px">${rateBar(K.edu)}</td><td class="c">${K.actOpen ? `<span class="pill" style="--c:${K.actOver ? '#C0392B' : '#E8750A'}">${K.actOpen}</span>` : '0'}</td><td class="c">${K.nmN ? '⚠' + K.nmN : ''} ${K.accN ? '🩹' + K.accN : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">기록을 시작한 사업장이 없습니다</div>'}
      <div class="chartbox" style="height:220px;margin-top:12px"><canvas id="cTrend"></canvas></div>
    </div></div>
    <div>
      <div class="card" style="--c:#C0392B"><h2>⏰ 조치 필요 · 기한 임박 <span class="r"><button class="btn sm" data-go2="rep">전체 보기</button></span></h2><div class="body">
        ${acts.length ? `<div class="acts">${acts.map(actHtml).join('')}</div>` : '<div class="empty">✔ 미조치 항목이 없습니다</div>'}
      </div></div>
      <div class="card" style="--c:#2F6FD0"><h2>🎓 교육 미이수 · 🦺 보호구 교체</h2><div class="body">${alertsHtml(G)}</div></div>
    </div>
  </div>
  <div class="card" style="--c:#B3261E"><h2>⚖ 중대재해처벌법 이행 현황 — ${esc(L.half.label)} <span class="r">시행령 제4조(안전보건관리체계 9개) · 제5조(관계법령 의무이행) · 반기 1회 점검 기준</span></h2><div class="body">
    <div class="law">${L.items.map(x => `<div class="l" style="--c:${x.ok ? '#1B7A34' : '#C0392B'}"><span class="no">${esc(x.no)} · ${esc(x.cyc)}</span><b>${x.ok ? '✅' : '⬜'} ${esc(x.n)}</b><small>${esc(x.how)}</small><small><b style="display:inline;font-size:11.5px;color:${x.ok ? '#1B7A34' : '#C0392B'}">${esc(x.note)}</b></small><div class="row" style="margin-top:5px"><button class="btn sm" data-law="${x.k}">${(SH.law[L.hk] || {})[x.k] ? '본사 확인 취소' : '본사 확인 기록'}</button></div></div>`).join('')}</div>
    <p class="hint">「본사 확인」은 경영방침·예산·전담조직처럼 사업장 기록으로 증빙되지 않는 항목을 본사(경영책임자 보좌 조직)가 반기마다 점검했다는 기록입니다. 근거 문서 이름을 메모로 남겨 두세요.</p>
  </div></div>
  <div class="card" style="--c:#0E7C86"><h2>🤝 도급인(고객사) 안전보건 의무 이행 지원 <span class="r">고객사가 가장 반기는 자료 — 「🖨 보고서 › 고객사 제출용 이행 현황」</span></h2><div class="body">
    <div class="cards2">${Object.entries(CO_K).map(([k, c]) => { const n = Object.values(SH.co).filter(x => x.type === k && inR(x.d, r) && siteOk(SITE[x.site], F)).length; return `<div class="ritem" style="--c:#0E7C86"><div class="rh"><b>${esc(c.n)}</b><span class="pill" style="--c:#0E7C86">${nf(n)}건</span></div><div class="mini">${esc(c.cyc)} · ${esc(c.law)}</div></div>`; }).join('')}</div>
  </div></div>`;
  host.querySelectorAll('[data-per]').forEach(b => b.onclick = () => { UI.per = b.dataset.per; saveUI(); RENDER.dash(); });
  host.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { const n = +b.dataset.nav; UI.ref = n ? shiftRange(r, n).from : today(); saveUI(); RENDER.dash(); });
  host.querySelectorAll('[data-f]').forEach(el => el.onchange = () => { UI.F = Object.assign({}, UI.F, { [el.dataset.f]: el.value }); if (el.dataset.f === 'org' && el.value !== 'best') UI.F.br = ''; saveUI(); RENDER.dash(); });
  host.querySelectorAll('tr[data-site]').forEach(tr => tr.onclick = () => { UI.site = tr.dataset.site; saveUI(); setTab('tbm'); });
  host.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => setTab(b.dataset.go2));
  host.querySelectorAll('[data-law]').forEach(b => b.onclick = () => lawConfirm(L.hk, b.dataset.law));
  bindActs(host, () => { renderHeroStats(); RENDER.dash(); });
  const dm = $('#dDemo'); if (dm) dm.onclick = () => { loadDemo(); renderAll(); toast('예시 자료를 넣었습니다 — 「⚙ 사업장·설정」에서 지울 수 있습니다'); };
  drawCharts(); pushKpi(r);
};
function drawCharts() {
  const cv = $('#cTrend'); if (!cv || !cv.offsetParent) return;
  const r = periodRange('m', UI.ref || today()), F = UI.F || {}, lb = [], shi = [], tbm = [], chk = [];
  for (let i = 5; i >= 0; i--) { const m = shiftRange(r, -i), G = groupKpi(m, F); lb.push(m.from.slice(2, 7).replace('-', '.')); shi.push(G.shi); tbm.push(G.tbm || 0); chk.push(G.chk || 0); }
  drawBar(cv, { title: '최근 6개월 추이 — TBM·점검 이행률(%) · SHI', labels: lb, bars: [{ name: 'TBM', data: tbm, color: '#2A44D4' }, { name: '점검', data: chk, color: '#22A04A' }], line: { name: 'SHI', data: shi, color: '#E8750A', max: 100 } });
}
function actHtml(a) {
  const s = SITE[a.site], st = a.done ? '완료' : a.over ? '기한 지남' : a.soon ? '7일 내' : '진행';
  return `<div class="act ${a.done ? 'done' : a.over ? 'over' : a.soon ? 'soon' : ''}"><span class="pill" style="--c:${a.done ? '#1B7A34' : a.over ? '#C0392B' : a.soon ? '#E8750A' : '#2F6FD0'}">${st}</span>
    <div class="t">${esc(a.title)}<small>${esc(s ? s.name : '')} · 발생 ${fmtDs(a.d)}${a.owner ? ' · 담당 ' + esc(a.owner) : ''}${a.due ? ' · 기한 ' + fmtDs(a.due) : ' · 기한 미정'}${a.ctrl ? ' · ' + esc(a.ctrl) : ''}${a.done ? ' · 완료 ' + fmtDs(a.doneD) : ''}</small></div>
    ${a.done ? '' : `<button class="btn sm" data-actdone="${esc(a.src + '|' + a.ref + '|' + (a.sub || ''))}">✔ 완료</button>`}</div>`;
}
function bindActs(root, after) {
  root.querySelectorAll('[data-actdone]').forEach(b => b.onclick = () => {
    const [src, ref, sub] = b.dataset.actdone.split('|'); const a = allActions({}).find(x => x.src === src && x.ref === ref && (x.sub || '') === sub); if (!a) return;
    openModal(`<h2>조치 완료 기록</h2><div class="sub">${esc(a.title)}</div>
      <div class="grid2"><div class="field"><label>완료일</label><input type="date" id="adD" value="${today()}"></div><div class="field"><label>확인자</label><input id="adBy" value="${esc(whoAmI())}"></div></div>
      <div class="field"><label>조치 결과(무엇을 고쳤나)</label><textarea id="adR" rows="3" placeholder="예: 순찰로 조명 2개소 교체 완료(고객사 시설팀), 미끄럼 방지 테이프 부착"></textarea></div>
      <div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="adOk">완료 저장</button></div>`, md => {
      md.querySelector('#mClose').onclick = closeModal;
      md.querySelector('#adOk').onclick = () => { setActionDone(a, md.querySelector('#adD').value, [md.querySelector('#adR').value.trim(), md.querySelector('#adBy').value.trim()].filter(Boolean).join(' — 확인 ')); closeModal(); toast('조치 완료로 기록했습니다'); after && after(); };
    });
  });
}
function alertsHtml(G) {
  const em = G.rows.flatMap(K => K.eduMiss.map(m => ({ s: K.site, m }))).slice(0, 8);
  const pp = G.rows.flatMap(K => latestPpe(K.key).filter(p => p.next && dayDiff(today(), p.next) <= 30).map(p => ({ s: K.site, p }))).sort((a, b) => a.p.next < b.p.next ? -1 : 1).slice(0, 8);
  if (!em.length && !pp.length) return '<div class="empty">✔ 교육 미이수자 · 보호구 교체 대상이 없습니다</div>';
  return `${em.length ? `<b style="font-size:12.5px">교육 미이수 ${nf(G.eduMiss)}명</b><ul class="hl" style="margin:6px 0 10px">${em.map(x => `<li style="background:#FFF4D6">${esc(x.s.name)} · ${esc(x.m.w.name)} — ${esc(x.m.t)}</li>`).join('')}</ul>` : ''}
    ${pp.length ? `<b style="font-size:12.5px">보호구 교체 임박·지남</b><ul class="hl" style="margin-top:6px">${pp.map(x => `<li style="background:${x.p.next < today() ? '#FFE1DC' : '#FFF4D6'}">${esc(x.s.name)} · ${esc(workerName(x.s.key, x.p.wid))} · ${esc(PPE[x.p.item].n)} — 교체 ${fmtDs(x.p.next)}</li>`).join('')}</ul>` : ''}`;
}
function lawConfirm(hk, k) {
  SH.law[hk] = SH.law[hk] || {};
  if (SH.law[hk][k]) { delete SH.law[hk][k]; saveSH(); RENDER.dash(); return; }
  const L = LAW.find(x => x.k === k);
  openModal(`<h2>본사 확인 기록</h2><div class="sub">${esc(L.no)} · ${esc(L.n)}</div>
    <div class="grid2"><div class="field"><label>확인일</label><input type="date" id="lwD" value="${today()}"></div><div class="field"><label>확인자</label><input id="lwBy" value="${esc(whoAmI())}"></div></div>
    <div class="field"><label>근거 문서 · 메모</label><input id="lwN" placeholder="예: 2026 안전보건 경영방침(대표이사 서명) 게시 사진, 예산 편성표"></div>
    <div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="lwOk">저장</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal;
    md.querySelector('#lwOk').onclick = () => { SH.law[hk][k] = { d: md.querySelector('#lwD').value, by: md.querySelector('#lwBy').value.trim(), note: md.querySelector('#lwN').value.trim() }; saveSH(); closeModal(); RENDER.dash(); };
  });
}

/* =====================================================================
 * ⚙ 사업장 · 설정
 * ===================================================================== */
RENDER.set = function renderSet() {
  const host = $('#p-set'), s = curSite(), c = (s && SH.cfg[s.key]) || {};
  host.innerHTML = siteBarHtml() + `<div class="two">
  <div>${s ? `<div class="card" style="--c:#0B1F8A"><h2>🏢 사업장 안전보건 설정 — ${esc(s.name)}</h2><div class="body">
    <div class="field"><label>업종(여러 개 선택)</label><div class="chips">${Object.entries(JOBS).map(([k, j]) => `<button type="button" class="chip g" data-sj="${k}" aria-pressed="${s.jobs.includes(k)}">${j.ic} ${j.n}</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label>근무형태(TBM 기준일)</label><select id="sShift">${['', '격일제', '3조2교대', '4조3교대', '24시간 교대', '주5일', '주간 통상'].map(x => `<option ${x === (c.shift || s.shift) ? 'selected' : ''} value="${x}">${x || '사업장 목록 기준'}</option>`).join('')}</select></div>
    <div class="field"><label>관리 시작일(이행률 계산 시작)</label><input type="date" id="sStart" value="${esc(c.start || '')}"></div></div>
    <div class="grid2"><div class="field"><label>정기교육 반기 기준 시간</label><input type="number" id="sRegH" min="0" step="1" value="${esc(c.regH || EDU.reg.h)}"></div>
    <div class="field"><label>총 인원(목록 값 대신)</label><input type="number" id="sTot" min="0" value="${esc(c.total || '')}" placeholder="${s.total || ''}"></div></div>
    <h3 style="font-size:13.5px;margin:6px 0">고객사(도급인) 안전보건 담당</h3>
    <div class="grid2"><div class="field"><label>성명</label><input id="sCN" value="${esc((c.client || {}).name || '')}"></div><div class="field"><label>부서·직책</label><input id="sCP" value="${esc((c.client || {}).pos || '')}"></div></div>
    <div class="grid2"><div class="field"><label>연락처</label><input id="sCT" value="${esc((c.client || {}).tel || '')}"></div><div class="field"><label>고객사(도급인) 회사명</label><input id="sCC" value="${esc((c.client || {}).co || s.name)}"></div></div>
    <label class="row" style="font-size:13px;margin:6px 0"><input type="checkbox" id="sOn" ${c.on ? 'checked' : ''}> 기록이 없어도 관리 대상 사업장으로 표시</label>
    <div class="mrow"><button class="btn pri" id="sSave">💾 설정 저장</button></div>
  </div></div>` : needSite('사업장을 고르면 업종 · 근무형태 · 고객사 담당자를 설정합니다.')}
  <div class="card" style="--c:#1B7A34"><h2>➕ 목록에 없는 사업장 추가</h2><div class="body">
    <div class="grid2"><div class="field"><label>사업장명</label><input id="aName"></div><div class="field"><label>조직</label><select id="aOrg">${ORGS.map(o => `<option value="${o.k}">${esc(o.n)}</option>`).join('')}</select></div></div>
    <div class="grid2"><div class="field"><label>지사(에스텍베스트)</label><select id="aBr"><option value="">-</option>${BRANCHES.map(b => `<option>${b.key}</option>`).join('')}</select></div><div class="field"><label>업종</label><select id="aJob">${jobOptions('sec', '')}</select></div></div>
    <div class="mrow"><button class="btn" id="aAdd">추가</button></div>
  </div></div></div>
  <div>
  <div class="card" style="--c:#7A2E8E"><h2>🔗 연동 · 공유 서버</h2><div class="body">
    <p class="hint" style="margin-top:0">${renderShareStateText()}</p>
    <div class="row"><button class="btn" id="shPush">☁ 이 기기 기록 올리기</button><button class="btn" id="shPull">☁ 서버 기록 받기(올해)</button></div>
    <div class="tblw" style="margin-top:10px"><table class="t" style="min-width:0"><thead><tr><th>연동 프로그램</th><th>주고받는 것</th></tr></thead><tbody>
      <tr><td>근태관리</td><td>오늘 근무자 → TBM 참석 대상 · 신규 배치자 → 채용 시 교육 알림 (「👥 근무자 명부」 · TBM의 「근태관리에서 불러오기」)</td></tr>
      <tr><td>업무표준화·매뉴얼</td><td>업종별 표준업무 → 위험요인 초안 자동 제안 (위험성평가의 「📚 표준 위험요인 불러오기」)</td></tr>
      <tr><td>사건·사고 즉시 보고 [16]</td><td>재해·아차사고 → 수시 위험성평가 자동 열기 (서버 함수 sh_adhoc_ra)</td></tr>
      <tr><td>법률 대응 시스템</td><td>TBM·교육·점검·위험성평가 기록 → 사업주 의무 이행 증빙 묶음 (sh_link_push)</td></tr>
      <tr><td>성과관리 · 고객사 포털 [14]</td><td>TBM 실시율 · 점검 이행률 · 미조치 건수 → 월간 안전 지표 (sh_kpi)</td></tr>
    </tbody></table></div>
  </div></div>
  <div class="card" style="--c:#E8750A"><h2>💾 백업 · 예시 자료</h2><div class="body">
    <p class="hint" style="margin-top:0">이 기기 저장량 ${nf(storeBytes() / 1024, 0)} KB · 사업장 ${nf(activeSiteKeys().size)}곳 · 기록 ${nf(KINDS.reduce((a, k) => a + Object.keys(SH[k]).length, 0))}건</p>
    <div class="row"><button class="btn" id="bkOut">⬇ 백업 파일 받기</button><label class="btn">⬆ 백업 파일 복원<input type="file" id="bkIn" accept=".json,application/json" hidden></label></div>
    <div class="row" style="margin-top:8px"><button class="btn" id="dmIn">🧪 예시 자료 넣기</button><button class="btn warn" id="dmOut">예시 자료 지우기</button></div>
    <p class="hint">예시 자료는 「예시 ○○」 가상 사업장 2곳에만 들어가며 공유 서버에 올라가지 않습니다. 공개 저장소에는 실제 고객사·근무자·사고 자료를 넣지 않습니다.</p>
  </div></div></div></div>`;
  bindSiteBar(host, RENDER.set);
  if (s) {
    const jobs = new Set(s.jobs); host.querySelectorAll('[data-sj]').forEach(b => b.onclick = () => { const k = b.dataset.sj; jobs.has(k) ? jobs.delete(k) : jobs.add(k); b.setAttribute('aria-pressed', String(jobs.has(k))); });
    $('#sSave').onclick = () => {
      if (!jobs.size) return toast('업종을 하나 이상 고르세요');
      SH.cfg[s.key] = Object.assign({}, c, { jobs: [...jobs], shift: $('#sShift').value, start: $('#sStart').value, regH: +$('#sRegH').value || EDU.reg.h, total: +$('#sTot').value || 0, on: $('#sOn').checked,
        client: { name: $('#sCN').value.trim(), pos: $('#sCP').value.trim(), tel: $('#sCT').value.trim(), co: $('#sCC').value.trim() } });
      saveSH(); queueShare('wk_' + s.key); buildSites(); toast('사업장 설정을 저장했습니다'); RENDER.set();
    };
  }
  $('#aAdd').onclick = () => { const n = $('#aName').value.trim(); if (!n) return toast('사업장명을 넣으세요'); const key = 'u' + uid(), org = $('#aOrg').value; SH.usites.push({ key, name: n, org, br: org === 'best' ? $('#aBr').value : '', orgN: orgName(org), ind: indOf(n), jobs: [$('#aJob').value] }); saveSH(); buildSites(); UI.site = key; saveUI(); toast('추가했습니다'); RENDER.set(); };
  $('#shPush').onclick = async () => { if (!sbClient()) return toast('로그인한 뒤 올릴 수 있습니다'); busy(true, '올리는 중…'); await pushAllShare(); busy(false); toast(SHARE.ok ? '공유 서버에 올렸습니다' : '공유 서버가 아직 준비되지 않았습니다'); RENDER.set(); };
  $('#shPull').onclick = async () => { const n = await pullShare(periodRange('y', today())); if (n) { renderAll(); toast(`${n}건을 받았습니다`); } };
  $('#bkOut').onclick = () => download(new Blob([JSON.stringify(SH)], { type: 'application/json' }), `${fileStamp()}_에스텍_안전보건_백업.json`);
  $('#bkIn').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (!o || !o.tbm) throw 0; if (!confirmBox('백업 파일로 바꿉니다. 지금 이 기기의 기록은 덮어씁니다. 계속할까요?')) return; SH = Object.assign(SH, o); saveSH(); renderAll(); toast('복원했습니다'); } catch (x) { toast('백업 파일이 아닙니다'); } };
  $('#dmIn').onclick = () => { loadDemo(); renderAll(); toast('예시 자료를 넣었습니다'); };
  $('#dmOut').onclick = () => { clearDemo(); renderAll(); toast('예시 자료를 지웠습니다'); };
};
function renderShareStateText() { const sb = sbClient(); return !sb ? '로그인 전 — 기록은 이 기기에 저장됩니다. 통합관리 시스템과 같은 아이디로 로그인하면 여러 기기 · 회사 공유 서버에 저장됩니다.' : SHARE.ok === false ? '로그인됨 — 공유 서버 SQL(server/supabase_stsh.sql)을 아직 실행하지 않아 계정 동기화만 됩니다.' : '로그인됨 — 기록이 회사 공유 서버(sh_records)에 저장되어 본사·지사·연동 프로그램이 함께 봅니다.'; }

/* =====================================================================
 * 시작
 * ===================================================================== */
async function buildSignature(date) {
  try {
    const ff = new FontFace('DancingSig', `url(data:font/woff2;base64,${ASSET.dancing})`); await ff.load(); document.fonts.add(ff);
    const base = await loadImg(ASSET.sigBase);
    const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const txt = `${M[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`, S = 4, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    ctx.font = `${72 * S}px DancingSig`; const tw = ctx.measureText(txt).width / S, W = Math.ceil(1389 + tw + 24), H = 210;
    cv.width = W * S; cv.height = H * S; ctx.drawImage(base, 0, 0, base.width * S, base.height * S);
    ctx.font = `${72 * S}px DancingSig`; ctx.fillStyle = '#8A1C34'; ctx.fillText(txt, 1389 * S, 138 * S);
    const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(cv, 0, 0, W, H);
    VS.sig = out.toDataURL('image/png'); VS.sigPx = W;
  } catch (e) { VS.sig = ASSET.sigBase; VS.sigPx = 1860; }
}
const VS = { sig: '', sigPx: 1860 };
function isAdminUser() { const p = window.STSH_AUTH && STSH_AUTH.profile; return !!(p && ['owner', 'admin'].includes(p.role)); }
function openGuide() { return openManual('user'); }
async function init() {
  $('#appIcon').src = ASSET.icon; $('#gateLogo').src = ASSET.icon; $('#heroImg').src = ASSET.heroAnim || ASSET.hero; $('#mainIc').src = ASSET.icon;
  $('#ver').textContent = APP.version;
  $('#mgrCard').onclick = openMgr; $('#qrCard').onclick = openQR; $('#refCard').onclick = openRef; $('#btnGuide').onclick = e => { e.preventDefault(); openGuide(); };
  $$('[data-theme-set]').forEach(b => b.onclick = () => applyTheme(b.dataset.themeSet));
  $$('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $$('[data-go]').forEach(b => b.onclick = () => { setTab(b.dataset.go); $('.tabs').scrollIntoView({ behavior: 'smooth' }); });
  if (!UI.F || typeof UI.F !== 'object') UI.F = {};
  applyTheme(UI.theme); renderHeader(); showGate(); initPlayer(); renderAll(); renderShareState();
  window.addEventListener('app-access', () => renderAll());
  window.addEventListener('resize', () => { clearTimeout(V.rt); V.rt = setTimeout(drawCharts, 200); });
  setInterval(() => { renderShareState(); if (SHARE.ok == null && sbClient()) flushShare(); }, 15000);
  await buildSignature(kstNow()); $('#sigImg').src = VS.sig;
}
window.addEventListener('DOMContentLoaded', init);

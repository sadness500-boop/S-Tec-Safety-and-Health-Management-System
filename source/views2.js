/* =====================================================================
 * S-Tec Safety & Health Management System — 화면 ②
 *  📋 위험성평가 · 🗣 TBM · ✅ 안전점검
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */

/* =====================================================================
 * 📋 위험성평가 — 사업장·업종·작업별 유해위험요인 · 가능성×중대성 · 감소대책 · 담당·완료일
 * ===================================================================== */
RENDER.ra = function renderRa() {
  const host = $('#p-ra'), s = curSite();
  if (!s) { host.innerHTML = siteBarHtml() + needSite('위험성평가는 사업장 · 업종 단위로 만듭니다.'); bindSiteBar(host, RENDER.ra); return; }
  const list = Object.values(SH.ra).filter(r => r.site === s.key).sort((a, b) => a.d < b.d ? 1 : -1);
  if (V.raId && (!SH.ra[V.raId] || SH.ra[V.raId].site !== s.key)) V.raId = '';
  if (!V.raId && list.length) V.raId = list[0].id;
  const cur = V.raId ? SH.ra[V.raId] : null;
  host.innerHTML = siteBarHtml() + `<div class="entry">
    <div><div class="card" style="--c:#7A2E8E"><h2>📋 위험성평가 목록 <span class="r">${list.length}건</span></h2><div class="body">
      <div class="field"><label>새 평가 종류</label><select id="raKind">${Object.entries(RA_KINDS).map(([k, n]) => `<option value="${k}" ${k === (list.length ? 'reg' : 'first') ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>업종</label><select id="raJob">${jobOptions(s.jobs[0], '', s.jobs)}</select></div>
      <button class="btn pri" id="raNew" style="width:100%;justify-content:center">＋ 새 위험성평가 (표준 위험요인으로 시작)</button>
      <ul class="sitelist" style="margin-top:10px">${list.map(r => { const n = (r.items || []).length, hi = (r.items || []).filter(it => ['high', 'vhigh'].includes(riskLv(riskOf(it)).k) && !it.doneD).length; return `<li class="${r.id === V.raId ? 'on' : ''}" data-ra="${r.id}"><span class="dot" style="background:${hi ? '#C0392B' : '#1B7A34'}"></span><span class="nm">${esc(RA_KINDS[r.type] || r.type)} · ${JOBS[r.job] ? JOBS[r.job].s : ''}<small>${fmtDs(r.d)} · 위험요인 ${n}개${hi ? ` · 높음 미조치 ${hi}` : ''}${r.st === 'draft' ? ' · 작성 중' : ''}</small></span></li>`; }).join('') || '<li class="empty" style="cursor:default">아직 평가가 없습니다 — 최초평가부터 시작하세요</li>'}</ul>
      <div class="mx" style="margin-top:12px"><div class="h"></div>${[1, 2, 3, 4].map(x => `<div class="h">중대성 ${x}</div>`).join('')}${[5, 4, 3, 2, 1].map(p => `<div class="h">가능성 ${p}</div>${[1, 2, 3, 4].map(sv => { const L = riskLv(p * sv); return `<div style="background:${L.bg};color:${L.c}">${p * sv}</div>`; }).join('')}`).join('')}</div>
      <p class="hint">빈도·강도법(가능성 1~5 × 중대성 1~4). 1~4 낮음 · 5~8 보통 · 9~12 높음 · 15~20 매우 높음. 「보통」 이상은 감소대책을 세우고 담당·기한을 정합니다.</p>
    </div></div></div>
    <div id="raEd">${cur ? '' : '<div class="card"><div class="body empty">왼쪽에서 평가를 고르거나 「＋ 새 위험성평가」를 누르세요.<br><span class="hint">사업장 위험성평가에 관한 지침(고시 2023-19호): 최초평가 · 정기평가(매년) · 수시평가(사고·작업 변경 시) · 상시평가(월·주·일) — 모든 단계에 근로자를 참여시킵니다.</span></div></div>'}</div>
  </div>`;
  bindSiteBar(host, RENDER.ra);
  host.querySelectorAll('[data-ra]').forEach(li => li.onclick = () => { V.raId = li.dataset.ra; RENDER.ra(); });
  $('#raNew').onclick = () => {
    const job = $('#raJob').value, type = $('#raKind').value;
    const r = putRec('ra', { site: s.key, job, type, d: today(), title: `${s.name} ${JOBS[job].s} ${RA_KINDS[type]}`, by: whoAmI(), part: [], partTxt: '', how: '작업자 면담 · 현장 순회 · TBM 의견', st: 'draft', items: stdHaz(job, s) }, 'new');
    V.raId = r.id; RENDER.ra(); toast('표준 위험요인으로 평가를 시작했습니다 — 사업장에 맞게 고치고 저장하세요');
  };
  if (cur) raEditor(cur, s);
};
function stdHaz(job, s) { return (HAZ[job] || []).map(h => ({ id: uid(), task: h[0], hz: h[1], type: h[2], p: h[3], s: h[4], cur: h[5], ctrl: h[6], p2: Math.max(1, h[3] - 1), s2: h[4], owner: (s && s.head) || '', due: isoD(addDays(kstNow(), h[3] * h[4] >= 9 ? 14 : 30)) })); }
function raEditor(r, s) {
  const host = $('#raEd'), W = workers(s.key, r.d).filter(w => !w.job || w.job === r.job);
  r.part = r.part || []; r.items = r.items || [];
  const hi = r.items.filter(it => riskLv(riskOf(it)).k && ['high', 'vhigh'].includes(riskLv(riskOf(it)).k)).length;
  host.innerHTML = `<div class="card" style="--c:#7A2E8E"><h2>${esc(RA_KINDS[r.type] || '')} — ${JOBS[r.job] ? JOBS[r.job].ic + ' ' + JOBS[r.job].n : ''} <span class="r">${r.ref ? `<span class="pill" style="--c:#C0392B">사고 연계</span>` : ''}${r.hash ? `<span class="mini" title="원본 해시 SHA-256">🔒 ${r.hash.slice(0, 10)}…</span>` : ''}</span></h2><div class="body">
    <div class="grid2"><div class="field"><label>평가 제목</label><input id="rTitle" value="${esc(r.title || '')}"></div><div class="field"><label>평가일</label><input type="date" id="rD" value="${esc(r.d)}"></div></div>
    <div class="grid2"><div class="field"><label>평가 종류</label><select id="rType">${Object.entries(RA_KINDS).map(([k, n]) => `<option value="${k}" ${k === r.type ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="field"><label>평가 실시자(관리감독자)</label><input id="rBy" value="${esc(r.by || '')}"></div></div>
    <div class="field"><label>참여 근로자 (근로자 참여 — 지침 제6조)</label>${workerPick(s.key, r.part, r.d, r.job)}<input id="rPartTxt" style="margin-top:6px" value="${esc(r.partTxt || '')}" placeholder="명부에 없는 참여자 · 근로자대표(쉼표로 구분)"></div>
    <div class="field"><label>참여 방법</label><input id="rHow" value="${esc(r.how || '')}"></div>
    ${r.ref && SH.ev[r.ref] ? `<div class="legal">연계 사고: ${esc(SH.ev[r.ref].title)} (${fmtDs(SH.ev[r.ref].d)}) — 같은 사고가 다시 일어나지 않도록 원인 작업의 감소대책을 정하세요.</div>` : ''}
    <div class="row" style="margin:8px 0"><b style="font-size:13.5px">유해·위험요인 ${r.items.length}개</b>${hi ? `<span class="pill" style="--c:#C0392B">높음 이상 ${hi}</span>` : ''}<span style="margin-left:auto"></span>
      <button class="btn sm" id="rStd">📚 표준 위험요인 불러오기</button><button class="btn sm" id="rStos">🔗 업무표준화에서</button><button class="btn sm" id="rAdd">＋ 항목 추가</button></div>
    <div id="rItems">${r.items.map((it, i) => raItemHtml(it, i)).join('')}</div>
    <div class="savebar"><span class="st">${r.st === 'draft' ? '작성 중' : '확정'} · 마지막 저장 ${r.at ? fmtDs(r.at.slice(0, 10)) + ' ' + r.at.slice(11, 16) : '-'}</span>
      <button class="btn warn" id="rDel">삭제</button><button class="btn" id="rOutW">Word</button><button class="btn" id="rOutP">PDF</button><button class="btn" id="rOutX">엑셀</button><button class="btn" id="rSave">💾 저장</button><button class="btn pri" id="rFix">✔ 확정(근로자 공유)</button></div>
  </div></div>`;
  bindWorkerPick(host, r.part);
  const collect = () => {
    r.title = $('#rTitle').value.trim(); r.d = $('#rD').value || r.d; r.type = $('#rType').value; r.by = $('#rBy').value.trim(); r.partTxt = $('#rPartTxt').value.trim(); r.how = $('#rHow').value.trim();
    host.querySelectorAll('.ritem').forEach(el => { const it = r.items[+el.dataset.i]; if (!it) return; el.querySelectorAll('[data-k]').forEach(f => { it[f.dataset.k] = f.type === 'number' || f.tagName === 'SELECT' && /^(p|s|p2|s2)$/.test(f.dataset.k) ? +f.value : f.value; }); });
  };
  host.querySelectorAll('.ritem [data-k]').forEach(f => f.addEventListener('change', () => { collect(); const el = f.closest('.ritem'), it = r.items[+el.dataset.i]; el.querySelector('.rk1').innerHTML = lvTag(riskOf(it)); el.querySelector('.rk2').innerHTML = lvTag(risk2Of(it)); el.style.setProperty('--c', riskLv(riskOf(it)).k === 'vhigh' ? '#B3261E' : riskLv(riskOf(it)).c); }));
  host.querySelectorAll('[data-rix]').forEach(b => b.onclick = () => { collect(); r.items.splice(+b.dataset.rix, 1); raEditor(r, s); });
  $('#rAdd').onclick = () => { collect(); r.items.push({ id: uid(), task: '', hz: '', type: '기타', p: 3, s: 2, cur: '', ctrl: '', p2: 2, s2: 2, owner: s.head || '', due: isoD(addDays(kstNow(), 30)) }); raEditor(r, s); };
  $('#rStd').onclick = () => { collect(); const have = new Set(r.items.map(x => x.hz)); const add = stdHaz(r.job, s).filter(x => !have.has(x.hz)); r.items = r.items.concat(add); raEditor(r, s); toast(add.length ? `표준 위험요인 ${add.length}개를 더했습니다` : '이미 모두 들어 있습니다'); };
  $('#rStos').onclick = async () => {
    collect(); const sb = sbClient(); let rows = null;
    if (sb) { try { const { data, error } = await sb.rpc('stos_tasks', { p_job: r.job }); if (!error && Array.isArray(data)) rows = data; } catch (e) { } }
    if (!rows || !rows.length) { toast('업무표준화 프로그램의 공유 표준업무가 아직 없어 내장 표준 위험요인을 씁니다'); $('#rStd').click(); return; }
    const have = new Set(r.items.map(x => x.task + x.hz)); rows.forEach(t => { const hz = t.hazard || t.risk || ''; if (!have.has((t.task || t.name) + hz)) r.items.push({ id: uid(), task: t.task || t.name || '', hz, type: t.acc || '기타', p: 3, s: 2, cur: '', ctrl: t.control || '', p2: 2, s2: 2, owner: s.head || '', due: isoD(addDays(kstNow(), 30)) }); });
    raEditor(r, s); toast('업무표준화 표준업무를 불러왔습니다');
  };
  $('#rSave').onclick = () => { collect(); putRec('ra', r); toast('저장했습니다'); RENDER.ra(); };
  $('#rFix').onclick = () => { collect(); if (!r.items.length) return toast('유해·위험요인을 하나 이상 넣으세요'); if (!r.part.length && !r.partTxt) return toast('참여 근로자를 고르세요(근로자 참여는 필수입니다)'); r.st = 'done'; putRec('ra', r, 'fix'); toast('확정했습니다 — TBM에서 이 위험요인을 근로자와 공유하세요'); RENDER.ra(); };
  $('#rDel').onclick = () => { if (!confirmBox('이 위험성평가를 삭제할까요?')) return; delRec('ra', r.id); V.raId = ''; RENDER.ra(); };
  $('#rOutW').onclick = () => { collect(); outRa(r, 'docx'); }; $('#rOutP').onclick = () => { collect(); outRa(r, 'pdf'); }; $('#rOutX').onclick = () => { collect(); outRaXlsx(r); };
}
function raItemHtml(it, i) {
  const L = riskLv(riskOf(it)), opt = (arr, v) => arr.map((t, k) => k ? `<option value="${k}" ${+v === k ? 'selected' : ''}>${t}</option>` : '').join('');
  return `<div class="ritem" data-i="${i}" style="--c:${L.k === 'vhigh' ? '#B3261E' : L.c}">
    <div class="rh"><b>${i + 1}.</b><span class="rk1">${lvTag(riskOf(it))}</span><span class="mini">→ 개선 후</span><span class="rk2">${lvTag(risk2Of(it))}</span>${it.doneD ? `<span class="pill" style="--c:#1B7A34">조치 완료 ${fmtDs(it.doneD)}</span>` : ''}<button class="btn sm warn" style="margin-left:auto" data-rix="${i}">삭제</button></div>
    <div class="g3"><label>작업(공정)<input data-k="task" value="${esc(it.task)}"></label><label>유해·위험요인<input data-k="hz" value="${esc(it.hz)}"></label><label>재해 형태<select data-k="type">${ACC_TYPES.map(t => `<option ${t === it.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
    <div class="g4" style="margin-top:6px"><label>현재 안전조치<input data-k="cur" value="${esc(it.cur || '')}"></label><label>가능성(빈도)<select data-k="p">${opt(RISK_P, it.p)}</select></label><label>중대성(강도)<select data-k="s">${opt(RISK_S, it.s)}</select></label><label>위험성 판단<span class="mini" style="padding-top:6px">${esc(L.act)}</span></label></div>
    <div class="g4" style="margin-top:6px"><label>감소대책<textarea data-k="ctrl" rows="2">${esc(it.ctrl || '')}</textarea></label><label>개선 후 가능성<select data-k="p2">${opt(RISK_P, it.p2)}</select></label><label>개선 후 중대성<select data-k="s2">${opt(RISK_S, it.s2)}</select></label>
      <label>담당 · 완료 예정일<input data-k="owner" value="${esc(it.owner || '')}" placeholder="담당"><input type="date" data-k="due" value="${esc(it.due || '')}" style="margin-top:4px"></label></div>
  </div>`;
}

/* =====================================================================
 * 🗣 TBM — 작업 전 모바일 작성 · 오늘의 위험요인 · 참석자 터치 서명 · 현장 사진
 * ===================================================================== */
RENDER.tbm = function renderTbm() {
  const host = $('#p-tbm'), s = curSite();
  if (!s) { host.innerHTML = siteBarHtml() + needSite('TBM은 사업장 · 일자 · 업종마다 한 장씩 남깁니다.'); bindSiteBar(host, RENDER.tbm); return; }
  V.tbmD = V.tbmD || today(); if (!s.jobs.includes(V.tbmJob)) V.tbmJob = s.jobs[0];
  const d = parseD(V.tbmD), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const days = new Set(Object.values(SH.tbm).filter(x => x.site === s.key && x.d.startsWith(V.tbmD.slice(0, 7))).map(x => x.d));
  const id = `tbm_${s.key}_${V.tbmD}_${V.tbmJob}`, t = SH.tbm[id] || null;
  const K = siteKpi(s.key, periodRange('m', V.tbmD));
  host.innerHTML = siteBarHtml() + `<div class="entry">
    <div><div class="card" style="--c:#0B1F8A"><h2>📅 ${y}년 ${m + 1}월 TBM <span class="r">실시율 ${pct(K.tbm)}</span></h2><div class="body">
      <div class="row"><button class="btn sm" data-mv="-1">◀</button><b style="flex:1;text-align:center">${y}.${pad(m + 1)}</b><button class="btn sm" data-mv="1">▶</button><button class="btn sm" data-mv="0">오늘</button></div>
      <div class="cal">${WKK.map(w => `<b>${w}</b>`).join('')}${Array(first.getDay()).fill('<button class="x"></button>').join('')}${Array.from({ length: last.getDate() }, (_, i) => { const ds = isoD(new Date(y, m, i + 1)); return `<button data-day="${ds}" class="${days.has(ds) ? 'has' : ''} ${ds === V.tbmD ? 'on' : ''}">${i + 1}</button>`; }).join('')}</div>
      <p class="hint">초록 날짜 = TBM 기록이 있는 날 · 근무형태 「${esc((SH.cfg[s.key] || {}).shift || s.shift || '-')}」 기준 ${tbmEveryDay(s) ? '매일' : '평일'} 실시</p>
      <div class="jobtabs">${s.jobs.map(j => `<button style="--c:${JOBS[j].color}" data-tj="${j}" aria-pressed="${j === V.tbmJob}">${JOBS[j].ic} ${JOBS[j].s}</button>`).join('')}</div>
      <div class="row"><button class="btn sm" id="tPrev">↺ 지난 TBM 내용 불러오기</button><button class="btn sm" id="tAms">🔗 근태관리에서 근무자</button></div>
    </div></div></div>
    <div id="tbmEd"></div></div>`;
  bindSiteBar(host, RENDER.tbm);
  host.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const n = +b.dataset.mv; V.tbmD = n ? isoD(new Date(y, m + n, 1)) : today(); RENDER.tbm(); });
  host.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { V.tbmD = b.dataset.day; RENDER.tbm(); });
  host.querySelectorAll('[data-tj]').forEach(b => b.onclick = () => { V.tbmJob = b.dataset.tj; RENDER.tbm(); });
  const draft = t ? JSON.parse(JSON.stringify(t)) : newTbm(s, V.tbmD, V.tbmJob);
  $('#tPrev').onclick = () => { const p = Object.values(SH.tbm).filter(x => x.site === s.key && x.job === V.tbmJob && x.d < V.tbmD).sort((a, b) => a.d < b.d ? 1 : -1)[0]; if (!p) return toast('지난 TBM이 없습니다'); Object.assign(draft, { work: p.work, hz: p.hz.slice(), rules: p.rules.slice() }); tbmEditor(draft, s, id); toast(`${fmtDs(p.d)} TBM 내용을 불러왔습니다 — 참석·서명은 새로 받습니다`); };
  $('#tAms').onclick = async () => {
    const sb = sbClient(); let rows = null;
    if (sb) { try { const { data, error } = await sb.rpc('ams_roster', { p_site: s.name, p_date: V.tbmD }); if (!error && Array.isArray(data)) rows = data; } catch (e) { } }
    if (!rows || !rows.length) return toast('근태관리 공유 근무표가 아직 연결되지 않았습니다 — 근무자 명부 기준으로 표시합니다', 3800);
    const W = SH.wk[s.key] = SH.wk[s.key] || []; let n = 0; rows.forEach(x => { const nm = x.name || x.worker; if (nm && !W.find(w => w.name === nm)) { W.push({ id: uid(), name: nm, job: V.tbmJob, role: x.role || '', hired: x.hired || '' }); n++; } });
    saveSH(); toast(`근태관리 근무자 ${rows.length}명 확인 · 새로 ${n}명 명부 추가`); RENDER.tbm();
  };
  tbmEditor(draft, s, id);
};
function newTbm(s, d, job) {
  const ras = Object.values(SH.ra).filter(r => r.site === s.key && r.job === job).flatMap(r => r.items || []).sort((a, b) => riskOf(b) - riskOf(a));
  const hz = ras.slice(0, 3).map(it => `${it.task}: ${it.hz} → ${it.ctrl || '감소대책 확인'}`);
  if (hz.length < 3) (HAZ[job] || []).slice(0, 3 - hz.length).forEach(h => hz.push(`${h[0]}: ${h[1]} → ${h[6]}`));
  const mt = TBM_MONTH[parseD(d).getMonth() + 1] || [];
  return { site: s.key, d, job, time: nowHM(), leader: whoAmI(), work: '', hz, season: mt[0] || '', rules: (TBM_RULES[job] || []).slice(0, 3), att: [], photos: [], voice: '' };
}
function tbmEditor(t, s, id) {
  const host = $('#tbmEd'), W = workers(s.key, t.d).filter(w => !w.job || w.job === t.job);
  const mt = TBM_MONTH[parseD(t.d).getMonth() + 1] || [];
  const raHz = Object.values(SH.ra).filter(r => r.site === s.key && r.job === t.job).flatMap(r => r.items || []).sort((a, b) => riskOf(b) - riskOf(a)).slice(0, 8).map(it => `${it.task}: ${it.hz} → ${it.ctrl || '감소대책 확인'}`);
  const saved = !!SH.tbm[id];
  host.innerHTML = `<div class="card" style="--c:${JOBS[t.job].color}"><h2>🗣 TBM 일지 — ${fmtD(t.d)} · ${JOBS[t.job].ic} ${JOBS[t.job].n} <span class="r">${saved ? `<span class="pill" style="--c:#1B7A34">저장됨 · 참석 ${(t.att || []).length}명</span>` : '<span class="pill" style="--c:#E8750A">작성 전</span>'}</span></h2><div class="body">
    <div class="grid2"><div class="field"><label>시작 시각</label><input type="time" id="tTime" value="${esc(t.time || '')}"></div><div class="field"><label>진행자(관리감독자·반장)</label><input id="tLead" value="${esc(t.leader || '')}"></div></div>
    <div class="field"><label>오늘 작업 내용 · 장소</label><input id="tWork" value="${esc(t.work || '')}" placeholder="예: 4호기 제품창고 주변 야간 순찰 · 흡연부스 점검 / 본관 화장실 정기 청소"></div>
    <div class="field"><label>오늘의 위험요인과 대책 (한 줄에 하나)</label><textarea id="tHz" rows="4">${esc((t.hz || []).join('\n'))}</textarea>
      <div class="chips" style="margin-top:6px">${raHz.concat((HAZ[t.job] || []).map(h => `${h[0]}: ${h[1]} → ${h[6]}`)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 10).map((x, i) => `<button type="button" class="chip" data-addhz="${i}" title="${esc(x)}">＋ ${esc(x.split(':')[1] ? x.split(':')[1].split('→')[0].trim().slice(0, 22) : x.slice(0, 22))}</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label>이달의 계절 위험</label><select id="tSeason">${mt.map(x => `<option ${x === t.season ? 'selected' : ''}>${esc(x)}</option>`).join('')}<option value="" ${!t.season ? 'selected' : ''}>-</option></select></div>
    <div class="field"><label>안전수칙 복창</label><textarea id="tRules" rows="2">${esc((t.rules || []).join('\n'))}</textarea></div></div>
    <div class="field"><label>참석자 · 건강상태 · 서명 (근무자를 누르면 참석, 칸 안에 손가락으로 서명)</label>
      ${W.length ? '' : '<div class="hint">근무자 명부가 비어 있습니다. 아래 「＋ 참석자 추가」로 이름을 넣거나 「🎓 교육·보호구 › 👥 근무자 명부」에 등록하세요.</div>'}
      <div class="att" id="tAtt">${W.concat((t.att || []).filter(a => !a.wid).map(a => ({ id: '', name: a.name, tmp: true }))).map(w => { const a = (t.att || []).find(x => (w.id && x.wid === w.id) || (!w.id && x.name === w.name)); return `<div class="a ${a ? 'ok' : ''}" data-w="${esc(w.id || '')}" data-nm="${esc(w.name)}"><div class="n"><label class="row" style="gap:6px"><input type="checkbox" class="aon" ${a ? 'checked' : ''}> ${esc(w.name)}${w.role ? ' · ' + esc(w.role) : ''}</label><select class="ahl" style="width:auto;font-size:12px">${TBM_HEALTH.map(h => `<option ${a && a.health === h ? 'selected' : ''}>${h}</option>`).join('')}</select></div><div class="asig"></div></div>`; }).join('')}</div>
      <div class="row" style="margin-top:6px"><input id="tNewNm" placeholder="명부에 없는 참석자 이름" style="max-width:220px"><button class="btn sm" id="tAddNm">＋ 참석자 추가</button></div></div>
    <div class="field"><label>근로자 의견(건의·위험 신고) — 적으면 「종사자 의견」에도 자동 등록</label><input id="tVoice" value="${esc(t.voice || '')}" placeholder="예: 흡연부스 뒤편 조명이 없어 야간에 위험합니다"></div>
    <div class="field"><label>현장 사진(최대 2장 · 얼굴·차량번호가 찍히지 않게)</label>${photosHtml(t.photos, 'tPh', 2)}</div>
    <div class="savebar"><span class="st">${saved ? `저장 ${t.at ? t.at.slice(0, 10) + ' ' + t.at.slice(11, 16) : ''}${t.hash ? ' · 🔒 ' + t.hash.slice(0, 8) : ''}` : '저장하면 이 날짜 TBM 실시로 집계됩니다'}</span>
      ${saved ? '<button class="btn warn" id="tDel">삭제</button>' : ''}<button class="btn" id="tOutW">Word</button><button class="btn" id="tOutP">PDF</button><button class="btn pri" id="tSave">💾 TBM 저장</button></div>
  </div></div>`;
  const att = (t.att || []).map(a => Object.assign({}, a));
  host.querySelectorAll('#tAtt .a').forEach(el => {
    const wid = el.dataset.w, nm = el.dataset.nm, find = () => att.find(x => (wid && x.wid === wid) || (!wid && x.name === nm));
    const sigHost = el.querySelector('.asig');
    const mk = () => { const a = find(); if (a) sigPad(sigHost, a.sig, p => { const x = find(); if (x) x.sig = p; }); else sigHost.innerHTML = ''; };
    el.querySelector('.aon').onchange = e => { if (e.target.checked) { if (!find()) att.push({ wid, name: nm, health: el.querySelector('.ahl').value, sig: '' }); } else { const i = att.indexOf(find()); if (i >= 0) att.splice(i, 1); } el.classList.toggle('ok', e.target.checked); mk(); };
    el.querySelector('.ahl').onchange = e => { const a = find(); if (a) a.health = e.target.value; if (/음주/.test(e.target.value)) toast('음주 후 근무자는 작업에서 배제하고 반장에게 보고하세요', 4000); };
    mk();
  });
  const allHz = raHz.concat((HAZ[t.job] || []).map(h => `${h[0]}: ${h[1]} → ${h[6]}`)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 10);
  host.querySelectorAll('[data-addhz]').forEach(b => b.onclick = () => { const ta = $('#tHz'); const v = allHz[+b.dataset.addhz]; if (!ta.value.includes(v)) ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + v; });
  const collect = () => { t.time = $('#tTime').value; t.leader = $('#tLead').value.trim(); t.work = $('#tWork').value.trim(); t.hz = $('#tHz').value.split('\n').map(x => x.trim()).filter(Boolean); t.season = $('#tSeason').value; t.rules = $('#tRules').value.split('\n').map(x => x.trim()).filter(Boolean); t.voice = $('#tVoice').value.trim(); t.att = att; };
  $('#tAddNm').onclick = () => { const n = $('#tNewNm').value.trim(); if (!n) return; collect(); t.att.push({ wid: '', name: n, health: '이상 없음', sig: '' }); tbmEditor(t, s, id); };
  bindPhotos(host, 'tPh', t.photos = t.photos || [], 2, () => { collect(); tbmEditor(t, s, id); });
  $('#tSave').onclick = () => {
    collect(); if (!t.att.length) return toast('참석자를 한 명 이상 체크하세요');
    if (!t.hz.length) return toast('오늘의 위험요인을 적으세요');
    const noSig = t.att.filter(a => !a.sig).length;
    t.id = id; const voiceNew = t.voice && (!SH.tbm[id] || SH.tbm[id].voice !== t.voice);
    putRec('tbm', t);
    if (voiceNew) putRec('op', { site: s.key, d: t.d, cat: 'risk', text: t.voice, by: t.leader, src: 'TBM ' + fmtDs(t.d), anon: false, act: {} }, 'tbm');
    toast(noSig ? `TBM을 저장했습니다 — 서명 없는 참석자 ${noSig}명` : 'TBM을 저장했습니다'); renderHeroStats(); RENDER.tbm();
  };
  const del = $('#tDel'); if (del) del.onclick = () => { if (!confirmBox('이 TBM 기록을 삭제할까요?')) return; delRec('tbm', id); RENDER.tbm(); };
  $('#tOutW').onclick = () => { collect(); outTbm([Object.assign({ id }, t)], 'docx'); }; $('#tOutP').onclick = () => { collect(); outTbm([Object.assign({ id }, t)], 'pdf'); };
}

/* =====================================================================
 * ✅ 안전점검 — 업종별 체크리스트(주간·월간) · 불량은 담당·기한을 정해 조치 추적
 * ===================================================================== */
RENDER.chk = function renderChk() {
  const host = $('#p-chk'), s = curSite();
  if (!s) { host.innerHTML = siteBarHtml() + needSite('안전점검은 사업장 · 업종 · 주기(주간/월간)별로 남깁니다.'); bindSiteBar(host, RENDER.chk); return; }
  if (!s.jobs.includes(V.chkJob)) V.chkJob = s.jobs[0]; V.chkD = V.chkD || today();
  const hist = Object.values(SH.chk).filter(c => c.site === s.key).sort((a, b) => a.d < b.d ? 1 : -1);
  const same = hist.find(c => c.job === V.chkJob && c.cyc === V.chkCyc && c.d === V.chkD);
  const c = same ? JSON.parse(JSON.stringify(same)) : { site: s.key, job: V.chkJob, cyc: V.chkCyc, d: V.chkD, by: whoAmI(), res: {}, memo: {}, act: {}, photos: [] };
  const items = chkItems(V.chkJob).filter(x => V.chkCyc === 'm' || x[2] === 'w');
  const K = siteKpi(s.key, periodRange('m', V.chkD));
  host.innerHTML = siteBarHtml() + `<div class="two"><div class="card" style="--c:${JOBS[V.chkJob].color}"><h2>✅ ${JOBS[V.chkJob].ic} ${JOBS[V.chkJob].n} 안전점검표 <span class="r">이번 달 이행률 ${pct(K.chk)}</span></h2><div class="body">
    <div class="jobtabs">${s.jobs.map(j => `<button style="--c:${JOBS[j].color}" data-cj="${j}" aria-pressed="${j === V.chkJob}">${JOBS[j].ic} ${JOBS[j].s}</button>`).join('')}<span style="width:12px"></span><button style="--c:#0B1F8A" data-cc="w" aria-pressed="${V.chkCyc === 'w'}">주간 점검</button><button style="--c:#0B1F8A" data-cc="m" aria-pressed="${V.chkCyc === 'm'}">월간 점검(전체 항목)</button></div>
    <div class="grid2"><div class="field"><label>점검일</label><input type="date" id="cD" value="${esc(c.d)}"></div><div class="field"><label>점검자</label><input id="cBy" value="${esc(c.by || '')}"></div></div>
    <div class="row" style="margin-bottom:6px"><button class="btn sm" id="cAllOk">모두 양호</button><span class="mini">불량은 메모 · 조치 담당 · 기한을 넣으면 「조치 필요」 목록에 올라갑니다.</span></div>
    <div style="border:1px solid var(--line);border-radius:14px;overflow:hidden">${items.map(([k, n, cy]) => { const v = c.res[k] || '', a = c.act[k] || {}; return `<div class="ckrow" data-ck="${k}"><div><b style="font-size:13px">${esc(n)}</b> <span class="mini">${cy === 'w' ? '주간' : '월간'}${k[0] === 'c' ? ' · 공통' : ''}</span></div>
      <div class="seg3">${Object.entries(CHK_RES).map(([rv, [rn]]) => `<button type="button" data-v="${rv}" aria-pressed="${v === rv}">${rn}</button>`).join('')}</div>
      <div class="ngx ${v === 'ng' ? '' : 'hidden'}"><input class="ngm" value="${esc(c.memo[k] || '')}" placeholder="불량 내용"><input class="ngo" value="${esc(a.owner || s.head || '')}" placeholder="조치 담당"><input type="date" class="ngd" value="${esc(a.due || isoD(addDays(kstNow(), 7)))}"></div></div>`; }).join('')}</div>
    <div class="field" style="margin-top:10px"><label>점검 사진(최대 3장)</label>${photosHtml(c.photos, 'cPh', 3)}</div>
    <div class="savebar"><span class="st">${same ? '이 날짜 점검을 고칩니다' : '새 점검'} · ${items.length}개 항목</span>${same ? '<button class="btn warn" id="cDel">삭제</button>' : ''}<button class="btn" id="cOutP">PDF</button><button class="btn pri" id="cSave">💾 점검 저장</button></div>
  </div></div>
  <div class="card" style="--c:#1B7A34"><h2>🗂 점검 이력 <span class="r">${hist.length}건</span></h2><div class="body">
    ${hist.length ? `<div class="tblw"><table class="t" style="min-width:0"><thead><tr><th>점검일</th><th>업종</th><th>주기</th><th>양호</th><th>불량</th><th>점검자</th></tr></thead><tbody>${hist.slice(0, 40).map(h => { const vs = Object.values(h.res || {}); return `<tr class="clk" data-hc="${h.id}"><td class="c">${fmtDs(h.d)}</td><td class="c">${JOBS[h.job] ? JOBS[h.job].s : ''}</td><td class="c">${h.cyc === 'm' ? '월간' : '주간'}</td><td class="c">${vs.filter(v => v === 'ok').length}</td><td class="c">${vs.filter(v => v === 'ng').length ? `<span class="pill" style="--c:#C0392B">${vs.filter(v => v === 'ng').length}</span>` : 0}</td><td>${esc(h.by || '')}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">점검 기록이 없습니다</div>'}
    <h3 style="font-size:13.5px;margin:14px 0 6px">이 사업장 조치 필요 항목</h3>
    <div class="acts">${allActions({ site: s.key }).filter(a => !a.done).slice(0, 12).map(actHtml).join('') || '<div class="empty">✔ 없음</div>'}</div>
  </div></div></div>`;
  bindSiteBar(host, RENDER.chk); bindActs(host, () => { renderHeroStats(); RENDER.chk(); });
  host.querySelectorAll('[data-cj]').forEach(b => b.onclick = () => { V.chkJob = b.dataset.cj; RENDER.chk(); });
  host.querySelectorAll('[data-cc]').forEach(b => b.onclick = () => { V.chkCyc = b.dataset.cc; RENDER.chk(); });
  host.querySelectorAll('[data-hc]').forEach(tr => tr.onclick = () => { const h = SH.chk[tr.dataset.hc]; V.chkJob = h.job; V.chkCyc = h.cyc; V.chkD = h.d; RENDER.chk(); });
  $('#cD').onchange = e => { V.chkD = e.target.value; RENDER.chk(); };
  host.querySelectorAll('.ckrow').forEach(row => row.querySelectorAll('.seg3 button').forEach(b => b.onclick = () => { const k = row.dataset.ck; c.res[k] = b.dataset.v; row.querySelectorAll('.seg3 button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); row.querySelector('.ngx').classList.toggle('hidden', b.dataset.v !== 'ng'); }));
  $('#cAllOk').onclick = () => { items.forEach(([k]) => { if (!c.res[k]) c.res[k] = 'ok'; }); host.querySelectorAll('.ckrow').forEach(row => { const v = c.res[row.dataset.ck]; row.querySelectorAll('.seg3 button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === v))); }); };
  const collect = () => { c.d = $('#cD').value; c.by = $('#cBy').value.trim(); host.querySelectorAll('.ckrow').forEach(row => { const k = row.dataset.ck; if (c.res[k] === 'ng') { c.memo[k] = row.querySelector('.ngm').value.trim(); c.act[k] = Object.assign(c.act[k] || {}, { owner: row.querySelector('.ngo').value.trim(), due: row.querySelector('.ngd').value }); } }); };
  c.photos = c.photos || [];
  const redrawPh = () => { const ph = $('#cPh'); ph.outerHTML = photosHtml(c.photos, 'cPh', 3); bindPhotos(host, 'cPh', c.photos, 3, redrawPh); };
  bindPhotos(host, 'cPh', c.photos, 3, redrawPh);
  $('#cSave').onclick = () => { collect(); const miss = items.filter(([k]) => !c.res[k]).length; if (miss) return toast(`점검하지 않은 항목이 ${miss}개 있습니다`); if (same) c.id = same.id; putRec('chk', c); toast('점검을 저장했습니다'); renderHeroStats(); RENDER.chk(); };
  const del = $('#cDel'); if (del) del.onclick = () => { if (!confirmBox('이 점검 기록을 삭제할까요?')) return; delRec('chk', same.id); RENDER.chk(); };
  $('#cOutP').onclick = () => { collect(); outChk(Object.assign({}, c, { id: same ? same.id : '' }), 'pdf'); };
};

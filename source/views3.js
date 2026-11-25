/* =====================================================================
 * S-Tec Safety & Health Management System — 화면 ③
 *  ⚠ 아차사고·재해 보고 · 종사자 의견 청취 · 🎓 교육·보호구·근무자 명부 · 🤝 도급인 협의·합동점검
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */

/* =====================================================================
 * ⚠ 아차사고 · 재해 보고 · 종사자 의견
 * ===================================================================== */
const LEGAL_COND = [['injury', '인명 사고 · 산재 가능성'], ['worker', '근무자 기인 사안(폭행·음주·도난 가담·근무지 이탈)'], ['claim', '고객사의 손해배상·계약해지 언급'], ['conflict', '고객사 직원과 근무자 간 갈등(갑질 포함)'], ['police', '경찰 출동']];
RENDER.rep = function renderRep() {
  const host = $('#p-rep'), s = curSite(), F = s ? { site: s.key } : (UI.F || {});
  const evs = Object.values(SH.ev).filter(e => siteOk(SITE[e.site], F)).sort((a, b) => (a.d + (a.time || '')) < (b.d + (b.time || '')) ? 1 : -1);
  const ops = Object.values(SH.op).filter(o => siteOk(SITE[o.site], F)).sort((a, b) => a.d < b.d ? 1 : -1);
  const acts = allActions(F);
  host.innerHTML = siteBarHtml() + `
  <div class="card" style="--c:#E8750A"><h2>⚡ 바로 보고 <span class="r">${s ? esc(s.name) : '사업장을 먼저 고르세요'} · 사진 1장 + 한 줄이면 됩니다</span></h2><div class="body">
    <div class="qbtn">${Object.entries(EV_K).map(([k, e]) => `<button type="button" style="--c:${e.c}" data-ev="${k}">${e.ic} ${e.n}<small>${esc(e.d)}</small></button>`).join('')}<button type="button" style="--c:#0E7C86" data-op="1">🗨 종사자 의견<small>건의 · 개선 요청 · 위험 신고 · 고충</small></button></div>
    <p class="hint">재해 · 아차사고를 보고하면 그 작업의 <b>수시 위험성평가</b>가 자동으로 열립니다. 보고 원본은 고칠 수 없고, 보완 내용은 이력으로만 덧붙습니다(위변조 대비 해시 저장).</p>
  </div></div>
  <div class="two">
    <div class="card" style="--c:#C0392B"><h2>📮 사고 · 아차사고 보고 <span class="r">${evs.length}건</span></h2><div class="body"><div class="evlist">${evs.slice(0, 40).map(evCard).join('') || '<div class="empty">보고된 사고 · 아차사고가 없습니다</div>'}</div></div></div>
    <div>
      <div class="card" style="--c:#0E7C86"><h2>🗨 종사자 의견 청취 <span class="r">${ops.length}건 · 반기 1회 이상 점검(시행령 4조 7호)</span></h2><div class="body"><div class="evlist">${ops.slice(0, 30).map(opCard).join('') || '<div class="empty">접수된 의견이 없습니다</div>'}</div></div></div>
      <div class="card" style="--c:#7A2E8E"><h2>⏰ 조치 추적 <span class="r">미조치 ${acts.filter(a => !a.done).length} · 완료 ${acts.filter(a => a.done).length}</span></h2><div class="body"><div class="acts">${acts.filter(a => !a.done).concat(acts.filter(a => a.done).sort((a, b) => (b.doneD || '') < (a.doneD || '') ? -1 : 1).slice(0, 10)).map(actHtml).join('') || '<div class="empty">조치 항목이 없습니다</div>'}</div></div></div>
    </div>
  </div>`;
  bindSiteBar(host, RENDER.rep); bindActs(host, () => { renderHeroStats(); RENDER.rep(); });
  host.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => s ? openEvForm(s, b.dataset.ev) : toast('위에서 사업장을 먼저 고르세요'));
  host.querySelector('[data-op]').onclick = () => s ? openOpForm(s) : toast('위에서 사업장을 먼저 고르세요');
  host.querySelectorAll('[data-evx]').forEach(b => b.onclick = () => evAction(b.dataset.evx, b.dataset.a));
  host.querySelectorAll('[data-opx]').forEach(b => b.onclick = () => { const o = SH.op[b.dataset.opx]; if (b.dataset.a === 'del') { if (confirmBox('이 의견을 삭제할까요?')) { delRec('op', o.id); RENDER.rep(); } return; } openOpForm(SITE[o.site], o); });
};
function evCard(e) {
  const k = EV_K[e.type] || EV_K.nm, g = EV_GRADE[e.grade] || EV_GRADE.C, s = SITE[e.site] || {}, a = e.act || {};
  const lc = (e.legalC || []).length;
  return `<div class="ev" style="--c:${k.c}"><div class="h"><span class="pill" style="--c:${g[1]}">${g[0]}</span><b>${k.ic} ${esc(e.title)}</b><small>${fmtD(e.d)} ${esc(e.time || '')} · ${esc(s.name || '')} · ${esc(e.loc || '')}</small>
    <span class="x">${a.doneD ? `<span class="pill" style="--c:#1B7A34">조치 완료</span>` : `<span class="pill" style="--c:#E8750A">조치 중</span>`}</span></div>
    <p>${esc(e.desc || '')}${e.acc ? ` · 재해형태 ${esc(e.acc)}` : ''}${e.injured ? ` · 관계자 ${esc(e.injured)}` : ''}${e.lost ? ` · 예상 휴업 ${e.lost}일` : ''}</p>
    ${e.photos && e.photos.length ? `<div class="ph">${e.photos.map(p => `<figure><img src="${p}" alt=""></figure>`).join('')}</div>` : ''}
    ${(e.supp || []).length ? `<p class="mini">보완 이력: ${(e.supp || []).map(x => `${x.at.slice(0, 10)} ${esc(x.by)} — ${esc(x.t)}`).join(' / ')}</p>` : ''}
    ${a.doneD ? `<p class="mini">조치 결과(${fmtDs(a.doneD)}): ${esc(a.result || '')}</p>` : a.plan ? `<p class="mini">조치 계획: ${esc(a.plan)} · 담당 ${esc(a.owner || '-')} · 기한 ${a.due ? fmtDs(a.due) : '-'}</p>` : ''}
    ${legalNote(e)}
    <div class="row" style="margin-top:6px"><button class="btn sm" data-evx="${e.id}" data-a="supp">＋ 보완 기록</button>${e.raId && SH.ra[e.raId] ? `<button class="btn sm" data-evx="${e.id}" data-a="ra">📋 수시 위험성평가</button>` : `<button class="btn sm" data-evx="${e.id}" data-a="ra">📋 수시 위험성평가 열기</button>`}
      <button class="btn sm" data-evx="${e.id}" data-a="doc">🖨 경위서·조치결과서</button>${lc || e.grade === 'A' ? `<button class="btn sm" data-evx="${e.id}" data-a="legal" style="border-color:#C0392B;color:#C0392B">⚖ 법률 대응으로 ${e.legal ? '다시 ' : ''}보내기</button>` : ''}
      ${e.legal ? `<span class="mini">⚖ ${fmtDs(e.legal.at.slice(0, 10))} 보냄${e.legal.st === 'done' ? ' · 법률 검토 완료' : ''}</span>` : ''}<span class="mini" style="margin-left:auto">${e.hash ? '🔒 ' + e.hash.slice(0, 10) : ''}</span></div></div>`;
}
function legalNote(e) {
  const out = [];
  if (e.type !== 'nm' && (e.serious || e.lost >= 3)) {
    if (e.serious) out.push('⚠ ' + LEGAL_REPORT.serious);
    if (e.lost >= 3 || e.serious) out.push('📄 ' + LEGAL_REPORT.lost3);
  }
  return out.length ? `<div class="legal">${out.map(esc).join('<br>')}</div>` : '';
}
function openEvForm(s, type) {
  const k = EV_K[type], e = { type, d: today(), time: nowHM(), grade: type === 'nm' ? 'C' : type === 'fire' || type === 'acc' ? 'A' : 'B', photos: [], legalC: [] };
  const draw = md => {
    md.querySelector('#eAccBox').classList.toggle('hidden', e.type === 'nm');
  };
  openModal(`<h2>${k.ic} ${k.n} 보고 — ${esc(s.name)}</h2><div class="sub">${esc(k.d)} · 저장한 원본은 고칠 수 없습니다(보완은 이력으로)</div>
    <div class="grid2"><div class="field"><label>종류</label><select id="eType">${Object.entries(EV_K).map(([kk, v]) => `<option value="${kk}" ${kk === type ? 'selected' : ''}>${v.ic} ${v.n}</option>`).join('')}</select></div>
    <div class="field"><label>보고 등급</label><select id="eGrade">${Object.entries(EV_GRADE).map(([g, v]) => `<option value="${g}" ${g === e.grade ? 'selected' : ''}>${v[0]} — ${v[2]}</option>`).join('')}</select></div></div>
    <div class="grid2"><div class="field"><label>일자</label><input type="date" id="eD" value="${e.d}"></div><div class="field"><label>시각</label><input type="time" id="eT" value="${e.time}"></div></div>
    <div class="field"><label>한 줄 제목</label><input id="eTitle" placeholder="${type === 'nm' ? '예: 습식 청소 중 미끄러질 뻔함(미끄럼주의 표지 미설치)' : '예: 흡연부스 뒤편 화재 — 순찰 중 발견·초기 진화'}"></div>
    <div class="grid2"><div class="field"><label>장소</label><input id="eLoc" placeholder="예: 4호기 제품창고 옆 흡연부스"></div><div class="field"><label>관련 업종</label><select id="eJob">${jobOptions(s.jobs[0], '', s.jobs)}</select></div></div>
    <div class="field"><label>경위(6하 원칙 · 짧게)</label><textarea id="eDesc" rows="3"></textarea></div>
    <div id="eAccBox"><div class="grid2"><div class="field"><label>재해 형태</label><select id="eAcc">${ACC_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div><div class="field"><label>관계자 · 부상자</label><input id="eInj" placeholder="이름 또는 「근무자 1명」"></div></div>
      <div class="grid2"><div class="field"><label>예상 휴업일수(부상)</label><input type="number" id="eLost" min="0" value="0"></div><div class="field"><label>&nbsp;</label><label class="row" style="font-size:12.5px"><input type="checkbox" id="eSer"> 중대재해 가능성(사망 · 3개월 이상 요양 2명 이상 등)</label></div></div></div>
    <div class="field"><label>법률 대응 연계 조건(해당하면 체크 — 증빙 묶음이 법률 대응 시스템으로 갑니다)</label><div class="chips">${LEGAL_COND.map(([c, n]) => `<button type="button" class="chip" data-lc="${c}" aria-pressed="false">${n}</button>`).join('')}</div></div>
    <div class="field"><label>사진(최대 3장)</label><div id="ePhW">${photosHtml(e.photos, 'ePh', 3)}</div></div>
    <div class="grid2"><div class="field"><label>조치 계획</label><input id="ePlan" placeholder="예: 흡연부스 이전 · 감지기·CCTV 연동 요청"></div><div class="field"><label>조치 담당 · 기한</label><div class="row"><input id="eOwn" value="${esc(s.head || '')}" style="flex:1"><input type="date" id="eDue" value="${isoD(addDays(kstNow(), 7))}" style="flex:1"></div></div></div>
    <div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="eOk">보고 저장</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal;
    md.querySelector('#eType').onchange = ev => { e.type = ev.target.value; draw(md); };
    md.querySelectorAll('[data-lc]').forEach(b => b.onclick = () => { const i = e.legalC.indexOf(b.dataset.lc); i < 0 ? e.legalC.push(b.dataset.lc) : e.legalC.splice(i, 1); b.setAttribute('aria-pressed', String(i < 0)); });
    const redraw = () => { md.querySelector('#ePhW').innerHTML = photosHtml(e.photos, 'ePh', 3); bindPhotos(md, 'ePh', e.photos, 3, redraw); };
    bindPhotos(md, 'ePh', e.photos, 3, redraw); draw(md);
    md.querySelector('#eOk').onclick = () => {
      const g = id => md.querySelector(id).value;
      const r = { site: s.key, type: g('#eType'), grade: g('#eGrade'), d: g('#eD'), time: g('#eT'), title: g('#eTitle').trim(), loc: g('#eLoc').trim(), job: g('#eJob'), desc: g('#eDesc').trim(), photos: e.photos, legalC: e.legalC,
        acc: g('#eType') === 'nm' ? '' : g('#eAcc'), injured: g('#eInj').trim(), lost: +g('#eLost') || 0, serious: md.querySelector('#eSer').checked, act: { plan: g('#ePlan').trim(), owner: g('#eOwn').trim(), due: g('#eDue') }, supp: [] };
      if (!r.title) return toast('한 줄 제목을 넣으세요');
      if (r.serious && r.grade !== 'A') r.grade = 'A';
      const ev = putRec('ev', r, 'report'); const ra = openAdhocRa(ev);
      closeModal(); renderHeroStats(); RENDER.rep();
      toast(`보고를 저장했습니다 — 수시 위험성평가(${fmtDs(ra.d)})가 열렸습니다`, 4000);
      if (r.serious || r.lost >= 3) openModal(`<h2>⚠ 법정 보고 안내</h2><div class="legal">${[r.serious ? LEGAL_REPORT.serious : '', LEGAL_REPORT.lost3, LEGAL_REPORT.keep].filter(Boolean).map(esc).join('<br><br>')}</div><div class="mrow"><button class="btn pri" id="mClose">확인</button></div>`, m2 => m2.querySelector('#mClose').onclick = closeModal);
    };
  }, true);
}
function evAction(id, a) {
  const e = SH.ev[id]; if (!e) return;
  if (a === 'ra') { const ra = openAdhocRa(e); UI.site = e.site; V.raId = ra.id; saveUI(); setTab('ra'); return; }
  if (a === 'doc') return outEv(e, 'docx');
  if (a === 'legal') { if (!confirmBox('이 사고와 사업장의 최근 90일 TBM · 교육 · 점검 · 위험성평가 기록을 묶어 법률 대응 시스템으로 보냅니다. 상세 검토 내용은 권한자만 보고 고객사 포털에는 나가지 않습니다. 보낼까요?')) return; sendToLegal(e).then(() => RENDER.rep()); return; }
  if (a === 'supp') openModal(`<h2>보완 기록 추가</h2><div class="sub">${esc(e.title)} — 원본은 그대로 두고 보완 내용을 이력으로 덧붙입니다</div>
    <div class="field"><label>보완 내용</label><textarea id="sT" rows="3" placeholder="예: 고객사 시설팀 현장 확인 — 감지기 미연동 구간 확인됨"></textarea></div>
    <div class="grid2"><div class="field"><label>조치 계획 수정</label><input id="sP" value="${esc((e.act || {}).plan || '')}"></div><div class="field"><label>조치 기한</label><input type="date" id="sD" value="${esc((e.act || {}).due || '')}"></div></div>
    <div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="sOk">보완 저장</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal;
    md.querySelector('#sOk').onclick = () => { const t = md.querySelector('#sT').value.trim(); if (!t) return toast('보완 내용을 넣으세요'); e.supp = (e.supp || []).concat([{ at: new Date().toISOString(), by: whoAmI(), t }]); e.act = Object.assign(e.act || {}, { plan: md.querySelector('#sP').value.trim(), due: md.querySelector('#sD').value }); putRec('ev', e, 'supp'); closeModal(); RENDER.rep(); };
  });
}
function opCard(o) {
  const a = o.act || {}, s = SITE[o.site] || {};
  return `<div class="ev" style="--c:#0E7C86"><div class="h"><span class="pill" style="--c:#0E7C86">${esc(OP_CAT[o.cat] || '의견')}</span><b>${esc(o.text)}</b><small>${fmtDs(o.d)} · ${esc(s.name || '')} · ${o.anon ? '익명' : esc(o.by || '')}${o.src ? ' · ' + esc(o.src) : ''}</small><span class="x">${a.doneD ? '<span class="pill" style="--c:#1B7A34">조치 완료</span>' : '<span class="pill" style="--c:#E8750A">검토 중</span>'}</span></div>
    ${a.doneD ? `<p class="mini">조치 결과(${fmtDs(a.doneD)}): ${esc(a.result || '')}</p>` : a.plan ? `<p class="mini">조치 계획: ${esc(a.plan)} · 담당 ${esc(a.owner || '-')} · 기한 ${a.due ? fmtDs(a.due) : '-'}</p>` : ''}
    ${o.photos && o.photos.length ? `<div class="ph">${o.photos.map(p => `<figure><img src="${p}" alt=""></figure>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:6px"><button class="btn sm" data-opx="${o.id}" data-a="edit">조치 계획 · 결과</button><button class="btn sm warn" data-opx="${o.id}" data-a="del">삭제</button></div></div>`;
}
function openOpForm(s, o) {
  const e = o ? JSON.parse(JSON.stringify(o)) : { site: s.key, d: today(), cat: 'sug', text: '', by: '', anon: false, photos: [], act: {} };
  openModal(`<h2>🗨 종사자 의견 ${o ? '조치' : '접수'} — ${esc(s.name)}</h2><div class="sub">현장 근무자의 건의 · 개선 요청 · 위험 신고 · 고충 — 조치 결과까지 기록해 반기 점검 증빙으로 씁니다</div>
    <div class="grid2"><div class="field"><label>분류</label><select id="oC">${Object.entries(OP_CAT).map(([k, n]) => `<option value="${k}" ${k === e.cat ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="field"><label>접수일</label><input type="date" id="oD" value="${esc(e.d)}"></div></div>
    <div class="field"><label>의견 내용</label><textarea id="oT" rows="3">${esc(e.text)}</textarea></div>
    <div class="grid2"><div class="field"><label>제안자</label><input id="oB" value="${esc(e.by || '')}"></div><div class="field"><label>&nbsp;</label><label class="row" style="font-size:12.5px"><input type="checkbox" id="oA" ${e.anon ? 'checked' : ''}> 익명으로 기록</label></div></div>
    <div class="field"><label>사진</label><div id="oPhW">${photosHtml(e.photos, 'oPh', 2)}</div></div>
    <div class="grid2"><div class="field"><label>조치 계획</label><input id="oP" value="${esc(e.act.plan || '')}"></div><div class="field"><label>담당 · 기한</label><div class="row"><input id="oO" value="${esc(e.act.owner || s.head || '')}" style="flex:1"><input type="date" id="oDue" value="${esc(e.act.due || isoD(addDays(kstNow(), 14)))}" style="flex:1"></div></div></div>
    ${o ? `<div class="grid2"><div class="field"><label>조치 완료일</label><input type="date" id="oDone" value="${esc(e.act.doneD || '')}"></div><div class="field"><label>조치 결과 · 회신</label><input id="oR" value="${esc(e.act.result || '')}"></div></div>` : ''}
    <div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="oOk">저장</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal;
    const redraw = () => { md.querySelector('#oPhW').innerHTML = photosHtml(e.photos, 'oPh', 2); bindPhotos(md, 'oPh', e.photos, 2, redraw); }; bindPhotos(md, 'oPh', e.photos, 2, redraw);
    md.querySelector('#oOk').onclick = () => {
      const g = id => (md.querySelector(id) || {}).value || '';
      Object.assign(e, { cat: g('#oC'), d: g('#oD'), text: g('#oT').trim(), by: g('#oB').trim(), anon: md.querySelector('#oA').checked, act: Object.assign(e.act, { plan: g('#oP').trim(), owner: g('#oO').trim(), due: g('#oDue') }) });
      if (o) { e.act.doneD = g('#oDone'); e.act.result = g('#oR').trim(); }
      if (!e.text) return toast('의견 내용을 넣으세요');
      putRec('op', e); closeModal(); renderHeroStats(); RENDER.rep(); toast('저장했습니다');
    };
  }, true);
}

/* =====================================================================
 * 🎓 교육 · 보호구 · 근무자 명부
 * ===================================================================== */
RENDER.edu = function renderEdu() {
  const host = $('#p-edu'), s = curSite();
  if (!s) { host.innerHTML = siteBarHtml() + needSite('근무자 명부 · 교육 이수 · 보호구 지급은 사업장별로 관리합니다.'); bindSiteBar(host, RENDER.edu); return; }
  const tabs = [['wk', '👥 근무자 명부'], ['edu', '🎓 교육 이력'], ['ppe', '🦺 보호구 지급']];
  host.innerHTML = siteBarHtml() + `<div class="jobtabs">${tabs.map(([k, n]) => `<button style="--c:#0B1F8A" data-et="${k}" aria-pressed="${V.eduTab === k}">${n}</button>`).join('')}</div><div id="eduBody"></div>`;
  bindSiteBar(host, RENDER.edu);
  host.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { V.eduTab = b.dataset.et; RENDER.edu(); });
  ({ wk: eduWorkers, edu: eduList, ppe: eduPpe })[V.eduTab](s, $('#eduBody'));
};
function eduWorkers(s, host) {
  const W = (SH.wk[s.key] || []).map(w => Object.assign({}, w));
  const draw = () => {
    host.innerHTML = `<div class="card" style="--c:#0B1F8A"><h2>👥 근무자 명부 — ${esc(s.name)} <span class="r">재직 ${W.filter(w => !w.out).length}명 · TBM 참석 대상 · 교육·보호구 대상</span></h2><div class="body">
      <div class="tblw"><table class="t"><thead><tr><th>성명</th><th>업종</th><th>역할</th><th>배치일</th><th>교육 구분</th><th>퇴사일</th><th></th></tr></thead><tbody>
      ${W.map((w, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(w.name)}"></td><td><select data-k="job">${jobOptions(w.job || s.jobs[0], '', Object.keys(JOBS))}</select></td><td><input data-k="role" value="${esc(w.role || '')}" placeholder="반장·근무자"></td><td><input type="date" data-k="hired" value="${esc(w.hired || '')}"></td><td><select data-k="type"><option value="" ${w.type !== 'off' ? 'selected' : ''}>현장(반기 12h)</option><option value="off" ${w.type === 'off' ? 'selected' : ''}>사무·판매(반기 6h)</option></select></td><td><input type="date" data-k="out" value="${esc(w.out || '')}"></td><td><button class="btn sm warn" data-wx="${i}">삭제</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="row" style="margin-top:8px"><button class="btn" id="wAdd">＋ 근무자 추가</button><button class="btn" id="wPaste">📋 엑셀에서 붙여넣기</button><span style="margin-left:auto"></span><button class="btn pri" id="wSave">💾 명부 저장</button></div>
      <p class="hint">근태관리 프로그램과 연결되면 오늘 근무자가 TBM 참석 대상으로 자동으로 들어옵니다. 신규 배치자(배치일이 최근 2개월 이내)는 채용 시 교육 이수 여부를 확인해 미이수 알림을 띄웁니다. 공개 저장소·고객사 제출본에는 이름을 「김○○」로 가릴 수 있습니다.</p>
    </div></div>`;
    const collect = () => host.querySelectorAll('tr[data-i]').forEach(tr => { const w = W[+tr.dataset.i]; tr.querySelectorAll('[data-k]').forEach(f => w[f.dataset.k] = f.value.trim ? f.value.trim() : f.value); });
    host.querySelectorAll('[data-wx]').forEach(b => b.onclick = () => { collect(); W.splice(+b.dataset.wx, 1); draw(); });
    $('#wAdd').onclick = () => { collect(); W.push({ id: uid(), name: '', job: s.jobs[0], role: '', hired: today(), type: '' }); draw(); };
    $('#wPaste').onclick = () => openModal(`<h2>엑셀에서 붙여넣기</h2><div class="sub">엑셀에서 「성명 · 업종(보안/미화/시설/주차/안내/조리) · 역할 · 배치일」 열을 복사해 붙여넣으세요</div><textarea id="pT" rows="8" placeholder="홍길동\t미화\t반장\t2025-03-01"></textarea><div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="pOk">추가</button></div>`, md => {
      md.querySelector('#mClose').onclick = closeModal;
      md.querySelector('#pOk').onclick = () => { collect(); const jm = Object.fromEntries(Object.entries(JOBS).map(([k, v]) => [v.s, k])); md.querySelector('#pT').value.split('\n').map(l => l.split(/\t|,/).map(x => x.trim())).filter(c => c[0]).forEach(c => W.push({ id: uid(), name: c[0], job: jm[c[1]] || s.jobs[0], role: c[2] || '', hired: /\d{4}/.test(c[3] || '') ? c[3].replace(/\./g, '-').slice(0, 10) : '', type: '' })); closeModal(); draw(); };
    });
    $('#wSave').onclick = () => { collect(); if (W.some(w => !w.name)) return toast('이름이 빈 줄이 있습니다'); putWorkers(s.key, W); toast('근무자 명부를 저장했습니다'); };
  };
  draw();
}
function eduList(s, host) {
  const K = siteKpi(s.key, periodRange('h', today()));
  const list = Object.values(SH.edu).filter(e => e.site === s.key || !e.site).sort((a, b) => a.d < b.d ? 1 : -1);
  host.innerHTML = `<div class="two"><div class="card" style="--c:#2F6FD0"><h2>🎓 교육 이력 <span class="r">이번 반기 이수율 ${pct(K.edu)}</span></h2><div class="body">
    <div class="row" style="margin-bottom:8px">${Object.entries(EDU).map(([k, v]) => `<button class="btn sm" data-ne="${k}">＋ ${esc(v.n)}</button>`).join('')}</div>
    ${list.length ? `<div class="tblw"><table class="t" style="min-width:0"><thead><tr><th>일자</th><th>종류</th><th>제목</th><th>시간</th><th>이수</th><th></th></tr></thead><tbody>${list.slice(0, 60).map(e => `<tr><td class="c">${fmtDs(e.d)}</td><td>${esc((EDU[e.type] || {}).n || e.type)}${e.site ? '' : ' <span class="tag" style="--c:#7A2E8E">전사</span>'}</td><td>${esc(e.title || '')}<br><span class="mini">${esc(e.inst || '')} · ${esc(e.method || '')}</span></td><td class="c">${nf(e.h, 1)}h</td><td class="c">${(e.att || []).length}명</td><td><button class="btn sm" data-ee="${e.id}">열기</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">교육 기록이 없습니다</div>'}
  </div></div>
  <div class="card" style="--c:#E8750A"><h2>⚠ 미이수자 알림 <span class="r">${K.eduMiss.length}명</span></h2><div class="body">
    ${K.eduMiss.length ? `<ul class="hl">${K.eduMiss.map(m => `<li style="background:#FFF4D6">${esc(m.w.name)} — ${esc(m.t)}</li>`).join('')}</ul>` : '<div class="empty">✔ 미이수자가 없습니다</div>'}
    <div class="tblw" style="margin-top:10px"><table class="t" style="min-width:0"><thead><tr><th>교육 종류</th><th>법정 기준(기본값)</th></tr></thead><tbody>${Object.values(EDU).map(v => `<tr><td><b>${esc(v.n)}</b></td><td class="mini">${esc(v.d)}</td></tr>`).join('')}</tbody></table></div>
  </div></div></div>`;
  host.querySelectorAll('[data-ne]').forEach(b => b.onclick = () => openEduForm(s, { type: b.dataset.ne }));
  host.querySelectorAll('[data-ee]').forEach(b => b.onclick = () => openEduForm(s, SH.edu[b.dataset.ee]));
}
function openEduForm(s, o) {
  const e = o.id ? JSON.parse(JSON.stringify(o)) : { site: s.key, type: o.type, d: today(), h: EDU[o.type].h, title: EDU[o.type].n, inst: whoAmI(), method: '집체(현장)', att: [], photos: [] };
  e.att = e.att || []; e.photos = e.photos || [];
  openModal(`<h2>🎓 ${esc((EDU[e.type] || {}).n || '교육')} 기록</h2><div class="sub">${esc((EDU[e.type] || {}).d || '')}</div>
    <div class="grid2"><div class="field"><label>교육일</label><input type="date" id="dD" value="${esc(e.d)}"></div><div class="field"><label>교육 시간(시간)</label><input type="number" id="dH" min="0" step=".5" value="${esc(e.h)}"></div></div>
    <div class="field"><label>교육 제목 · 내용</label><input id="dT" value="${esc(e.title || '')}"></div>
    <div class="grid2"><div class="field"><label>강사</label><input id="dI" value="${esc(e.inst || '')}"></div><div class="field"><label>방법</label><select id="dM">${['집체(현장)', '집체(본사)', '인터넷 원격', '비대면 실시간', '현장 실습·훈련'].map(x => `<option ${x === e.method ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <label class="row" style="font-size:12.5px;margin-bottom:8px"><input type="checkbox" id="dAll" ${e.site ? '' : 'checked'}> 전사 공통 교육(모든 사업장에 반영)</label>
    <div class="field"><label>이수자 (누르면 선택) <button type="button" class="btn sm" id="dSelAll">모두 선택</button></label>${workerPick(s.key, e.att, e.d)}</div>
    <div class="field"><label>교육 사진</label><div id="dPhW">${photosHtml(e.photos, 'dPh', 2)}</div></div>
    <div class="mrow">${o.id ? '<button class="btn warn" id="dDel">삭제</button>' : ''}<button class="btn" id="mClose">취소</button><button class="btn pri" id="dOk">저장</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal; bindWorkerPick(md, e.att);
    md.querySelector('#dSelAll').onclick = () => { workers(s.key, e.d).forEach(w => { if (!e.att.includes(w.id)) e.att.push(w.id); }); md.querySelectorAll('[data-wk]').forEach(b => b.setAttribute('aria-pressed', 'true')); };
    const redraw = () => { md.querySelector('#dPhW').innerHTML = photosHtml(e.photos, 'dPh', 2); bindPhotos(md, 'dPh', e.photos, 2, redraw); }; bindPhotos(md, 'dPh', e.photos, 2, redraw);
    const del = md.querySelector('#dDel'); if (del) del.onclick = () => { if (confirmBox('삭제할까요?')) { delRec('edu', e.id); closeModal(); RENDER.edu(); } };
    md.querySelector('#dOk').onclick = () => { Object.assign(e, { d: md.querySelector('#dD').value, h: +md.querySelector('#dH').value || 0, title: md.querySelector('#dT').value.trim(), inst: md.querySelector('#dI').value.trim(), method: md.querySelector('#dM').value, site: md.querySelector('#dAll').checked ? '' : s.key }); if (!e.att.length && !confirmBox('이수자가 없습니다. 그대로 저장할까요?')) return; putRec('edu', e); closeModal(); renderHeroStats(); RENDER.edu(); toast('교육을 기록했습니다'); };
  }, true);
}
function eduPpe(s, host) {
  const W = workers(s.key, today()), items = Object.entries(PPE).filter(([, p]) => p.jobs.some(j => s.jobs.includes(j)));
  const last = {}; Object.values(SH.ppe).filter(p => p.site === s.key).forEach(p => { const k = p.wid + '|' + p.item; if (!last[k] || last[k].d < p.d) last[k] = p; });
  const hist = Object.values(SH.ppe).filter(p => p.site === s.key).sort((a, b) => a.d < b.d ? 1 : -1);
  host.innerHTML = `<div class="card" style="--c:#E8750A"><h2>🦺 보호구 지급 현황 — ${esc(s.name)} <span class="r">칸 = 마지막 지급일 · 빨강 교체 지남 · 노랑 30일 내</span></h2><div class="body">
    ${W.length ? `<div class="tblw"><table class="t"><thead><tr><th>근무자</th>${items.map(([, p]) => `<th>${esc(p.n)}<br><span class="mini">${p.m ? p.m + '개월' : '소모품'}</span></th>`).join('')}</tr></thead><tbody>
    ${W.map(w => `<tr><td><b>${esc(w.name)}</b><br><span class="mini">${JOBS[w.job] ? JOBS[w.job].s : ''}</span></td>${items.map(([k, p]) => { if (w.job && !p.jobs.includes(w.job)) return '<td class="c mini">-</td>'; const l = last[w.id + '|' + k]; const st = l && l.next ? (l.next < today() ? '#FFE1DC' : dayDiff(today(), l.next) <= 30 ? '#FFF4D6' : '') : ''; return `<td class="c" style="${st ? 'background:' + st : ''}">${l ? fmtDs(l.d).slice(2) + (l.sig ? ' ✍' : '') : '<span class="mini">미지급</span>'}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">근무자 명부를 먼저 등록하세요</div>'}
    <div class="row" style="margin-top:8px"><button class="btn pri" id="pNew">＋ 보호구 지급 기록(수령 서명)</button></div>
  </div></div>
  <div class="card" style="--c:#9AA3B2"><h2>🗂 지급 이력 <span class="r">${hist.length}건</span></h2><div class="body">${hist.length ? `<div class="tblw"><table class="t" style="min-width:0"><thead><tr><th>지급일</th><th>근무자</th><th>품목</th><th>수량</th><th>교체 예정</th><th>서명</th></tr></thead><tbody>${hist.slice(0, 80).map(p => `<tr><td class="c">${fmtDs(p.d)}</td><td>${esc(workerName(s.key, p.wid))}</td><td>${esc((PPE[p.item] || {}).n || p.item)}</td><td class="c">${nf(p.qty)}</td><td class="c">${p.next ? fmtDs(p.next) : '-'}</td><td class="c">${p.sig ? `<img class="sigimg" src="${sigToPng(p.sig)}" alt="서명">` : '-'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">지급 기록이 없습니다</div>'}</div></div>`;
  const nb = $('#pNew'); if (nb) nb.onclick = () => {
    const sel = []; let sig = '';
    openModal(`<h2>🦺 보호구 지급 기록</h2><div class="sub">고른 근무자 모두에게 같은 품목을 지급한 것으로 기록합니다 · 수령 서명은 대표 1명 또는 각자</div>
      <div class="grid2"><div class="field"><label>품목</label><select id="qI">${items.map(([k, p]) => `<option value="${k}">${esc(p.n)}${p.m ? ' (' + p.m + '개월)' : ''}</option>`).join('')}</select></div><div class="field"><label>지급일</label><input type="date" id="qD" value="${today()}"></div></div>
      <div class="grid2"><div class="field"><label>수량(1인당)</label><input type="number" id="qQ" min="1" value="1"></div><div class="field"><label>지급자</label><input id="qB" value="${esc(whoAmI())}"></div></div>
      <div class="field"><label>받은 근무자</label>${workerPick(s.key, sel, today())}</div>
      <div class="field"><label>수령 서명</label><div id="qSig"></div></div>
      <div class="mrow"><button class="btn" id="mClose">취소</button><button class="btn pri" id="qOk">지급 저장</button></div>`, md => {
      md.querySelector('#mClose').onclick = closeModal; bindWorkerPick(md, sel); sigPad(md.querySelector('#qSig'), '', p => sig = p);
      md.querySelector('#qOk').onclick = () => {
        if (!sel.length) return toast('받은 근무자를 고르세요');
        const it = md.querySelector('#qI').value, d = md.querySelector('#qD').value, m = PPE[it].m;
        sel.forEach(wid => putRec('ppe', { site: s.key, wid, item: it, d, qty: +md.querySelector('#qQ').value || 1, by: md.querySelector('#qB').value.trim(), next: m ? addMonths(d, m) : '', sig }));
        closeModal(); renderHeroStats(); RENDER.edu(); toast(`${sel.length}명 지급을 기록했습니다`);
      };
    }, true);
  };
}

/* =====================================================================
 * 🤝 도급인(고객사) 협의 · 합동점검 · 순회점검
 * ===================================================================== */
RENDER.co = function renderCo() {
  const host = $('#p-co'), s = curSite();
  if (!s) { host.innerHTML = siteBarHtml() + needSite('도급인(고객사)과의 협의체 · 합동점검 기록은 사업장별로 남깁니다.'); bindSiteBar(host, RENDER.co); return; }
  const list = Object.values(SH.co).filter(c => c.site === s.key).sort((a, b) => a.d < b.d ? 1 : -1);
  const y = today().slice(0, 4), cl = s.client || {};
  const months = new Set(list.filter(c => c.type === 'council' && c.d.startsWith(y)).map(c => c.d.slice(5, 7)));
  const qs = new Set(list.filter(c => c.type === 'joint' && c.d.startsWith(y)).map(c => Math.floor((+c.d.slice(5, 7) - 1) / 3) + 1));
  host.innerHTML = siteBarHtml() + `<div class="two"><div>
    <div class="card" style="--c:#0E7C86"><h2>🤝 ${y}년 도급인 의무 이행 달력 <span class="r">고객사(도급인) ${esc(cl.co || s.name)} · 담당 ${esc(cl.name || '미등록')}</span></h2><div class="body">
      <b style="font-size:12.5px">안전보건 협의체 회의(매월)</b><div class="cal" style="grid-template-columns:repeat(12,1fr)">${Array.from({ length: 12 }, (_, i) => `<button class="${months.has(pad(i + 1)) ? 'has' : ''}">${i + 1}월</button>`).join('')}</div>
      <b style="font-size:12.5px;display:block;margin-top:10px">합동 안전보건점검(분기)</b><div class="cal" style="grid-template-columns:repeat(4,1fr)">${[1, 2, 3, 4].map(q => `<button class="${qs.has(q) ? 'has' : ''}">${q}분기</button>`).join('')}</div>
      <p class="hint">협의체는 도급인과 수급인 전원으로 구성해 매월 1회 이상 회의하고 결과를 기록·보존합니다(시행규칙 제79조). 합동점검은 도급인·수급인·각 근로자 1명으로 점검반을 구성합니다(제82조). 이 기록이 고객사가 중대재해처벌법 제5조 의무를 이행했다는 증빙이 됩니다.</p>
      <div class="qbtn">${Object.entries(CO_K).map(([k, c]) => `<button type="button" style="--c:#0E7C86" data-nc="${k}">＋ ${esc(c.n)}<small>${esc(c.cyc)}</small></button>`).join('')}</div>
      ${cl.name ? '' : '<p class="hint">고객사 안전보건 담당자는 「⚙ 사업장·설정」에서 넣습니다.</p>'}
    </div></div></div>
    <div class="card" style="--c:#1B7A34"><h2>🗂 협의 · 점검 기록 <span class="r">${list.length}건</span></h2><div class="body"><div class="evlist">${list.map(c => `<div class="ev" style="--c:#0E7C86"><div class="h"><span class="pill" style="--c:#0E7C86">${esc((CO_K[c.type] || {}).n || c.type)}</span><b>${esc(c.title || '')}</b><small>${fmtDs(c.d)} · 고객사 ${esc(c.client || '-')} · 당사 ${esc(c.our || '-')}</small><span class="x">${c.sigC ? '✍ 고객사' : ''} ${c.sigO ? '✍ 당사' : ''}</span></div>
      <p>${(c.items || []).map(x => `• ${esc(x.t)}${x.res ? ' → ' + esc(x.res) : ''}`).join('<br>')}</p>${(c.acts || []).length ? `<p class="mini">후속 조치: ${(c.acts || []).map(a => `${esc(a.t)}(${esc(a.owner || '-')}, ${a.doneD ? '완료' : a.due ? fmtDs(a.due) : '-'})`).join(' / ')}</p>` : ''}
      <div class="row" style="margin-top:6px"><button class="btn sm" data-co="${c.id}">열기·고치기</button><button class="btn sm" data-cop="${c.id}">🖨 PDF</button></div></div>`).join('') || '<div class="empty">기록이 없습니다</div>'}</div></div></div></div>`;
  bindSiteBar(host, RENDER.co);
  host.querySelectorAll('[data-nc]').forEach(b => b.onclick = () => openCoForm(s, { type: b.dataset.nc }));
  host.querySelectorAll('[data-co]').forEach(b => b.onclick = () => openCoForm(s, SH.co[b.dataset.co]));
  host.querySelectorAll('[data-cop]').forEach(b => b.onclick = () => outCo(SH.co[b.dataset.cop], 'pdf'));
};
function openCoForm(s, o) {
  const cl = s.client || {}, k = o.type;
  const defItems = { council: ['당월 작업 일정 · 혼재 작업 공유', '위험성평가 결과 · 감소대책 공유', '아차사고 · 종사자 의견 공유', '비상연락 · 대피 체계 확인'], joint: ['순찰로 · 작업 구역 위험요인 합동 확인', '소방 · 전기 설비(감지기 · CCTV 사각지대)', '보호구 착용 · 휴게시설', '지난 점검 지적사항 개선 확인'], patrol: ['작업 구역 순회 — 위험요인 확인', '근로자 의견 청취'], consult: ['협의 · 요청 사항'] }[k] || [];
  const e = o.id ? JSON.parse(JSON.stringify(o)) : { site: s.key, type: k, d: today(), title: `${s.name} ${CO_K[k].n}`, client: [cl.name, cl.pos].filter(Boolean).join(' '), our: whoAmI(), items: defItems.map(t => ({ t, res: '' })), acts: [], photos: [], sigC: '', sigO: '' };
  let sigC = e.sigC, sigO = e.sigO;
  openModal(`<h2>🤝 ${esc(CO_K[k].n)}</h2><div class="sub">${esc(CO_K[k].law)} · ${esc(CO_K[k].cyc)}</div>
    <div class="grid2"><div class="field"><label>일자</label><input type="date" id="kD" value="${esc(e.d)}"></div><div class="field"><label>제목</label><input id="kT" value="${esc(e.title)}"></div></div>
    <div class="grid2"><div class="field"><label>고객사(도급인) 참석자</label><input id="kC" value="${esc(e.client || '')}"></div><div class="field"><label>당사(수급인) 참석자</label><input id="kO" value="${esc(e.our || '')}"></div></div>
    <div class="field"><label>안건 · 점검 항목 → 결과</label><div id="kItems">${e.items.map((x, i) => `<div class="row" style="margin-bottom:4px"><input data-it="${i}" value="${esc(x.t)}" style="flex:1"><input data-ir="${i}" value="${esc(x.res || '')}" placeholder="결과 · 결정" style="flex:1"></div>`).join('')}</div><button type="button" class="btn sm" id="kAddI">＋ 안건</button></div>
    <div class="field"><label>후속 조치(담당 · 기한) — 「조치 필요」 목록으로 추적</label><div id="kActs">${e.acts.map((a, i) => `<div class="row" style="margin-bottom:4px"><input data-at="${i}" value="${esc(a.t)}" style="flex:2"><input data-ao="${i}" value="${esc(a.owner || '')}" placeholder="담당" style="flex:1"><input type="date" data-ad="${i}" value="${esc(a.due || '')}" style="flex:1"></div>`).join('')}</div><button type="button" class="btn sm" id="kAddA">＋ 후속 조치</button></div>
    <div class="grid2"><div class="field"><label>고객사 담당 서명</label><div id="kSC"></div></div><div class="field"><label>당사 책임자 서명</label><div id="kSO"></div></div></div>
    <div class="field"><label>사진</label><div id="kPhW">${photosHtml(e.photos, 'kPh', 3)}</div></div>
    <div class="mrow">${o.id ? '<button class="btn warn" id="kDel">삭제</button>' : ''}<button class="btn" id="mClose">취소</button><button class="btn pri" id="kOk">저장</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal;
    sigPad(md.querySelector('#kSC'), sigC, p => sigC = p); sigPad(md.querySelector('#kSO'), sigO, p => sigO = p);
    const collect = () => { e.items = [...md.querySelectorAll('[data-it]')].map(i => ({ t: i.value.trim(), res: md.querySelector(`[data-ir="${i.dataset.it}"]`).value.trim() })).filter(x => x.t); e.acts = [...md.querySelectorAll('[data-at]')].map(i => Object.assign({}, e.acts[+i.dataset.at] || {}, { t: i.value.trim(), owner: md.querySelector(`[data-ao="${i.dataset.at}"]`).value.trim(), due: md.querySelector(`[data-ad="${i.dataset.at}"]`).value })).filter(x => x.t); };
    md.querySelector('#kAddI').onclick = () => { md.querySelector('#kItems').insertAdjacentHTML('beforeend', `<div class="row" style="margin-bottom:4px"><input data-it="${md.querySelectorAll('[data-it]').length}" style="flex:1"><input data-ir="${md.querySelectorAll('[data-it]').length}" placeholder="결과 · 결정" style="flex:1"></div>`); };
    md.querySelector('#kAddA').onclick = () => { const n = md.querySelectorAll('[data-at]').length; md.querySelector('#kActs').insertAdjacentHTML('beforeend', `<div class="row" style="margin-bottom:4px"><input data-at="${n}" style="flex:2" placeholder="예: 흡연부스 이전 · 감지기 연동"><input data-ao="${n}" placeholder="담당" style="flex:1"><input type="date" data-ad="${n}" value="${isoD(addDays(kstNow(), 14))}" style="flex:1"></div>`); };
    const redraw = () => { md.querySelector('#kPhW').innerHTML = photosHtml(e.photos, 'kPh', 3); bindPhotos(md, 'kPh', e.photos, 3, redraw); }; bindPhotos(md, 'kPh', e.photos, 3, redraw);
    const del = md.querySelector('#kDel'); if (del) del.onclick = () => { if (confirmBox('삭제할까요?')) { delRec('co', e.id); closeModal(); RENDER.co(); } };
    md.querySelector('#kOk').onclick = () => { collect(); Object.assign(e, { d: md.querySelector('#kD').value, title: md.querySelector('#kT').value.trim(), client: md.querySelector('#kC').value.trim(), our: md.querySelector('#kO').value.trim(), sigC, sigO }); putRec('co', e); closeModal(); renderHeroStats(); RENDER.co(); toast('저장했습니다'); };
  }, true);
}

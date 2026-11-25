/* =====================================================================
 * 출력물 — 위험성평가표 · TBM 일지 · 안전점검표 · 사고 경위서 · 도급인 협의록
 *          월간 안전보건 활동보고서(Word·PDF·PPT) · 고객사 제출용 안전보건 이행 현황(Word·PDF·PPT)
 *          사업주 안전보건 확보의무 이행 증빙(법률 대응) · 전사 안전보건 현황(엑셀)
 *  Word는 에스텍 표준 머리글(「The Best Choice」)·바닥글(쪽번호 · 제작자 서명)을 씁니다.
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const APPROVAL = ['담 당', '소 장', '지사장'];
const nmOf = (n, mask) => mask ? maskName(n) : (n || '');
function siteInfoRows(s, r, extra = []) {
  const cl = (s && s.client) || {};
  return [['사업장', s ? s.name : '-', '소속', s ? siteOrgLabel(s) : '-'], ['업종', s ? s.jobs.map(j => JOBS[j] ? JOBS[j].n : j).join(' · ') : '-', '기간', r ? `${fmtDs(r.from)} ~ ${fmtDs(r.to)}` : '-'], ['고객사(도급인)', cl.co || (s ? s.name : '-'), '고객사 담당', [cl.name, cl.pos].filter(Boolean).join(' ') || '-']].concat(extra);
}
async function outBlocks(blocks, name, kind) {
  busy(true, kind === 'pdf' ? 'PDF 만드는 중…' : 'Word 만드는 중…');
  try {
    if (kind === 'pdf') await download(await blocksToPdf(blocks, name), name + '.pdf');
    else await download(await packDocx(blocksToDocx(blocks), name), name + '.docx');
    toast(kind === 'pdf' ? 'PDF를 만들었습니다' : 'Word 문서를 만들었습니다');
  } catch (e) { console.error(e); toast('만들지 못했습니다: ' + (e.message || e), 4500); }
  finally { busy(false); }
}
async function outSlides(S, name, kind) {
  busy(true, '발표자료 만드는 중…');
  try { if (kind === 'pdf') await download(await slidesToPdf(S, name), name + '.pdf'); else await download(await slidesToPptx(S, name), name + '.pptx'); toast('발표자료를 만들었습니다'); }
  catch (e) { console.error(e); toast('만들지 못했습니다: ' + (e.message || e), 4500); }
  finally { busy(false); }
}
const riskTxt = v => { const L = riskLv(v); return v ? `${v} ${L.n}` : '-'; };

/* ---------- 1) 위험성평가표 ---------- */
function raBlocks(r) {
  const s = SITE[r.site], parts = (r.part || []).map(id => workerName(r.site, id)).concat((r.partTxt || '').split(',').map(x => x.trim()).filter(Boolean));
  const B = [{ k: 'title', t: '위 험 성 평 가 표', approval: APPROVAL, sub: `${RA_KINDS[r.type] || ''} · ${JOBS[r.job] ? JOBS[r.job].n : ''} · 사업장 위험성평가에 관한 지침(고용노동부 고시) 빈도·강도법` },
    { k: 'info', rows: [['사업장', s ? s.name : '-', '소속', s ? siteOrgLabel(s) : '-'], ['업종', JOBS[r.job] ? JOBS[r.job].n : '-', '평가 제목', r.title || '-'], ['평가 종류', RA_KINDS[r.type] || '-', '평가일', fmtD(r.d)], ['평가 실시자', r.by || '-', '참여 근로자', parts.join(', ') || '-'], ['참여 방법', r.how || '-', '상태', r.st === 'done' ? '확정(근로자 공유)' : '작성 중'], ['고객사(도급인)', ((s && s.client) || {}).co || (s ? s.name : '-'), '고객사 담당', [((s && s.client) || {}).name, ((s && s.client) || {}).pos].filter(Boolean).join(' ') || '-']] },
    { k: 'h', t: '1. 위험성 추정 · 결정 기준' },
    { k: 'table', head: ['위험성(가능성×중대성)', '등급', '조치 기준'], rows: [['1 ~ 4', '낮음', riskLv(4).act], ['5 ~ 8', '보통', riskLv(8).act], ['9 ~ 12', '높음', riskLv(12).act], ['15 ~ 20', '매우 높음', riskLv(20).act]], w: [1.3, .8, 3.6], align: ['c', 'c', ''] },
    { k: 'p', t: `가능성(빈도) 1 거의 없음 · 2 낮음 · 3 보통 · 4 높음 · 5 매우 높음  /  중대성(강도) 1 경미 · 2 경상(휴업 3일 미만) · 3 중상(휴업 3일 이상) · 4 사망·영구장해`, size: 16, color: C.gray },
    { k: 'h', t: `2. 유해·위험요인 파악 및 감소대책 (${(r.items || []).length}개)` },
    { k: 'table', head: ['No', '작업 · 유해·위험요인', '재해형태', '현재 안전조치', '위험성', '감소대책', '개선 후', '담당 · 기한', '완료'], w: [.35, 2.2, .8, 1.3, .8, 2.2, .7, 1.1, .7], align: ['c', '', 'c', '', 'c', '', 'c', 'c', 'c'], size: 15,
      rows: (r.items || []).map((it, i) => [i + 1, `${it.task}\n${it.hz}`, it.type, it.cur || '-', `${it.p}×${it.s}=${riskTxt(riskOf(it))}`, it.ctrl || '-', riskTxt(risk2Of(it)), `${it.owner || '-'}\n${it.due ? fmtDs(it.due) : '-'}`, it.doneD ? fmtDs(it.doneD).slice(2) : '진행']) },
    { k: 'h', t: '3. 근로자 공유 확인' },
    { k: 'p', t: '위 위험성평가 결과(유해·위험요인과 감소대책)를 TBM · 교육으로 공유받았음을 확인합니다.' },
    { k: 'table', head: ['No', '성명', '서명', 'No', '성명', '서명'], w: [.4, 1.4, 1.6, .4, 1.4, 1.6], align: ['c', 'c', 'c', 'c', 'c', 'c'], rows: Array.from({ length: Math.max(3, Math.ceil(parts.length / 2)) }, (_, i) => [i * 2 + 1, parts[i * 2] || '', '', i * 2 + 2, parts[i * 2 + 1] || '', '']) }];
  if (r.ref && SH.ev[r.ref]) B.splice(3, 0, { k: 'box', title: '사고 연계 수시평가', items: [`${fmtDs(SH.ev[r.ref].d)} ${SH.ev[r.ref].title} — ${SH.ev[r.ref].desc || ''}`] });
  B.push({ k: 'p', t: `작성: ${APP.ko} ${APP.version} · ${fmtDs(kstNow())}${r.hash ? ' · 원본 해시 ' + r.hash.slice(0, 16) : ''}`, size: 15, color: C.gray });
  return B;
}
function outRa(r, kind) { const s = SITE[r.site]; return outBlocks(raBlocks(r), `${fileStamp()}_${safeName(s ? s.name : '')}_${(RA_KINDS[r.type] || '').replace(/\(.*\)/, '')}_위험성평가표`, kind); }
async function outRaXlsx(r) {
  const s = SITE[r.site], wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('위험성평가표');
  const head = ['No', '작업(공정)', '유해·위험요인', '재해형태', '현재 안전조치', '가능성', '중대성', '위험성', '등급', '감소대책', '개선 후 가능성', '개선 후 중대성', '개선 후 위험성', '담당', '완료 예정', '완료일'];
  xlTitle(ws, `위험성평가표 — ${s ? s.name : ''}`, `${RA_KINDS[r.type] || ''} · ${JOBS[r.job] ? JOBS[r.job].n : ''} · 평가일 ${fmtDs(r.d)} · 실시자 ${r.by || '-'} · ${APP.ko} ${APP.version}`, head.length);
  xlHead(ws, 4, head, XL.navy);
  (r.items || []).forEach((it, i) => { const row = xlRow(ws, 5 + i, [i + 1, it.task, it.hz, it.type, it.cur || '', +it.p, +it.s, riskOf(it), riskLv(riskOf(it)).n, it.ctrl || '', +it.p2 || '', +it.s2 || '', risk2Of(it) || '', it.owner || '', it.due || '', it.doneD || ''], { center: [0, 3, 8, 14, 15] }); const L = riskLv(riskOf(it)); row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + L.bg.slice(1) } }; });
  [5, 14, 26, 11, 22, 7, 7, 7, 8, 30, 8, 8, 8, 10, 12, 12].forEach((w, i) => ws.getColumn(i + 1).width = w);
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  await xlSave(wb, `${fileStamp()}_${safeName(s ? s.name : '')}_위험성평가표.xlsx`);
}

/* ---------- 2) TBM 일지 ---------- */
function tbmBlocks(t, first) {
  const s = SITE[t.site];
  const B = [];
  if (!first) B.push({ k: 'pb' });
  B.push({ k: 'title', t: 'T B M  일 지', approval: ['반 장', '소 장'], sub: '작업 전 안전점검 회의(Tool Box Meeting) — 오늘의 위험요인 공유 · 안전수칙 확인 · 건강상태 확인' },
    { k: 'info', rows: [['사업장', s ? s.name : '-', '업종', JOBS[t.job] ? JOBS[t.job].n : '-'], ['일시', `${fmtD(t.d)} ${t.time || ''}`, '진행자', t.leader || '-'], ['작업 내용', t.work || '-', '계절 위험', t.season || '-']] },
    { k: 'h', t: '1. 오늘의 위험요인과 대책' },
    { k: 'table', head: ['No', '위험요인 → 대책'], w: [.4, 6], align: ['c', ''], rows: (t.hz || []).map((x, i) => [i + 1, x]) },
    { k: 'h', t: '2. 안전수칙 복창' }, { k: 'bullets', items: (t.rules || []).length ? t.rules : ['-'] },
    { k: 'h', t: `3. 참석자 확인 (${(t.att || []).length}명)` },
    { k: 'table', head: ['No', '성명', '건강상태', '서명', 'No', '성명', '건강상태', '서명'], w: [.35, 1, 1, 1.15, .35, 1, 1, 1.15], align: ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
      rows: Array.from({ length: Math.max(2, Math.ceil((t.att || []).length / 2)) }, (_, i) => { const a = (t.att || [])[i * 2], b = (t.att || [])[i * 2 + 1]; const cell = x => x && x.sig ? { img: sigToPng(x.sig), w: 96, h: 36 } : ''; return [i * 2 + 1, a ? a.name : '', a ? a.health || '' : '', cell(a), i * 2 + 2, b ? b.name : '', b ? b.health || '' : '', cell(b)]; }) });
  if (t.voice) B.push({ k: 'h', t: '4. 근로자 의견' }, { k: 'p', t: t.voice });
  (t.photos || []).forEach((p, i) => B.push({ k: 'img', src: p, wIn: 3.6, ratio: .75, caption: `현장 사진 ${i + 1}` }));
  B.push({ k: 'p', t: `기록: ${t.at ? t.at.slice(0, 16).replace('T', ' ') : '-'}${t.hash ? ' · 원본 해시 ' + t.hash.slice(0, 16) : ''} · ${APP.ko}`, size: 15, color: C.gray });
  return B;
}
function outTbm(list, kind, name) {
  if (!list.length) return toast('TBM 기록이 없습니다');
  const s = SITE[list[0].site];
  const B = list.flatMap((t, i) => tbmBlocks(t, i === 0));
  return outBlocks(B, name || `${fileStamp()}_${safeName(s ? s.name : '')}_${list[0].d}_TBM일지`, kind);
}
function outTbmMonth(key, r, kind) {
  const list = Object.values(SH.tbm).filter(t => t.site === key && inR(t.d, r)).sort((a, b) => (a.d + a.job) < (b.d + b.job) ? -1 : 1);
  if (!list.length) return toast('이 기간 TBM 기록이 없습니다');
  const s = SITE[key], K = siteKpi(key, r);
  const B = [{ k: 'title', t: `TBM 일지 (${r.label})`, approval: APPROVAL, sub: `${s.name} · TBM 실시율 ${pct(K.tbm)} (${K.tbmDays}/${K.tbmNeed}일) · 참석 연인원 ${nf(K.tbmAtt)}명` },
    { k: 'table', head: ['일자', '업종', '진행자', '작업 내용', '참석', '주요 위험요인'], w: [.9, .6, .9, 1.8, .5, 3], align: ['c', 'c', 'c', '', 'c', ''], size: 15, rows: list.map(t => [fmtDs(t.d).slice(5), JOBS[t.job] ? JOBS[t.job].s : '', t.leader || '', t.work || '', (t.att || []).length, (t.hz || []).slice(0, 2).map(x => x.split('→')[0].trim()).join(' / ')]) }];
  list.forEach(t => B.push(...tbmBlocks(t, false)));
  return outBlocks(B, `${fileStamp()}_${safeName(s.name)}_${r.from.slice(0, 7)}_TBM일지(월)`, kind);
}

/* ---------- 3) 안전점검표 ---------- */
function chkBlocks(c) {
  const s = SITE[c.site], items = chkItems(c.job).filter(x => c.cyc === 'm' || x[2] === 'w');
  return [{ k: 'title', t: `${JOBS[c.job] ? JOBS[c.job].s : ''} 안전점검표 (${c.cyc === 'm' ? '월간' : '주간'})`, approval: APPROVAL },
    { k: 'info', rows: [['사업장', s ? s.name : '-', '업종', JOBS[c.job] ? JOBS[c.job].n : '-'], ['점검일', fmtD(c.d), '점검자', c.by || '-']] },
    { k: 'table', head: ['No', '점검 항목', '주기', '결과', '불량 내용 · 조치(담당 · 기한 · 완료)'], w: [.4, 3, .5, .7, 2.6], align: ['c', '', 'c', 'c', ''], rows: items.map(([k, n, cy], i) => { const v = (c.res || {})[k], a = (c.act || {})[k] || {}; return [i + 1, n, cy === 'w' ? '주' : '월', v ? CHK_RES[v][0] : '미점검', v === 'ng' ? `${(c.memo || {})[k] || ''}\n담당 ${a.owner || '-'} · 기한 ${a.due ? fmtDs(a.due) : '-'}${a.doneD ? ' · 완료 ' + fmtDs(a.doneD) : ''}` : '']; }) }]
    .concat((c.photos || []).map((p, i) => ({ k: 'img', src: p, wIn: 3.4, ratio: .75, caption: `점검 사진 ${i + 1}` })));
}
function outChk(c, kind) { const s = SITE[c.site]; return outBlocks(chkBlocks(c), `${fileStamp()}_${safeName(s ? s.name : '')}_${c.d}_안전점검표`, kind); }

/* ---------- 4) 사고 경위서 · 조치결과서 ---------- */
function evBlocks(e) {
  const s = SITE[e.site], k = EV_K[e.type] || EV_K.nm, a = e.act || {}, ra = e.raId ? SH.ra[e.raId] : null;
  const B = [{ k: 'title', t: e.type === 'nm' ? '아 차 사 고  보 고 서' : '사고 경위서 · 조치결과서', approval: APPROVAL, sub: `${k.n} · 보고 등급 ${(EV_GRADE[e.grade] || [''])[0]}` },
    { k: 'info', rows: [['사업장', s ? s.name : '-', '소속', s ? siteOrgLabel(s) : '-'], ['발생 일시', `${fmtD(e.d)} ${e.time || ''}`, '장소', e.loc || '-'], ['종류 · 재해형태', `${k.n}${e.acc ? ' · ' + e.acc : ''}`, '관계자 · 부상자', e.injured || '-'], ['예상 휴업', e.lost ? e.lost + '일' : '-', '보고자', e.by || '-']] },
    { k: 'h', t: '1. 발생 경위' }, { k: 'p', t: `${e.title}\n${e.desc || ''}` }];
  (e.photos || []).forEach((p, i) => B.push({ k: 'img', src: p, wIn: 3.6, ratio: .75, caption: `현장 사진 ${i + 1}` }));
  B.push({ k: 'h', t: '2. 조치 계획 및 결과' }, { k: 'table', head: ['구분', '내용'], w: [1.2, 5], rows: [['조치 계획', a.plan || '-'], ['담당 · 기한', `${a.owner || '-'} · ${a.due ? fmtDs(a.due) : '-'}`], ['조치 결과', a.doneD ? `${fmtDs(a.doneD)} — ${a.result || ''}` : '진행 중']] });
  if ((e.supp || []).length) B.push({ k: 'h', t: '3. 보완 이력(원본은 수정하지 않음)' }, { k: 'table', head: ['일시', '작성자', '보완 내용'], w: [1.3, 1, 4], rows: e.supp.map(x => [x.at.slice(0, 16).replace('T', ' '), x.by || '', x.t]) });
  if (ra) B.push({ k: 'h', t: '4. 재발방지 — 수시 위험성평가' }, { k: 'table', head: ['작업 · 유해·위험요인', '위험성', '감소대책', '담당 · 기한', '완료'], w: [2.4, .9, 2.4, 1.2, .7], align: ['', 'c', '', 'c', 'c'], rows: (ra.items || []).map(it => [`${it.task}\n${it.hz}`, riskTxt(riskOf(it)), it.ctrl || '-', `${it.owner || '-'}\n${it.due ? fmtDs(it.due) : '-'}`, it.doneD ? fmtDs(it.doneD).slice(2) : '진행']) });
  const legal = [];
  if (e.serious) legal.push(LEGAL_REPORT.serious); if (e.type !== 'nm' && (e.lost >= 3 || e.serious)) legal.push(LEGAL_REPORT.lost3); legal.push(LEGAL_REPORT.keep);
  B.push({ k: 'box', title: '법정 보고 · 기록 보존 안내', items: legal });
  B.push({ k: 'h', t: '원본 무결성' }, { k: 'table', head: ['항목', '값'], w: [1.3, 5], rows: [['최초 보고', (e.first || '').slice(0, 19).replace('T', ' ')], ['원본 해시(SHA-256)', e.hash || '-'], ['변경 이력', (e.log || []).map(l => `${l.at.slice(0, 16).replace('T', ' ')} ${l.by || ''} ${({ report: '보고', supp: '보완', action: '조치', legal: '법률 연계', link: '평가 연계', edit: '수정', new: '작성' })[l.act] || l.act}`).join('\n')]] });
  return B;
}
function outEv(e, kind) { const s = SITE[e.site]; return outBlocks(evBlocks(e), `${fileStamp()}_${safeName(s ? s.name : '')}_${e.d}_${e.type === 'nm' ? '아차사고보고서' : '사고경위서'}`, kind); }

/* ---------- 5) 도급인 협의록 · 합동점검표 ---------- */
function coBlocks(c) {
  const s = SITE[c.site], K = CO_K[c.type] || {};
  return [{ k: 'title', t: K.n || '도급인 협의', sub: `${K.law || ''} · ${K.cyc || ''}` },
    { k: 'info', rows: [['사업장', s ? s.name : '-', '일자', fmtD(c.d)], ['고객사(도급인) 참석', c.client || '-', '당사(수급인) 참석', c.our || '-']] },
    { k: 'h', t: '1. 안건 · 점검 결과' }, { k: 'table', head: ['No', '안건 · 점검 항목', '결과 · 결정'], w: [.4, 3, 3], align: ['c', '', ''], rows: (c.items || []).map((x, i) => [i + 1, x.t, x.res || '']) },
    { k: 'h', t: '2. 후속 조치' }, { k: 'table', head: ['조치 사항', '담당', '기한', '완료'], w: [3.4, 1, 1, 1], align: ['', 'c', 'c', 'c'], rows: (c.acts || []).length ? c.acts.map(a => [a.t, a.owner || '', a.due ? fmtDs(a.due) : '', a.doneD ? fmtDs(a.doneD) : '진행']) : [['-', '', '', '']] },
    { k: 'h', t: '3. 확인 서명' }, { k: 'table', head: ['고객사(도급인) 담당', '당사(수급인) 책임자'], w: [1, 1], align: ['c', 'c'], rows: [[c.client || '', c.our || ''], [c.sigC ? { img: sigToPng(c.sigC), w: 150, h: 56 } : '', c.sigO ? { img: sigToPng(c.sigO), w: 150, h: 56 } : '']] }]
    .concat((c.photos || []).map((p, i) => ({ k: 'img', src: p, wIn: 3.4, ratio: .75, caption: `사진 ${i + 1}` })));
}
function outCo(c, kind) { const s = SITE[c.site]; return outBlocks(coBlocks(c), `${fileStamp()}_${safeName(s ? s.name : '')}_${c.d}_${safeName((CO_K[c.type] || {}).n)}`, kind); }

/* ---------- 6) 월간 안전보건 활동보고서 · 7) 고객사 제출용 이행 현황 — 공통 자료 ---------- */
function siteData(key, r) {
  const inP = x => x.site === key && inR(x.d, r);
  return { K: siteKpi(key, r), s: SITE[key], r,
    ra: Object.values(SH.ra).filter(x => x.site === key && x.d <= r.to).sort((a, b) => a.d < b.d ? -1 : 1),
    tbm: Object.values(SH.tbm).filter(inP).sort((a, b) => a.d < b.d ? -1 : 1), chk: Object.values(SH.chk).filter(inP).sort((a, b) => a.d < b.d ? -1 : 1),
    ev: Object.values(SH.ev).filter(inP).sort((a, b) => a.d < b.d ? -1 : 1), op: Object.values(SH.op).filter(inP).sort((a, b) => a.d < b.d ? -1 : 1),
    edu: Object.values(SH.edu).filter(e => (e.site === key || !e.site) && inR(e.d, r)).sort((a, b) => a.d < b.d ? -1 : 1), ppe: Object.values(SH.ppe).filter(inP),
    co: Object.values(SH.co).filter(inP).sort((a, b) => a.d < b.d ? -1 : 1), acts: allActions({ site: key }).filter(a => a.d <= r.to) };
}
function kpiRows(K) { return SHI_W.map(([k, n, w]) => [n, `${w}점`, K[k] == null ? '측정 전' : pct(K[k]), K[k] == null ? '-' : nf(K[k] * w / 100, 1)]); }
function kpiChart(K) { return chartPng('bar', { title: '안전보건 이행 영역별 달성률(%)', labels: SHI_W.map(x => x[1].replace(' 실시율', '').replace(' 이행률', '').replace(' 관리', '').replace(' 완료율', '').replace(' 이수율', '')), bars: [{ name: '달성률', data: SHI_W.map(([k]) => K[k] == null ? 0 : K[k]), color: '#1B7A34' }] }, 1100, 380); }
function nextPlan(r) { const m = parseD(r.to).getMonth() + 2 > 12 ? 1 : parseD(r.to).getMonth() + 2; return (TBM_MONTH[m] || []).map(x => `${m}월 TBM 중점: ${x}`); }
function monthlyBlocks(key, r, mask) {
  const D = siteData(key, r), K = D.K, s = D.s, g = shiGrade(K.shi), open = D.acts.filter(a => !a.done);
  const hiItems = D.ra.flatMap(x => (x.items || []).map(it => Object.assign({ ra: x }, it))).filter(it => ['mid', 'high', 'vhigh'].includes(riskLv(riskOf(it)).k));
  const B = [{ k: 'title', t: `${r.label} 안전보건 활동보고서`, approval: APPROVAL, sub: `${s.name} · ${siteOrgLabel(s)} · 중대재해처벌법 · 산업안전보건법 이행 기록` },
    { k: 'info', rows: siteInfoRows(s, r, [['작성자', whoAmI() || '-', '작성일', fmtDs(kstNow())]]) },
    { k: 'h', t: 'Ⅰ. 안전보건 이행 요약' },
    { k: 'box', title: `안전보건 이행지수(SHI) ${K.shi == null ? '-' : nf(K.shi, 1) + '점'} · ${g[0]} ${g[1]}`, items: [
      `TBM ${nf(K.tbmN)}회(실시율 ${pct(K.tbm)} · ${K.tbmDays}/${K.tbmNeed}일) · 참석 연인원 ${nf(K.tbmAtt)}명`,
      `안전점검 ${nf(K.chkN)}회(이행률 ${pct(K.chk)}) · 불량 ${nf(K.chkNg)}건`,
      `위험성평가 ${nf(K.raN)}건 · 감소대책 대상 ${nf(hiItems.length)}개 · 높음 이상 미조치 ${nf(K.raHigh)}개`,
      `아차사고 ${nf(K.nmN)}건 · 사고 ${nf(K.accN)}건 · 종사자 의견 ${nf(K.opN)}건 · 도급인 협의·점검 ${nf(K.coN)}건`,
      `조치 항목 ${nf(K.actN)}건 중 ${nf(K.actDone)}건 완료(${pct(K.act)}) · 기한 지남 ${nf(K.actOver)}건`] },
    { k: 'table', head: ['영역', '배점', '달성률', '반영 점수'], rows: kpiRows(K).concat([{ tot: true, cells: ['종합(측정 영역 가중 평균)', '100점', K.shi == null ? '-' : nf(K.shi, 1) + '점', `${g[0]} ${g[1]}`] }]), w: [2.4, .8, 1, 1], align: ['', 'c', 'r', 'r'] },
    { k: 'img', src: kpiChart(K), wIn: 6.4, ratio: .345 },
    { k: 'h', t: 'Ⅱ. 위험성평가 및 감소대책' },
    hiItems.length ? { k: 'table', head: ['작업 · 유해·위험요인', '위험성', '감소대책', '담당 · 기한', '상태'], w: [2.4, .9, 2.4, 1.2, .8], align: ['', 'c', '', 'c', 'c'], size: 15, rows: hiItems.map(it => [`${it.task}\n${it.hz}`, riskTxt(riskOf(it)), it.ctrl || '-', `${nmOf(it.owner, mask) || '-'}\n${it.due ? fmtDs(it.due) : '-'}`, it.doneD ? '완료 ' + fmtDs(it.doneD).slice(5) : (it.due && it.due < today() ? '기한 지남' : '진행')]) } : { k: 'p', t: '「보통」 이상 위험요인이 없습니다.' },
    { k: 'h', t: 'Ⅲ. TBM 실시 현황' },
    D.tbm.length ? { k: 'table', head: ['일자', '업종', '작업 내용', '참석', '주요 위험요인'], w: [.8, .6, 2, .5, 3], align: ['c', 'c', '', 'c', ''], size: 15, rows: D.tbm.map(t => [fmtDs(t.d).slice(5), JOBS[t.job] ? JOBS[t.job].s : '', t.work || '', (t.att || []).length, (t.hz || []).slice(0, 2).map(x => x.split('→')[0].trim()).join(' / ')]) } : { k: 'p', t: '기록 없음' },
    { k: 'h', t: 'Ⅳ. 안전점검 결과' },
    D.chk.length ? { k: 'table', head: ['일자', '업종', '주기', '양호', '불량', '불량 내용'], w: [.8, .6, .5, .5, .5, 3.6], align: ['c', 'c', 'c', 'c', 'c', ''], size: 15, rows: D.chk.map(c => { const ng = Object.entries(c.res || {}).filter(([, v]) => v === 'ng'); return [fmtDs(c.d).slice(5), JOBS[c.job] ? JOBS[c.job].s : '', c.cyc === 'm' ? '월간' : '주간', Object.values(c.res || {}).filter(v => v === 'ok').length, ng.length, ng.map(([k]) => `${chkName(k)}${(c.memo || {})[k] ? ': ' + c.memo[k] : ''}`).join('\n')]; }) } : { k: 'p', t: '기록 없음' },
    { k: 'h', t: 'Ⅴ. 아차사고 · 사고 및 조치' },
    D.ev.length ? { k: 'table', head: ['일자', '구분', '내용', '조치'], w: [.8, .9, 3, 2.3], align: ['c', 'c', '', ''], size: 15, rows: D.ev.map(e => [fmtDs(e.d).slice(5), (EV_K[e.type] || {}).n, `${e.title}${e.loc ? ' (' + e.loc + ')' : ''}`, (e.act || {}).doneD ? `완료 — ${(e.act || {}).result || ''}` : `${(e.act || {}).plan || '조치 계획 수립'} (기한 ${(e.act || {}).due ? fmtDs(e.act.due).slice(5) : '-'})`]) } : { k: 'p', t: '이 기간 사고 · 아차사고 보고가 없습니다.' },
    { k: 'h', t: 'Ⅵ. 종사자 의견 청취 및 조치' },
    D.op.length ? { k: 'table', head: ['일자', '분류', '의견', '조치 결과'], w: [.8, .9, 3, 2.3], align: ['c', 'c', '', ''], size: 15, rows: D.op.map(o => [fmtDs(o.d).slice(5), OP_CAT[o.cat] || '', o.text, (o.act || {}).doneD ? (o.act.result || '완료') : ((o.act || {}).plan || '검토 중')]) } : { k: 'p', t: '접수된 의견 없음' },
    { k: 'h', t: 'Ⅶ. 안전보건교육 · 보호구 지급' },
    { k: 'table', head: ['일자', '교육 종류', '제목', '시간', '이수'], w: [.8, 1.4, 2.6, .6, .6], align: ['c', '', '', 'c', 'c'], size: 15, rows: D.edu.length ? D.edu.map(e => [fmtDs(e.d).slice(5), (EDU[e.type] || {}).n || '', e.title || '', nf(e.h, 1) + 'h', (e.att || []).length + '명']) : [['-', '기록 없음', '', '', '']] },
    { k: 'p', t: `보호구 지급 ${nf(D.ppe.length)}건 · 교체 기한 지남 ${nf(K.ppeOver)}건 · 30일 내 교체 ${nf(K.ppeSoon)}건 · 교육 미이수 ${nf(K.eduMiss.length)}명${K.eduMiss.length ? ' (' + K.eduMiss.map(m => nmOf(m.w.name, mask)).join(', ') + ')' : ''}` },
    { k: 'h', t: 'Ⅷ. 도급인(고객사) 협의 · 합동점검' },
    D.co.length ? { k: 'table', head: ['일자', '구분', '주요 내용', '후속 조치'], w: [.8, 1.4, 2.6, 2], align: ['c', '', '', ''], size: 15, rows: D.co.map(c => [fmtDs(c.d).slice(5), (CO_K[c.type] || {}).n, (c.items || []).map(x => x.t + (x.res ? ' → ' + x.res : '')).join('\n'), (c.acts || []).map(a => a.t).join('\n') || '-']) } : { k: 'p', t: '기록 없음 — 협의체 회의(매월) · 합동점검(분기)을 고객사와 일정 협의 필요' },
    { k: 'h', t: 'Ⅸ. 미조치 사항 및 차월 계획' },
    open.length ? { k: 'table', head: ['발생', '내용', '담당', '기한', '상태'], w: [.8, 3.6, .9, .8, .8], align: ['c', '', 'c', 'c', 'c'], size: 15, rows: open.slice(0, 25).map(a => [fmtDs(a.d).slice(5), a.title, nmOf(a.owner, mask) || '-', a.due ? fmtDs(a.due).slice(5) : '-', a.over ? '기한 지남' : '진행']) } : { k: 'p', t: '✔ 미조치 사항이 없습니다.' },
    { k: 'bullets', items: nextPlan(r).concat(['정기 위험성평가 · 감소대책 이행 확인', '안전보건 협의체 회의 및 분기 합동점검 일정 협의']) }];
  const ph = D.tbm.concat(D.chk).flatMap(x => (x.photos || []).map(p => ({ p, d: x.d, t: x.kind === 'tbm' ? 'TBM' : '안전점검' }))).slice(0, 4);
  if (ph.length) { B.push({ k: 'h', t: '붙임. 현장 사진' }); ph.forEach(x => B.push({ k: 'img', src: x.p, wIn: 3.2, ratio: .75, caption: `${fmtDs(x.d)} ${x.t}` })); }
  return B;
}
function deckData(key, r, mask, client) {
  const D = siteData(key, r), K = D.K, s = D.s, g = shiGrade(K.shi), S = []; let no = 1;
  const title = client ? '안전보건 확보의무 이행 현황' : '안전보건 활동보고';
  S.push([Rc(0, 0, SLW, SLH, '0C2350'), Im(SLW * .53, .3, SLW * .45, SLH - .6, ASSET.hero, { contain: true }), Rc(.7, 1.3, .14, 1.5, C.green), T(1.0, 1.15, 6.6, .5, `${APP.org} · ${s.name}`, { size: 15, color: 'B9C3EC' }),
    T(1.0, 1.65, 6.0, 1.5, `${r.label}\n${title}`, { size: 27, bold: true, color: 'FFFFFF' }), T(1.0, 3.35, 6.4, .5, `( ${fmtDs(r.from)} ~ ${fmtDs(r.to)} )${client ? ' · 고객사(도급인) 제출용' : ''}`, { size: 14, color: 'D7DEFF' }),
    Im(1.0, 5.5, 1.1, 1.1, ASSET.icon), T(2.25, 5.55, 5, .5, APP.name, { size: 14, bold: true, color: 'FFFFFF' }), T(2.25, 5.95, 5, .5, '「했다」는 기록이 안전보건 확보의무의 증거입니다', { size: 12, color: 'B9C3EC' })]);
  const kp = [['이행지수 SHI', K.shi == null ? '-' : nf(K.shi, 1), `${g[0]} ${g[1]}`, C.navy], ['TBM 실시율', pct(K.tbm), `${K.tbmN}회 · ${K.tbmAtt}명`, '2A44D4'], ['점검 이행률', pct(K.chk), `불량 ${K.chkNg}건`, C.green], ['위험성평가', pct(K.ra), `높음 미조치 ${K.raHigh}`, '7A2E8E'], ['조치 완료율', pct(K.act), `미조치 ${K.actOpen}`, 'C0392B']];
  const s2 = slideBase('1. 안전보건 이행 요약', ++no, s.name);
  kp.forEach((k, i) => { const x = .45 + i * 2.5; s2.push(Rc(x, 1.15, 2.35, 1.35, i ? 'FFFFFF' : k[3], { line: i ? 'DCE3F3' : undefined, r: .12 }), T(x + .15, 1.2, 2.1, .35, k[0], { size: 11, color: i ? C.gray : 'D7DEFF', bold: true }), T(x + .15, 1.5, 2.1, .6, k[1], { size: 24, bold: true, color: i ? k[3] : 'FFFFFF' }), T(x + .15, 2.08, 2.1, .35, k[2], { size: 10.5, color: i ? C.gray : 'D7DEFF' })); });
  s2.push(Im(.45, 2.7, 7.4, 2.6, kpiChart(K)), Tb(8.1, 2.7, 4.8, tblRows(['영역', '배점', '달성률'], kpiRows(K).map(x => x.slice(0, 3)), { align: ['', 'c', 'r'] }), [2.4, .9, 1.5], { size: 10.5 }));
  s2.push(T(.45, 5.5, 12.4, 1.4, `✔ 아차사고 ${K.nmN}건 · 사고 ${K.accN}건 · 종사자 의견 ${K.opN}건 · 교육 ${K.eduN}회 · 도급인 협의·점검 ${K.coN}건\n✔ 미조치 ${K.actOpen}건(기한 지남 ${K.actOver}) · 보호구 교체 지남 ${K.ppeOver}건 · 교육 미이수 ${K.eduMiss.length}명`, { size: 13, color: C.ink, line: 1.4 }));
  S.push(s2);
  if (client) {
    const L = lawStatus(r, { site: key });
    S.push(slideBase('2. 중대재해처벌법 시행령 제4조 · 제5조 대응 현황', ++no, L.half.label).concat([Tb(.45, 1.15, 12.45, tblRows(['조항', '의무', '이행', '증빙 기록'], L.items.map(x => [x.no, x.n, x.ok ? '✔' : '-', x.note])), [1.3, 4.2, .7, 6.25], { size: 10 })]));
  }
  const hi = D.ra.flatMap(x => (x.items || [])).filter(it => ['mid', 'high', 'vhigh'].includes(riskLv(riskOf(it)).k)).slice(0, 9);
  S.push(slideBase(`${client ? 3 : 2}. 위험성평가 · 감소대책`, ++no, s.name).concat(hi.length ? [Tb(.45, 1.15, 12.45, tblRows(['작업 · 유해·위험요인', '위험성', '감소대책', '기한', '상태'], hi.map(it => [`${it.task} — ${it.hz}`, riskTxt(riskOf(it)), it.ctrl || '-', it.due ? fmtDs(it.due).slice(5) : '-', it.doneD ? '완료' : '진행']), { align: ['', 'c', '', 'c', 'c'] }), [4.2, 1.3, 4.6, 1.1, 1.25], { size: 10 })] : [T(.6, 1.3, 12, .6, '「보통」 이상 위험요인이 없습니다.', { size: 14, color: C.gray })]));
  const tb = D.tbm.slice(-8), ck = D.chk.slice(-6);
  S.push(slideBase(`${client ? 4 : 3}. TBM · 안전점검`, ++no, s.name).concat([
    T(.45, 1.05, 6, .4, `■ TBM ${K.tbmN}회 · 실시율 ${pct(K.tbm)}`, { size: 13, bold: true, color: C.greenD }), tb.length ? Tb(.45, 1.45, 6.1, tblRows(['일자', '작업', '참석'], tb.map(t => [fmtDs(t.d).slice(5), t.work || (t.hz || [''])[0].split(':')[0], (t.att || []).length]), { align: ['c', '', 'c'] }), [.9, 4.4, .8], { size: 10 }) : T(.45, 1.5, 6, .5, '기록 없음', { size: 12, color: C.gray }),
    T(6.8, 1.05, 6, .4, `■ 안전점검 ${K.chkN}회 · 이행률 ${pct(K.chk)}`, { size: 13, bold: true, color: C.greenD }), ck.length ? Tb(6.8, 1.45, 6.1, tblRows(['일자', '업종', '양호', '불량'], ck.map(c => [fmtDs(c.d).slice(5), (JOBS[c.job] || {}).s, Object.values(c.res || {}).filter(v => v === 'ok').length, Object.values(c.res || {}).filter(v => v === 'ng').length]), { align: ['c', 'c', 'c', 'c'] }), [1.2, 1.6, 1.6, 1.7], { size: 10 }) : T(6.8, 1.5, 6, .5, '기록 없음', { size: 12, color: C.gray })]));
  const evs = D.ev.slice(-6), ops = D.op.slice(-4);
  S.push(slideBase(`${client ? 5 : 4}. 아차사고 · 사고 · 종사자 의견`, ++no, s.name).concat([
    evs.length ? Tb(.45, 1.15, 12.45, tblRows(['일자', '구분', '내용', '조치'], evs.map(e => [fmtDs(e.d).slice(5), (EV_K[e.type] || {}).n, e.title, (e.act || {}).doneD ? '완료 — ' + ((e.act || {}).result || '') : (e.act || {}).plan || '조치 계획'])), [1, 1.3, 5.6, 4.55], { size: 10 }) : T(.6, 1.3, 12, .5, '✔ 이 기간 사고 · 아차사고 보고가 없습니다.', { size: 14, color: C.greenD, bold: true }),
    T(.45, 4.3, 12, .4, `■ 종사자 의견 ${D.op.length}건`, { size: 13, bold: true, color: C.greenD }), ops.length ? Tb(.45, 4.7, 12.45, tblRows(['일자', '분류', '의견', '조치'], ops.map(o => [fmtDs(o.d).slice(5), OP_CAT[o.cat], o.text, (o.act || {}).doneD ? (o.act.result || '완료') : ((o.act || {}).plan || '검토 중')])), [1, 1.3, 5.6, 4.55], { size: 10 }) : T(.45, 4.75, 12, .4, '접수된 의견 없음', { size: 12, color: C.gray })]));
  S.push(slideBase(`${client ? 6 : 5}. 교육 · 보호구 · 도급인 협의`, ++no, s.name).concat([
    T(.45, 1.05, 6, .4, `■ 안전보건교육 ${D.edu.length}회 · 이수율 ${pct(K.edu)}`, { size: 13, bold: true, color: C.greenD }), D.edu.length ? Tb(.45, 1.45, 6.1, tblRows(['일자', '교육', '시간', '이수'], D.edu.slice(-7).map(e => [fmtDs(e.d).slice(5), (EDU[e.type] || {}).n, nf(e.h, 1) + 'h', (e.att || []).length + '명']), { align: ['c', '', 'c', 'c'] }), [.9, 3.2, 1, 1], { size: 10 }) : T(.45, 1.5, 6, .5, '기록 없음', { size: 12, color: C.gray }),
    T(6.8, 1.05, 6, .4, `■ 도급인 협의 · 합동점검 ${D.co.length}건`, { size: 13, bold: true, color: C.greenD }), D.co.length ? Tb(6.8, 1.45, 6.1, tblRows(['일자', '구분', '주요 결정'], D.co.slice(-6).map(c => [fmtDs(c.d).slice(5), (CO_K[c.type] || {}).n, (c.items || []).filter(x => x.res).map(x => x.res).join(' / ') || '-'])), [.9, 2, 3.2], { size: 10 }) : T(6.8, 1.5, 6, .5, '기록 없음', { size: 12, color: C.gray }),
    T(.45, 5.4, 12.4, 1, `보호구 지급 ${D.ppe.length}건 · 교체 지남 ${K.ppeOver}건 · 30일 내 교체 ${K.ppeSoon}건`, { size: 12.5, color: C.ink })]));
  const open = D.acts.filter(a => !a.done).slice(0, 9);
  S.push(slideBase(`${client ? 7 : 6}. 미조치 사항 · 차월 계획`, ++no, s.name).concat([
    open.length ? Tb(.45, 1.15, 12.45, tblRows(['발생', '내용', '담당', '기한', '상태'], open.map(a => [fmtDs(a.d).slice(5), a.title, nmOf(a.owner, mask) || '-', a.due ? fmtDs(a.due).slice(5) : '-', a.over ? '기한 지남' : '진행'])), [1, 7.3, 1.5, 1.3, 1.35], { size: 10 }) : T(.6, 1.3, 12, .6, '✔ 미조치 사항이 없습니다.', { size: 15, bold: true, color: C.greenD }),
    Rc(.45, 5.2, 12.45, 1.6, 'EEF7F1', { r: .1 }), T(.7, 5.28, 12, 1.5, nextPlan(r).concat(['협의체 회의(매월) · 합동점검(분기) 일정 협의']).map(x => '▶ ' + x).join('\n'), { size: 12.5, color: C.greenD, line: 1.3 })]));
  return S;
}
function outMonthly(key, r, kind) {
  const s = SITE[key]; if (!s) return toast('사업장을 고르세요');
  const nm = `${fileStamp()}_${safeName(s.name)}_${safeName(r.label)}_안전보건활동보고서`;
  if (kind === 'pptx' || kind === 'ppdf') return outSlides(deckData(key, r, false, false), nm + (kind === 'ppdf' ? '_발표' : ''), kind === 'ppdf' ? 'pdf' : 'pptx');
  return outBlocks(monthlyBlocks(key, r, false), nm, kind);
}
function clientBlocks(key, r, mask) {
  const D = siteData(key, r), K = D.K, s = D.s, cl = s.client || {}, L = lawStatus(r, { site: key }), g = shiGrade(K.shi);
  const months = []; for (let m = periodRange('m', r.from); m.from <= r.to && m.from <= today(); m = shiftRange(m, 1)) months.push(m);
  return [{ k: 'title', t: '안전보건 확보의무 이행 현황', sub: `수급인(용역업체) 안전보건 이행 보고 — 중대재해처벌법 제4조 · 제5조, 산업안전보건법 제63조 · 제64조 관련 · 고객사(도급인) 제출용` },
    { k: 'info', rows: [['고객사(도급인)', cl.co || s.name, '고객사 담당', [cl.name, cl.pos].filter(Boolean).join(' ') || '-'], ['수급인', `${siteOrgLabel(s)}`, '사업장', s.name], ['업종 · 인원', `${s.jobs.map(j => JOBS[j] ? JOBS[j].s : j).join('·')} · 근무자 ${K.workers || s.total || '-'}명`, '보고 기간', `${fmtDs(r.from)} ~ ${fmtDs(r.to)}`]] },
    { k: 'h', t: '1. 종합 — 안전보건 이행지수(SHI)' },
    { k: 'box', title: `${K.shi == null ? '-' : nf(K.shi, 1) + '점'} · ${g[0]} ${g[1]}`, items: [`TBM 실시율 ${pct(K.tbm)} · 안전점검 이행률 ${pct(K.chk)} · 위험성평가 관리 ${pct(K.ra)}`, `조치 완료율 ${pct(K.act)} · 교육 이수율 ${pct(K.edu)} · 보호구 관리 ${pct(K.ppe)}`] },
    { k: 'img', src: kpiChart(K), wIn: 6.4, ratio: .345 },
    { k: 'h', t: `2. 중대재해처벌법 시행령 제4조 · 제5조 대응 현황 (${L.half.label})` },
    { k: 'table', head: ['조항', '의무', '이행', '증빙 기록'], w: [1, 2.6, .5, 2.6], align: ['c', '', 'c', ''], size: 15, rows: L.items.map(x => [x.no, x.n, x.ok ? '✔' : '-', x.note]) },
    { k: 'h', t: '3. 월별 안전활동 실적' },
    { k: 'table', head: ['월', 'TBM(회)', 'TBM 실시율', '안전점검(회)', '점검 이행률', '교육(회)', '아차사고', '사고', '조치 완료율'], w: [.7, .7, .9, .8, .9, .7, .7, .6, .9], align: ['c', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'], size: 15, rows: months.map(m => { const k = siteKpi(key, m); return [m.label.replace(/^\d+년 /, ''), k.tbmN, pct(k.tbm), k.chkN, pct(k.chk), k.eduN, k.nmN, k.accN, pct(k.act)]; }) },
    { k: 'h', t: '4. 위험성평가 실시 및 감소대책 이행' },
    { k: 'p', t: `기간 중 위험성평가 ${nf(D.ra.filter(x => inR(x.d, r)).length)}건(누적 ${nf(D.ra.length)}건) · 최근 정기·최초평가 ${K.raLast ? fmtDs(K.raLast) : '-'} · 높음 이상 미조치 ${nf(K.raHigh)}개` },
    { k: 'table', head: ['작업 · 유해·위험요인', '위험성', '감소대책', '상태'], w: [2.6, .9, 2.6, .9], align: ['', 'c', '', 'c'], size: 15, rows: D.ra.flatMap(x => x.items || []).filter(it => ['high', 'vhigh', 'mid'].includes(riskLv(riskOf(it)).k)).slice(0, 15).map(it => [`${it.task}\n${it.hz}`, riskTxt(riskOf(it)), it.ctrl || '-', it.doneD ? '완료' : '진행']) },
    { k: 'h', t: '5. 아차사고 · 사고와 재발방지' },
    D.ev.length ? { k: 'table', head: ['일자', '구분', '내용', '재발방지 조치'], w: [.8, .9, 2.8, 2.5], align: ['c', 'c', '', ''], size: 15, rows: D.ev.map(e => [fmtDs(e.d).slice(5), (EV_K[e.type] || {}).n, e.title, (e.act || {}).doneD ? (e.act.result || '완료') : ((e.act || {}).plan || '조치 계획 수립 중')]) } : { k: 'p', t: '✔ 보고 기간 중 사고 · 아차사고 없음' },
    { k: 'h', t: '6. 도급인 협의체 · 합동점검 · 순회점검 (고객사 의무 이행 기록)' },
    D.co.length ? { k: 'table', head: ['일자', '구분', '주요 내용 · 결과', '서명'], w: [.8, 1.5, 3.4, .8], align: ['c', '', '', 'c'], size: 15, rows: D.co.map(c => [fmtDs(c.d).slice(5), (CO_K[c.type] || {}).n, (c.items || []).map(x => x.t + (x.res ? ' → ' + x.res : '')).join('\n'), [c.sigC ? '고객사' : '', c.sigO ? '당사' : ''].filter(Boolean).join('·') || '-']) } : { k: 'p', t: '기록 없음 — 협의체 회의(매월 1회) · 합동 안전보건점검(분기 1회) 일정을 협의드립니다.' },
    { k: 'h', t: '7. 안전보건교육 · 보호구' },
    { k: 'p', t: `교육 ${nf(D.edu.length)}회(이수율 ${pct(K.edu)}) · 보호구 지급 ${nf(D.ppe.length)}건 · 교체 기한 지남 ${nf(K.ppeOver)}건` },
    { k: 'h', t: '8. 미조치 사항 및 개선 계획' },
    D.acts.filter(a => !a.done).length ? { k: 'table', head: ['내용', '담당', '기한'], w: [4.6, 1, 1], align: ['', 'c', 'c'], size: 15, rows: D.acts.filter(a => !a.done).slice(0, 15).map(a => [a.title, nmOf(a.owner, mask) || '-', a.due ? fmtDs(a.due) : '-']) } : { k: 'p', t: '✔ 미조치 사항 없음' },
    { k: 'box', title: '자료 범위', items: ['이 자료는 수급인의 안전보건 활동 기록 요약입니다. 급여 · 단가 · 내부 대응방안 · 법률 검토 내용은 포함하지 않습니다.', mask ? '근무자 이름은 개인정보 보호를 위해 일부 가렸습니다.' : '근무자 이름을 그대로 표시했습니다.'] },
    { k: 'h', t: '확인' },
    { k: 'table', head: ['수급인 현장 책임자', '수급인 지사(안전 담당)', '고객사(도급인) 확인'], w: [1, 1, 1], align: ['c', 'c', 'c'], rows: [[s.head || '', whoAmI(), cl.name || ''], ['(서명)', '(서명)', '(서명)']] }];
}
function outClient(key, r, kind, mask) {
  const s = SITE[key]; if (!s) return toast('사업장을 고르세요');
  const nm = `${fileStamp()}_${safeName(s.name)}_${safeName(r.label)}_안전보건이행현황_고객사제출`;
  if (kind === 'pptx' || kind === 'ppdf') return outSlides(deckData(key, r, mask, true), nm, kind === 'ppdf' ? 'pdf' : 'pptx');
  return outBlocks(clientBlocks(key, r, mask), nm, kind);
}

/* ---------- 8) 사업주 안전보건 확보의무 이행 증빙(법률 대응) ---------- */
function evidenceBlocks(e) {
  const b = evidenceBundle(e), s = SITE[e.site];
  return [{ k: 'title', t: '사업주 안전보건 확보의무\n이행 증빙자료', sub: `${s ? s.name : ''} · 사건일 ${fmtDs(e.d)} 기준 직전 90일(${fmtDs(b.range.from)} ~ ${fmtDs(b.range.to)}) 기록 · 법률 대응 시스템 연계용` },
    { k: 'info', rows: [['사업장', s ? s.name : '-', '소속', s ? siteOrgLabel(s) : '-'], ['사건', e.title, '종류 · 등급', `${(EV_K[e.type] || {}).n} · ${(EV_GRADE[e.grade] || [''])[0]}`], ['작성', whoAmI() || '-', '작성일', fmtDs(kstNow())]] },
    { k: 'h', t: '1. 증빙 요약' },
    { k: 'table', head: ['의무', '기록', '건수'], w: [2.6, 3, .8], align: ['', '', 'r'], rows: [['유해·위험요인 확인 · 개선(위험성평가)', '최초·정기·수시 위험성평가', b.ra.length], ['작업 전 위험 공유', 'TBM 일지(참석자 서명)', b.tbm.length], ['안전보건교육', '채용 시 · 정기 · 특별 · 비상훈련', b.edu.length], ['관계법령 의무 이행 점검', '업종별 안전점검', b.chk.length], ['보호구 지급', '지급 · 수령 서명', b.ppe.length], ['도급인 협의 · 합동점검', '협의체 · 합동 · 순회점검', b.co.length], ['종사자 의견 청취', '의견 접수 · 조치', b.op.length], ['이전 보고', '아차사고 · 사고', b.prior.length]] },
    { k: 'h', t: '2. 사건 개요' }, { k: 'p', t: `${fmtD(e.d)} ${e.time || ''} · ${e.loc || ''}\n${e.desc || ''}` },
    { k: 'h', t: '3. TBM 실시 기록' }, b.tbm.length ? { k: 'table', head: ['일자', '진행자', '위험요인(요약)', '참석 · 서명'], w: [.8, .9, 3.6, 1], align: ['c', 'c', '', 'c'], size: 15, rows: b.tbm.map(t => [fmtDs(t.d).slice(2), t.leader || '', (t.hz || []).slice(0, 2).join(' / '), `${(t.att || []).length}명 · 서명 ${(t.att || []).filter(a => a.sig).length}`]) } : { k: 'p', t: '기록 없음' },
    { k: 'h', t: '4. 안전보건교육 기록' }, b.edu.length ? { k: 'table', head: ['일자', '종류', '제목', '시간', '이수'], w: [.8, 1.3, 2.6, .6, .6], align: ['c', '', '', 'c', 'c'], size: 15, rows: b.edu.map(x => [fmtDs(x.d).slice(2), (EDU[x.type] || {}).n, x.title || '', nf(x.h, 1) + 'h', (x.att || []).length + '명']) } : { k: 'p', t: '기록 없음' },
    { k: 'h', t: '5. 위험성평가 기록' }, b.ra.length ? { k: 'table', head: ['평가일', '종류', '업종', '위험요인', '감소대책 완료'], w: [.8, 1.2, .8, 2.5, 1], align: ['c', 'c', 'c', '', 'c'], size: 15, rows: b.ra.map(x => [fmtDs(x.d).slice(2), RA_KINDS[x.type] || '', (JOBS[x.job] || {}).s || '', (x.items || []).slice(0, 3).map(it => it.hz).join(' / '), `${(x.items || []).filter(it => it.doneD).length}/${(x.items || []).length}`]) } : { k: 'p', t: '기록 없음' },
    { k: 'h', t: '6. 안전점검 · 보호구 · 도급인 협의' },
    { k: 'p', t: `안전점검 ${b.chk.length}회(불량 ${b.chk.reduce((a, c) => a + Object.values(c.res || {}).filter(v => v === 'ng').length, 0)}건) · 보호구 지급 ${b.ppe.length}건 · 도급인 협의·점검 ${b.co.length}건(${b.co.map(c => fmtDs(c.d).slice(5) + ' ' + ((CO_K[c.type] || {}).n || '')).join(', ') || '-'})` },
    { k: 'box', title: '무결성', items: [`각 기록은 저장 시 SHA-256 해시를 남깁니다. 사건 보고 원본 해시: ${e.hash || '-'}`, '사건 보고 원본은 수정할 수 없고 보완은 이력으로만 덧붙습니다.'] }];
}
function outEvidence(e, kind) { const s = SITE[e.site]; return outBlocks(evidenceBlocks(e), `${fileStamp()}_${safeName(s ? s.name : '')}_${e.d}_안전보건확보의무_이행증빙`, kind); }

/* ---------- 9) 전사 안전보건 현황(엑셀) ---------- */
async function outGroupXlsx(r, F) {
  const G = groupKpi(r, F); if (!G.n) return toast('기록을 시작한 사업장이 없습니다');
  busy(true, '엑셀 만드는 중…');
  try {
    const wb = new ExcelJS.Workbook();
    const w1 = wb.addWorksheet('사업장별 이행률'), h1 = ['No', '사업장', '소속', '업종', '근무자', 'SHI', '등급', 'TBM 실시율', 'TBM(회)', '점검 이행률', '점검(회)', '불량', '위험성평가', '높음 미조치', '조치 완료율', '미조치', '기한 지남', '교육 이수율', '미이수', '보호구 관리', '아차사고', '사고', '의견', '도급인 협의'];
    xlTitle(w1, `에스텍 그룹 안전보건 현황 — ${r.label}`, `${APP.ko} ${APP.version} · ${fmtDs(kstNow())} · 관리 사업장 ${G.n}곳 · 평균 SHI ${G.shi == null ? '-' : nf(G.shi, 1)}`, h1.length); xlHead(w1, 4, h1, XL.navy);
    const r1 = v => v == null ? '' : Math.round(v * 10) / 10;
    G.rows.sort((a, b) => (b.shi ?? -1) - (a.shi ?? -1)).forEach((K, i) => xlRow(w1, 5 + i, [i + 1, K.site.name, siteOrgLabel(K.site), K.site.jobs.map(j => (JOBS[j] || {}).s).join('·'), K.workers, r1(K.shi), shiGrade(K.shi)[0], r1(K.tbm), K.tbmN, r1(K.chk), K.chkN, K.chkNg, r1(K.ra), K.raHigh, r1(K.act), K.actOpen, K.actOver, r1(K.edu), K.eduMiss.length, r1(K.ppe), K.nmN, K.accN, K.opN, K.coN], { center: [0, 6] }));
    [5, 26, 18, 10].concat(Array(20).fill(10)).forEach((w, i) => w1.getColumn(i + 1).width = w); w1.views = [{ state: 'frozen', ySplit: 4, xSplit: 2 }];
    const w2 = wb.addWorksheet('조치 대장'), h2 = ['No', '사업장', '출처', '발생일', '내용', '담당', '기한', '상태', '완료일'];
    xlTitle(w2, '안전보건 조치 대장', '위험성평가 감소대책 · 점검 불량 · 사고·아차사고 · 종사자 의견 · 도급인 협의 후속조치', h2.length); xlHead(w2, 4, h2, XL.navy);
    allActions(F).forEach((a, i) => xlRow(w2, 5 + i, [i + 1, (SITE[a.site] || {}).name || '', ({ ra: '위험성평가', chk: '안전점검', ev: '사고·아차사고', op: '종사자 의견', co: '도급인 협의' })[a.src], a.d, a.title, a.owner || '', a.due || '', a.done ? '완료' : a.over ? '기한 지남' : '진행', a.doneD || ''], { center: [0, 3, 6, 7, 8] }));
    [5, 24, 12, 11, 60, 12, 11, 10, 11].forEach((w, i) => w2.getColumn(i + 1).width = w);
    const w3 = wb.addWorksheet('사고·아차사고 대장'), h3 = ['No', '사업장', '일자', '시각', '종류', '등급', '제목', '장소', '재해형태', '휴업', '조치', '완료일', '원본 해시'];
    xlTitle(w3, '사고 · 아차사고 대장', r.label, h3.length); xlHead(w3, 4, h3, XL.navy);
    Object.values(SH.ev).filter(e => inR(e.d, r) && siteOk(SITE[e.site], F)).sort((a, b) => a.d < b.d ? -1 : 1).forEach((e, i) => xlRow(w3, 5 + i, [i + 1, (SITE[e.site] || {}).name || '', e.d, e.time || '', (EV_K[e.type] || {}).n, e.grade, e.title, e.loc || '', e.acc || '', e.lost || 0, (e.act || {}).result || (e.act || {}).plan || '', (e.act || {}).doneD || '', (e.hash || '').slice(0, 16)], { center: [0, 2, 3, 4, 5] }));
    [5, 22, 11, 7, 10, 6, 40, 18, 12, 6, 36, 11, 18].forEach((w, i) => w3.getColumn(i + 1).width = w);
    const w4 = wb.addWorksheet('교육 이력'), h4 = ['No', '사업장', '일자', '교육 종류', '제목', '시간', '이수 인원', '강사', '방법'];
    xlTitle(w4, '안전보건교육 이력', r.label, h4.length); xlHead(w4, 4, h4, XL.navy);
    Object.values(SH.edu).filter(e => inR(e.d, r) && (!e.site || siteOk(SITE[e.site], F))).sort((a, b) => a.d < b.d ? -1 : 1).forEach((e, i) => xlRow(w4, 5 + i, [i + 1, e.site ? (SITE[e.site] || {}).name : '전사 공통', e.d, (EDU[e.type] || {}).n, e.title || '', +e.h || 0, (e.att || []).length, e.inst || '', e.method || ''], { center: [0, 2] }));
    [5, 22, 11, 18, 36, 7, 9, 12, 14].forEach((w, i) => w4.getColumn(i + 1).width = w);
    const w5 = wb.addWorksheet('보호구 지급 대장'), h5 = ['No', '사업장', '지급일', '근무자', '품목', '수량', '교체 예정', '지급자', '수령 서명'];
    xlTitle(w5, '보호구 지급 대장', r.label, h5.length); xlHead(w5, 4, h5, XL.navy);
    Object.values(SH.ppe).filter(p => inR(p.d, r) && siteOk(SITE[p.site], F)).sort((a, b) => a.d < b.d ? -1 : 1).forEach((p, i) => xlRow(w5, 5 + i, [i + 1, (SITE[p.site] || {}).name || '', p.d, workerName(p.site, p.wid), (PPE[p.item] || {}).n || p.item, +p.qty || 1, p.next || '', p.by || '', p.sig ? '서명' : ''], { center: [0, 2, 6, 8] }));
    [5, 22, 11, 12, 22, 7, 11, 12, 9].forEach((w, i) => w5.getColumn(i + 1).width = w);
    await xlSave(wb, `${fileStamp()}_에스텍그룹_안전보건현황_${safeName(r.label)}.xlsx`);
    toast('엑셀을 만들었습니다');
  } catch (e) { console.error(e); toast('엑셀을 만들지 못했습니다: ' + (e.message || e)); }
  finally { busy(false); }
}

/* =====================================================================
 * 🖨 보고서 출력 화면
 * ===================================================================== */
RENDER.report = function renderReport() {
  const host = $('#p-report'), s = curSite(), per = UI.rper || 'm', r = periodRange(per, UI.rref || today());
  const evs = s ? Object.values(SH.ev).filter(e => e.site === s.key).sort((a, b) => a.d < b.d ? 1 : -1) : [];
  const ras = s ? Object.values(SH.ra).filter(x => x.site === s.key).sort((a, b) => a.d < b.d ? 1 : -1) : [];
  const card = (c, ic, t, d, btns) => `<div class="rcard" style="--c:${c}"><h3>${ic} ${t}</h3><p>${d}</p>${btns}</div>`;
  const bt = (id, txt, c, dis) => `<button class="btn" id="${id}" style="background:${c}" ${dis ? 'disabled' : ''}>${txt}</button>`;
  host.innerHTML = siteBarHtml() + `<div class="filters">
    <label class="per">기간<div class="chips">${[['m', '월간'], ['q', '분기'], ['h', '반기'], ['y', '연간']].map(([k, n]) => `<button class="chip" data-rp="${k}" aria-pressed="${per === k}">${n}</button>`).join('')}</div></label>
    <label class="per">기준<div class="nav"><button class="btn sm" data-rn="-1">◀</button><b style="padding:6px 4px;font-size:13px">${esc(r.label)}</b><button class="btn sm" data-rn="1">▶</button><button class="btn sm" data-rn="0">이번</button></div></label>
    <label class="per">개인정보<label class="row" style="font-size:12.5px;color:var(--ink)"><input type="checkbox" id="rMask" ${UI.mask ? 'checked' : ''}> 고객사 제출본 근무자 이름 가림(김○○)</label></label></div>
  ${s ? '' : '<div class="sbn">사업장을 고르면 사업장 보고서를 만들 수 있습니다. 전사 현황 엑셀은 사업장 없이도 됩니다.</div>'}
  <div class="rgrid">
    ${card('#0B1F8A', '📑', '월간 안전보건 활동보고서', `위험성평가 · TBM · 점검 · 사고·의견 · 교육·보호구 · 도급인 협의 · 미조치·차월계획 — ${esc(r.label)}`, `<div class="row">${bt('oMW', 'Word', '#0B1F8A', !s)}${bt('oMP', 'PDF', '#C0392B', !s)}${bt('oMS', 'PPT', '#E8750A', !s)}</div>`)}
    ${card('#1B7A34', '🤝', '고객사 제출용 안전보건 이행 현황', '도급인(고객사)이 가장 반기는 자료 — SHI · 시행령 4조·5조 대응 · 월별 실적 · 재발방지 · 협의체/합동점검 · 확인 서명란 (내부 대응·법률 검토 제외)', `<div class="row">${bt('oCW', 'Word', '#1B7A34', !s)}${bt('oCP', 'PDF', '#C0392B', !s)}${bt('oCS', 'PPT', '#E8750A', !s)}</div>`)}
    ${card('#7A2E8E', '📋', '위험성평가표', `작업별 유해·위험요인 · 빈도×강도 · 감소대책 · 근로자 공유 확인란<br><select id="oRaSel" style="margin-top:6px">${ras.map(x => `<option value="${x.id}">${fmtDs(x.d)} ${esc(RA_KINDS[x.type] || '')} · ${esc((JOBS[x.job] || {}).s || '')}</option>`).join('') || '<option value="">평가 없음</option>'}</select>`, `<div class="row">${bt('oRW', 'Word', '#7A2E8E', !ras.length)}${bt('oRP', 'PDF', '#C0392B', !ras.length)}${bt('oRX', '엑셀', '#1B7A34', !ras.length)}</div>`)}
    ${card('#2A44D4', '🗣', 'TBM 일지(기간)', `기간 내 TBM 목록 + 날짜별 일지(참석자 서명 · 현장 사진) — ${esc(r.label)}`, `<div class="row">${bt('oTW', 'Word', '#2A44D4', !s)}${bt('oTP', 'PDF', '#C0392B', !s)}</div>`)}
    ${card('#C0392B', '🩹', '사고 경위서 · 조치결과서 / 이행 증빙', `<select id="oEvSel">${evs.map(e => `<option value="${e.id}">${fmtDs(e.d)} ${esc((EV_K[e.type] || {}).n)} · ${esc(e.title)}</option>`).join('') || '<option value="">보고 없음</option>'}</select><br>증빙 = 사건 전 90일 TBM·교육·점검·위험성평가 묶음(법률 대응용)`, `<div class="row">${bt('oEW', '경위서 Word', '#C0392B', !evs.length)}${bt('oEP', 'PDF', '#8A1C34', !evs.length)}${bt('oEE', '이행 증빙', '#1F3A73', !evs.length)}</div>`)}
    ${card('#0E7C86', '📊', '전사 안전보건 현황(엑셀)', `사업장별 이행률 · 조치 대장 · 사고·아차사고 대장 · 교육 이력 · 보호구 지급 대장 — ${esc(r.label)} · 조직·지사 필터는 「📊 안전보건 현황」과 같음`, `<div class="row">${bt('oGX', '엑셀', '#0E7C86')}</div>`)}
  </div>`;
  bindSiteBar(host, RENDER.report);
  host.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { UI.rper = b.dataset.rp; saveUI(); RENDER.report(); });
  host.querySelectorAll('[data-rn]').forEach(b => b.onclick = () => { const n = +b.dataset.rn; UI.rref = n ? shiftRange(r, n).from : today(); saveUI(); RENDER.report(); });
  $('#rMask').onchange = e => { UI.mask = e.target.checked; saveUI(); };
  const on = (id, fn) => { const b = $('#' + id); if (b) b.onclick = fn; };
  if (s) {
    on('oMW', () => outMonthly(s.key, r, 'docx')); on('oMP', () => outMonthly(s.key, r, 'pdf')); on('oMS', () => outMonthly(s.key, r, 'pptx'));
    on('oCW', () => outClient(s.key, r, 'docx', UI.mask)); on('oCP', () => outClient(s.key, r, 'pdf', UI.mask)); on('oCS', () => outClient(s.key, r, 'pptx', UI.mask));
    on('oTW', () => outTbmMonth(s.key, r, 'docx')); on('oTP', () => outTbmMonth(s.key, r, 'pdf'));
  }
  const raSel = () => SH.ra[($('#oRaSel') || {}).value], evSel = () => SH.ev[($('#oEvSel') || {}).value];
  on('oRW', () => raSel() && outRa(raSel(), 'docx')); on('oRP', () => raSel() && outRa(raSel(), 'pdf')); on('oRX', () => raSel() && outRaXlsx(raSel()));
  on('oEW', () => evSel() && outEv(evSel(), 'docx')); on('oEP', () => evSel() && outEv(evSel(), 'pdf')); on('oEE', () => evSel() && outEvidence(evSel(), 'docx'));
  on('oGX', () => outGroupXlsx(r, UI.F || {}));
};

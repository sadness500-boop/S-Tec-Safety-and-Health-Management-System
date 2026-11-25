/* =====================================================================
 * 예시 자료 — 가상 사업장 2곳(「예시 가람공장」 보안·미화 · 「예시 나래빌딩」 미화·주차)
 *  공개 저장소에는 실제 고객사 · 근무자 · 사고 자료를 넣지 않습니다(성과관리 시스템과 같은 방침).
 *  예시 자료는 공유 서버에 올라가지 않고 「⚙ 사업장·설정 › 예시 자료 지우기」로 한 번에 지웁니다.
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
function rnd(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = x * 16807 % 2147483647) / 2147483647; }
function fakeSig(R) { let p = '', x = 20 + R() * 30, y = 50; const n = 3 + Math.floor(R() * 3); for (let k = 0; k < n; k++) { p += `${p ? ' ' : ''}M${Math.round(x)} ${Math.round(y)}`; for (let i = 0; i < 6; i++) { x += 6 + R() * 14; y = 25 + R() * 45; p += ` L${Math.round(x)} ${Math.round(y)}`; } x += 8; } return p; }
const DEMO_NAMES = ['김하늘', '이바다', '박나무', '최구름', '정별빛', '강산들', '윤새벽', '장노을', '임가람', '한마루'];
/* 사업장 한 곳에 지난 days일 치 기록을 만듭니다 — opt: { sample, names, client, fire, workers } */
function genSiteData(key, days, opt = {}) {
  const s = SITE[key]; if (!s) return; const R = rnd(key.split('').reduce((a, c) => a + c.charCodeAt(0), 7) * 97 + days);
  const mark = o => opt.sample ? Object.assign(o, { sample: true }) : o;
  const names = opt.names || DEMO_NAMES; const W = [];
  s.jobs.forEach((j, ji) => { const n = opt.workers ? opt.workers[j] || 0 : (j === 'cln' ? 4 : 3); for (let i = 0; i < n; i++) { const nm = names[(ji * 5 + i) % names.length]; W.push({ id: 'w' + key + j + i, name: nm, job: j, role: i === 0 ? '반장' : '근무자', hired: i === n - 1 ? isoD(addDays(kstNow(), -20)) : '2024-03-01', type: '' }); } });
  SH.wk[key] = W; SH.cfg[key] = Object.assign({}, SH.cfg[key], { on: true, start: isoD(addDays(kstNow(), -days)), client: opt.client || (SH.cfg[key] || {}).client || { co: s.name.replace(/^예시 /, '예시 '), name: '고객사 안전담당', pos: '안전환경팀 과장' } });
  buildSites();
  const td = today(), start = addDays(kstNow(), -days);
  // 위험성평가: 업종별 최초(또는 정기) 1건
  s.jobs.forEach(j => {
    const items = stdHaz(j, s).map((it, i) => Object.assign(it, { owner: s.head || '현장 소장', due: i % 3 === 2 ? isoD(addDays(kstNow(), 5 + i * 2)) : isoD(addDays(start, 20 + i * 3)), doneD: i % 3 === 2 ? '' : isoD(addDays(start, 15 + i * 2)) }));
    SH.ra['ra_d' + key + j] = mark({ id: 'ra_d' + key + j, kind: 'ra', site: key, job: j, type: 'reg', d: isoD(addDays(start, 3)), title: `${s.name} ${JOBS[j].s} 정기 위험성평가`, by: s.head || '현장 소장', part: W.filter(w => w.job === j).map(w => w.id), partTxt: '', how: '작업자 면담 · 현장 순회 · TBM 의견', st: 'done', items, at: new Date().toISOString(), log: [] });
  });
  // TBM · 점검
  for (let i = 0; i <= days; i++) {
    const d = addDays(start, i), ds = isoD(d); if (ds > td) break;
    s.jobs.forEach(j => {
      if (R() < .9 && (tbmEveryDay(s) || d.getDay() % 6)) {
        const att = W.filter(w => w.job === j && (!w.hired || w.hired <= ds)).filter(() => R() > .08).map(w => ({ wid: w.id, name: w.name, health: R() < .95 ? '이상 없음' : '경미한 피로', sig: fakeSig(R) }));
        const hz = (HAZ[j] || []).filter(() => R() < .4).slice(0, 3).map(h => `${h[0]}: ${h[1]} → ${h[6]}`); if (!hz.length) hz.push(`${HAZ[j][0][0]}: ${HAZ[j][0][1]} → ${HAZ[j][0][6]}`);
        const id = `tbm_${key}_${ds}_${j}`;
        SH.tbm[id] = mark({ id, kind: 'tbm', site: key, d: ds, job: j, time: j === 'sec' ? '08:50' : '07:40', leader: (W.find(w => w.job === j && w.role === '반장') || {}).name || '', work: j === 'sec' ? '정문 출입통제 · 야간 순찰(외곽 · 흡연구역 포함)' : j === 'cln' ? '본관 화장실 · 복도 습식 청소 · 분리수거' : j === 'prk' ? '지하 주차장 순회 · 출차 유도' : '정기 작업', hz, season: (TBM_MONTH[d.getMonth() + 1] || [''])[0], rules: (TBM_RULES[j] || []).slice(0, 3), att, photos: [], voice: '', at: ds + 'T09:00:00.000Z', log: [] });
      }
      if (d.getDay() === 2) { const res = {}, memo = {}, act = {}; chkItems(j).filter(x => x[2] === 'w').forEach(([k]) => { res[k] = R() < .93 ? 'ok' : 'ng'; if (res[k] === 'ng') { memo[k] = '현장 확인 필요'; act[k] = { owner: s.head || '반장', due: isoD(addDays(d, 7)), doneD: isoD(addDays(d, 7)) < td && R() < .7 ? isoD(addDays(d, 5)) : '' }; } }); const id = `chk_d${key}${ds}${j}`; SH.chk[id] = mark({ id, kind: 'chk', site: key, job: j, cyc: 'w', d: ds, by: s.head || '반장', res, memo, act, photos: [], at: ds + 'T10:00:00.000Z', log: [] }); }
      if (d.getDate() === 25) { const res = {}; chkItems(j).forEach(([k]) => res[k] = 'ok'); const id = `chk_m${key}${ds}${j}`; SH.chk[id] = mark({ id, kind: 'chk', site: key, job: j, cyc: 'm', d: ds, by: s.head || '소장', res, memo: {}, act: {}, photos: [], at: ds + 'T10:00:00.000Z', log: [] }); }
    });
    if (d.getDate() === 15) {   // 매월 정기교육 · 협의체
      const id = 'edu_r' + key + ds; SH.edu[id] = mark({ id, kind: 'edu', site: key, type: 'reg', d: ds, h: 2, title: `${d.getMonth() + 1}월 정기 안전보건교육 — ${(TBM_MONTH[d.getMonth() + 1] || [''])[0]}`, inst: s.head || '지사 안전 담당', method: '집체(현장)', att: W.map(w => w.id), photos: [], at: ds + 'T11:00:00.000Z', log: [] });
      const cid = 'co_c' + key + ds; SH.co[cid] = mark({ id: cid, kind: 'co', site: key, type: 'council', d: ds, title: `${d.getMonth() + 1}월 안전보건 협의체 회의`, client: '고객사 안전환경팀 과장', our: s.head || '현장 소장', items: [{ t: '당월 작업 일정 · 혼재 작업 공유', res: '야간 하역 작업 시 순찰 동선 조정' }, { t: '위험성평가 결과 공유', res: '높음 항목 감소대책 일정 합의' }, { t: '아차사고 · 종사자 의견 공유', res: '조명 보수 요청 접수' }], acts: [{ t: '외곽 순찰로 조명 보수', owner: '고객사 시설팀', due: isoD(addDays(d, 14)), doneD: isoD(addDays(d, 14)) < td ? isoD(addDays(d, 10)) : '' }], photos: [], sigC: fakeSig(R), sigO: fakeSig(R), at: ds + 'T14:00:00.000Z', log: [] });
    }
  }
  const hs = isoD(addDays(start, 1)); SH.edu['edu_h6' + key] = mark({ id: 'edu_h6' + key, kind: 'edu', site: key, type: 'reg', d: hs, h: 6, title: '반기 정기 안전보건교육(위험성평가 결과 · 비상대응)', inst: '지사 안전 담당', method: '집체(현장)', att: W.filter(w => w.hired <= hs).map(w => w.id), photos: [], at: hs + 'T09:00:00.000Z', log: [] });
  // 신규 배치자 채용 시 교육 · 비상훈련 · 합동점검
  const nw = W.find(w => w.hired && w.hired > isoD(addDays(kstNow(), -30)));
  if (nw && R() < .6) SH.edu['edu_h' + key] = mark({ id: 'edu_h' + key, kind: 'edu', site: key, type: 'hire', d: nw.hired, h: 8, title: '채용 시 안전보건교육', inst: s.head || '', method: '집체(현장)', att: [nw.id], photos: [], at: nw.hired + 'T09:00:00.000Z', log: [] });
  const dd = isoD(addDays(start, Math.floor(days * .6)));
  SH.edu['edu_d' + key] = mark({ id: 'edu_d' + key, kind: 'edu', site: key, type: 'drill', d: dd, h: 1, title: '화재 대피 · 소화기 · CPR 비상대응 훈련', inst: '지사 안전 담당', method: '현장 실습·훈련', att: W.map(w => w.id), photos: [], at: dd + 'T15:00:00.000Z', log: [] });
  const jd = isoD(addDays(start, Math.floor(days * .4)));
  SH.co['co_j' + key] = mark({ id: 'co_j' + key, kind: 'co', site: key, type: 'joint', d: jd, title: '분기 합동 안전보건점검', client: '고객사 안전환경팀 과장', our: s.head || '현장 소장', items: [{ t: '순찰로 · 작업 구역 위험요인 합동 확인', res: '흡연부스 주변 감지기 사각지대 확인' }, { t: '소방 · 전기 설비', res: '소화기 2대 교체 필요' }, { t: '보호구 착용 · 휴게시설', res: '양호' }], acts: [{ t: '흡연부스 주변 감지기 · CCTV 연동', owner: '고객사 시설팀', due: isoD(addDays(parseD(jd), 30)), doneD: '' }], photos: [], sigC: fakeSig(R), sigO: fakeSig(R), at: jd + 'T15:00:00.000Z', log: [] });
  // 보호구
  W.forEach(w => Object.entries(PPE).filter(([, p]) => p.jobs.includes(w.job) && p.m).slice(0, 3).forEach(([k, p], i) => { const d0 = i === 2 ? isoD(addDays(kstNow(), -(p.m * 30 - 12))) : isoD(addDays(start, 2)); const id = `ppe_${key}${w.id}${k}`; SH.ppe[id] = mark({ id, kind: 'ppe', site: key, wid: w.id, item: k, d: d0, qty: 1, by: s.head || '', next: addMonths(d0, p.m), sig: fakeSig(R), at: d0 + 'T09:00:00.000Z', log: [] }); }));
  // 아차사고 · 의견
  const nm1 = isoD(addDays(start, Math.floor(days * .3)));
  SH.ev['ev_n' + key] = mark({ id: 'ev_n' + key, kind: 'ev', site: key, type: 'nm', grade: 'C', d: nm1, time: '06:40', title: s.jobs.includes('cln') ? '화장실 습식 청소 중 미끄러질 뻔함' : '야간 순찰 중 외곽 요철에 걸려 넘어질 뻔함', loc: s.jobs.includes('cln') ? '본관 2층 화장실' : '외곽 순찰로 동측', job: s.jobs.includes('cln') ? 'cln' : 'sec', desc: s.jobs.includes('cln') ? '물기 제거 전 이동 중 미끄러질 뻔함. 미끄럼주의 표지 미설치.' : '조명 꺼진 구간 바닥 요철에 발이 걸림. 부상 없음.', photos: [], legalC: [], acc: '', injured: '', lost: 0, serious: false, act: { plan: s.jobs.includes('cln') ? '구역 분할 청소 · 표지 상시 비치' : '조명 보수 요청 · 요철 표시', owner: s.head || '반장', due: isoD(addDays(parseD(nm1), 7)), doneD: isoD(addDays(parseD(nm1), 5)), result: '조치 완료 · TBM 공유' }, supp: [], at: nm1 + 'T07:00:00.000Z', log: [] });
  if (opt.fire) {
    const fd = opt.fire.d || isoD(addDays(kstNow(), -9));
    SH.ev['ev_f' + key] = mark({ id: 'ev_f' + key, kind: 'ev', site: key, type: 'fire', grade: 'A', d: fd, time: '02:00', title: opt.fire.title || '흡연부스 뒤편 화재 — 순찰 중 발견 · 초기 진화', loc: opt.fire.loc || '제품창고 옆 흡연부스 뒤편', job: 'sec', desc: opt.fire.desc || '01:10 순찰 통과 후 02:00경 연기 발견. 소화기 2대로 초기 진화, 고객사 · 지사 보고. 해당 위치는 화재수신기 · CCTV 미연동 사각지대.', photos: [], legalC: ['claim'], acc: '화재·폭발', injured: '없음', lost: 0, serious: false, act: { plan: '흡연부스 이전 · 감지기 · CCTV 연동 요청 · 순찰 지점 추가', owner: s.head || '현장 소장', due: isoD(addDays(parseD(fd), 21)) }, supp: [{ at: fd + 'T09:00:00.000Z', by: '지사 안전 담당', t: '고객사 시설팀 현장 확인 — 감지기 미연동 구간 확인' }], at: fd + 'T02:30:00.000Z', log: [{ at: fd + 'T02:30:00.000Z', by: '반장', act: 'report' }] });
    const ra = { id: 'ra_f' + key, kind: 'ra', site: key, job: 'sec', type: 'adhoc', d: fd, title: '수시 위험성평가 — 흡연부스 화재', ref: 'ev_f' + key, st: 'done', part: W.filter(w => w.job === 'sec').map(w => w.id), partTxt: '', how: '사고 후 현장 확인 · 근무자 면담', items: [{ id: 'f1', task: '야간 순찰', hz: '흡연구역 꽁초 · 감지기 미연동 사각지대 화재', type: '화재·폭발', p: 3, s: 4, cur: '소화기 비치', ctrl: '흡연부스 이전 · 감지기 · CCTV 연동 · 순찰 지점 추가(1시간 간격)', p2: 1, s2: 4, owner: s.head || '', due: isoD(addDays(parseD(fd), 21)) }], at: fd + 'T09:00:00.000Z', log: [] };
    SH.ra[ra.id] = mark(ra); SH.ev['ev_f' + key].raId = ra.id;
  }
  const od = isoD(addDays(start, Math.floor(days * .5)));
  SH.op['op_' + key] = mark({ id: 'op_' + key, kind: 'op', site: key, d: od, cat: 'imp', text: s.jobs.includes('sec') ? '흡연부스 뒤편 조명이 없어 야간 순찰이 위험합니다' : '미화 창고 환기가 안 돼 약품 냄새가 심합니다', by: W[1] ? W[1].name : '', anon: false, photos: [], act: { plan: '고객사에 조명 · 환기 개선 요청', owner: s.head || '', due: isoD(addDays(parseD(od), 14)), doneD: isoD(addDays(parseD(od), 12)), result: '고객사 시설팀 조치 완료' }, at: od + 'T10:00:00.000Z', log: [] });
}
function loadDemo() {
  clearDemo(false);
  SH.usites.push({ key: 'ux_demo1', name: '예시 가람공장', org: 'best', br: '동부', ind: 'mfg', jobs: ['sec', 'cln'], total: 8, head: '반장 김하늘', shift: '격일제', sample: true });
  SH.usites.push({ key: 'ux_demo2', name: '예시 나래빌딩', org: 'am', br: '', orgN: '자산관리사업본부', ind: 'office', jobs: ['cln', 'prk'], total: 7, head: '소장 정별빛', shift: '주5일', sample: true });
  buildSites();
  genSiteData('ux_demo1', 62, { sample: true, fire: {} });
  genSiteData('ux_demo2', 62, { sample: true });
  saveSH(); UI.site = UI.site || 'ux_demo1'; saveUI();
}
function clearDemo(save = true) {
  KINDS.forEach(k => Object.keys(SH[k]).forEach(id => { const r = SH[k][id]; if (r.sample || /^ux_demo/.test(r.site || '')) delete SH[k][id]; }));
  ['ux_demo1', 'ux_demo2'].forEach(k => { delete SH.wk[k]; delete SH.cfg[k]; });
  SH.usites = (SH.usites || []).filter(u => !u.sample);
  if (/^ux_demo/.test(UI.site || '')) UI.site = '';
  if (save) { saveSH(); saveUI(); }
  buildSites();
}

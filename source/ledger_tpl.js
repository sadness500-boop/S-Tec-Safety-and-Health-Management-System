/* =====================================================================
 * 📒 안전보건 관리대장 — 회사 양식팩 엔진
 *  · 회사가 배포한 양식(Word · Excel · PPT)을 그대로 열어 사업장 정보와 상세 내용을 채워 넣음(서식 그대로)
 *  · 원본(관리책임자 이수증 · 관리감독자 수료증 · 교육일지 · 경영방침 · 산재율 확인서 등)은 그대로 비치
 *      - 회사 공통(co-) · 지사 공통(br-) · 개인(p-) · 사업장(b..) 범위로 자동 연결
 *  · 사업장에 기존 회사 서식 서류(동부 조직도 · 지정서 · 근골격계 조사 · 예산 · 훈련)가 있으면 그 서류를 그대로 사용
 *  · 양식팩은 서버 보관함(stsh-forms, 로그인 사용자만) 또는 기기에 불러온 팩(zip)에서 읽음 — 공개 저장소에는 넣지 않음
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const LP = { man: null, from: '', bucket: 'stsh-forms', mem: new Map() };
const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', ANS = 'http://schemas.openxmlformats.org/drawingml/2006/main', SNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const LP_MIME = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const lpExt = k => (String(k).match(/\.([a-z0-9]+)$/i) || [])[1] ? String(k).match(/\.([a-z0-9]+)$/i)[1].toLowerCase() : '';
const lpClient = () => window.STSH_AUTH && STSH_AUTH.client && STSH_AUTH.client.storage ? STSH_AUTH.client : null;

/* ---------- 양식팩 읽기 · 불러오기 · 서버 올리기 ---------- */
async function lpInit(force) {
  if (LP.man && !force) return LP.man;
  try { const m = await ldbGet('pk:manifest'); if (m && m.files) { LP.man = m; LP.from = 'local'; } } catch (e) { }
  const c = lpClient();
  if (c) try {
    const { data, error } = await c.storage.from(LP.bucket).download('manifest.json');
    if (!error && data) { const m = JSON.parse(await data.text()); if (!LP.man || m.ver !== LP.man.ver || force) { LP.man = m; LP.from = 'server'; await ldbPut('pk:manifest', m); } else if (LP.from !== 'local') LP.from = 'server'; }
  } catch (e) { }
  return LP.man;
}
async function lpBlob(k) {
  if (LP.mem.has(k)) return LP.mem.get(k);
  let b = await ldbGet('pk:' + k).catch(() => null);
  if (!b) { const c = lpClient(); if (c) { const { data, error } = await c.storage.from(LP.bucket).download('files/' + k); if (!error && data) { b = data; ldbPut('pk:' + k, b).catch(() => { }); } } }
  if (!b) throw new Error('양식팩 파일이 없습니다: ' + k);
  if (b.size < 3e6) LP.mem.set(k, b);
  return b;
}
async function lpImport(file) {
  busy(true, '회사 양식팩 읽는 중…');
  try {
    const z = await JSZip.loadAsync(file), mf = z.file('manifest.json'); if (!mf) throw new Error('양식팩(zip) 안에 manifest.json 이 없습니다');
    const man = JSON.parse(await mf.async('string')), ks = [...new Set(man.files.map(x => x.k))];
    for (let i = 0; i < ks.length; i++) { const f = z.file('files/' + ks[i]); if (!f) continue; if (i % 10 === 0) busy(true, `회사 양식팩 저장 중… ${i + 1}/${ks.length}`); await ldbPut('pk:' + ks[i], new Blob([await f.async('arraybuffer')], { type: LP_MIME[lpExt(ks[i])] || '' })); }
    await ldbPut('pk:manifest', man); LP.man = man; LP.from = 'local'; LP.mem.clear();
    toast(`회사 양식팩을 불러왔습니다 — 파일 ${ks.length}개`, 3500);
  } catch (e) { console.error(e); toast('양식팩을 불러오지 못했습니다: ' + (e.message || e), 5000); }
  finally { busy(false); }
}
async function lpUpload() {
  const c = lpClient(); if (!c) return toast('로그인해야 서버에 올릴 수 있습니다');
  if (!LP.man) return toast('먼저 양식팩을 불러오세요');
  const ks = [...new Set(LP.man.files.map(x => x.k))]; let ok = 0, fail = 0;
  try {
    for (let i = 0; i < ks.length; i++) {
      busy(true, `서버에 올리는 중… ${i + 1}/${ks.length}`);
      const b = await ldbGet('pk:' + ks[i]).catch(() => null); if (!b) { fail++; continue; }
      const { error } = await c.storage.from(LP.bucket).upload('files/' + ks[i], b, { upsert: true, contentType: LP_MIME[lpExt(ks[i])] || 'application/octet-stream' });
      error ? (fail++, console.warn(ks[i], error)) : ok++;
    }
    const { error } = await c.storage.from(LP.bucket).upload('manifest.json', new Blob([JSON.stringify(LP.man)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' });
    if (error) throw error;
    toast(`서버에 올렸습니다 — ${ok}개${fail ? ` (실패 ${fail})` : ''}. 이제 모든 담당자가 로그인하면 회사 양식을 씁니다.`, 6000);
  } catch (e) { toast('서버에 올리지 못했습니다: ' + (e.message || e), 6000); }
  finally { busy(false); }
}

/* ---------- 사업장 → 적용 범위 ---------- */
function lpCo(c) { return /시스템/.test(c.co.n) ? 'sys' : 'best'; }
function lpBr(s) { const L = siteOrgLabel(s) || ''; const m = L.match(/(동부|서부|남부|중부|북부)/); return s.br || (m && m[1]) || ''; }
function lpScopes(c) {
  const sc = new Set(['all', 'co-' + lpCo(c), 'br-' + lpBr(c.s), c.s.key]);
  [c.mgr, c.head, c.info.sup].filter(Boolean).forEach(n => sc.add('p-' + String(n).replace(/\s/g, '')));
  return sc;
}
function lpFor(c, item) {
  if (!LP.man) return { forms: [], site: [], orig: [] };
  const M = LP.man.files.filter(x => x.item === item), sc = lpScopes(c);
  const chemTxt = c.chem.map(x => x[0]).join(' ');
  const orig = M.filter(x => x.kind === 'o' && (sc.has(x.scope) || (x.scope === 'msds' && (hasJ(c.s, 'cln', 'cook') || /락스|세정|세척|소포|유리/.test(chemTxt)))));
  return { forms: M.filter(x => x.kind === 'f'), site: M.filter(x => x.kind === 's' && x.scope === c.s.key), orig };
}
const lpHas = () => !!(LP.man && LP.man.files && LP.man.files.length);

/* =====================================================================
 * Word(docx) 채우기 엔진 — 회사 양식 서식(글꼴 · 표 · 병합 · 그림)은 그대로 두고 글자만 바꿈
 * ===================================================================== */
class DX {
  static async open(blob) {
    const d = new DX(); d.z = await JSZip.loadAsync(blob); d.parts = {};
    for (const n of Object.keys(d.z.files).filter(n => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))) d.parts[n] = new DOMParser().parseFromString(await d.z.file(n).async('string'), 'application/xml');
    d.doc = d.parts['word/document.xml']; d.body = d.doc.getElementsByTagNameNS(WNS, 'body')[0]; return d;
  }
  async blob() { for (const n in this.parts) this.z.file(n, new XMLSerializer().serializeToString(this.parts[n])); return this.z.generateAsync({ type: 'blob', mimeType: LP_MIME.docx, compression: 'DEFLATE' }); }
  all(tag, root) { if (Array.isArray(root)) return [].concat(...root.filter(r => r && r.nodeType === 1).map(r => (r.localName === tag && r.namespaceURI === WNS ? [r] : []).concat([...r.getElementsByTagNameNS(WNS, tag)]))); return [...(root || this.doc).getElementsByTagNameNS(WNS, tag)]; }
  txt(el) { return [...el.getElementsByTagNameNS(WNS, 't')].map(t => t.textContent).join(''); }
  kids(el, tag) { return [...el.childNodes].filter(x => x.nodeType === 1 && x.localName === tag); }
  leafPs(root) { const out = []; if (Array.isArray(root)) { root.forEach(r => { if (r.nodeType !== 1) return; if (r.localName === 'p' && !r.getElementsByTagNameNS(WNS, 'p').length) out.push(r); else [...r.getElementsByTagNameNS(WNS, 'p')].forEach(p => { if (!p.getElementsByTagNameNS(WNS, 'p').length) out.push(p); }); }); return out; } const roots = root ? [root] : Object.values(this.parts).map(p => p.documentElement); roots.forEach(r => [...r.getElementsByTagNameNS(WNS, 'p')].forEach(p => { if (!p.getElementsByTagNameNS(WNS, 'p').length) out.push(p); })); if (root && !Array.isArray(root) && root.localName === 'p' && !root.getElementsByTagNameNS(WNS, 'p').length) out.push(root); return out; }
  setP(p, text) {
    const ts = [...p.getElementsByTagNameNS(WNS, 't')];
    if (!ts.length) { const d = p.ownerDocument, r = d.createElementNS(WNS, 'w:r'), t = d.createElementNS(WNS, 'w:t'); t.setAttribute('xml:space', 'preserve'); t.textContent = text; r.appendChild(t); p.appendChild(r); return; }
    ts[0].textContent = text; ts[0].setAttribute('xml:space', 'preserve'); ts.slice(1).forEach(t => t.textContent = '');
  }
  /* 문단 글자 바꾸기 — R: [[정규식, 값|함수], …] */
  repl(R, root) {
    let n = 0;
    this.leafPs(root).forEach(p => { const a = this.txt(p); if (!a) return; let b = a; R.forEach(([re, v]) => { re.lastIndex = 0; b = b.replace(re, v); }); if (b !== a) { this.setP(p, b); n++; } });
    return n;
  }
  /* 「작성 요령」 · 「Sample」 같은 안내 글상자 · 안내 문단 지우기 */
  stripNotes() {
    const bad = /작성\s*요령|작성\s*기준|관리\s*요령|양식\s*찾아서\s*작성|Sample|예시용이며\s*빈항목|System\s*내\s*예시문|해당 중량물 무게 기입/;
    Object.values(this.parts).forEach(doc => {
      const MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
      [...doc.getElementsByTagNameNS(MC, 'AlternateContent')].forEach(a => { if (a.parentNode && bad.test(this.txt(a)) && !a.getElementsByTagNameNS(MC, 'AlternateContent').length) a.parentNode.removeChild(a); });
      ['drawing', 'pict'].forEach(tag => [...doc.getElementsByTagNameNS(WNS, tag)].forEach(dEl => { if (dEl.parentNode && bad.test(this.txt(dEl))) dEl.parentNode.removeChild(dEl); }));
    });
    this.leafPs().forEach(p => { const t = this.txt(p).trim(); if (/^[*※]\s*작성\s*요령/.test(t) && p.parentNode && p.parentNode.localName !== 'tc') p.parentNode.removeChild(p); });
  }
  tables(root) { return this.all('tbl', root); }
  rows(tbl) { return this.kids(tbl, 'tr'); }
  cells(tr) { return this.kids(tr, 'tc'); }
  ct(tc) { return this.txt(tc).replace(/\s+/g, ' ').trim(); }
  /* 칸 글자 넣기 — 첫 문단 서식 유지 · 줄바꿈(\n)은 문단으로 */
  setCell(tc, text) {
    const d = tc.ownerDocument, ps = this.kids(tc, 'p'); let p0 = ps[0];
    if (!p0) { p0 = d.createElementNS(WNS, 'w:p'); tc.appendChild(p0); }
    ps.slice(1).forEach(p => tc.removeChild(p));
    const r0 = p0.getElementsByTagNameNS(WNS, 'r')[0], rPr0 = r0 ? this.kids(r0, 'rPr')[0] : null, rPr = rPr0 ? rPr0.cloneNode(true) : null;
    if (rPr) [...rPr.childNodes].forEach(n => { if (n.nodeType === 1 && (n.localName === 'color' || n.localName === 'highlight' || n.localName === 'shd')) rPr.removeChild(n); });
    [...p0.childNodes].forEach(n => { if (n.nodeType === 1 && n.localName !== 'pPr') p0.removeChild(n); });
    String(text == null ? '' : text).split('\n').forEach((line, i) => {
      let p = p0; if (i) { p = p0.cloneNode(true); [...p.childNodes].forEach(n => { if (n.nodeType === 1 && n.localName !== 'pPr') p.removeChild(n); }); tc.appendChild(p); }
      const r = d.createElementNS(WNS, 'w:r'); if (rPr) r.appendChild(rPr.cloneNode(true));
      const t = d.createElementNS(WNS, 'w:t'); t.setAttribute('xml:space', 'preserve'); t.textContent = line; r.appendChild(t); p.appendChild(r);
    });
  }
  /* 조건에 맞는 문단 다음 문단부터 새 쪽 */
  breakAfter(re) { const ps = this.kids(this.body, 'p'); const i = ps.findIndex(p => re.test(this.txt(p).trim())); if (i < 0) return; let nx = ps[i].nextSibling; while (nx && nx.nodeType !== 1) nx = nx.nextSibling; if (!nx) return; if (nx.localName !== 'p') { const p = this.doc.createElementNS(WNS, 'w:p'); this.body.insertBefore(p, nx); nx = p; } let pr = this.kids(nx, 'pPr')[0]; if (!pr) { pr = this.doc.createElementNS(WNS, 'w:pPr'); nx.insertBefore(pr, nx.firstChild); } if (!this.kids(pr, 'pageBreakBefore').length) pr.insertBefore(this.doc.createElementNS(WNS, 'w:pageBreakBefore'), pr.firstChild); }
  /* 칸 배경색 */
  shade(tc, fill) { const d = tc.ownerDocument; let pr = this.kids(tc, 'tcPr')[0]; if (!pr) { pr = d.createElementNS(WNS, 'w:tcPr'); tc.insertBefore(pr, tc.firstChild); } this.kids(pr, 'shd').forEach(x => pr.removeChild(x)); const sh = d.createElementNS(WNS, 'w:shd'); sh.setAttribute('w:val', 'clear'); sh.setAttribute('w:color', 'auto'); sh.setAttribute('w:fill', fill); const order = ['tcW', 'gridSpan', 'vMerge', 'tcBorders']; let after = null; this.kids(pr, '*').forEach(() => { }); const kids = [...pr.childNodes].filter(n => n.nodeType === 1); const pos = kids.findIndex(n => !order.includes(n.localName)); pos >= 0 ? pr.insertBefore(sh, kids[pos]) : pr.appendChild(sh); }
  /* 「라벨」 칸 다음 칸 채우기 — 비어 있거나 자리표시(ㅇㅇ · 00 · 예시)일 때 */
  kv(label, val, root, force) {
    const re = label instanceof RegExp ? label : new RegExp('^' + label.replace(/\s/g, '') + '$');
    let n = 0;
    this.all('tc', root).forEach(tc => { if (!re.test(this.ct(tc).replace(/\s/g, ''))) return; let nx = tc.nextSibling; while (nx && !(nx.nodeType === 1 && nx.localName === 'tc')) nx = nx.nextSibling; if (!nx) return; const cur = this.ct(nx); if (force || !cur || /^[\sㅇ0/~:년월일().\-]*$/.test(cur) || /ㅇㅇ|예시|보안\/미화|^\(\s*\)$/.test(cur)) { this.setCell(nx, val); n++; } });
    return n;
  }
  /* 표 찾기 — 앞부분 글자에 모든 낱말이 들어간 표 */
  findTables(words, root) { return this.tables(root).filter(t => { const h = this.rows(t).slice(0, 6).map(r => this.ct(r)).join(' '); return words.every(w => h.includes(w)); }); }
  /* 자료 줄 채우기 — 시작 줄부터 같은 칸 수의 줄을 차례로 채우고, 모자라면 마지막 줄을 복제 · 남는 줄은 비움 */
  fillRows(tbl, start, data, map, opt = {}) {
    const rows = this.rows(tbl); if (!rows[start]) return 0;
    const N = this.cells(rows[start]).length, cand = rows.slice(start).filter(r => this.cells(r).length === N && !(opt.stop && opt.stop.test(this.ct(r))));
    let pool = cand.slice(), last = cand[cand.length - 1];
    data.forEach((row, i) => {
      let tr = pool[i];
      if (!tr) { tr = last.cloneNode(true); last.parentNode.insertBefore(tr, last.nextSibling); last = tr; pool.push(tr); }
      const cs = this.cells(tr);
      (map || row.map((_, j) => j)).forEach((ci, j) => { if (ci == null || !cs[ci]) return; const v = row[j]; if (v === undefined) return; this.setCell(cs[ci], v); });
    });
    if (opt.clearRest !== false) pool.slice(data.length).forEach(tr => { const cs = this.cells(tr); (opt.clearCols || map || cs.map((_, j) => j)).forEach(ci => { if (ci == null || !cs[ci]) return; const t = this.ct(cs[ci]); if (t && (opt.keepNo && /^\(?\d+\)?$/.test(t) && ci === (opt.noCol || 0))) return; if (t) this.setCell(cs[ci], ''); }); });
    return data.length;
  }
  /* 문단 기준으로 본문을 나눠 n번째 묶음만 남기기(여러 양식이 든 파일에서 하나 고르기) */
  keepGroup(isStart, idx) {
    const kids = [...this.body.childNodes].filter(n => n.nodeType === 1 && n.localName !== 'sectPr');
    const groups = []; kids.forEach(k => { if (!groups.length || isStart(k)) groups.push([]); groups[groups.length - 1].push(k); });
    if (groups.length < 2) return;
    const keep = Math.max(0, Math.min(idx, groups.length - 1));
    groups.forEach((g, i) => { if (i !== keep) g.forEach(k => this.body.removeChild(k)); });
    const first = groups[keep][0]; if (first && first.localName === 'p') { const pPr = this.kids(first, 'pPr')[0]; if (pPr) this.kids(pPr, 'pageBreakBefore').forEach(x => pPr.removeChild(x)); }
    this.all('br', groups[keep][0]).forEach(br => { if (br.getAttributeNS(WNS, 'type') === 'page' || br.getAttribute('w:type') === 'page') br.parentNode.removeChild(br); });
  }
  /* 처음부터 조건에 맞는 요소 전까지 지우기 */
  dropUntil(pred) { for (const k of [...this.body.childNodes].filter(n => n.nodeType === 1 && n.localName !== 'sectPr')) { if (pred(k)) break; this.body.removeChild(k); } }
  /* 본문 묶음 떼어내기 — 시작 문단 ~ 다음 시작 문단 전 */
  dropGroup(isStart, idx) {
    const kids = [...this.body.childNodes].filter(n => n.nodeType === 1 && n.localName !== 'sectPr');
    const groups = []; kids.forEach(k => { if (!groups.length || isStart(k)) groups.push([]); groups[groups.length - 1].push(k); });
    if (groups[idx] && groups.length > 1) groups[idx].forEach(k => this.body.removeChild(k));
  }
  /* 본문 전체를 n번 반복(쪽 나눔) — fn(묶음 노드들, i)로 묶음마다 채움 */
  repeat(n, fn) {
    const sect = this.kids(this.body, 'sectPr')[0], src = [...this.body.childNodes].filter(x => x.nodeType === 1 && x.localName !== 'sectPr');
    const groups = [src];
    for (let i = 1; i < n; i++) {
      const pb = this.doc.createElementNS(WNS, 'w:p'), r = this.doc.createElementNS(WNS, 'w:r'), br = this.doc.createElementNS(WNS, 'w:br'); br.setAttribute('w:type', 'page'); r.appendChild(br); pb.appendChild(r);
      this.body.insertBefore(pb, sect || null);
      const g = src.map(x => { const y = x.cloneNode(true); this.body.insertBefore(y, sect || null); return y; }); groups.push(g);
    }
    groups.forEach((g, i) => fn(g, i));
  }
}
const isPText = (dx, re) => el => el.localName === 'p' && re.test(dx.txt(el).trim());

/* ---------- 공통 자리표시 바꾸기(회사 양식 표기) ---------- */
const spaced = n => String(n || '').split('').join(' ');
function lpRules(c, opt = {}) {
  const Y = c.d.slice(0, 4), M = +c.d.slice(5, 7), D = +c.d.slice(8, 10), yy = Y.slice(2), MM = String(M).padStart(2, '0'), DD = String(D).padStart(2, '0');
  const full = `${c.label} ${c.s.name}`.trim(), n = Math.max(c.names.length, c.total || 0), jobsSl = c.jobsS.replace(/·/g, ', ');
  const ceo = c.co.ceo || '', boss = opt.boss || c.mgr || '';
  const box = (k, j) => k + (hasJ(c.s, ...j) ? '■' : '□');
  return [
    [/\(\s*[0ㅇ○]{2}\s*\)\s*본부\s*\(\s*[0ㅇ○]{2}\s*\)\s*지사\s*[0ㅇ○]{3}\s*사업장/g, full], [/[0ㅇ○]{2}\s*본부\s*\(\s*[0ㅇ○]{2}\s*\)\s*지사/g, c.label],
    [/\(\s*\)\s*지사\s*\(\s*\)\s*사업장/g, full], [/\(\s*[0ㅇ○]{2}\s*\)\s*지사\s*[0ㅇ○]{3}\s*사업장/g, full],
    [/\[\s*0{3,}\s*사업장\s*\]/g, `[${c.s.name}]`], [/\(\s*ABC\s*사업장\s*\)/g, `(${c.s.name})`], [/\(\s*ㅇ{3,}\s*사업장\s*\)/g, `(${c.s.name})`], [/ㅇ{3,}\s*사업장/g, c.s.name],
    [/ㅇ{4,}\s*회의실/g, `${c.s.name} 회의실`], [/^\s*ㅇ\s?ㅇ\s?ㅇ\s?ㅇ\s?ㅇ\s?ㅇ?\s*$/g, c.s.name], [/^\s*ㅇ\s?ㅇ\s+지사\s*$/g, c.label],
    [/ㅇㅇㅇ\s*외\s*0+\s*명/g, `${boss} 외 ${Math.max(0, n - 1)}명`], [/ㅇ\s?ㅇ\s?ㅇ\s+ㅇ\s?ㅇ\s+\(서\s*명\)/g, `${boss} ${c.mgrPos}   (서  명)`], [/^\s*ㅇ\s?ㅇ\s?ㅇ\s*$/g, boss], [/ㅇㅇㅇ\s*팀장/g, `${boss} ${c.mgrPos}`],
    [/\(사업장\s*전화번호\s*기재\)/g, c.tel || ''], [/\(사업장\s*(소재지\s*)?주소(\s*기재)?\)/g, c.addr || ''], [/\(회사명\s*기입\)/g, c.co.n],
    [/\(\s*사업장\s*명\s*:\s*\)/g, `(사업장 명 : ${c.s.name})`], [/\(\s*사업장명\s*:\s*\)/g, `(사업장명 : ${c.s.name})`],
    [/(■\s*사업장\s*명\s*:)[^■]*?(?=■|$)/g, `$1 ${c.s.name}   `], [/^(\s*사업장명\s*:)\s*_*ㅇ?\s*$/g, `$1 ${c.s.name}`], [/^(\s*사업장명\s*:)\s{3,}(작업장소\s*:)/g, `$1 ${c.s.name}     $2`],
    [/(업\s*체\s*명\s*:)\s*\S*(\s{3,})(사업장명\s*:).*/g, `$1 ${c.co.n.replace('주식회사 ', '㈜')}$2$3 ${c.s.name}`], [/(회\s*사\s*명\s*:)\s*(\s{3,})(사업장명\s*:).*/g, `$1 ${c.co.n.replace('주식회사 ', '㈜')}$2$3 ${c.s.name}`],
    [/보안\s*\/\s*미화\s*\/\s*주차\s*\/\s*시설\s*\/\s*기타/g, jobsSl], [/보안\s*[□■]\s*미화\s*[□■]\s*주차\s*[□■]\s*시설\s*[□■]\s*기타\s*[□■]/g, [box('보안', ['sec']), box('미화', ['cln']), box('주차', ['prk']), box('시설', ['fac']), box('기타', ['info', 'cook'])].join(' ')],
    [/`\s*00\.\s*00\.\s*00\s*현재/g, `\`${yy}. ${MM}. ${DD} 현재`], [/`\s*\d{2}\.\s*\d{2}\.\s*\d{2}\s*현재/g, `\`${yy}. ${MM}. ${DD} 현재`],
    [/(생년월일\s*:\s*)0000년\s*00월\s*00일/g, '$1      년    월    일'], [/0000년\s*00월\s*00일/g, `${Y}년 ${MM}월 ${DD}일`], [/^20\s{0,2}년\s*00월\s*00일$/g, `${Y}년 ${MM}월 ${DD}일`], [/^0000\.00\.00$/g, `${Y}.${MM}.${DD}`], [/^\s*00\.00\.00\s*$/g, ''],
    [/20\s{1,4}년\s+0?\s*월\s+0?\s*일(?!\s*\()/g, `${Y} 년 ${M} 월 ${D} 일`], [/^20\s{1,3}\.\s{1,4}\.\s{1,4}\.?\s*$/g, `${Y}. ${M}. ${D}.`], [/\(20\s{1,3}년\s+월\)/g, `(${Y}년 ${M}월)`],
    [/^20\s{1,3}년\s*(건강검진)/g, `${Y}년 $1`], [/^20\s?\.\s?09$/g, `${Y}. ${MM}`], [/(20)\s{1,3}(년\s+월\s+일)\s*\(\s+:\s+~\s+:\s+\)/g, `${Y}년 ${M}월 ${D}일 (   :    ~    :   )`],
    [/(대표이사)\s*(이\s*병\s*화|정\s*규\s*상)/g, `$1 ${spaced(ceo)}`], [/(이\s*병\s*화|정\s*규\s*상)\s*(대표이사)/g, `${ceo} $2`],
    [/주식회사\s*에스텍(베스트|시스템)/g, c.co.n], [/\(주\)에스텍(베스트|시스템)/g, c.co.n.replace('주식회사 ', '(주)')],
    [/홍길동\s*지사장/g, `${c.head || ''} ${c.headPos}`.trim()], [/홍길동\s*(선임|팀장|반장|소장|대장)/g, `${c.mgr} ${c.mgrPos}`.trim()],
    [/000\s*지사장/g, `${c.head || ''} ${c.headPos}`.trim()]
  ];
}
/* 회사 · 사업장 칸(지정서) */
function lpCompanyCells(dx, c, who) {
  let addrN = 0;
  dx.all('tc').forEach(tc => {
    const t = dx.ct(tc), s = t.replace(/\s/g, '');
    if (/^회사명/.test(s)) dx.setCell(tc, `회사명   ${c.co.n}`);
    else if (/^업종/.test(s) && s.length > 3) dx.setCell(tc, `업  종   ${c.co.biz}`);
    else if (/^소재지/.test(s)) { dx.setCell(tc, `소재지   ${addrN++ === 0 ? c.co.addr : (c.addr || '')}`); }
    else if (/^사업장\(|^사업장[^명]/.test(s) && /지사|사업장|ㅇ/.test(s)) dx.setCell(tc, `사업장   ${c.label} ${c.s.name}`);
    else if (/^전화번호/.test(s)) dx.setCell(tc, `전화번호 ${c.tel || ''}`);
  });
  if (who) { dx.kv(/^소속$/, who[0], null, true); dx.kv(/^성명$/, spaced(who[1]), null, true); dx.kv(/^직책$/, who[2], null, true); }
}
/* 교육일지 공통 — 업종 · 일자 · 장소 · 실시자 · 대상/실시 · 참석자 성명 */
function lpEduFill(dx, c, o = {}, root) {
  dx.kv(/^업종$/, c.jobsS.replace(/·/g, ', '), root, true);
  if (o.date) dx.kv(/^일자$/, o.date, root, true);
  dx.kv(/^장소$/, o.place || `${c.s.name} ${hasJ(c.s, 'sec') ? '보안실' : '휴게실'}`, root);
  dx.findTables(['교육 실시자'], root).concat(dx.findTables(['교육실시자'], root)).forEach(t => {
    const rows = dx.rows(t), hi = rows.findIndex(r => { const h = dx.cells(r).map(x => dx.ct(x).replace(/\s/g, '')); return h.includes('성명') && h.includes('직책'); });
    if (hi < 0 || !rows[hi + 1]) return; const h = dx.cells(rows[hi]).map(x => dx.ct(x).replace(/\s/g, '')), cs = dx.cells(rows[hi + 1]);
    if (cs.length !== h.length) return; const put = (k, v) => { const i = h.indexOf(k); if (i >= 0 && cs[i] && !dx.ct(cs[i])) dx.setCell(cs[i], v); };
    put('성명', o.inst || c.mgr || ''); put('직책', o.instPos || c.mgrPos); put('대상', String(o.n != null ? o.n : (c.names.length || c.total || '')));
  });
  lpNames(dx, o.names || c.names, root);
}
/* 참석자 표(순번 · 성명) 채우기 */
function lpNames(dx, names, root, jobsOf) {
  if (!names || !names.length) return 0; let filled = 0;
  dx.tables(root).forEach(t => {
    const rows = dx.rows(t), hi = rows.findIndex(r => { const h = dx.cells(r).map(x => dx.ct(x).replace(/\s/g, '')); return h.includes('성명') && h.includes('순번'); });
    if (hi < 0) return; const head = dx.cells(rows[hi]).map(x => dx.ct(x).replace(/\s/g, ''));
    head.forEach((h, ci) => { if (h !== '성명') return; const ni = head.lastIndexOf('순번', ci); if (ni < 0) return;
      rows.slice(hi + 1).forEach(r => { const cs = dx.cells(r); if (cs.length !== head.length) return; const no = parseInt(dx.ct(cs[ni]), 10); if (!(no > 0) || !names[no - 1] || dx.ct(cs[ci])) return; dx.setCell(cs[ci], names[no - 1]); filled++; }); });
  });
  return filled;
}

/* =====================================================================
 * 상세 내용 재료 — 위험성평가(3×3) · 근골격계 · 보호구 · 예산
 * ===================================================================== */
function lpHaz(c) {
  const out = []; const recs = Object.values(SH.ra).filter(r => r.site === c.s.key && (r.items || []).length).sort((a, b) => a.d < b.d ? 1 : -1)[0];
  c.jobs.forEach(j => (RAX[j] || []).forEach((h, i) => out.push({ code: `${RAX_CODE[j] || j.toUpperCase()}-${String(i + 1).padStart(2, '0')}`, job: j, task: h[0], cat: h[1], hz: h[2], cur: h[3], p: h[4], s: h[5], ctrl: h[6], p2: h[7], s2: h[8], plan2: h[9] })));
  (RAX_IND[c.s.ind] || []).forEach((h, i) => out.push({ code: `IND-${String(i + 1).padStart(2, '0')}`, job: '', task: h[0], cat: h[1], hz: h[2], cur: h[3], p: h[4], s: h[5], ctrl: h[6], p2: h[7], s2: h[8], plan2: h[9] }));
  if (recs) recs.items.forEach((it, i) => { if (out.some(o => o.hz === it.hz)) return; const p = Math.min(3, Math.max(1, Math.ceil(+it.p * 3 / 5))), s = Math.min(3, Math.max(1, Math.ceil(+it.s * 3 / 4)));
    out.push({ code: `REC-${String(i + 1).padStart(2, '0')}`, job: recs.job, task: it.task, cat: it.type, hz: it.hz, cur: it.cur || '-', p, s, ctrl: it.ctrl || '', p2: Math.max(1, p - 1), s2: s, plan2: p * s >= 4 && (p - 1) * s >= 4 ? (it.ctrl || '') : '' }); });
  return out;
}
const lpR = (p, s) => p * s;
function lpDue(c, plus) { const d = parseD(addMonths(c.d, plus)); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; }

/* =====================================================================
 * 항목별 작성 규칙 — 결과: [{name, blob, kind:'form'|'site'|'orig', t}]
 * ===================================================================== */
const LPS = {};
async function lpFormDx(e) { return DX.open(await lpBlob(e.k)); }
async function lpStd(c, e, extra) {
  const dx = await lpFormDx(e); dx.stripNotes(); if (extra) await extra(dx); dx.repl(lpRules(c)); return { name: `${e.title}.docx`, blob: await dx.blob(), kind: 'form', t: e.title };
}
/* 엑셀 양식 — 공유 문자열 · 셀 글자 바꾸기 */
async function lpXlsx(c, e, cells) {
  const z = await JSZip.loadAsync(await lpBlob(e.k)), R = lpRules(c);
  const ssP = 'xl/sharedStrings.xml';
  if (z.file(ssP)) { const d = new DOMParser().parseFromString(await z.file(ssP).async('string'), 'application/xml');
    [...d.getElementsByTagNameNS(SNS, 'si')].forEach(si => { const ts = [...si.getElementsByTagNameNS(SNS, 't')]; if (!ts.length) return; const a = ts.map(t => t.textContent).join(''); let b = a; R.forEach(([re, v]) => { re.lastIndex = 0; b = b.replace(re, v); }); b = b.replace(/(■\s*사업장명\s*:)\s*[^■]*$/, `$1 ${c.s.name}`); if (b !== a) { ts[0].textContent = b; ts.slice(1).forEach(t => t.textContent = ''); } });
    z.file(ssP, new XMLSerializer().serializeToString(d)); }
  if (cells) for (const n of Object.keys(z.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))) {
    const d = new DOMParser().parseFromString(await z.file(n).async('string'), 'application/xml'); let ch = false;
    Object.entries(cells).forEach(([ref, val]) => { const cEl = [...d.getElementsByTagNameNS(SNS, 'c')].find(x => x.getAttribute('r') === ref); if (!cEl) return; [...cEl.childNodes].forEach(k => cEl.removeChild(k)); cEl.setAttribute('t', 'inlineStr'); const is = d.createElementNS(SNS, 'is'), t = d.createElementNS(SNS, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = val; is.appendChild(t); cEl.appendChild(is); ch = true; });
    if (ch) z.file(n, new XMLSerializer().serializeToString(d));
  }
  return { name: `${e.title}.xlsx`, blob: await z.generateAsync({ type: 'blob', mimeType: LP_MIME.xlsx, compression: 'DEFLATE' }), kind: 'form', t: e.title };
}
/* PPT 양식 — 문단 글자 바꾸기 · 표 칸 채우기 */
async function lpPptx(c, e, tableFill) {
  const z = await JSZip.loadAsync(await lpBlob(e.k)), R = lpRules(c);
  for (const n of Object.keys(z.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const d = new DOMParser().parseFromString(await z.file(n).async('string'), 'application/xml');
    [...d.getElementsByTagNameNS(ANS, 'p')].forEach(p => { const ts = [...p.getElementsByTagNameNS(ANS, 't')]; if (!ts.length) return; const a = ts.map(t => t.textContent).join(''); let b = a; R.forEach(([re, v]) => { re.lastIndex = 0; b = b.replace(re, v); }); if (b !== a) { ts[0].textContent = b; ts.slice(1).forEach(t => t.textContent = ''); } });
    if (tableFill) tableFill(d, n);
    z.file(n, new XMLSerializer().serializeToString(d));
  }
  return { name: `${e.title}.pptx`, blob: await z.generateAsync({ type: 'blob', mimeType: LP_MIME.pptx, compression: 'DEFLATE' }), kind: 'form', t: e.title };
}
async function lpOrig(e) { return { name: e.name.replace(/^[0-9a-f]{12}_/, ''), blob: await lpBlob(e.k), kind: 'orig', t: e.title, shared: /^(all|co-|br-|msds)/.test(e.scope) }; }
async function lpSite(c, e, fix) {
  const ext = lpExt(e.k);
  if (ext !== 'docx') return { name: e.name, blob: await lpBlob(e.k), kind: 'site', t: e.title };
  const dx = await lpFormDx(e); dx.stripNotes(); if (fix) await fix(dx);
  const Y = c.d.slice(0, 4), yy = Y.slice(2), M = String(+c.d.slice(5, 7)).padStart(2, '0'), D = c.d.slice(8, 10);
  dx.repl([[/`\s*\d{2}\.\s*\d{2}\.\s*\d{2}\s*현재/g, `\`${yy}. ${M}. ${D} 현재`]]);
  return { name: e.name.replace(/^[0-9a-f]{12}_/, ''), blob: await dx.blob(), kind: 'site', t: e.title };
}
const fOf = (L, v) => L.forms.find(x => x.var === v);

/* 0 표지 · 목차 */
LPS['0'] = async (c, L) => {
  const out = [];
  for (const e of L.forms) out.push(await lpStd(c, e, dx => { if (e.var === 'cover') dx.repl([[/\[\s*0{3,}\s*사업장\s*\]/g, `[${c.s.name}]`]]); }));
  return out;
};
/* 1-2 조직도 — 사업장 서류 우선 · 없으면 같은 회사 사업장 서류 서식(에스텍베스트) 또는 회사 양식 */
LPS['1-2'] = async (c, L) => {
  if (L.site.length) return [await lpSite(c, L.site[0])];
  const jobsN = c.jobs.length, roster = c.jobs.map(j => { const w = c.W.find(x => (x.job || c.jobs[0]) === j); const sh = ledSiteHead(c.s); return [JOBS[j].s, w ? `${w.name} ${w.role || ''}`.trim() : (j === c.jobs[0] && sh[1] ? `${sh[1]} ${sh[0]}`.trim() : '')]; });
  if (c.jobs.length > 1) roster.unshift(['총괄', `${c.mgr} ${c.mgrPos}`.trim()]);
  let base = null;
  if (lpCo(c) === 'best') { const cand = LP.man.files.filter(x => x.item === '1-2' && x.kind === 's'); for (const e of cand) { const dx = await lpFormDx(e); const rowsN = dx.all('tr').filter(r => /^(보안|미화|주차|시설|총괄|기타|안내|조리)$/.test(dx.ct(dx.cells(r).find(x => dx.ct(x)) || r))).length; if (rowsN === roster.length) { base = { e, dx }; break; } if (!base) base = { e, dx }; } }
  let dx, title = '사업장 안전보건 조직도';
  if (base) dx = base.dx; else { dx = await lpFormDx(fOf(L, undefined) || L.forms[0]); dx.stripNotes(); dx.keepGroup(isPText(dx, /^사업장 안전보건 조직도$/), c.jobs.length > 1 ? 1 : /교대/.test(c.s.shift || '') ? 3 : 2); }
  // 관리감독자 줄 · 직종 줄
  dx.all('tr').forEach((tr, i, arr) => { const cs = dx.cells(tr); cs.forEach((tc, k) => { if (dx.ct(tc) === '관리감독자') { const nx = arr[i + 1]; if (nx) { const nc = dx.cells(nx).find(x => dx.ct(x)); if (nc) dx.setCell(nc, `${c.head || c.mgr} ${c.head ? c.headPos : c.mgrPos}`.trim()); } } }); });
  const jobRows = dx.all('tr').filter(r => { const cs = dx.cells(r).filter(x => dx.ct(x)); return cs.length >= 1 && /^(보안|미화|주차|시설|총괄|기타|안내|조리)$/.test(dx.ct(cs[0])); });
  if (jobRows.length) {
    let last = jobRows[jobRows.length - 1];
    roster.forEach((r, i) => { let tr = jobRows[i]; if (!tr) { tr = last.cloneNode(true); last.parentNode.insertBefore(tr, last.nextSibling); last = tr; } const cs = dx.cells(tr).filter(x => dx.ct(x) || true); const filled = dx.cells(tr).filter(x => dx.ct(x)); const ji = dx.cells(tr).indexOf(filled[0]); dx.setCell(dx.cells(tr)[ji], r[0]); if (dx.cells(tr)[ji + 1]) dx.setCell(dx.cells(tr)[ji + 1], r[1]); });
    jobRows.slice(roster.length).forEach(tr => tr.parentNode.removeChild(tr));
  }
  dx.repl(lpRules(c)); dx.repl([[/`\s*\d{2}\.\s*\d{2}\.\s*\d{2}\s*현재/g, `\`${c.d.slice(2, 4)}. ${c.d.slice(5, 7)}. ${c.d.slice(8, 10)} 현재`]]);
  return [{ name: `${title}.docx`, blob: await dx.blob(), kind: 'form', t: title }];
};
/* 1-3 관리책임자 — 사업장 지정서 원본 · 없으면 회사 양식 + 순회점검표 + 이수증 원본 */
LPS['1-3'] = async (c, L) => {
  const out = [];
  if (L.site.length) for (const e of L.site) out.push(await lpSite(c, e));
  else { const e = fOf(L, 'appoint'); if (e) { const dx = await lpFormDx(e); dx.stripNotes(); lpCompanyCells(dx, c, [c.co.n.replace('주식회사 ', ''), c.co.ceo, '대표이사']); dx.repl(lpRules(c)); dx.repl([[/^20\d{2}\s*년\s+\d{1,2}\s*월\s+\d{1,2}\s*일$/g, `${c.d.slice(0, 4)} 년   ${+c.d.slice(5, 7)} 월   ${+c.d.slice(8, 10)} 일`]]); out.push({ name: '안전보건관리책임자 지정서.docx', blob: await dx.blob(), kind: 'form', t: '안전보건관리책임자 지정서' }); } }
  const p = fOf(L, 'patrol'); if (p) out.push(await lpXlsx(c, p));
  return out;
};
/* 1-4 관리감독자 — 지정서 · 교육일지 · 주간 순회점검표 + 지사 공통 · 개인 수료증 원본 */
LPS['1-4'] = async (c, L) => {
  const out = [], sup = c.info.sup || c.head || c.mgr, supPos = c.info.sup ? (c.info.supPos || '관리감독자') : (c.head ? c.headPos : c.mgrPos);
  const full = fOf(L, 'full'), ap = fOf(L, 'appoint'), Y = c.d.slice(0, 4);
  const e = full || ap;
  if (e) { const dx = await lpFormDx(e); dx.stripNotes(); if (e.var === 'full') dx.breakAfter(/^대표이사\s/); lpCompanyCells(dx, c, [c.label, sup, supPos]);
    dx.tables().forEach(t => dx.rows(t).forEach(r => { const cs = dx.cells(r); if (cs.length === 7 && /^\d+\s*~\s*\d+$/.test(dx.ct(cs[0])) && /홍길동|임꺽정/.test(dx.ct(r))) [0, 1, 2, 3, 4, 5, 6].forEach(i => dx.setCell(cs[i], '')); if (cs.length === 7 && /관리책임자\s*→/.test(dx.ct(cs[5]))) dx.setCell(cs[5], ''); }));
    dx.tables().filter(t => /차\s*시/.test(dx.ct(dx.rows(t)[0] || t))).forEach(t => dx.fillRows(t, 2, [['1 ~ 8', '', ':  ~  :', c.s.name, c.s.name, sup, '']], [0, 1, 2, 3, 4, 5, 6], { clearRest: false }));
    dx.all('tc').forEach(tc => { const t = dx.ct(tc); if (/^관리책임자$/.test(t)) { let nx = tc.nextSibling; while (nx && nx.localName !== 'tc') nx = nx.nextSibling; if (nx && /ㅇㅇㅇ|^$/.test(dx.ct(nx))) dx.setCell(nx, c.head || c.co.ceo); } });
    dx.repl([[/^(\s*소\s*속\s*:).*$/g, `$1 ${c.label}`], [/^(\s*성\s*명\s*:).*$/g, `$1 ${spaced(sup)}`], [/(훈련기간\s*:\s*)20\s*년?\s*(09월\s*01일\s*~\s*)20\s*년\s*(10월\s*31일)/g, `$1${Y}년 $2${Y}년 $3`], [/^20\d{2}\s*년\s+\d{1,2}\s*월\s+\d{1,2}\s*일$/g, `${Y} 년   ${c.d.slice(5, 7)} 월   ${c.d.slice(8, 10)} 일`]]);
    dx.repl(lpRules(c, { boss: c.head || c.co.ceo }));
    out.push({ name: `${e.title}.docx`, blob: await dx.blob(), kind: 'form', t: e.title }); }
  const px = fOf(L, hasJ(c.s, 'cln', 'fac', 'cook') ? 'patrol-mix' : 'patrol-sec'); if (px) out.push(await lpXlsx(c, px));
  return out;
};
LPS['1-5'] = LPS['1-6'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { dx.kv(/^사업체명$/, c.co.n); })];
LPS['1-7'] = async (c, L) => [await lpStd(c, L.forms[0], dx => {
  dx.repl([[/^(ㅇ\s*성\s*명\s*:)\s*$/g, `$1 ${c.mgr}`], [/^(ㅇ\s*직\s*책\s*:)\s*$/g, `$1 ${c.mgrPos}`], [/^(ㅇ\s*선임일\s*:)\s*$/g, `$1 ${c.d.replace(/-/g, '. ')}.`], [/^(대표이사)\s+\(직인\)/g, `$1 ${spaced(c.co.ceo)}   (직인)`]]);
  dx.kv(/^사업장명$/, c.s.name); dx.kv(/^업종$/, c.jobsS.replace(/·/g, ', ')); })];
/* 2-2 교육계획(엑셀) */
LPS['2-2'] = async (c, L) => { const e = fOf(L, 'field'); return e && !c.online ? [await lpXlsx(c, e)] : []; };
/* 2-3 정기교육일지 — 12개월 · 근무자 명부 · 실시자 */
LPS['2-3'] = async (c, L) => {
  if (c.online) return [];
  const out = [];
  for (const e of L.forms.filter(x => /^m\d+$/.test(x.var) && (!c.per || !c.per.m || +x.var.slice(1) === c.per.m)).sort((a, b) => +a.var.slice(1) - +b.var.slice(1))) {
    const m = +e.var.slice(1), rec = Object.values(SH.edu).find(x => (x.site === c.s.key) && x.type === 'reg' && +String(x.d).slice(5, 7) === m && String(x.d).startsWith(String(c.y)));
    const dx = await lpFormDx(e); dx.stripNotes();
    lpEduFill(dx, c, { date: rec ? `${+rec.d.slice(5, 7)} / ${+rec.d.slice(8, 10)}` : `${m} /`, names: rec ? (rec.att || []).map(id => workerName(c.s.key, id)).filter(Boolean) : c.names });
    dx.repl(lpRules(c)); out.push({ name: `${String(m).padStart(2, '0')}월 ${e.title}.docx`, blob: await dx.blob(), kind: 'form', t: e.title });
  }
  return out;
};
LPS['2-4'] = async (c, L) => {
  const out = [], hires = c.W.filter(w => w.hired && w.hired >= addMonths(c.d, -12)).map(w => w.name);
  for (const e of L.forms) out.push(await lpStd(c, e, dx => lpEduFill(dx, c, { names: hires.length ? hires : [], n: hires.length || '' })));
  return out;
};
LPS['2-5'] = async (c, L) => [await lpStd(c, L.forms[0], dx => {
  const works = (c.info.special && c.info.special.length ? c.info.special : [].concat(...c.jobs.map(j => LK.special[j] || []))); dx.all('tc').forEach(tc => { if (/^1호\s*~\s*3[89]호\s*작업명$/.test(dx.ct(tc))) dx.setCell(tc, works[0] || ''); });
  lpEduFill(dx, c, { names: [] }); })];
LPS['2-6'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { lpEduFill(dx, c, {}); dx.repl([[/\(20\s{1,3}년\s+월\)/g, `(${c.y}년 3월)`]]); })];
LPS['2-7'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { lpEduFill(dx, c, {}); dx.repl([[/\(20\s{1,3}년\s+월\)/g, `(${c.y}년 4월)`]]); })];
LPS['2-8'] = async (c, L) => [await lpStd(c, L.forms[0])];
/* 3-1 위험성평가 — 회사 3×3 기준 · 직종별 상세 유해·위험요인 · 개선실행 계획 · 실시규정 */
LPS['3-1'] = async (c, L) => {
  const H = lpHaz(c), out = [], date = `${c.y}년 ${c.d.slice(5, 7)}월 ${c.d.slice(8, 10)}일`, n = Math.max(c.names.length, c.total || 0);
  const head = dx => { dx.kv(/^사업장명$/, c.s.name, null, true); dx.kv(/^평가담당자$/, c.mgr, null, true); dx.kv(/^참여근로자$/, `${c.mgr} 외 ${Math.max(0, n - 1)}명`, null, true); dx.kv(/^평가일자$|^작성일자$/, date, null, true); dx.all('tc').forEach(tc => { const t = dx.ct(tc); if (/^위험성평가표\(업종명\)$/.test(t)) dx.setCell(tc, `위험성평가표(${c.jobsS})`); if (/^개선실행\s*계획서\(업종명\)$/.test(t)) dx.setCell(tc, `개선실행 계획서(${c.jobsS})`); }); };
  for (const e of L.forms.sort((a, b) => ['cover', 'rule', 'edu1', 'survey', 'meet', 'table', 'plan', 'edu2'].indexOf(a.var) - ['cover', 'rule', 'edu1', 'survey', 'meet', 'table', 'plan', 'edu2'].indexOf(b.var))) {
    const dx = await lpFormDx(e); dx.stripNotes();
    if (e.var === 'edu1' || e.var === 'edu2') lpEduFill(dx, c, { place: `${c.s.name} 회의실` });
    if (e.var === 'survey') { dx.kv(/^담당자$/, `${c.mgr} ${c.mgrPos}   (서  명)`, null, true);
      const t = dx.tables().find(t => /유해ㆍ위험작업/.test(dx.ct(dx.rows(t)[0] || t)) && dx.rows(t).length < 30 && dx.cells(dx.rows(t)[0]).length === 3);
      const TY = ['떨어짐', '넘어짐', '깔림', '부딪힘', '맞음', '무너짐', '끼임', '절단ㆍ베임ㆍ찔림', '감전', '폭발', '파열', '화재', '불균형 및 무리한 동작', '이상온도 접촉', '빠짐ㆍ익사', '화학물질 누출ㆍ접촉', '산소결핍', '사업장 내 교통사고', '폭력행위'];
      const typ = h => { const m = { '넘어짐': 2, '추락': 1, '떨어짐': 1, '부딪힘': 4, '차량': 18, '끼임': 7, '베임': 8, '찔림': 8, '감전': 9, '화재': 12, '폭발': 10, '근골격계': 13, '중량물': 13, '자세': 13, 'VDT': 13, '이상기온': 14, '고온': 14, '화학': 16, '유해물질': 16, '질식': 17, '폭언': 19, '폭행': 19, '위협': 19 }; for (const k in m) if (h.cat.includes(k) || h.hz.includes(k)) return `${'①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲'[m[k] - 1]} ${TY[m[k] - 1]}`; return '⑳ 기타'; };
      if (t) dx.fillRows(t, 1, H.map((h, i) => [`(${i + 1})`, `${h.task} — ${h.hz}`, typ(h)]), [0, 1, 2]); }
    if (e.var === 'meet') { dx.kv(/^회의장소$/, `${c.s.name} 회의실`, null, true);
      const ops = Object.values(SH.op).filter(o => o.site === c.s.key && String(o.d).startsWith(String(c.y)));
      const rows = (c.W.length ? c.W : []).map(w => { const op = ops.find(o => o.by === w.name); return [JOBS[w.job] ? JOBS[w.job].s : c.jobsS, w.name, w.role || '근무자', op ? op.text : '']; });
      ops.filter(o => !c.W.some(w => w.name === o.by)).forEach(o => rows.push([c.jobsS, o.anon ? '익명' : (o.by || ''), '근무자', o.text || '']));
      dx.findTables(['근로자의견', '소속']).forEach((t, ti) => { if (ti === 0) dx.fillRows(t, dx.rows(t).findIndex(r => /소속/.test(dx.ct(r))) + 1, rows, [1, 2, 3, 4]); }); }
    if (e.var === 'table') { head(dx);
      const t = dx.findTables(['유해요인코드'])[0];
      if (t) dx.fillRows(t, 5, H.map(h => { const r = lpR(h.p, h.s), need = r >= 4, r2 = lpR(h.p2, h.s2); return [h.code, h.task, h.cat.replace(/\(.*\)/, ''), h.hz, h.cur, h.p, h.s, r, need ? h.ctrl : '', need ? h.p2 : '', need ? h.s2 : '', need ? r2 : '', need ? (r2 >= 4 || h.plan2 ? '개선실행계획수립' : lpDue(c, 1)) : '']; }), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      if (t) { const col = r => r >= 6 ? 'FF0000' : r >= 4 ? 'FFFF00' : '92D050'; dx.rows(t).slice(5).forEach(tr => { const cs = dx.cells(tr); if (cs.length !== 13) return; [7, 11].forEach(ci => { const v = parseInt(dx.ct(cs[ci]), 10); if (v > 0) dx.shade(cs[ci], col(v)); else dx.shade(cs[ci], 'FFFFFF'); }); }); } }
    if (e.var === 'plan') { head(dx);
      const P = H.filter(h => lpR(h.p, h.s) >= 4 && (h.plan2 || lpR(h.p2, h.s2) >= 4));
      const t = dx.findTables(['코드번호'])[0];
      if (t) dx.fillRows(t, 4, P.map(h => [h.code, h.cat.replace(/^.*\((.+)\)$/, '$1'), `[${h.task}] ${h.hz}\n→ ${h.plan2 || h.ctrl}\n(담당: ${c.mgr || '현장 관리감독자'} · 고객사 협의 · 완료 후 위험성 재평가)`, lpDue(c, lpR(h.p, h.s) >= 6 ? 1 : 3)]), [0, 1, 2, 3]); }
    if (e.var === 'rule') dx.repl([[/ㅇ{5,7}/g, c.s.name]]);
    dx.repl(lpRules(c));
    out.push({ name: `${e.title}.docx`, blob: await dx.blob(), kind: 'form', t: e.title });
  }
  return out;
};
LPS['3-3'] = async (c, L) => [await lpStd(c, L.forms[0])];
LPS['3-4'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { const t = dx.findTables(['방호 조치사항'])[0] || dx.findTables(['품목', '보유수량'])[0]; if (t) dx.fillRows(t, 1, c.mach.map((m, i) => [i + 1, m[0], '', '', 'ㅇ ' + (m[1] || ''), '', '']), [0, 1, 2, 3, 4, 5, 6], { clearCols: [1, 2, 3, 4, 5, 6] }); })];
LPS['3-5'] = async (c, L) => [await lpStd(c, L.forms[0], dx => {
  const cert = Object.keys(PPE).filter(k => PPE[k].jobs.some(j => c.jobs.includes(j)) && LK.cert[k]).map(k => LK.cert[k].replace(/\(.+\)/, ''));
  const t = dx.findTables(['안전인증대상'])[0] || dx.findTables(['안전인증'])[0]; if (t) dx.fillRows(t, 2, cert.map((p, i) => [i + 1, p, '', i + 1, '', '']), [0, 1, 2, 3, 4, 5], { clearCols: [1, 2, 4, 5] }); })];
LPS['3-6'] = async (c, L) => [await lpStd(c, L.forms[0], dx => {
  const recs = Object.values(SH.ppe).filter(p => p.site === c.s.key).sort((a, b) => a.d < b.d ? -1 : 1);
  const items = Object.entries(PPE).filter(([, p]) => p.jobs.some(j => c.jobs.includes(j)));
  const rows = recs.length ? recs.map((p, i) => [i + 1, fmtDs(p.d), workerName(c.s.key, p.wid), '', (PPE[p.item] || {}).n || p.item, p.qty || 1, p.sig ? '서명함' : '', '']) :
    [].concat(...c.W.map(w => items.filter(([, p]) => !w.job || p.jobs.includes(w.job)).map(([, p]) => ['', '', w.name, w.no || '', p.n, 1, '', p.m ? `교체 ${p.m}개월` : '소모품']))).map((r, i) => (r[0] = i + 1, r));
  const t = dx.findTables(['지급일자'])[0]; if (t) dx.fillRows(t, 2, rows, [0, 1, 2, 3, 4, 5, 6, 7], { clearCols: [1, 2, 3, 4, 5] }); })];
/* 4장 */
LPS['4-1'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { const t = dx.findTables(['물질명', '보관장소'])[0]; if (t) dx.fillRows(t, 1, c.chem.map((x, i) => [i + 1, x[0], '', x[1] || '', '']), [0, 1, 2, 3, 4], { clearCols: [1, 2, 3, 4] }); })];
LPS['4-2'] = async (c, L) => [await lpStd(c, L.forms[0])];
LPS['4-3'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { const t = dx.findTables(['검진구분', '성명'])[0]; if (t) dx.fillRows(t, 1, c.W.map(w => ['일반', w.no || '', w.name]), [0, 1, 2], { clearRest: false }); })];
LPS['4-4'] = async (c, L) => [await lpStd(c, L.forms[0])];
LPS['4-5'] = async (c, L) => { const out = []; for (const e of L.forms) out.push(await lpStd(c, e)); return out; };
/* 4-6 근골격계 — 사업장 기존 조사(3년 주기 유효)면 그대로 · 아니면 회사 양식에 직종별 상세 작성 */
LPS['4-6'] = async (c, L) => {
  const out = [], T = [].concat(...c.jobs.map(j => (MSDX[j] || []).map(t => ({ j, t })))), date = `${c.y}.${c.d.slice(5, 7)}.${c.d.slice(8, 10)}`, work = T.map(x => x.t[0]).join(' / ');
  if (L.site.length) { for (const e of L.site) out.push(await lpSite(c, e)); }
  for (const e of L.forms) {
    if (L.site.length && e.var !== 'symptom') continue;
    const dx = await lpFormDx(e); dx.stripNotes();
    const top = (root) => { dx.kv(/^사업장명$/, c.s.name, root, true); dx.kv(/^조사일자$|^조사일시$/, date, root, true); dx.kv(/^조사자$/, c.mgr, root, true); dx.kv(/^업종명$/, c.jobsS.replace(/·/g, ', '), root, true); dx.kv(/^작업내용$/, work, root); };
    if (e.var === 'cover') dx.repl([[/^20\s?\.\s?\d{2}$/g, `${c.y}. ${c.d.slice(5, 7)}`], [/^(사업장명\s*:).*$/g, `$1 ${c.s.name}`]]);
    if (e.var === 'check') { top();
      const t = dx.tables()[1] || dx.tables().find(x => dx.rows(x).length >= 12); const sub = [].concat(...T.map(x => x.t[1].map((s, i) => [`${JOBS[x.j].s} · ${x.t[0]}: ${s}`, x.t[2][i] || 0])));
      if (t) { const st = dx.rows(t).findIndex(r => /^작업내용/.test(dx.ct(r))); dx.fillRows(t, st < 0 ? 6 : st, sub.map(([nm, ho]) => [nm].concat(Array.from({ length: 11 }, (_, k) => ho === k + 1 ? '○' : '×'))), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); } }
    if (e.var === 'survey') {
      dx.repeat(Math.max(1, T.length), (g, i) => { const x = T[i]; if (!x) return; top(g);
        dx.all('tc', g).forEach(tc => { if (/^□\s*정기조사$/.test(dx.ct(tc))) dx.setCell(tc, '■ 정기조사'); });
        dx.tables(g).forEach(t => { const r0 = dx.ct(dx.rows(t)[0]); if (/^작업설비|^작 업 량|^작업속도/.test(r0)) dx.rows(t).forEach(r => { const cs = dx.cells(r); if (cs[1] && /□\s*변화없음/.test(dx.ct(cs[1]))) dx.setCell(cs[1], '■ 변화없음'); }); });
        const step1 = dx.tables(g).find(t => /^작업내용/.test(dx.ct(dx.rows(t)[0])) && dx.rows(t).length === 6 && /세부작업내용/.test(dx.ct(dx.rows(t)[1])));
        if (step1) { dx.setCell(dx.cells(dx.rows(step1)[0])[1], `- ${x.t[0]} (${JOBS[x.j].n})`); dx.rows(step1).slice(1).forEach((r, k) => { const cs = dx.cells(r); dx.setCell(cs[cs.length - 1], x.t[1][k] ? `${'①②③④⑤'[k]} ${x.t[1][k]}` : `${'①②③④⑤'[k]}`); }); }
        const step2 = dx.tables(g).find(t => /세부작업내용/.test(dx.ct(dx.rows(t)[0])) && /부담작업/.test(dx.ct(dx.rows(t)[0])));
        if (step2) dx.fillRows(step2, 1, x.t[1].slice(0, 5).map((s, k) => { const ho = x.t[2][k]; return [`${'①②③④⑤'[k]} ${s}`, ho ? `${ho}호` : '해당 없음', ho ? x.t[3] : '', ho ? x.t[4] : '', ho ? String(x.t[3] * x.t[4]) : '']; }), [0, 1, 2, 3, 4], { clearRest: false });
        const step3 = dx.tables(g).find(t => /^작업내용/.test(dx.ct(dx.rows(t)[0])) && dx.rows(t).length === 2);
        if (step3) { dx.setCell(dx.cells(dx.rows(step3)[0])[1], `- ${x.t[0]}`); dx.setCell(dx.cells(dx.rows(step3)[1])[0], `<작업별로 관찰된 유해요인에 대한 원인분석>\n· 세부작업: ${x.t[1].filter((_, k) => x.t[2][k]).join(', ') || '부담작업 해당 없음'}\n· 유해요인: ${x.t[5]}\n· 개선 방향: ${x.t[7]}`); }
      }); }
    if (e.var === 'symptom') dx.repeat(Math.max(1, c.W.length), (g, i) => { const w = c.W[i]; if (!w) return; dx.kv(/^성명$/, w.name, g, true); dx.kv(/^업종$/, JOBS[w.job] ? JOBS[w.job].s : c.jobsS, g, true); });
    if (e.var === 'plan') { const t = dx.findTables(['작업내용(근로자)'])[0] || dx.tables()[0]; const P = [].concat(...T.map(x => x.t[2].some(Boolean) ? [[x.t[0], x.t[1].filter((_, k) => x.t[2][k]).join(', '), x.t[5], '', x.t[7], `${c.y}.${c.d.slice(5, 7)}`, '', '', '', '']] : []));
      if (t) dx.fillRows(t, 2, P.map((r, i) => [i + 1].concat(r)), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { clearCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }); }
    dx.repl(lpRules(c)); out.push({ name: `${e.title}.docx`, blob: await dx.blob(), kind: 'form', t: e.title });
  }
  return out;
};
LPS['4-7'] = async (c, L) => { const out = []; for (const e of L.forms) out.push(lpExt(e.k) === 'pptx' ? await lpPptx(c, e) : await lpStd(c, e)); return out; };
LPS['4-8'] = async (c, L) => [await lpStd(c, L.forms[0], dx => {
  const MM = c.per && c.per.m ? [c.per.m] : [6, 7, 8, 9];
  dx.repeat(MM.length, (g, i) => { const m = MM[i]; dx.repl([[/^(사업장명\s*:)\s{3,}(작업장소\s*:)\s*(.*?)(측정일자\s*:)\s*년\s*월\s*일/g, `$1 ${c.s.name}     $2 ${hasJ(c.s, 'sec', 'prk') ? '정문 · 외곽' : '옥외 작업장'}     $4 ${c.y}년 ${m}월     일`]], g);
    dx.tables(g).forEach(t => dx.rows(t).forEach(r => dx.cells(r).forEach(tc => { if (dx.ct(tc) === '홍길동') dx.setCell(tc, c.mgr); if (dx.ct(tc) === '예시') dx.setCell(tc, ''); }))); }); })];
/* 5장 */
LPS['5-1'] = async (c, L) => {
  if (L.site.length) return [await lpSite(c, L.site[0])];
  return [await lpStd(c, L.forms[0], dx => {
    const items = Object.entries(PPE).filter(([, p]) => p.jobs.some(j => c.jobs.includes(j)));
    const nOf = p => c.W.length ? c.W.filter(w => !w.job || p.jobs.includes(w.job)).length : c.jobs.filter(j => p.jobs.includes(j)).reduce((a, j) => a + (+(c.s.hc && c.s.hc[j]) || 0), 0) || c.total || 1;
    const fac = [['안전표지판', 2, 10000], ['소화기(교체·충전)', 1, 30000]].concat(hasJ(c.s, 'sec', 'prk') ? [['경광봉 · 경광등', 2, 5000]] : []).concat(hasJ(c.s, 'cln') ? [['「청소 중」 미끄럼주의 표지', 2, 15000]] : []);
    const ppe = items.map(([k, p]) => [p.n, Math.ceil(nOf(p) * (p.m ? 12 / p.m : 12) * (p.m ? 1 : .5)), LK.price[k] || 10000]);
    const edu = [['안전보건교육 교재 · 온라인 교육', Math.max(1, c.names.length || c.total), 20000]], health = [['구급함 · 의약품', 1, 50000], ['폭염 대비(식수 · 쿨토시 · 냉방용품)', Math.max(1, c.names.length || c.total), 15000], ['한파 대비(방한용품 · 핫팩)', Math.max(1, c.names.length || c.total), 15000]];
    const t = dx.tables()[0], rows = dx.rows(t);
    const secIdx = rows.map((r, i) => [i, dx.ct(dx.cells(r)[0] || r)]).filter(([, x]) => x && !/^구\s*분|^합\s*계$|^계$/.test(x)).map(([i, x]) => [i, x]);
    const groups = { '안전시설': fac, '개인보호구': ppe, '교육': edu, '보건': health, '건강': health };
    secIdx.forEach(([ri, name], gi) => { const next = secIdx[gi + 1] ? secIdx[gi + 1][0] : rows.findIndex((r, i) => i > ri && /합\s*계|^계/.test(dx.ct(r))); const end = next > ri ? next : rows.length; const key = Object.keys(groups).find(k => name.includes(k)); const data = key ? groups[key] : [];
      let last = rows[end - 1];
      for (let k = end - ri; k < data.length; k++) { const cl = last.cloneNode(true); last.parentNode.insertBefore(cl, last.nextSibling); last = cl; const c0 = dx.cells(cl)[0]; if (c0 && dx.ct(c0)) dx.setCell(c0, ''); }
      const grp = []; for (let tr = rows[ri]; tr; tr = tr.nextSibling) { if (tr.nodeType !== 1 || tr.localName !== 'tr') continue; if (tr !== rows[ri] && (rows.indexOf(tr) >= end && rows.indexOf(tr) !== -1)) break; grp.push(tr); if (grp.length >= Math.max(end - ri, data.length)) break; }
      grp.forEach((tr, k) => { const cs = dx.cells(tr); if (cs.length < 5) return; const d = data[k]; dx.setCell(cs[1], d ? d[0] : ''); dx.setCell(cs[2], d ? String(d[1]) : ''); dx.setCell(cs[3], d ? nf(d[2]) : ''); dx.setCell(cs[4], d ? nf(d[1] * d[2]) : ''); }); });
    const sum = [].concat(fac, ppe, edu, health).reduce((a, d) => a + d[1] * d[2], 0);
    dx.rows(t).forEach(r => { const cs = dx.cells(r); if (cs.length && /^(합\s*계|계)$/.test(dx.ct(cs[0]))) dx.setCell(cs[cs.length - 1], nf(sum)); });
    dx.dropGroup(isPText(dx, /^안전∙보건관리비 사용계획서|^안전∙보건관리비 사용내역서/), 1); // 작성 例 묶음 떼기
  })];
};
LPS['5-2'] = async (c, L) => { if (lpCo(c) === 'best' && L.orig.length) return []; const e = L.forms.find(x => x.var === (hasJ(c.s, 'sec') ? 'sec' : 'infra')) || L.forms[0]; return e ? [await lpStd(c, e)] : []; };
LPS['5-3'] = async (c, L) => {
  const out = [], tag = [c.s.ind].concat(c.jobs), sc = LK.scen.filter(x => x[1] === '*' || x[1].split(',').some(t => tag.includes(t))), n = Math.max(c.names.length, c.total || 0);
  for (const e of L.site) out.push(await lpSite(c, e));
  const d = fOf(L, 'drill');
  if (d) { const dx = await lpFormDx(d); dx.stripNotes();
    const Q = c.per && c.per.q ? [c.per.q - 1] : [0, 1, 2, 3];
    dx.repeat(Q.length, (g, qi) => { const q = Q[qi], s = sc[q % sc.length] || sc[0];
      dx.tables(g).forEach(t => dx.rows(t).forEach(r => { const cs = dx.cells(r); cs.forEach((tc, k) => { const x = dx.ct(tc).replace(/\s/g, '');
        if (x === '훈련명' && cs[k + 1]) dx.setCell(cs[k + 1], `${s[0]} 발생에 따른 비상 대응훈련 (${q + 1}분기)`);
        if (x === '훈련일시' && cs[k + 1]) dx.setCell(cs[k + 1], `${c.y}년 ${String((q + 1) * 3).padStart(2, '0')}월    일(   :    ~    :   )`);
        if (x === '훈련장소' && cs[k + 1]) dx.setCell(cs[k + 1], c.s.name);
        if (x === '주관자' && cs[k + 1]) dx.setCell(cs[k + 1], `${c.mgr} ${c.mgrPos}`);
        if (x === '참가자' && cs[k + 1]) dx.setCell(cs[k + 1], `${c.mgr} 외 ${Math.max(0, n - 1)}명`); }); }));
      dx.tables(g).forEach(t => { const rows = dx.rows(t); const hi = rows.findIndex(r => /대\s*응\s*활\s*동/.test(dx.ct(r))); if (hi >= 0 && rows[hi + 1]) { const cs = dx.cells(rows[hi + 1]); if (cs.length >= 2) { dx.setCell(cs[0], s[2]); dx.setCell(cs[1], s[3].map(x => '■ ' + x).join('\n')); if (cs[2]) dx.setCell(cs[2], '비상연락망 및 대피장소 참고'); } }
        const hj = rows.findIndex(r => /문제점\s*및\s*개선방안/.test(dx.ct(r))); if (hj >= 0 && rows[hj + 1]) { const cs = dx.cells(rows[hj + 1]); if (cs.length >= 2) { dx.setCell(cs[0], s[2]); dx.setCell(cs[1], ''); } } });
      dx.repl([[/^20\d{2}년\s*00월\s*00일\s+.*\(서명\)$/g, `${c.y}년    월    일      ${c.mgr} ${c.mgrPos} (서명)`]], g); });
    dx.repl(lpRules(c)); out.push({ name: c.per && c.per.q ? `${c.y} ${c.per.q}분기 비상대응 훈련계획 및 결과.docx` : `${c.y} 비상대응 훈련계획 및 결과(분기).docx`, blob: await dx.blob(), kind: 'form', t: '비상대응 훈련계획 및 결과(분기)' }); }
  const ct = fOf(L, 'contact');
  if (ct) out.push(await lpPptx(c, ct, (d) => {
    const tbl = [...d.getElementsByTagNameNS(ANS, 'tbl')][0]; if (!tbl) return; const rows = [...tbl.getElementsByTagNameNS(ANS, 'tr')];
    const ppl = [[c.s.name, c.mgr, c.mgrPos, ''], [c.label, c.head || '', c.headPos, ''], [(c.s.client && c.s.client.co) || '고객사', (c.s.client && c.s.client.name) || '', (c.s.client && c.s.client.pos) || '', (c.s.client && c.s.client.tel) || '']];
    const setT = (tc, v) => { const ts = [...tc.getElementsByTagNameNS(ANS, 't')]; if (ts.length) { ts[0].textContent = v; ts.slice(1).forEach(t => t.textContent = ''); } };
    rows.slice(1).forEach((r, i) => { const cs = [...r.getElementsByTagNameNS(ANS, 'tc')]; const p = ppl[i]; if (!p || cs.length < 4) return; cs.slice(0, 4).forEach((tc, k) => { if (p[k] || /0000/.test([...tc.getElementsByTagNameNS(ANS, 't')].map(t => t.textContent).join(''))) setT(tc, p[k]); }); });
  }));
  return out;
};
LPS['5-4'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { dx.all('tc').forEach(tc => { if (/^부문\s+본부\s+지사/.test(dx.ct(tc))) dx.setCell(tc, `${c.label}  ${c.s.name}`); }); })];
LPS['5-5'] = async (c, L) => [await lpStd(c, L.forms[0])];
LPS['6-1'] = async (c, L) => [await lpStd(c, L.forms[0], dx => { lpCompanyCells(dx, c); dx.repl([[/^홍\s*길\s*동$/g, spaced(c.head || c.mgr)]]); })];
LPS['6-2'] = LPS['6-3'] = async (c, L) => [await lpStd(c, L.forms[0], dx => dx.repl([[/^홍길동$/g, c.mgr]]))];
LPS['7-1'] = async (c, L) => [await lpStd(c, L.forms[0])];
LPS['7-2'] = async (c, L) => { const out = [], want = [...new Set(c.jobs.map(j => j === 'prk' || j === 'info' ? 'sec' : j === 'cook' ? 'cln' : j))]; for (const v of want) { const e = fOf(L, v); if (e) out.push(await lpStd(c, e)); } return out; };
LPS['7-3'] = async (c, L) => {
  const out = [], d = fOf(L, 'doc'); if (d) out.push(await lpStd(c, d));
  const x = fOf(L, 'log'); if (x) out.push(await lpXlsx(c, x));
  return out;
};

/* =====================================================================
 * 항목 만들기 · 대장 전체(ZIP)
 * ===================================================================== */
const LP_DIR = { 0: '0_표지_및_목차', 1: '1_안전보건관리체계_구축', 2: '2_안전보건교육', 3: '3_사업장_안전관리', 4: '4_사업장_보건관리', 5: '5_중대산업재해_관리', 6: '6_도급시_산업재해예방', 7: '7_기타_안전관리_준수사항' };
async function lpBuildItem(s, id, per) {
  await lpInit(); const c = ledCtx(s), L = lpFor(c, id), out = []; if (per) c.per = per;
  const fn = LPS[id];
  if (fn && (L.forms.length || L.site.length)) { try { out.push(...await fn(c, L)); } catch (e) { console.error(id, e); out.push({ name: `${id}_작성오류.txt`, blob: new Blob([`${id} 작성 중 오류: ${e.message || e}`]), kind: 'err', t: '오류' }); } }
  for (const e of L.orig) if (!per || (per.origRe && per.origRe.test(`${e.name || ''} ${e.title || ''}`))) out.push(await lpOrig(e));
  return out;
}
const lpCount = (s, id) => { if (!lpHas()) return null; const L = lpFor(ledCtx(s), id); return { forms: L.forms.length, site: L.site.length, orig: L.orig.length }; };
async function lpOutItem(s, id) {
  busy(true, `${id} 회사 양식으로 작성 중…`);
  try {
    const it = LED_ID[id], files = await lpBuildItem(s, id);
    if (!files.length) { toast('이 항목은 회사 양식 · 원본이 없습니다 — 간이 서식으로 만듭니다'); busy(false); return ledOutItem(s, id, 'docx'); }
    const sorted = files.map((f, i) => Object.assign(f, { _i: i })).sort((x, y) => (lpKindOrder[x.kind] || 0) - (lpKindOrder[y.kind] || 0) || x._i - y._i);
    if (sorted.length === 1) await download(sorted[0].blob, lpNm(`${id}-01 ${s.name} ${sorted[0].name}`));
    else { const z = new JSZip(), dir = `${lpItDir(it)}/`; sorted.forEach((f, i) => z.file(`${dir}${id}-${String(i + 1).padStart(2, '0')} ${lpNm((f.kind === 'orig' ? '[원본] ' : f.kind === 'site' ? '[사업장] ' : '') + f.name)}`, f.blob)); await download(await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), lpNm(`${fileStamp()} ${s.name} ${id}. ${it.t}.zip`)); }
    ledMarkGen(s.key, [id]); toast(`${id} ${it.t} — 회사 양식 ${files.filter(f => f.kind !== 'orig').length}개 · 원본 ${files.filter(f => f.kind === 'orig').length}개`, 3500);
  } catch (e) { console.error(e); toast('작성하지 못했습니다: ' + (e.message || e), 5000); }
  finally { busy(false); RENDER.led(); }
}
/* 대장 전체 — 「안전보건관리대장 목차」 순서 그대로: 0 표지·목차 → 1장(1-0 목차, 1-1 ~ 1-8) → … → 7장(7-4)
 *  폴더 · 파일 이름 앞에 목차 번호 · 순번을 붙여 탐색기에서 이름순으로 보면 목차 순서가 됨 · 해당 없음 항목도 사유 파일로 자리 유지 */
const LP_CHT = { 0: '0. 표지 및 목차', 1: '1. 안전보건관리체계 구축', 2: '2. 안전보건교육', 3: '3. 사업장 안전관리', 4: '4. 사업장 보건관리', 5: '5. 중대산업재해 관리', 6: '6. 도급시 산업재해 예방', 7: '7. 기타 안전관리 준수사항' };
/* 파일 이름 — 목차 표기 그대로(띄어쓰기 · 점 유지) · 쓸 수 없는 글자만 바꿈 */
const lpNm = t => String(t || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
const lpChDir = ch => lpNm(LP_CHT[ch]);
const lpItDir = it => lpNm(`${it.id}. ${it.t}`);
const lpKindOrder = { form: 0, site: 1, orig: 2, err: 3 };
async function lpFullZip(s, zip, root, shared) {
  const c = ledCtx(s), put = (dir, n, name, blob) => zip.file(`${dir}${n} ${lpNm(name)}`, blob);
  // 0. 표지 및 목차 — 표지 · 전체 목차만, 장 목차는 각 장 폴더의 맨 앞(X-0)으로
  const zero = await lpBuildItem(s, '0'), chToc = {};
  let k0 = 0; const d0 = `${root}${lpChDir(0)}/`;
  zero.forEach(f => { const m = /^(\d)장_목차/.exec(f.name.replace(/\s/g, '_')) || /^(\d)장 목차/.exec(f.t || ''); if (m) { chToc[m[1]] = f; return; } put(d0, `0-${++k0}`, f.name, f.blob); });
  if (!zero.length) put(d0, '0-1', '안전보건관리대장(표지·목차).docx', await packDocx(blocksToDocx(ldFix(LG['0'](c))), s.name));
  for (let ch = 1; ch <= 7; ch++) {
    const cd = `${root}${lpChDir(ch)}/`;
    if (chToc[ch]) put(cd, `${ch}-0`, `${LP_CHT[ch].replace(/^\d\.\s*/, '')} 목차.docx`, chToc[ch].blob);
    for (const it of LED.filter(x => x.ch === ch)) {
      const dir = `${cd}${lpItDir(it)}/`, ap = ledApp(s, it);
      if (ap.v === 'n') { put(dir, `${it.id}-00`, '해당없음.txt', new Blob([`${it.id} ${it.t}\n${it.docs}\n\n이 사업장은 해당 없음(n/a) — ${ap.why}\n${s.name} · ${fmtDs(today())}`], { type: 'text/plain' })); continue; }
      let files = await lpBuildItem(s, it.id);
      if (!files.length && LG[it.id]) files = [{ name: `${it.t}(간이서식).docx`, blob: await packDocx(blocksToDocx(ledBlocks(s, it.id)), s.name), kind: 'form' }];
      files = files.map((f, i) => Object.assign(f, { _i: i })).sort((x, y) => (lpKindOrder[x.kind] || 0) - (lpKindOrder[y.kind] || 0) || x._i - y._i);
      let n = 0;
      files.forEach(f => {
        const tag = f.kind === 'orig' ? '[원본] ' : f.kind === 'site' ? '[사업장] ' : '';
        if (shared && f.kind === 'orig' && f.shared) { const key = `${it.id}/${f.name}`; if (!shared.has(key)) { shared.add(key); zip.file(`공통원본(회사·지사)/${lpChDir(ch)}/${lpItDir(it)}/${lpNm(f.name)}`, f.blob); } return; }
        put(dir, `${it.id}-${String(++n).padStart(2, '0')}`, tag + f.name, f.blob);
      });
      const st = ((SH.led[s.key] || {}).it || {})[it.id] || {};
      for (const f of (st.files || [])) { const b = await ldbGet(f.key).catch(() => null); if (b) put(dir, `${it.id}-${String(++n).padStart(2, '0')}`, '[첨부] ' + f.n, b); }
    }
  }
  ledMarkGen(s.key, LED.filter(it => ledApp(s, it).v !== 'n' && it.kind !== 'ext').map(it => it.id));
}
/* 빈 회사 양식(사업장 미지정) — 항목의 회사 양식 원본 그대로 */
async function lpBlankItem(id) {
  await lpInit(); if (!lpHas()) return toast('먼저 회사 양식팩을 불러오세요');
  const it = LED_ID[id] || { id, t: '표지 및 목차' }, F = LP.man.files.filter(x => x.item === id && (x.kind === 'f' || (x.kind === 'o' && /^(all|co-best)$/.test(x.scope))));
  if (!F.length) return toast('이 항목은 회사 양식이 없습니다 — 사업장을 고르면 간이 서식으로 만들 수 있습니다');
  busy(true, `${id} 빈 양식 준비 중…`);
  try { const z = new JSZip(); let n = 0; for (const e of F) z.file(`${id}-${String(++n).padStart(2, '0')}_${e.kind === 'o' ? '[원본] ' : ''}${safeName(e.name.replace(/^[0-9a-f]{12}_/, ''))}`, await lpBlob(e.k));
    if (F.length === 1) await download(await lpBlob(F[0].k), `${id}_${safeName(F[0].name.replace(/^[0-9a-f]{12}_/, ''))}`);
    else await download(await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${id}_${safeName(it.t)}_회사양식.zip`); }
  finally { busy(false); }
}
async function lpOutFull(s) {
  const z = new JSZip();
  try { busy(true, `${s.name} 관리대장 — 회사 양식으로 작성 중…`); await lpFullZip(s, z, ''); busy(true, 'ZIP 묶는 중…');
    await download(await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), lpNm(`${fileStamp()} ${s.name} ${today().slice(0, 4)}년 안전보건관리대장.zip`)); toast('관리대장을 회사 양식 폴더 구성 그대로 만들었습니다', 3500); }
  catch (e) { console.error(e); toast('만들지 못했습니다: ' + (e.message || e), 5000); }
  finally { busy(false); RENDER.led(); }
}
async function lpBatch(sites) {
  if (!sites.length) return toast('사업장이 없습니다');
  const per = 10, parts = Math.ceil(sites.length / per);
  if (!confirmBox(`${sites.length}곳 사업장의 안전보건관리대장을 회사 양식으로 만듭니다.${parts > 1 ? ` 용량 때문에 ${per}곳씩 ${parts}개 ZIP으로 나눠 내려받습니다.` : ''} 사업장이 많으면 몇 분 걸릴 수 있습니다. 계속할까요?`)) return;
  try {
    for (let pi = 0; pi < parts; pi++) {
      const z = new JSZip(), shared = new Set(), part = sites.slice(pi * per, pi * per + per);
      for (let i = 0; i < part.length; i++) { const s = part[i]; busy(true, `관리대장 작성 중… ${pi * per + i + 1}/${sites.length} ${s.name}`); await lpFullZip(s, z, `${lpNm(siteOrgLabel(s) || '기타')}/${lpNm(s.name)}/`, shared); await new Promise(r => setTimeout(r, 0)); }
      busy(true, `ZIP 묶는 중… ${pi + 1}/${parts}`);
      await download(await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${fileStamp()}_안전보건관리대장_${sites.length}곳${parts > 1 ? `_${pi + 1}of${parts}` : ''}.zip`);
    }
    toast(`${sites.length}곳 관리대장을 만들었습니다`);
  } catch (e) { console.error(e); toast('만들지 못했습니다: ' + (e.message || e), 5000); }
  finally { busy(false); RENDER.led(); }
}

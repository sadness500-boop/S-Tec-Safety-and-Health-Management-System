/* =====================================================================
 * 출력 공통 엔진 — 성과관리 시스템과 같은 문서 모델(블록 → Word·PDF) · 슬라이드 모델(→ PPT·PDF) · 엑셀 서식
 *  하나의 문서 모델(블록)을 Word와 PDF로, 하나의 슬라이드 모델을 PPT와 PDF로 그립니다.
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const C = { navy: '0B1F8F', navyD: '07124F', green: '1E8B3A', greenD: '17552F', brick: 'E34234', silver: 'C9CED6', silverL: 'EEF1F5', ink: '1C2333', gray: '5B6475', white: 'FFFFFF', tint: 'F4F6FB', tintG: 'EEF7F1', line: 'BFC6D4', amber: 'D98E04' };
const W_FONT = '맑은 고딕';
const imgType = src => /^data:image\/png/.test(src) ? 'png' : 'jpg';
const fileStamp = () => { const d = kstNow(); return `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
function periodTitle(r) {
  const f = parseD(r.from), t = parseD(r.to);
  if (r.from === r.to) return `${f.getFullYear()}. ${f.getMonth() + 1}. ${f.getDate()}.(${WKK[f.getDay()]})`;
  if (f.getDate() === 1 && t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() && f.getMonth() === t.getMonth()) return `( ${f.getMonth() + 1} )월`;
  if (f.getMonth() === 0 && f.getDate() === 1 && t.getMonth() === 11 && t.getDate() === 31) return `${f.getFullYear()}년`;
  if (f.getDate() === 1 && f.getMonth() % 3 === 0 && t.getMonth() === f.getMonth() + 2 && t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()) return `${f.getFullYear()}년 ${f.getMonth() / 3 + 1}분기`;
  return `${fmtDs(f)} ~ ${fmtDs(t)}`;
}
const perWord = r => r.from === r.to ? '일일' : daysIn(r) <= 7 ? '주간' : daysIn(r) <= 31 ? '월' : daysIn(r) <= 92 ? '분기' : '연간';
const nextWord = r => r.from === r.to ? '익일' : daysIn(r) <= 7 ? '차주' : daysIn(r) <= 31 ? '차월' : daysIn(r) <= 92 ? '차분기' : '차년도';

/* =====================================================================
 * 문서 모델 → Word (docx)
 * ===================================================================== */
const DOCW = 9638; // A4 본문 폭(twip): 11906 − 좌우 1134×2
function R(t, o = {}) { return new docx.TextRun({ text: String(t ?? ''), bold: o.bold, size: o.size || 20, color: o.color || C.ink, font: W_FONT, italics: o.it }); }
function P(runs, o = {}) { return new docx.Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 60, line: o.line || 276 }, keepNext: o.keepNext, pageBreakBefore: o.pb, indent: o.indent }); }
function lineParas(text, o = {}) { const ls = String(text ?? '').split('\n'); return ls.map((l, i) => P([R(l, o)], { after: i === ls.length - 1 ? 0 : 20, align: o.align })); }
function dCell(v, w, o = {}) {
  const ch = v && v.img ? [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ type: imgType(v.img), data: b64ToU8(dataUrlB64(v.img)), transformation: { width: v.w, height: v.h } })] })]
    : lineParas(v == null || v === '' ? (o.dash === false ? '' : '-') : v, { size: o.size || 18, bold: o.bold, color: o.color, align: o.align });
  return new docx.TableCell({ children: ch, width: { size: w, type: docx.WidthType.DXA }, columnSpan: o.span, rowSpan: o.rowSpan, verticalAlign: docx.VerticalAlign.CENTER,
    shading: o.fill ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 } });
}
function dTable(rows, widths, o = {}) {
  const bd = { style: docx.BorderStyle.SINGLE, size: 4, color: C.line };
  return new docx.Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: docx.WidthType.DXA }, columnWidths: widths, layout: docx.TableLayoutType.FIXED, alignment: o.align,
    borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd } });
}
function wOf(ratios, total = DOCW) { const s = ratios.reduce((a, b) => a + b, 0); const w = ratios.map(r => Math.floor(r / s * total)); w[w.length - 1] += total - w.reduce((a, b) => a + b, 0); return w; }
function blocksToDocx(blocks) {
  const out = [], AL = docx.AlignmentType;
  blocks.forEach(b => {
    if (b.k === 'pb') { out.push(new docx.Paragraph({ children: [new docx.PageBreak()] })); return; }
    if (b.k === 'title') {
      const ap = b.approval ? b.approval : null;
      if (ap) {
        const w = wOf([5.6, .5].concat(ap.map(() => 1)), DOCW);
        out.push(dTable([
          new docx.TableRow({ children: [dCell(b.t, w[0], { size: 34, bold: true, rowSpan: 2, align: AL.CENTER, dash: false }), dCell('결\n재', w[1], { rowSpan: 2, align: AL.CENTER, fill: C.silverL, bold: true })].concat(ap.map((a, i) => dCell(a, w[i + 2], { align: AL.CENTER, fill: C.silverL, bold: true }))) }),
          new docx.TableRow({ height: { value: 700, rule: docx.HeightRule.ATLEAST }, children: ap.map((a, i) => dCell('/', w[i + 2], { align: AL.CENTER, color: C.gray })) })
        ], w));
      } else String(b.t).split('\n').forEach((l, i, a) => out.push(P([R(l, { size: i ? 30 : 34, bold: true, color: C.navy })], { align: AL.CENTER, after: i === a.length - 1 ? 80 : 20 })));
      if (b.sub) out.push(P([R(b.sub, { size: 19, color: C.gray })], { align: AL.CENTER, before: 60, after: 120 }));
      else out.push(P([R('')], { after: 60 }));
      return;
    }
    if (b.k === 'info') { const w = wOf([1.2, 2.2, 1.2, 2.2]); out.push(dTable(b.rows.map(r => new docx.TableRow({ children: [dCell(r[0], w[0], { fill: 'E8F5EC', bold: true, align: AL.CENTER, color: C.greenD }), dCell(r[1], w[1]), dCell(r[2], w[2], { fill: 'E8F5EC', bold: true, align: AL.CENTER, color: C.greenD }), dCell(r[3], w[3])] })), w)); out.push(P([R('')], { after: 80 })); return; }
    if (b.k === 'h') { out.push(P([R(b.t, { size: 23, bold: true, color: C.navy })], { before: 200, after: 80, keepNext: true })); return; }
    if (b.k === 'h2') { out.push(P([R('■ ' + b.t, { size: 20, bold: true, color: C.greenD })], { before: 120, after: 60, keepNext: true })); return; }
    if (b.k === 'p') { out.push(...lineParas(b.t, { size: b.size || 19, color: b.color })); out.push(P([R('')], { after: 40 })); return; }
    if (b.k === 'box') { const w = [DOCW]; out.push(dTable([new docx.TableRow({ children: [new docx.TableCell({ width: { size: DOCW, type: docx.WidthType.DXA }, shading: { type: docx.ShadingType.CLEAR, color: 'auto', fill: 'EEF7F1' }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [P([R(b.title || '', { bold: true, size: 21, color: C.greenD })], { after: 60 })].concat((b.items || []).map(x => P([R('✔ ', { color: C.green, bold: true, size: 19 }), R(x, { size: 19 })], { after: 30 }))) })] })], w)); out.push(P([R('')], { after: 60 })); return; }
    if (b.k === 'bullets') { b.items.forEach(x => out.push(P([R('• ' + x, { size: 19 })], { after: 30, indent: { left: 200 } }))); return; }
    if (b.k === 'table') {
      const w = wOf(b.w || b.head.map(() => 1)), al = b.align || [];
      const rows = [new docx.TableRow({ tableHeader: true, children: b.head.map((h, i) => dCell(h, w[i], { fill: b.headFill || 'DCE3F3', bold: true, align: AL.CENTER, size: 18 })) })];
      b.rows.forEach(r => {
        if (r && r.cat) { rows.push(new docx.TableRow({ children: [dCell(r.cat, DOCW, { span: b.head.length, bold: true, fill: r.fill || 'EEF1F5', color: r.color || C.navy, size: 18 })] })); return; }
        const tot = r && r.tot; const cells = tot ? r.cells : r;
        rows.push(new docx.TableRow({ children: cells.map((c, i) => dCell(c, w[i], { size: b.size || 17, align: al[i] === 'c' ? AL.CENTER : al[i] === 'r' ? AL.RIGHT : AL.LEFT, bold: tot, fill: tot ? 'F1F3F8' : undefined })) }));
      });
      out.push(dTable(rows, w)); out.push(P([R('')], { after: 60 })); return;
    }
    if (b.k === 'img') { const wIn = b.wIn || 6.6, hIn = wIn * (b.ratio || .42); out.push(new docx.Paragraph({ alignment: AL.CENTER, spacing: { before: 40, after: 40 }, children: [new docx.ImageRun({ type: imgType(b.src), data: b64ToU8(dataUrlB64(b.src)), transformation: { width: wIn * 96, height: hIn * 96 } })] })); if (b.caption) out.push(P([R(b.caption, { size: 16, color: C.gray, it: true })], { align: AL.CENTER, after: 100 })); return; }
    if (b.k === 'photos') {
      const w = wOf([.7, 2.2, 2.2, .9]), iw = 2.1 * 96, ih = 1.45 * 96;
      const rows = [new docx.TableRow({ tableHeader: true, children: ['일자·장소', '작업 전', '작업 후', '비고'].map((h, i) => dCell(h, w[i], { fill: 'DCE3F3', bold: true, align: AL.CENTER })) })];
      b.items.forEach(it => rows.push(new docx.TableRow({ children: [dCell(`${it.date}\n${it.loc || ''}`, w[0], { align: AL.CENTER, size: 16 }), dCell(it.ph1 ? { img: it.ph1, w: iw, h: ih } : '사진 없음', w[1], { align: AL.CENTER, color: C.gray }), dCell(it.ph2 ? { img: it.ph2, w: iw, h: ih } : '사진 없음', w[2], { align: AL.CENTER, color: C.gray }), dCell(it.note, w[3], { size: 16 })] })));
      out.push(dTable(rows, w)); out.push(P([R('')], { after: 60 })); return;
    }
  });
  return out;
}
async function packDocx(children, title) {
  const doc = new docx.Document({ creator: APP.maker, title, description: `${APP.name} ${APP.version}`, styles: { default: { document: { run: { font: W_FONT, size: 20 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1850, bottom: 1831, left: 1134, right: 1134, header: 1020, footer: 973 } } }, children }] });
  return await applyHeaderFooter(await docx.Packer.toBlob(doc));
}
/* stec-header-footer 표준 머리글(「The Best Choice」 로고 + 진초록·벽돌색 선) · 바닥글(감청 선 + 쪽번호 + 제작자 서명) */
async function applyHeaderFooter(blob) {
  const zip = await JSZip.loadAsync(blob);
  const cx = Math.round(VS.sigPx * 2520000 / 1860);
  zip.file('word/stecHeader.xml', HF_HEADER_XML); zip.file('word/stecFooter.xml', HF_FOOTER_XML.replace(/cx="2520000"/g, `cx="${cx}"`));
  zip.file('word/media/stec-header-thebestchoice.png', b64ToU8(dataUrlB64(ASSET.headerTbc)));
  zip.file('word/media/stec-footer-signature.png', b64ToU8(dataUrlB64(VS.sig || ASSET.sigBase)));
  const rel = (id, t) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${t}"/></Relationships>`;
  zip.file('word/_rels/stecHeader.xml.rels', rel('rId1', 'media/stec-header-thebestchoice.png')); zip.file('word/_rels/stecFooter.xml.rels', rel('rId2', 'media/stec-footer-signature.png'));
  let ct = await zip.file('[Content_Types].xml').async('string');
  if (!/Extension="png"/i.test(ct)) ct = ct.replace(/(<Types[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>');
  if (!/Extension="jpg"/i.test(ct)) ct = ct.replace(/(<Types[^>]*>)/, '$1<Default Extension="jpg" ContentType="image/jpeg"/>');
  [['stecHeader.xml', 'header'], ['stecFooter.xml', 'footer']].forEach(([pt, k]) => { const ov = `<Override PartName="/word/${pt}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${k}+xml"/>`; if (!ct.includes(ov)) ct = ct.replace('</Types>', ov + '</Types>'); });
  zip.file('[Content_Types].xml', ct);
  let rl = await zip.file('word/_rels/document.xml.rels').async('string');
  rl = rl.replace('</Relationships>', '<Relationship Id="rIdStecHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="stecHeader.xml"/><Relationship Id="rIdStecFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="stecFooter.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', rl);
  let d = await zip.file('word/document.xml').async('string');
  const refs = ['default', 'first', 'even'].map(t => `<w:headerReference w:type="${t}" r:id="rIdStecHdr"/><w:footerReference w:type="${t}" r:id="rIdStecFtr"/>`).join('');
  d = d.replace(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>|<w:sectPr[^>]*\/>/g, s => { s = s.replace(/<w:(header|footer)Reference[^>]*\/>/g, ''); if (/\/>$/.test(s) && !/<\/w:sectPr>/.test(s)) s = s.replace(/\/>$/, '>') + '</w:sectPr>'; return s.replace(/(<w:sectPr[^>]*>)/, '$1' + refs); });
  if (!/xmlns:r=/.test(d.slice(0, 2000))) d = d.replace('<w:document ', '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  zip.file('word/document.xml', d);
  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}

/* =====================================================================
 * 문서 모델 → PDF (A4 세로 · html2canvas + jsPDF) — 블록 단위 쪽 나눔, 긴 표는 행 단위로 나눔
 * ===================================================================== */
const PW = 794, PH = 1123, PM_ = { t: 64, b: 70, l: 58, r: 58 };
const pdfCss = `.pg{width:${PW}px;height:${PH}px;background:#fff;color:#1C2333;font-family:${FONT};position:relative;overflow:hidden;box-sizing:border-box;padding:${PM_.t}px ${PM_.r}px ${PM_.b}px ${PM_.l}px;font-size:12.5px;line-height:1.5}
.pg .hdr{position:absolute;left:${PM_.l}px;right:${PM_.r}px;top:18px;height:26px;border-bottom:3px solid #17552F}.pg .hdr::after{content:"";position:absolute;left:0;right:0;bottom:-6px;border-bottom:1px solid #E34234}.pg .hdr img{height:22px}
.pg .ftr{position:absolute;left:${PM_.l}px;right:${PM_.r}px;bottom:16px;border-top:3px solid #1F4E79;padding-top:4px;display:flex;justify-content:center;align-items:center;font-size:11px;color:#555}.pg .ftr img{position:absolute;right:0;top:6px;height:20px}
.pg h1{white-space:pre-line;font-size:23px;text-align:center;color:#0B1F8F;margin:6px 0 4px}.pg .sub{text-align:center;color:#5B6475;margin-bottom:10px}
.pg h2{font-size:15px;color:#0B1F8F;margin:14px 0 6px}.pg h3{font-size:13px;color:#17552F;margin:10px 0 4px}
.pg table{border-collapse:collapse;width:100%;table-layout:fixed;margin-bottom:8px}.pg td,.pg th{border:1px solid #BFC6D4;padding:4px 6px;font-size:11.5px;vertical-align:middle;word-break:keep-all;overflow-wrap:anywhere;white-space:pre-line}
.pg th{background:#DCE3F3;font-weight:700;text-align:center}.pg td.c{text-align:center}.pg td.r{text-align:right}.pg tr.cat td{background:#EEF1F5;font-weight:700;color:#0B1F8F}.pg tr.tot td{background:#F1F3F8;font-weight:700}
.pg .ik{background:#E8F5EC;color:#17552F;font-weight:700;text-align:center}
.pg .box{background:#EEF7F1;border:1px solid #BFE0C9;border-radius:6px;padding:8px 12px;margin:6px 0 10px}.pg .box b{color:#17552F;display:block;margin-bottom:4px}.pg .box div{margin:2px 0}
.pg .ttl{display:flex;align-items:stretch;border:1px solid #BFC6D4;margin-bottom:8px}.pg .ttl .t{flex:1;display:grid;place-items:center;font-size:22px;font-weight:800}.pg .ttl table{width:auto;margin:0}.pg .ttl td{width:66px;height:22px;text-align:center}
.pg img.ph{width:100%;height:120px;object-fit:cover;display:block}.pg p{margin:2px 0 8px;white-space:pre-line}`;
function blockHtml(b) {
  const e = s => esc(s == null || s === '' ? '-' : s);
  if (b.k === 'title') return b.approval ? `<div class="ttl"><div class="t">${esc(b.t)}</div><table><tr><td rowspan="2" style="width:26px;background:#EEF1F5;font-weight:700">결<br>재</td>${b.approval.map(a => `<td style="background:#EEF1F5;font-weight:700">${esc(a)}</td>`).join('')}</tr><tr>${b.approval.map(() => '<td style="height:44px;color:#999">/</td>').join('')}</tr></table></div>${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ''}` : `<h1>${esc(b.t)}</h1>${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ''}`;
  if (b.k === 'info') return `<table>${b.rows.map(r => `<tr><td class="ik" style="width:16%">${e(r[0])}</td><td>${e(r[1])}</td><td class="ik" style="width:16%">${e(r[2])}</td><td>${e(r[3])}</td></tr>`).join('')}</table>`;
  if (b.k === 'h') return `<h2>${esc(b.t)}</h2>`;
  if (b.k === 'h2') return `<h3>■ ${esc(b.t)}</h3>`;
  if (b.k === 'p') return `<p>${esc(b.t)}</p>`;
  if (b.k === 'box') return `<div class="box"><b>${esc(b.title || '')}</b>${(b.items || []).map(x => `<div>✔ ${esc(x)}</div>`).join('')}</div>`;
  if (b.k === 'bullets') return `<div>${b.items.map(x => `<div>• ${esc(x)}</div>`).join('')}</div>`;
  if (b.k === 'img') return `<div style="text-align:center"><img src="${b.src}" style="width:${Math.round((b.wIn || 6.6) / 6.69 * 100)}%"><div style="color:#5B6475;font-size:11px">${esc(b.caption || '')}</div></div>`;
  return '';
}
function tableParts(b) {
  const s = (b.w || b.head.map(() => 1)).reduce((a, x) => a + x, 0), al = b.align || [];
  const head = `<colgroup>${(b.w || b.head.map(() => 1)).map(x => `<col style="width:${x / s * 100}%">`).join('')}</colgroup><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const rows = b.rows.map(r => r && r.cat ? `<tr class="cat"><td colspan="${b.head.length}">${esc(r.cat)}</td></tr>` : `<tr class="${r && r.tot ? 'tot' : ''}">${(r.tot ? r.cells : r).map((c, i) => `<td class="${al[i] || ''}">${c && c.img ? `<img src="${c.img}" style="height:${Math.round((c.h || 30) * .9)}px;max-width:100%;object-fit:contain;display:block;margin:0 auto">` : esc(c == null || c === '' ? '-' : c)}</td>`).join('')}</tr>`);
  return { head, rows };
}
function photoParts(b) { return { head: `<colgroup><col style="width:13%"><col style="width:36%"><col style="width:36%"><col style="width:15%"></colgroup><tr><th>일자·장소</th><th>작업 전</th><th>작업 후</th><th>비고</th></tr>`, rows: b.items.map(it => `<tr><td class="c">${esc(it.date)}<br>${esc(it.loc || '')}</td><td>${it.ph1 ? `<img class="ph" src="${it.ph1}">` : '<div style="height:120px;display:grid;place-items:center;color:#999">사진 없음</div>'}</td><td>${it.ph2 ? `<img class="ph" src="${it.ph2}">` : '<div style="height:120px;display:grid;place-items:center;color:#999">사진 없음</div>'}</td><td>${esc(it.note || '')}</td></tr>`) }; }
async function blocksToPdf(blocks, name) {
  const host = $('#render'); host.innerHTML = `<style>${pdfCss}</style>`;
  const pages = []; let pg, inner;
  const newPage = () => { pg = document.createElement('div'); pg.className = 'pg'; pg.innerHTML = `<div class="hdr"><img src="${ASSET.headerTbc}"></div><div class="ftr">- ${pages.length + 1} -<img src="${VS.sig || ASSET.sigBase}"></div>`; inner = document.createElement('div'); pg.appendChild(inner); host.appendChild(pg); pages.push(pg); };
  const limit = PH - PM_.t - PM_.b;
  const fits = () => inner.scrollHeight <= limit;
  newPage();
  for (const b of blocks) {
    if (b.k === 'pb') { if (inner.childNodes.length) newPage(); continue; }
    if (b.k === 'table' || b.k === 'photos') {
      const parts = b.k === 'table' ? tableParts(b) : photoParts(b);
      const mk = () => { const t = document.createElement('table'); t.innerHTML = parts.head; inner.appendChild(t); return t; };
      let t = mk(); if (!fits()) { t.remove(); newPage(); t = mk(); }
      for (const row of parts.rows) { const tb = document.createElement('tbody'); tb.innerHTML = row; t.appendChild(tb); if (b.k === 'photos') await Promise.all([...tb.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => { }) : 0)); if (!fits()) { tb.remove(); newPage(); t = mk(); t.appendChild(tb); } }
      continue;
    }
    const d = document.createElement('div'); d.innerHTML = blockHtml(b); inner.appendChild(d);
    await Promise.all([...d.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => { }) : 0));
    if (!fits() && inner.childNodes.length > 1) { d.remove(); newPage(); inner.appendChild(d); }
  }
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [PW, PH], compress: true, hotfixes: ['px_scaling'] });
  for (let i = 0; i < pages.length; i++) {
    busy(true, `PDF 만드는 중… ${i + 1}/${pages.length}쪽`);
    const cv = await html2canvas(pages[i], { scale: 1.6, backgroundColor: '#ffffff', logging: false });
    if (i) pdf.addPage([PW, PH], 'portrait'); pdf.addImage(cv.toDataURL('image/jpeg', .88), 'JPEG', 0, 0, PW, PH);
  }
  host.innerHTML = ''; pdf.setProperties({ title: name, creator: `${APP.name} — ${APP.maker}` });
  return pdf.output('blob');
}


const SLW = 13.333, SLH = 7.5;
function T(x, y, w, h, text, o = {}) { return Object.assign({ t: 'text', x, y, w, h, text: String(text ?? '') }, o); }
function Rc(x, y, w, h, fill, o = {}) { return Object.assign({ t: 'rect', x, y, w, h, fill }, o); }
function Im(x, y, w, h, src, o = {}) { return Object.assign({ t: 'img', x, y, w, h, src }, o); }
function Tb(x, y, w, rows, colW, o = {}) { return Object.assign({ t: 'table', x, y, w, rows, colW }, o); }
function slideBase(title, no, sub) {
  return [Rc(0, 0, SLW, .9, 'FFFFFF'), Rc(0, .86, SLW, .05, C.greenD), Rc(0, .91, SLW, .02, C.brick), Rc(.45, .22, .12, .5, C.green),
    T(.7, .14, 9.8, .66, title, { size: 24, bold: true, color: C.navy, valign: 'middle' }), sub ? T(8.4, .2, 4.5, .55, sub, { size: 11, color: C.gray, align: 'right', valign: 'middle' }) : null,
    Rc(0, SLH - .38, SLW, .38, C.silverL), T(.45, SLH - .36, 7, .34, 'S-Tec Group co. Ltd All rights Reserved. · S-Tec Safety & Health Management System', { size: 9, color: C.gray, it: true, valign: 'middle' }),
    T(SLW - 1.4, SLH - .36, 1, .34, String(no), { size: 10, color: C.gray, align: 'right', valign: 'middle' }), Im(SLW - 2.95, SLH - .345, 1.45, .3, ASSET.logo, { contain: true })].filter(Boolean);
}
function tblRows(head, rows, o = {}) {
  const H = head.map(h => ({ text: h, fill: o.headFill || C.navy, color: 'FFFFFF', bold: true, align: 'center' }));
  return [H].concat(rows.map((r, i) => r.cat ? [{ text: r.cat, fill: 'EEF1F5', bold: true, color: C.navy, colspan: head.length }] : (r.tot ? r.cells : r).map((c, j) => ({ text: c == null || c === '' ? '-' : String(c), fill: r.tot ? 'F1F3F8' : i % 2 ? 'F7F9FC' : 'FFFFFF', bold: !!r.tot, align: (o.align || [])[j] === 'r' ? 'right' : (o.align || [])[j] === 'c' ? 'center' : 'left' }))));
}

async function slidesToPptx(S, name) {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = APP.maker; pptx.company = APP.org; pptx.title = name;
  const dims = {}; const dim = async src => dims[src] || (dims[src] = await loadImg(src).then(i => [i.naturalWidth, i.naturalHeight]).catch(() => [1, 1]));
  for (const els of S) {
    const sl = pptx.addSlide(); sl.background = { color: 'FFFFFF' };
    for (const e of els) {
      if (e.t === 'rect') sl.addShape(e.r ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill, transparency: e.alpha != null ? Math.round((1 - e.alpha) * 100) : 0 }, line: e.line ? { color: e.line, width: .75 } : { type: 'none' }, rectRadius: e.r || 0 });
      else if (e.t === 'text') sl.addText(e.text, { x: e.x, y: e.y, w: e.w, h: e.h, fontFace: W_FONT, fontSize: e.size || 14, bold: !!e.bold, italic: !!e.it, color: e.color || C.ink, align: e.align || 'left', valign: e.valign || 'top', margin: 2, lineSpacingMultiple: e.line || 1.1, fit: 'shrink' });
      else if (e.t === 'img' && e.src) { const [iw, ih] = await dim(e.src); const o = { data: e.src, x: e.x, y: e.y, w: e.w, h: e.h }; if (e.contain) { const s = Math.min(e.w / iw, e.h / ih); o.w = iw * s; o.h = ih * s; o.x = e.x + (e.w - o.w) / 2; o.y = e.y + (e.h - o.h) / 2; } else if (e.cover) o.sizing = { type: 'cover', w: e.w, h: e.h }; if (e.alpha != null) o.transparency = Math.round((1 - e.alpha) * 100); sl.addImage(o); }
      else if (e.t === 'table') sl.addTable(e.rows.map(row => row.map(c => ({ text: c.text, options: { fill: { color: c.fill || 'FFFFFF' }, color: c.color || C.ink, bold: !!c.bold, align: c.align || 'left', valign: 'middle', colspan: c.colspan, fontFace: W_FONT, fontSize: e.size || 11 } }))), { x: e.x, y: e.y, w: e.w, colW: e.colW, rowH: e.rowH, border: { type: 'solid', color: 'BFC6D4', pt: .5 }, margin: .04, autoPage: false });
    }
    sl.addNotes(`${APP.name} ${APP.version} — Designed & Developed by Rat Rae Choi`);
  }
  return await pptx.write({ outputType: 'blob' });
}
/* 슬라이드 → PDF (16:9) */
function slideDom(els) {
  const d = document.createElement('div'); d.style.cssText = `position:relative;width:${SLW * 96}px;height:${SLH * 96}px;background:#fff;overflow:hidden;font-family:${FONT}`;
  els.forEach(e => {
    const s = `position:absolute;left:${e.x * 96}px;top:${e.y * 96}px;width:${e.w * 96}px;${e.h ? `height:${e.h * 96}px;` : ''}`;
    if (e.t === 'rect') d.insertAdjacentHTML('beforeend', `<div style="${s}background:#${e.fill};${e.line ? `border:1px solid #${e.line};` : ''}border-radius:${(e.r || 0) * 96}px;opacity:${e.alpha ?? 1}"></div>`);
    else if (e.t === 'text') d.insertAdjacentHTML('beforeend', `<div style="${s}display:flex;flex-direction:column;justify-content:${e.valign === 'middle' ? 'center' : 'flex-start'};text-align:${e.align || 'left'};font-size:${(e.size || 14) * 1.333}px;font-weight:${e.bold ? 800 : 400};font-style:${e.it ? 'italic' : 'normal'};color:#${e.color || C.ink};line-height:${(e.line || 1.1) * 1.18};white-space:pre-wrap;overflow:hidden">${esc(e.text)}</div>`);
    else if (e.t === 'img' && e.src) d.insertAdjacentHTML('beforeend', `<img src="${e.src}" style="${s}object-fit:${e.contain ? 'contain' : 'cover'};opacity:${e.alpha ?? 1}">`);
    else if (e.t === 'table') { const tw = e.colW.reduce((a, b) => a + b, 0); d.insertAdjacentHTML('beforeend', `<table style="${s}border-collapse:collapse;table-layout:fixed;font-size:${(e.size || 11) * 1.333}px"><colgroup>${e.colW.map(w => `<col style="width:${w / tw * 100}%">`).join('')}</colgroup>${e.rows.map((row, ri) => `<tr style="${e.rowH && e.rowH[ri] ? `height:${e.rowH[ri] * 96}px` : ''}">${row.map(c => `<td ${c.colspan ? `colspan="${c.colspan}"` : ''} style="border:1px solid #BFC6D4;padding:3px 6px;background:#${c.fill || 'FFFFFF'};color:#${c.color || C.ink};font-weight:${c.bold ? 700 : 400};text-align:${c.align || 'left'};vertical-align:middle;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere">${esc(c.text)}</td>`).join('')}</tr>`).join('')}</table>`); }
  });
  return d;
}
async function slidesToPdf(S, name) {
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [SLW, SLH], compress: true }); const host = $('#render');
  for (let i = 0; i < S.length; i++) {
    busy(true, `PDF 만드는 중… ${i + 1}/${S.length}장`);
    host.innerHTML = ''; const d = slideDom(S[i]); host.appendChild(d); await Promise.all([...d.querySelectorAll('img')].map(im => im.decode ? im.decode().catch(() => { }) : 0));
    const cv = await html2canvas(d, { scale: 1.4, backgroundColor: '#ffffff', logging: false }); if (i) pdf.addPage([SLW, SLH], 'landscape'); pdf.addImage(cv.toDataURL('image/jpeg', .86), 'JPEG', 0, 0, SLW, SLH);
  }
  host.innerHTML = ''; pdf.setProperties({ title: name, creator: `${APP.name} — ${APP.maker}` }); return pdf.output('blob');
}

const XL = { navy: 'FF0B1F8F', green: 'FF1E8B3A', head: 'FFDCE3F3', cat: 'FFEEF1F5', tot: 'FFF1F3F8', ik: 'FFE8F5EC' };
function xlBorder(c) { const b = { style: 'thin', color: { argb: 'FFBFC6D4' } }; c.border = { top: b, left: b, bottom: b, right: b }; }
function xlHead(ws, rowNo, vals, fill = XL.head) { const r = ws.getRow(rowNo); vals.forEach((v, i) => { const c = r.getCell(i + 1); c.value = v; c.font = { bold: true, name: W_FONT, size: 10, color: { argb: fill === XL.navy ? 'FFFFFFFF' : 'FF1C2333' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; xlBorder(c); }); r.height = 30; }
function xlRow(ws, rowNo, vals, o = {}) { const r = ws.getRow(rowNo); vals.forEach((v, i) => { const c = r.getCell(i + 1); c.value = v; c.font = { name: W_FONT, size: 10, bold: !!o.bold }; if (o.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }; c.alignment = { vertical: 'middle', wrapText: true, horizontal: typeof v === 'number' ? 'right' : (o.center || []).includes(i) ? 'center' : 'left' }; if (typeof v === 'number') c.numFmt = Number.isInteger(v) ? '#,##0' : '#,##0.0'; xlBorder(c); }); return r; }
function xlTitle(ws, t, sub, span) { ws.mergeCells(1, 1, 1, span); const c = ws.getCell(1, 1); c.value = t; c.font = { bold: true, size: 16, name: W_FONT, color: { argb: XL.navy } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 30; ws.mergeCells(2, 1, 2, span); const s = ws.getCell(2, 1); s.value = sub; s.font = { size: 10, name: W_FONT, color: { argb: 'FF5B6475' } }; s.alignment = { horizontal: 'center' }; }
async function xlSave(wb, name) { wb.creator = APP.maker; wb.company = APP.org; const buf = await wb.xlsx.writeBuffer(); await download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name); }
/* =====================================================================
 * 안전교육 영상 플레이어 (메인 화면) · 차트(화면·보고서 공용)
 *  - 5편 연속 재생: 끝나면 자연스럽게 다음 영상(살짝 어두워졌다 밝아짐) · 재생/정지 · 이전/다음 · 음량 · 소리 켜기
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const VIDEOS = [
  { id: 'v02', t: '화재 현장 인명 대피 유도', job: 'sec', note: '중대산업재해 대비 매뉴얼 — 대피·구호' },
  { id: 'v03', t: '초기 화재 진압(소화기)', job: 'sec', note: '비상대응 훈련 — 초기 진화' },
  { id: 'v05', t: '응급환자 CPR 초기 대응', job: 'sec', note: '응급처치 — 심폐소생술·AED' }
];
function mediaUrl(rel) { return location.protocol === 'file:' ? APP.shareUrl + rel : rel; }
const PLY = { i: 0, el: null, fading: false };
function initPlayer() {
  const v = $('#vid'); PLY.el = v;
  $('#vList').innerHTML = VIDEOS.map((x, i) => `<button type="button" data-i="${i}" title="${esc(x.t)}"><img src="${ASSET.thumbs[x.id] || ''}" alt=""><span>${i + 1}. ${esc(x.t)}</span></button>`).join('');
  $('#vList').onclick = e => { const b = e.target.closest('button'); if (b) go(+b.dataset.i, true); };
  v.volume = UI.vol != null ? UI.vol : 0.6; v.muted = UI.muted !== false; $('#vVol').value = v.volume;
  const syncMute = () => { $('#vMute').textContent = v.muted || v.volume === 0 ? '🔇' : v.volume < .5 ? '🔉' : '🔊'; };
  const syncPlay = () => { $('#vPlay').textContent = v.paused ? '▶' : '⏸'; };
  const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}` : '0:00';
  function load(i) {
    PLY.i = (i + VIDEOS.length) % VIDEOS.length; const x = VIDEOS[PLY.i];
    v.src = mediaUrl(`media/video/${x.id}.mp4`); v.poster = ASSET.thumbs[x.id] || '';
    $('#vTitle').textContent = `${PLY.i + 1}/${VIDEOS.length} · ${x.t}`;
    $$('#vList button').forEach((b, k) => b.classList.toggle('on', k === PLY.i));
  }
  function go(i, play) {
    v.style.transition = 'opacity .35s'; v.style.opacity = .15;
    setTimeout(() => { load(i); if (play) v.play().catch(() => { }); v.style.opacity = 1; }, 260);
  }
  PLY.go = go;
  $('#vPlay').onclick = () => { if (v.paused) v.play().catch(() => toast('영상을 재생할 수 없습니다(인터넷 연결 확인)')); else v.pause(); };
  $('#vStop').onclick = () => { v.pause(); v.currentTime = 0; };
  $('#vPrev').onclick = () => go(PLY.i - 1, true);
  $('#vNext').onclick = () => go(PLY.i + 1, true);
  $('#vMute').onclick = () => { v.muted = !v.muted; if (!v.muted && v.volume === 0) { v.volume = .6; $('#vVol').value = .6; } UI.muted = v.muted; saveUI(); syncMute(); };
  $('#vVol').oninput = e => { v.volume = +e.target.value; v.muted = v.volume === 0; UI.vol = v.volume; UI.muted = v.muted; saveUI(); syncMute(); };
  $('#vProg').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); if (v.duration) v.currentTime = (e.clientX - r.left) / r.width * v.duration; };
  v.addEventListener('timeupdate', () => { $('#vProg i').style.width = (v.duration ? v.currentTime / v.duration * 100 : 0) + '%'; $('#vTime').textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`; });
  v.addEventListener('play', syncPlay); v.addEventListener('pause', syncPlay);
  v.addEventListener('ended', () => { if ($('#vAuto').checked) go(PLY.i + 1, true); else syncPlay(); });
  v.addEventListener('click', () => $('#vPlay').click());
  v.addEventListener('volumechange', syncMute);
  load(0); syncMute(); syncPlay();
  // 화면에 보이면 자동 재생(소리는 꺼진 상태로 시작 — 브라우저 정책), 안 보이면 멈춤
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { if (v.paused && !PLY.userPaused) v.play().catch(() => { }); } else if (!v.paused) { v.pause(); } }), { threshold: .35 }).observe($('#player'));
  $('#vPlay').addEventListener('click', () => { PLY.userPaused = !v.paused; });
}

/* =====================================================================
 * 차트 — 캔버스에 직접 그림(라이브러리 없음). 화면용(HiDPI)과 보고서용(PNG) 같은 함수
 * ===================================================================== */
const PAL = ['#0B1F8A', '#1B7A34', '#E8750A', '#7A2E8E', '#0E7C86', '#C0392B', '#2F6FD0', '#B8860B'];
function chartColors() { const dark = document.documentElement.getAttribute('data-theme') === 'dark'; return { ink: dark ? '#C9D0E6' : '#2C3554', mute: dark ? '#8F99B6' : '#667089', grid: dark ? '#222B47' : '#E4E8F1', bg: dark ? '#11172B' : '#ffffff' }; }
function prepCanvas(cv, w, h, scale) { const s = scale || window.devicePixelRatio || 1; cv.width = Math.round(w * s); cv.height = Math.round(h * s); const g = cv.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); return g; }
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
const FONT = "'Pretendard','Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
/* 막대(+선) 차트: labels · bars[{name,data,color}] · line{name,data,color,max} */
function drawBar(cv, o) {
  const W = o.w || cv.clientWidth || 600, H = o.h || cv.clientHeight || 260, C = o.colors || chartColors();
  const g = prepCanvas(cv, W, H, o.scale); g.fillStyle = o.print ? '#fff' : C.bg; g.fillRect(0, 0, W, H);
  const L = 46, R = o.line ? 44 : 14, T = o.title ? 34 : 16, B = 40, pw = W - L - R, ph = H - T - B;
  if (o.title) { g.fillStyle = C.ink; g.font = `700 14px ${FONT}`; g.fillText(o.title, L, 20); }
  const n = o.labels.length || 1, stacked = o.stacked, bars = o.bars || [];
  let mx = 0; for (let i = 0; i < n; i++) { const v = stacked ? bars.reduce((a, b) => a + (+b.data[i] || 0), 0) : Math.max(0, ...bars.map(b => +b.data[i] || 0)); mx = Math.max(mx, v); }
  mx = niceMax(mx * 1.08);
  g.strokeStyle = C.grid; g.fillStyle = C.mute; g.font = `11px ${FONT}`; g.textAlign = 'right'; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const y = T + ph - ph * k / 4; g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke(); g.fillText(shortN(mx * k / 4), L - 6, y + 4); }
  const bw = pw / n, inner = Math.min(46, bw * .72), nb = stacked ? 1 : Math.max(1, bars.length), w1 = inner / nb;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    bars.forEach((b, j) => {
      const v = +b.data[i] || 0, h = v / mx * ph, x = L + bw * i + (bw - inner) / 2 + (stacked ? 0 : j * w1), y = T + ph - h - (stacked ? acc / mx * ph : 0);
      g.fillStyle = b.color || PAL[j % PAL.length]; roundRect(g, x, y, Math.max(2, w1 - (stacked ? 0 : 2)), Math.max(0, h), 3); g.fill(); acc += v;
    });
  }
  g.fillStyle = C.mute; g.textAlign = 'center'; g.font = `11px ${FONT}`;
  const every = Math.ceil(n / Math.max(1, Math.floor(pw / 46)));
  o.labels.forEach((lb, i) => { if (i % every) return; g.fillText(String(lb).slice(0, 8), L + bw * i + bw / 2, H - B + 16); });
  if (o.line) {
    const lm = o.line.max || niceMax(Math.max(1, ...o.line.data.map(x => +x || 0)) * 1.08);
    g.strokeStyle = o.line.color || '#E8750A'; g.lineWidth = 2.4; g.beginPath(); let st = false;
    o.line.data.forEach((v, i) => { if (v == null) return; const x = L + bw * i + bw / 2, y = T + ph - (+v / lm) * ph; st ? g.lineTo(x, y) : g.moveTo(x, y); st = true; }); g.stroke();
    g.fillStyle = o.line.color || '#E8750A'; o.line.data.forEach((v, i) => { if (v == null) return; g.beginPath(); g.arc(L + bw * i + bw / 2, T + ph - (+v / lm) * ph, 3, 0, 7); g.fill(); });
    g.textAlign = 'left'; g.fillStyle = C.mute; for (let k = 0; k <= 4; k++) g.fillText(shortN(lm * k / 4) + (o.line.unit || ''), W - R + 6, T + ph - ph * k / 4 + 4);
  }
  // 범례
  const leg = bars.map((b, j) => [b.name, b.color || PAL[j % PAL.length]]).concat(o.line ? [[o.line.name, o.line.color || '#E8750A']] : []);
  let lx = W - R; g.font = `11.5px ${FONT}`; g.textAlign = 'left';
  leg.slice().reverse().forEach(([nm, c]) => { const tw = g.measureText(nm).width; lx -= tw + 26; g.fillStyle = c; roundRect(g, lx, (o.title ? 11 : 2), 12, 10, 3); g.fill(); g.fillStyle = C.ink; g.fillText(nm, lx + 16, (o.title ? 20 : 11)); });
}
function drawDonut(cv, o) {
  const W = o.w || cv.clientWidth || 320, H = o.h || cv.clientHeight || 260, C = o.colors || chartColors();
  const g = prepCanvas(cv, W, H, o.scale); g.fillStyle = o.print ? '#fff' : C.bg; g.fillRect(0, 0, W, H);
  const tot = o.data.reduce((a, b) => a + (+b.v || 0), 0) || 1, r = Math.min(H * .38, W * .2), cx = r + 24, cy = H / 2 + (o.title ? 8 : 0);
  if (o.title) { g.fillStyle = C.ink; g.font = `700 14px ${FONT}`; g.textAlign = 'left'; g.fillText(o.title, 12, 20); }
  let a0 = -Math.PI / 2;
  o.data.forEach((d, i) => { const a = (+d.v || 0) / tot * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a0 + a); g.closePath(); g.fillStyle = d.c || PAL[i % PAL.length]; g.fill(); a0 += a; });
  g.beginPath(); g.arc(cx, cy, r * .58, 0, 7); g.fillStyle = o.print ? '#fff' : C.bg; g.fill();
  g.fillStyle = C.ink; g.textAlign = 'center'; g.font = `800 17px ${FONT}`; g.fillText(o.center || shortN(tot), cx, cy + 3); g.font = `11px ${FONT}`; g.fillStyle = C.mute; g.fillText(o.centerSub || '합계', cx, cy + 19);
  g.textAlign = 'left'; let y = cy - o.data.length * 11 + 8; const lx = cx + r + 22;
  o.data.forEach((d, i) => { g.fillStyle = d.c || PAL[i % PAL.length]; roundRect(g, lx, y - 9, 11, 11, 3); g.fill(); g.fillStyle = C.ink; g.font = `12px ${FONT}`; g.fillText(`${d.n}  ${shortN(d.v)} (${Math.round((+d.v || 0) / tot * 100)}%)`, lx + 17, y); y += 22; });
}
function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function shortN(v) { v = +v || 0; const a = Math.abs(v); return a >= 1e8 ? (v / 1e8).toFixed(1).replace(/\.0$/, '') + '억' : a >= 1e4 ? (v / 1e4).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '만' : a >= 1000 ? Math.round(v).toLocaleString('ko-KR') : String(Math.round(v * 10) / 10); }
/* 보고서용 PNG */
function chartPng(kind, o, w = 1000, h = 420) { const cv = document.createElement('canvas'); const opt = Object.assign({}, o, { w, h, scale: 2, print: true, colors: { ink: '#1C2333', mute: '#5B6475', grid: '#E3E7EE', bg: '#fff' } }); (kind === 'donut' ? drawDonut : drawBar)(cv, opt); return cv.toDataURL('image/png'); }

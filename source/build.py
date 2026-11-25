# S-Tec Safety & Health Management System (에스텍 안전보건 관리 시스템) — 한 파일 index.html 빌드
# 사용법: python3 source/build.py [출력경로]   (저장소 최상위에서 실행)
# Designed & Developed by Rat Rae Choi
import base64, json, os, sys
S = os.path.dirname(os.path.abspath(__file__)) + '/'
V = S + 'vendor/'
ROOT = os.path.abspath(S + '..') + '/'
def rd(p): return open(p, encoding='utf-8').read()
def scr(s): return s.replace('</script', '<\\/script')
def uri(p, mime): return f'data:{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()
asset = json.loads(rd(V + 'assets-base.json'))
asset['icon'] = uri(V + 'icon.png', 'image/png')            # 메인화면 좌측 상단 아이콘 · 앱 아이콘
asset['hero'] = uri(V + 'hero.jpg', 'image/jpeg')           # 출력물(PPT · Word) 표지용 정지 그림
asset['heroAnim'] = uri(V + 'hero-anim.gif', 'image/gif')  # 메인화면 히어로 — 안전보건 관리시스템 디오라마 애니메이션(업로드 GIF 원본 그대로)
asset['thumbs'] = {f[:-4]: uri(ROOT + 'media/thumb/' + f, 'image/jpeg') for f in sorted(os.listdir(ROOT + 'media/thumb')) if f.endswith('.jpg')}
html = rd(S + 'index.html')
APPJS = '\n'.join(rd(S + f) for f in ['app.js', 'ui.js', 'views.js', 'views2.js', 'views3.js', 'demo.js', 'media.js', 'out_base.js', 'out.js', 'guide.js'])
LIBS = rd(V + 'libs.html') + '\n<script>/* ExcelJS (MIT) */\n' + scr(rd(V + 'exceljs.min.js')) + '\n</script>'
for ph, val in [('<!--LIBS-->', LIBS), ('<!--QR-->', rd(V + 'qr.html')),
                ('/*ASSETS*/', 'const ASSET=' + json.dumps(asset, ensure_ascii=False) + ';'),
                ('/*HF*/', scr(rd(S + 'hf.js'))), ('/*SITES*/', scr(rd(S + 'sites.js'))), ('/*KB*/', scr(rd(S + 'kb.js'))),
                ('/*APP*/', scr(APPJS)), ('<!--AUTHCSS-->', rd(V + 'auth-css.html')),
                ('/*SUPABASE*/', rd(V + 'supabase.js')), ('/*AUTH*/', rd(V + 'auth.js')), ('/*APPACCESS*/', scr(rd(S + 'app-access.js')))]:
    assert html.count(ph) == 1, ph
    html = html.replace(ph, val)
out = sys.argv[1] if len(sys.argv) > 1 else ROOT + 'index.html'
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html); print(out, len(html) // 1024, 'KB')

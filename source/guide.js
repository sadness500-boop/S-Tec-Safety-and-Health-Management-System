/* =====================================================================
 * 매뉴얼 — 사용자 매뉴얼 · 제작자 관리매뉴얼 (프로그램 안 보기 · Word · PPT · PDF)
 *  사용자 매뉴얼은 누구나 보기 · 내려받기 / 제작자 관리매뉴얼은 제작자만(서버 비공개 보관함 owner-docs/stsh/admin-guide.json)
 * Designed & Developed by Rat Rae Choi
 * ===================================================================== */
const MANUAL = {
  user: {
    title: '사용자 매뉴얼', en: 'User Guide', file: '에스텍_안전보건관리시스템_사용자매뉴얼',
    sub: '현장 반장 · 소장 · 지사 안전 담당이 안전보건 기록을 남기고 고객사 제출 자료를 만드는 방법',
    sections: [
      { h: '이 프로그램은', key: ['「했다」는 기록이 안전보건 확보의무의 증거', '위험성평가 · TBM · 점검 · 아차사고 · 교육 · 보호구 · 도급인 협의', '사업장별로 한곳에 쌓고 이행률을 자동 계산', '고객사 제출용 이행 현황 Word · PPT · PDF'], img: 'm_main', blocks: [
        { p: 'S-Tec Safety & Health Management System(에스텍 안전보건 관리 시스템)은 중대재해처벌법 · 산업안전보건법이 요구하는 안전보건 활동을 사업장별로 전자 기록으로 남기는 프로그램입니다. 사고가 난 뒤에는 기록이 없으면 이행한 것으로 인정받기 어렵습니다. STM 미화팀 TBM, 흡연부스 화재 대응 같은 일을 날짜 · 사진 · 서명과 함께 남겨 두면 그대로 증빙이 됩니다.' },
        { table: { head: ['메뉴', '하는 일'], rows: [['📊 안전보건 현황', '사업장별 이행률 · 미조치 · 기한 임박 · 중대재해처벌법 이행 현황'], ['📋 위험성평가', '작업별 위험요인 · 가능성×중대성 · 감소대책 · 담당 · 완료일'], ['🗣 TBM', '작업 전 회의 — 오늘의 위험요인 · 참석자 터치 서명 · 사진'], ['✅ 안전점검', '업종별 체크리스트(주간 · 월간) · 불량 조치 추적'], ['⚠ 아차사고·의견', '사진 1장 + 한 줄 보고 · 종사자 의견 · 조치 추적'], ['🎓 교육·보호구', '근무자 명부 · 교육 이수 · 보호구 지급 · 수령 서명'], ['🤝 도급인 협의', '고객사와 협의체 · 합동점검 · 순회점검 · 서명'], ['🖨 보고서 출력', '월간 활동보고서 · 고객사 제출 자료 · 위험성평가표 · TBM 일지 · 증빙'], ['⚙ 사업장·설정', '업종 · 근무형태 · 고객사 담당 · 백업 · 예시 자료']] } },
        { tip: '고객사(도급인)도 용역 근무자에 대한 안전보건 확보 의무가 있습니다. 「🖨 보고서 › 고객사 제출용 안전보건 이행 현황」은 고객사가 자기 의무 이행 증빙으로 쓸 수 있어 가장 반기는 자료입니다.' }] },
      { h: '설치하고 시작하기', key: ['통합관리 시스템 메인 → 근태관리 다음 카드', '웹 주소 · 안드로이드 앱 · 홈 화면 추가', '통합 로그인(같은 아이디)', '처음 한 번 「안전보건 담당」 지정'], img: 'm_gate', blocks: [
        { table: { head: ['기기', '여는 방법'], rows: [['통합관리 시스템', '메인 화면 「S-Tec Safety & Health Management System」 카드 → 열기 (다시 로그인하지 않음)'], ['PC', '크롬 · 엣지로 웹 주소 열기 → 주소창 오른쪽 「앱 설치」 또는 Ctrl+D 즐겨찾기'], ['안드로이드', '「다운로드 QR › 안드로이드 앱(APK)」 → 내려받아 설치'], ['아이폰', '사파리로 웹 주소 열기 → 공유 버튼 → 「홈 화면에 추가」']] } },
        { p: '웹 주소: https://sadness500-boop.github.io/S-Tec-Safety-and-Health-Management-System/' },
        { ol: ['통합관리 시스템과 같은 아이디(이메일) · 비밀번호로 로그인합니다.', '처음 열면 「안전보건 담당 지정」 화면이 나옵니다. 성명(필수) · 직책 · 담당 지사 · 소속 · 연락처를 넣고 「안전보건 담당 지정하고 시작」을 누릅니다.', '담당자 이름은 TBM 진행자 · 보고서 작성자 · 결재란에 들어갑니다. 위쪽 「안전보건 담당」 카드를 눌러 언제든 바꿀 수 있습니다.'] },
        { tip: '로그인하지 않아도 이 기기에서는 쓸 수 있지만, 로그인하면 휴대폰 · PC에서 같은 기록을 보고 회사 공유 서버에 저장됩니다.' }] },
      { h: '사업장 고르기 · 설정', key: ['모든 화면 위쪽 「사업장」 칸', '● 표시 = 기록을 시작한 사업장', '업종 · 근무형태(TBM 기준일) 설정', '고객사(도급인) 안전 담당자 등록'], img: 'm_set', blocks: [
        { ol: ['화면 위쪽에서 조직 · 지사를 고르고, 「사업장 찾기」에 이름 일부를 넣어 좁힙니다.', '「사업장」 목록에서 고릅니다. 한 번 고르면 다른 메뉴에서도 같은 사업장이 유지됩니다.', '「⚙ 사업장·설정」에서 업종(보안 · 미화 · 시설 · 주차 · 안내 · 조리), 근무형태, 관리 시작일, 고객사 안전 담당자를 넣고 저장합니다.'] },
        { table: { head: ['설정', '쓰이는 곳'], rows: [['근무형태', '격일제 · 교대는 매일, 주5일은 평일만 TBM 실시 대상으로 계산'], ['관리 시작일', '이 날부터 이행률을 계산(이전 날짜는 미실시로 보지 않음)'], ['정기교육 기준 시간', '반기 기준(기본 12시간 — 사무 · 판매직은 6시간)'], ['고객사 담당', '협의록 · 고객사 제출 자료 · 확인 서명란']] } },
        { tip: '목록에 없는 사업장은 「⚙ 사업장·설정 › 목록에 없는 사업장 추가」로 넣습니다. 사업장 목록은 에스텍 그룹 전체(사업장 지도 기준)입니다.' }] },
      { h: '근무자 명부', key: ['TBM 참석 대상 · 교육 · 보호구 대상', '엑셀에서 붙여넣기', '배치일 → 신규 배치자 교육 알림', '근태관리 연동 시 자동'], img: 'm_wk', blocks: [
        { ol: ['「🎓 교육·보호구 › 👥 근무자 명부」를 엽니다.', '「＋ 근무자 추가」를 눌러 성명 · 업종 · 역할(반장 · 근무자) · 배치일을 넣습니다. 여러 명은 엑셀에서 복사해 「📋 엑셀에서 붙여넣기」로 한 번에 넣습니다.', '퇴사자는 퇴사일만 넣으면 그날 이후 TBM · 교육 대상에서 빠집니다(기록은 남음).', '「💾 명부 저장」을 누릅니다.'] },
        { warn: '근무자 개인정보(연락처 · 주민번호)는 넣지 않습니다. 고객사 제출 자료는 「근무자 이름 가림」을 켜면 「김○○」로 표시됩니다.' }] },
      { h: '위험성평가', key: ['최초 · 정기(매년) · 수시 · 상시', '표준 위험요인으로 바로 시작', '가능성(1~5) × 중대성(1~4) = 위험성', '감소대책 · 담당 · 완료일 → 조치 추적'], img: 'm_ra', blocks: [
        { ol: ['「📋 위험성평가」에서 평가 종류와 업종을 고르고 「＋ 새 위험성평가」를 누릅니다. 업종별 표준 위험요인이 자동으로 채워집니다.', '사업장에 맞지 않는 항목은 삭제하고, 빠진 작업은 「＋ 항목 추가」로 넣습니다.', '항목마다 가능성 · 중대성을 고르면 위험성 등급(낮음 · 보통 · 높음 · 매우 높음)이 바로 표시됩니다.', '「보통」 이상은 감소대책 · 담당 · 완료 예정일을 꼭 적습니다 — 「조치 필요」 목록에 올라갑니다.', '참여 근로자를 누르고 「✔ 확정(근로자 공유)」을 누릅니다. 근로자 참여 없이는 확정되지 않습니다.'] },
        { table: { head: ['위험성', '등급', '조치'], rows: [['1~4', '낮음', '현재 상태 유지 · 교육'], ['5~8', '보통', '개선 계획 · 감소대책 이행'], ['9~12', '높음', '조속히 개선(1개월 이내 권장)'], ['15~20', '매우 높음', '즉시 개선 · 개선 전 작업 중지 검토']] } },
        { tip: '사고 · 아차사고를 보고하면 그 작업의 수시 위험성평가가 자동으로 만들어집니다. 「🔗 업무표준화에서」는 업무표준화 프로그램의 표준업무를 불러옵니다(연결 전에는 내장 표준을 씀).' }] },
      { h: 'TBM(작업 전 안전점검 회의)', key: ['사업장 · 날짜 · 업종마다 한 장', '오늘의 위험요인은 위험성평가에서 자동 제안', '참석자 체크 + 손가락 서명', '근로자 의견은 「종사자 의견」에 자동 등록'], img: 'm_tbm', blocks: [
        { ol: ['「🗣 TBM」을 열면 오늘 날짜가 선택되어 있습니다. 업종 탭을 고릅니다.', '오늘 작업 내용을 적고, 오늘의 위험요인은 「＋」 칩을 눌러 넣거나 직접 고칩니다(위험성평가의 높은 항목이 먼저 나옵니다).', '참석한 근무자를 체크하고 건강상태를 고른 뒤, 칸 안에 손가락으로 서명받습니다.', '현장 사진(최대 2장)을 찍고 「💾 TBM 저장」을 누릅니다. 달력의 그 날짜가 초록색으로 바뀝니다.'] },
        { tip: '「↺ 지난 TBM 내용 불러오기」를 누르면 지난번 작업 내용 · 위험요인 · 안전수칙이 채워집니다(참석 · 서명은 새로 받음). 음주 후 근무자는 「음주 후(작업 배제)」를 고르고 작업에서 뺍니다.' },
        { warn: '사진에 고객사 직원 · 방문객 얼굴이나 차량번호가 찍히지 않게 합니다.' }] },
      { h: '안전점검', key: ['업종별 체크리스트', '주간 점검 · 월간 점검(전체 항목)', '양호 · 불량 · 해당 없음', '불량 → 담당 · 기한 → 조치 완료'], img: 'm_chk', blocks: [
        { ol: ['「✅ 안전점검」에서 업종과 주간 / 월간을 고릅니다.', '항목마다 양호 · 불량 · 해당 없음을 누릅니다. 이상 없으면 「모두 양호」 후 불량만 바꿉니다.', '불량은 불량 내용 · 조치 담당 · 기한을 적습니다.', '「💾 점검 저장」. 조치가 끝나면 오른쪽 「조치 필요 항목」의 「✔ 완료」를 눌러 결과를 적습니다.'] },
        { p: '보안: 순찰동선 · 야간 조도 · 흡연구역 · 화재수신기·CCTV 사각지대 / 미화: 약품 MSDS · 혼합 금지 · 사다리 · 습식 바닥 / 주차: 반사조끼 · 차량 유도 위치 · 배기가스 / 시설: LOTO · 절연 · 고소 · 밀폐공간 등 업종별 항목과 공통 항목(보호구 · 소화기 · 비상구 · 폭염·한파)을 점검합니다.' }] },
      { h: '아차사고 · 사고 보고 · 종사자 의견', key: ['사진 1장 + 한 줄로 바로 보고', '보고 원본은 수정 불가 — 보완은 이력으로', '수시 위험성평가 자동 열기', '법정 보고 안내 · 법률 대응 연계'], img: 'm_rep', blocks: [
        { ol: ['「⚠ 아차사고·의견」에서 아차사고 · 재해 · 화재 · 폭력·폭언 · 질병·온열 중 하나를 누릅니다.', '한 줄 제목 · 장소 · 경위를 적고 사진을 찍습니다. 재해는 재해형태 · 부상자 · 예상 휴업일수를 넣습니다.', '조치 계획 · 담당 · 기한을 적고 「보고 저장」. 그 작업의 수시 위험성평가가 자동으로 열립니다.', '나중에 알게 된 내용은 「＋ 보완 기록」으로 덧붙이고, 조치가 끝나면 「✔ 완료」로 결과를 적습니다.'] },
        { table: { head: ['상황', '안내'], rows: [['중대재해 가능성', '지체 없이 관할 지방고용노동관서에 보고(산업안전보건법 제54조) — 화면에 안내'], ['3일 이상 휴업 재해', '1개월 이내 산업재해조사표 제출(시행규칙 제73조)'], ['법률 연계 조건', '인명 · 근무자 기인 · 손해배상·계약해지 언급 · 갑질 · 경찰 출동 → 「⚖ 법률 대응으로 보내기」']] } },
        { p: '종사자 의견은 「🗨 종사자 의견」 버튼으로 받습니다(익명 가능). 조치 계획과 결과까지 적으면 중대재해처벌법 시행령 제4조 7호(종사자 의견 청취 · 반기 점검) 증빙이 됩니다. TBM에서 적은 근로자 의견도 자동으로 여기에 들어옵니다.' }] },
      { h: '교육 · 보호구', key: ['채용 시 · 정기 · 특별 · 비상훈련', '반기 정기교육 시간 자동 집계', '미이수자 알림', '보호구 지급 · 교체일 · 수령 서명'], img: 'm_edu', blocks: [
        { ol: ['「🎓 교육 이력」에서 교육 종류 버튼(＋ 정기교육 등)을 누릅니다.', '교육일 · 시간 · 제목 · 강사를 넣고 이수자를 누릅니다(「모두 선택」 가능). 전사 공통 교육이면 체크합니다.', '「🦺 보호구 지급」에서 「＋ 보호구 지급 기록」 → 품목 · 지급일 · 받은 근무자 · 수령 서명 → 저장. 교체 예정일이 자동으로 계산됩니다.'] },
        { table: { head: ['교육', '기본 기준(산업안전보건법 시행규칙 별표 4)'], rows: Object.values(EDU).map(v => [v.n, v.d]) } },
        { warn: '법정 교육시간은 법령 개정이나 업종에 따라 달라질 수 있습니다. 사업장 기준은 「⚙ 사업장·설정 › 정기교육 반기 기준 시간」에서 바꿉니다.' }] },
      { h: '도급인(고객사) 협의 · 합동점검', key: ['안전보건 협의체 회의(매월)', '합동 안전보건점검(분기)', '작업장 순회점검(주 1회 등)', '고객사 · 당사 서명 · 후속 조치 추적'], img: 'm_co', blocks: [
        { ol: ['「🤝 도급인 협의」에서 기록할 종류를 누릅니다. 기본 안건이 채워집니다.', '참석자 · 안건별 결과를 적고 후속 조치(담당 · 기한)를 넣습니다.', '고객사 담당과 당사 책임자가 손가락으로 서명하고 저장합니다.', '위쪽 달력에서 올해 협의체(월) · 합동점검(분기) 실시 여부를 한눈에 봅니다.'] },
        { tip: '협의체 · 합동점검 · 순회점검은 원래 도급인(고객사)의 의무입니다. 당사가 기록과 서명을 챙기면 고객사 담당자의 부담이 줄고, 재계약 때 「안전관리를 잘하는 협력업체」 근거가 됩니다.' }] },
      { h: '안전보건 현황 · 중대재해처벌법 이행', key: ['안전보건 이행지수(SHI) S~D', '사업장별 이행률 표', '조치 필요 · 기한 임박', '시행령 제4조 9개 · 제5조 반기 점검'], img: 'm_dash', blocks: [
        { table: { head: ['영역(배점)', '계산'], rows: [['TBM 실시율(25)', 'TBM 기록일 ÷ 근무일(근무형태 기준)'], ['안전점검 이행률(20)', '업종마다 주 1회 + 월 1회 점검 실시 비율'], ['위험성평가 관리(20)', '최근 1년 최초·정기평가 실시(50%) + 「보통」 이상 감소대책 완료율(50%)'], ['조치 완료율(15)', '모든 조치 항목 중 완료 비율'], ['교육 이수율(15)', '반기 정기교육 시간(경과 비율) + 신규 배치자 채용 시 교육'], ['보호구 관리(5)', '교체 기한이 지나지 않은 보호구 비율']] } },
        { p: '측정되지 않은 영역은 빼고 가중 평균합니다. 95↑ S 탁월 · 90↑ A 우수 · 80↑ B 양호 · 70↑ C 개선 필요 · 70 미만 D 집중 관리.' },
        { p: '「⚖ 중대재해처벌법 이행 현황」은 반기마다 각 의무가 기록으로 증빙되는지 보여 줍니다. 경영방침 · 예산 · 전담조직처럼 사업장 기록으로 증빙되지 않는 항목은 본사가 「본사 확인 기록」을 남깁니다.' }] },
      { h: '보고서 출력', key: ['월간 안전보건 활동보고서 Word · PDF · PPT', '고객사 제출용 이행 현황 Word · PDF · PPT', '위험성평가표 · TBM 일지 · 사고 경위서', '이행 증빙(법률 대응) · 전사 현황 엑셀'], img: 'm_report', blocks: [
        { table: { head: ['보고서', '형식', '내용'], rows: [['월간 안전보건 활동보고서', 'Word · PDF · PPT', '이행 요약 · 위험성평가 · TBM · 점검 · 사고·의견 · 교육·보호구 · 도급인 협의 · 미조치·차월계획'], ['고객사 제출용 안전보건 이행 현황', 'Word · PDF · PPT', 'SHI · 시행령 4조·5조 대응 · 월별 실적 · 재발방지 · 협의체/합동점검 · 확인 서명란'], ['위험성평가표', 'Word · PDF · 엑셀', '위험요인 · 빈도×강도 · 감소대책 · 근로자 공유 확인란'], ['TBM 일지', 'Word · PDF', '기간 목록 + 날짜별 일지(참석자 서명 · 사진)'], ['사고 경위서 · 조치결과서', 'Word · PDF', '경위 · 사진 · 조치 · 보완 이력 · 수시 위험성평가 · 원본 해시'], ['안전보건 확보의무 이행 증빙', 'Word', '사건 전 90일 TBM · 교육 · 위험성평가 · 점검 · 보호구 · 협의 기록'], ['전사 안전보건 현황', '엑셀', '사업장별 이행률 · 조치 대장 · 사고 대장 · 교육 이력 · 보호구 대장']] } },
        { ol: ['위쪽에서 사업장을 고르고, 기간(월간 · 분기 · 반기 · 연간)과 기준을 정합니다.', '고객사 제출본은 「근무자 이름 가림」을 켜면 「김○○」로 나갑니다.', '원하는 보고서의 Word · PDF · PPT 버튼을 누르면 파일이 내려받아집니다(휴대폰은 공유 창).'] },
        { tip: 'Word 보고서는 에스텍 표준 머리글(The Best Choice) · 바닥글(쪽번호 · 제작자 서명)이 들어갑니다. 고객사 제출본에는 급여 · 단가 · 내부 대응 · 법률 검토 내용이 들어가지 않습니다.' }] },
      { h: '자주 묻는 질문', key: ['기록은 어디에 저장되나요?', '고칠 수 없는 기록이 있나요?', '다른 프로그램과 이어지나요?', '휴대폰을 잃어버렸어요'], blocks: [
        { table: { head: ['질문', '답'], rows: [['기록은 어디에 저장되나요?', '이 기기에 바로 저장되고, 로그인하면 내 계정과 회사 공유 서버(sh_records)에도 저장됩니다.'], ['고칠 수 없는 기록이 있나요?', '사고 · 아차사고 보고 원본은 고칠 수 없고 보완 내용만 이력으로 덧붙습니다. 모든 기록은 저장 시 해시값(SHA-256)을 남겨 위변조 논란에 대비합니다.'], ['다른 프로그램과 이어지나요?', '근태관리(근무자) · 업무표준화(표준업무) · 법률 대응(증빙 묶음) · 성과관리 · 고객사 포털(월간 안전 지표) · 사건·사고 보고(수시 위험성평가)와 공유 서버로 이어집니다.'], ['휴대폰을 잃어버렸어요', '통합관리 시스템 관리자에게 알리면 그 기기를 강제 로그아웃합니다. 로그인해 둔 기록은 서버에 남아 있습니다.'], ['예시 자료는 무엇인가요?', '「예시 가람공장 · 예시 나래빌딩」 가상 사업장 자료입니다. 공유 서버에 올라가지 않고 「⚙ 사업장·설정」에서 한 번에 지웁니다.']] } }] }
    ]
  },
  /* 제작자 관리매뉴얼은 공개 파일에 넣지 않습니다 — 서버의 제작자 전용 보관함(owner-docs)에서 제작자 계정에게만 불러옵니다 */
  admin: null
};

/* ---------- 제작자 관리매뉴얼 — 제작자만 (서버 비공개 보관함 owner-docs/stsh/admin-guide.json) ---------- */
function isOwnerUser() { const p = window.STSH_AUTH && STSH_AUTH.profile; return !!(p && p.role === 'owner'); }
async function loadOwnerManual() {
  if (MANUAL.admin) return true;
  if (!isOwnerUser()) { toast('제작자 관리매뉴얼은 제작자만 볼 수 있습니다'); return false; }
  try {
    const c = window.STSH_AUTH && STSH_AUTH.client; if (!c || !c.storage) throw new Error('로그인이 필요합니다');
    const { data, error } = await c.storage.from('owner-docs').download('stsh/admin-guide.json');
    if (error || !data) throw new Error((error && error.message) || '없음');
    MANUAL.admin = JSON.parse(await data.text()); return true;
  } catch (e) { toast('제작자 관리매뉴얼을 불러오지 못했습니다: ' + (e.message || e)); return false; }
}

/* ---------- 매뉴얼 화면 사진 (media/manual/*.jpg — 없으면 사진 없이) ---------- */
const MAN_IMG = {};
async function manualImgs(kind) {
  const ids = [...new Set(MANUAL[kind].sections.map(s => s.img).filter(Boolean))];
  await Promise.all(ids.map(async id => {
    if (MAN_IMG[id] !== undefined) return;
    try { const r = await fetch(mediaUrl(`media/manual/${id}.jpg`)); if (!r.ok) throw 0; const b = await r.blob(); MAN_IMG[id] = await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }); }
    catch (e) { MAN_IMG[id] = null; }
  }));
}
const MAN_CAP = { m_main: '메인 화면 — 아이콘 · 디오라마 · 안전교육 영상', m_gate: '안전보건 담당 지정 화면', m_set: '사업장 · 설정', m_wk: '근무자 명부', m_ra: '위험성평가', m_tbm: 'TBM 일지 작성 · 참석자 서명', m_chk: '안전점검표', m_rep: '아차사고 · 사고 보고 · 종사자 의견', m_edu: '교육 이력 · 보호구', m_co: '도급인 협의 · 합동점검', m_dash: '안전보건 현황 · 중대재해처벌법 이행', m_report: '보고서 출력' };

/* ---------- 매뉴얼 → 문서 블록(Word·PDF) ---------- */
function manualBlocks(kind) {
  const M = MANUAL[kind], B = [];
  B.push({ k: 'title', t: `${APP.name}\n${M.title}`, sub: `${APP.ko} ${APP.version} · ${M.en} · ${M.sub}` });
  B.push({ k: 'info', rows: [['프로그램', `${APP.name} (${APP.ko})`, '버전', `${APP.version} · ${fmtDs(kstNow())}`], ['대상', kind === 'user' ? '현장 반장 · 소장 · 지사 안전 담당' : '제작자(owner) · 관리자(admin)', '웹 주소', APP.shareUrl]] });
  B.push({ k: 'h', t: '목 차' }); B.push({ k: 'p', t: M.sections.map((s, i) => `${i + 1}. ${s.h}`).join('\n') });
  M.sections.forEach((s, i) => {
    B.push({ k: 'pb' }); B.push({ k: 'h', t: `${i + 1}. ${s.h}` });
    B.push({ k: 'box', title: '핵심', items: s.key });
    if (s.img && MAN_IMG[s.img]) B.push({ k: 'img', src: MAN_IMG[s.img], wIn: 6.4, ratio: MAN_RATIO[s.img] || .56, caption: '▲ ' + (MAN_CAP[s.img] || '') });
    s.blocks.forEach(b => {
      if (b.p) B.push({ k: 'p', t: b.p });
      if (b.ol) B.push({ k: 'p', t: b.ol.map((x, j) => `${j + 1}) ${x}`).join('\n') });
      if (b.ul) B.push({ k: 'bullets', items: b.ul });
      if (b.table) B.push({ k: 'table', head: b.table.head, rows: b.table.rows, w: b.table.head.length === 2 ? [1.3, 4] : b.table.head.length === 3 ? [1.4, 1.2, 3.4] : undefined });
      if (b.tip) B.push({ k: 'box', title: '💡 도움말', items: [b.tip] });
      if (b.warn) B.push({ k: 'box', title: '⚠ 주의', items: [b.warn] });
    });
  });
  B.push({ k: 'p', t: `\n${APP.name} ${APP.version} — Designed & Developed by Rat Rae Choi` });
  return B;
}
const MAN_RATIO = {};
/* ---------- 매뉴얼 → 슬라이드(PPT·PDF) ---------- */
function manualSlides(kind) {
  const M = MANUAL[kind], S = []; let no = 1;
  S.push([Rc(0, 0, SLW, SLH, '0C2350'), Im(SLW * .46, 0, SLW * .54, SLH, ASSET.hero, { cover: true, alpha: .9 }), Rc(.7, 1.4, .14, 1.9, C.green),
    T(1.0, 1.25, 6.5, .5, `${APP.org} · ${APP.ko}`, { size: 15, color: 'B9C3EC' }), T(1.0, 1.75, 6.5, 1.2, M.title, { size: 40, bold: true, color: 'FFFFFF' }),
    T(1.0, 2.85, 6.5, .5, `${M.en} · ${APP.version}`, { size: 16, color: 'D7DEFF' }), T(1.0, 3.5, 6.3, 1, M.sub, { size: 13, color: 'B9C3EC' }),
    Im(1.0, 5.4, 1.1, 1.1, ASSET.icon), T(2.25, 5.5, 5, .5, APP.name, { size: 14, bold: true, color: 'FFFFFF' }), T(2.25, 5.9, 5, .5, 'Designed & Developed by Rat Rae Choi', { size: 11, color: 'B9C3EC', it: true })]);
  S.push(slideBase('목 차', ++no).concat([Im(.6, 1.3, 4, 5.3, ASSET.fig.cute_sec, { contain: true }), T(5.2, 1.25, 7.6, 5.7, M.sections.map((s, i) => `${i + 1}.  ${s.h}`).join('\n'), { size: 17, color: C.ink, line: 1.45 })]));
  M.sections.forEach((s, i) => {
    const im = s.img && MAN_IMG[s.img], els = slideBase(`${i + 1}. ${s.h}`, ++no, M.title);
    els.push(Rc(.45, 1.15, im ? 5.2 : 12.45, 5.75, 'EEF7F1', { r: .1 }), T(.7, 1.25, im ? 4.8 : 12, .45, '핵심', { size: 14, bold: true, color: C.greenD }), T(.75, 1.75, im ? 4.75 : 11.9, 5.0, s.key.map(k => '✔  ' + k).join('\n'), { size: 16, color: C.ink, line: 1.55 }));
    if (im) els.push(Im(5.85, 1.15, 7.05, 5.2, im, { contain: true }), T(5.85, 6.4, 7.05, .4, '▲ ' + (MAN_CAP[s.img] || ''), { size: 10, color: C.gray, align: 'center' }));
    S.push(els);
    s.blocks.filter(b => b.table).forEach(b => {
      const n = b.table.head.length, cw = n === 2 ? [3.2, 9.25] : n === 3 ? [3, 2.2, 7.25] : b.table.head.map(() => 12.45 / n);
      S.push(slideBase(`${i + 1}. ${s.h}`, ++no, M.title).concat([Tb(.45, 1.15, 12.45, tblRows(b.table.head, b.table.rows.slice(0, 12)), cw, { size: b.table.rows.length > 7 ? 10 : 12 })]));
    });
    const tx = s.blocks.filter(b => b.ol || b.p || b.ul || b.tip || b.warn).map(b => b.ol ? b.ol.map((x, j) => `${j + 1}) ${x}`).join('\n') : b.ul ? b.ul.map(x => '• ' + x).join('\n') : b.tip ? '💡 ' + b.tip : b.warn ? '⚠ ' + b.warn : b.p).join('\n\n');
    if (tx) S.push(slideBase(`${i + 1}. ${s.h}`, ++no, M.title).concat([T(.6, 1.2, 12.2, 5.8, tx, { size: tx.length > 700 ? 12 : 14, color: C.ink, line: 1.4 })]));
  });
  return S;
}
async function outManual(kind, fmt) {
  if (kind === 'admin' && !(await loadOwnerManual())) return;
  busy(true, `${MANUAL[kind].title} 만드는 중…`);
  try {
    await manualImgs(kind);
    await Promise.all(Object.entries(MAN_IMG).filter(([k, v]) => v && !MAN_RATIO[k]).map(async ([k, v]) => { const im = await loadImg(v); MAN_RATIO[k] = im.naturalHeight / im.naturalWidth; }));
    const nm = `${MANUAL[kind].file}_${APP.version}`;
    if (fmt === 'docx') await download(await packDocx(blocksToDocx(manualBlocks(kind)), nm), nm + '.docx');
    else if (fmt === 'pptx') await download(await slidesToPptx(manualSlides(kind), nm), nm + '.pptx');
    else if (fmt === 'pptpdf') await download(await slidesToPdf(manualSlides(kind), nm), nm + '_슬라이드.pdf');
    else await download(await blocksToPdf(manualBlocks(kind), nm), nm + '.pdf');
    toast(`${MANUAL[kind].title}를 만들었습니다`);
  } catch (e) { console.error(e); toast('만들지 못했습니다: ' + (e.message || e), 5000); } finally { busy(false); }
}
/* ---------- 프로그램 안 매뉴얼 창 ---------- */
async function openManual(kind) {
  if (kind === 'admin' && !(await loadOwnerManual())) return;
  const M = MANUAL[kind];
  const html = M.sections.map((s, i) => `<section id="man${i}" style="margin-bottom:18px"><h3 style="margin:0 0 6px;color:var(--nv)">${i + 1}. ${esc(s.h)}</h3><ul class="hl" style="margin-bottom:8px">${s.key.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
    ${s.blocks.map(b => b.p ? `<p style="font-size:13.5px">${esc(b.p)}</p>` : b.ol ? `<ol style="font-size:13.5px;padding-left:20px">${b.ol.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : b.ul ? `<ul style="font-size:13.5px;padding-left:20px">${b.ul.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : b.table ? `<div class="tblw" style="margin:6px 0"><table class="t" style="min-width:0"><thead><tr>${b.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : b.tip ? `<p class="spiform">💡 ${esc(b.tip)}</p>` : b.warn ? `<p class="spiform" style="background:#FFF4E5">⚠ ${esc(b.warn)}</p>` : '').join('')}</section>`).join('');
  openModal(`<h2>📘 ${esc(M.title)} <small class="hint">${esc(M.en)} · ${APP.version}</small></h2><div class="sub">${esc(M.sub)}</div>
    <div class="row" style="margin-bottom:10px">${kind === 'user' ? (isOwnerUser() ? '<button class="btn sm" id="mnOther">🛡️ 제작자 관리매뉴얼</button>' : '') : '<button class="btn sm" id="mnOther">👤 사용자 매뉴얼</button>'}<button class="btn sm bw" style="color:#fff;border:0" data-mf="docx">⬇ Word</button><button class="btn sm bp" style="color:#fff;border:0" data-mf="pptx">⬇ PPT</button><button class="btn sm bf" style="color:#fff;border:0" data-mf="pdf">⬇ PDF</button></div>
    <div class="row" style="margin-bottom:10px">${M.sections.map((s, i) => `<a class="chip" href="#man${i}">${i + 1}. ${esc(s.h)}</a>`).join('')}</div>
    <div style="max-height:62vh;overflow:auto;padding-right:6px">${html}</div>
    <div class="mrow"><a class="btn" href="${APP.repo}#readme" target="_blank" rel="noopener">GitHub 안내</a><button class="btn pri" id="mClose">닫기</button></div>`, md => {
    md.querySelector('#mClose').onclick = closeModal; const mo = md.querySelector('#mnOther'); if (mo) mo.onclick = () => openManual(kind === 'user' ? 'admin' : 'user');
    md.querySelectorAll('[data-mf]').forEach(b => b.onclick = () => outManual(kind, b.dataset.mf));
  }, 2);
}

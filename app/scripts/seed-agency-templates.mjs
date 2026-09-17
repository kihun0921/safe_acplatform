import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// agency 값은 실제 나라장터/발주처 API 동기화 데이터의 발주기관명과 정확히
// 일치해야 매칭된다. "조달청"은 하나의 특정 발주기관이 아니라 여러 발주처의
// 공고를 대행하는 조달 창구(api_source='pps')라서, agency 컬럼에는 실제
// 요청기관명(예: "OO교육청")이 들어가고 "조달청"이라는 단일 값으로는 절대
// 매칭되지 않는다 — 그래서 조달청 전용 템플릿은 만들지 않는다.
//
// 각 필드의 default는 빈 칸이 아니라 실제 LH 발주 현장 "안전보건관리계획서"
// 완성 샘플(화성동탄(2) 근린공원31호 지하주차장 설치공사 등)에서 쓰인 표현과
// 형식을 그대로 반영한 초안이다 — 회원은 이 문구를 그대로 두거나 현장 실정에
// 맞게 고쳐 쓰기만 하면 된다(처음부터 빈 칸에 새로 작성할 필요가 없도록).
const TEMPLATES = [
  {
    agency: "한국토지주택공사(LH)",
    name: "한국토지주택공사(LH) 표준 서식 (2025 개정판)",
    cover_style: "lh_standard",
    // 실제 LH 안전보건관리계획서 샘플(화성동탄(2) 근린공원31호 지하주차장 설치공사)의
    // 목차는 "표지"(제출문 포함) 다음 "Ⅰ. 안전보건관리 체계"로 시작하고, 그 1절이
    // 우리 시스템의 "사업개요"에 해당한다. 입력 필드 구성은 그대로 두고 제목만
    // 실제 목차에 맞춰 바꾼다.
    overview_label: "안전보건관리 체계",
    show_cover_nav: true,
    // 실제 샘플의 "Ⅰ.안전보건관리체계 / 1.사업개요" 페이지는 일반 "라벨: 값" 목록이
    // 아니라 글꼴·위치·□ 체크박스 불릿까지 완전히 정형화된 별도 페이지라, 그
    // 서식을 그대로 재현하는 전용 렌더러를 쓴다(generateDocx.ts 등 참고).
    overview_page_style: "lh_standard",
    // "Ⅰ.사업개요" 바로 다음에 "안전보건 경영방침 및 목표" 절을 추가한다. 회원사가
    // 자체 안전보건경영방침 이미지를 갖고 있으면 그 이미지를 업로드해 그대로
    // 첨부하고, 없으면 이 발주처 표준 문구(회사명만 자동 치환, 음영 박스 2곳만
    // 직접 입력)를 쓴다(wizardHtml.ts의 buildManagementPolicySectionHtml 참고).
    show_management_policy: true,
    // "안전보건관리 조직구성"을 실제 조직도(현장소장/안전관리자/관리감독자/작업팀장)
    // 표 형식으로 보여준다. 직책명은 고정값이고 성명·연락처만 입력 가능하다
    // (wizardHtml.ts의 buildOrgChartSectionHtml 참고). 예전에는 agency_templates.
    // sections의 자유서식 텍스트 2칸이었지만, 실제 표준 조직도 서식과 더 가깝게
    // 표 형식으로 바꿨다.
    show_org_chart: true,
    // "구성원별 안전보건 관리 역할"을 회원이 실제 제출했던 서식(구분/주요업무/비고,
    // 헤드라인 음영)과 같은 표로 보여준다. 구분(직책)은 고정값, 주요업무는
    // 경쟁사 서식과 비교해 중복을 통합한 표준 문구가 채워진 채로 수정 가능,
    // 비고는 빈 칸으로 시작한다(wizardHtml.ts의 buildRoleResponsibilitiesSectionHtml
    // 참고). 특정 발주처 전용 내용이 아니라 모든 안전보건관리계획서에 공통으로
    // 들어가는 법정 내용이라 아래 한국전력공사 표준서식에도 동일하게 켜둔다.
    show_role_responsibilities: true,
    // "안전보건교육 계획"을 경쟁사 서식 및 실제 LH 샘플(화성동탄(2), 23~27p
    // "1.2 교육종류 등") 내용을 통합한 표(종류/대상/교육시간/교육강사/교육내용/
    // 교육교재, 헤드라인 음영)로 보여준다. 종류(교육명)는 고정값, 나머지 칸은
    // 표준 문구가 채워진 채로 수정 가능하다(wizardHtml.ts의
    // buildEducationPlanSectionHtml 참고). 특정 발주처 전용 내용이 아니라 모든
    // 안전보건관리계획서에 공통으로 들어가는 법정 내용이라 아래 한국전력공사
    // 표준서식에도 동일하게 켜둔다. 예전에는 sections의 자유서식 텍스트 2칸
    // (id: "education_plan")이었지만 실제 표 서식으로 바꿨다.
    show_education_plan: true,
    // "위험성평가 실시규정"(붙임1, 실제 LH 샘플 화성동탄(2) 131~145p) 전문과 서식
    // 2종(교육일지/회의록)을 팝업(모달)에서 작성하도록 보여준다. 15페이지 분량이라
    // 위저드 본문에는 안내문구+"작성하기" 버튼만 두고, 실제 법정 표준 문구는 팝업
    // 안에서 읽기전용으로 두며 제·개정일/담당자 성명 등 소수만 입력한다
    // (wizardHtml.ts의 buildRiskAssessmentRulesSectionHtml 참고). 산업안전보건법
    // 제36조에 따른 법정 내용이라 아래 한국전력공사 표준서식에도 동일하게 켜둔다.
    show_risk_assessment_rules: true,
    // "유해·위험 기계·기구·물질의 방호조치 및 관리계획" 3개 절(위험기계·기구/
    // 차량계건설기계·하역운반기계/유해·위험물질(MSDS), 실제 LH 샘플 화성동탄(2)
    // 40~90p)을 항목별 체크리스트 개요표 + 항목별 "상세 작성" 팝업 형태로 보여준다
    // (wizardHtml.ts의 buildHazardMachineryLikeSectionHtml/buildHazardSubstanceSectionHtml
    // 참고). 산업안전보건법에 따른 법정 내용이라 아래 한국전력공사 표준서식에도
    // 동일하게 켜둔다.
    show_hazard_management: true,
    // "안전점검 및 일일 순회계획"(실제 LH 샘플 화성동탄(2) 91~93p, "5.1 공정별
    // 안전점검 계획" — TBM 절차 + 작업 전·중·후·특별점검 항목표)을 고정값 서식으로
    // 보여준다(wizardHtml.ts의 buildDailyInspectionPlanSectionHtml 참고). 산업안전
    // 보건법령에 따른 표준 절차·항목이라 아래 한국전력공사 표준서식에도 동일하게
    // 켜둔다.
    show_daily_inspection_plan: true,
    // "중점 위험작업허가제(PTW)"(실제 LH 샘플 화성동탄(2) 33~37p, 허가대상 작업·
    // 허가절차·이행주체 역할표 등)를 고정값 서식으로 보여준다(wizardHtml.ts의
    // buildPtwPlanSectionHtml 참고). 위저드 기본 템플릿의 데모 카드("1. 안전점검
    // 및 일일 순회계획", "2. 중점 위험작업허가제")와 내용이 겹쳐 그 두 카드는 아예
    // 제거했다 — 산업안전보건법령에 따른 표준 절차라 아래 한국전력공사
    // 표준서식에도 동일하게 켜둔다.
    show_ptw_plan: true,
    // 실제 목차 순서(표지 → Ⅰ.안전보건관리체계 → Ⅱ.실행계획 → Ⅲ.운영관리 →
    // Ⅳ.중대산업재해 등 비상 상황시 조치계획 → Ⅴ.기타사항 → Ⅵ.재해발생 수준 →
    // Ⅶ.붙임 → Ⅷ.작업투입 인력 인적사항)에 맞춰, 공통 6대 목차와 아래 sections의
    // 9개 발주처 전용 목차를 각 장(章) 밑에 소제목으로 묶는다. 좌측 목차에는 장별로
    // 대제목(로마숫자+실제 장 제목)이 한 번만 나오고, 그 밑에 속한 절들이 들여쓰기된
    // 소제목으로 나열된다(번호가 중복되어 헷갈리던 기존 평면 목차를 계층 구조로 정리).
    section_order: [
      {
        roman: "Ⅰ",
        title: "안전보건관리 체계",
        members: ["overview", "management-policy", "org_chart", "role_responsibilities"],
      },
      {
        roman: "Ⅱ",
        title: "실행계획",
        members: [
          "education_plan",
          "hazard_machinery",
          "hazard_vehicle",
          "hazard_substance",
          "process_hazard_equipment",
          "risk",
          "execution",
        ],
      },
      { roman: "Ⅲ", title: "운영관리", members: ["daily_inspection_plan", "ptw_plan", "protection_equipment"] },
      { roman: "Ⅳ", title: "중대산업재해 등 비상 상황시 조치계획", members: ["emergency", "accident_procedure"] },
      { roman: "Ⅴ", title: "기타사항", members: ["safety_council", "target", "misc_admin", "safety_cost"] },
      { roman: "Ⅵ", title: "재해발생 수준", members: ["accident_level"] },
      { roman: "Ⅶ", title: "붙임", members: ["risk_assessment_rules", "attachments"] },
      { roman: "Ⅷ", title: "작업투입 인력 인적사항", members: ["workforce"] },
    ],
    disabled_common_sections: [],
    sections: [
      {
        id: "workforce",
        label: "작업투입 인력 인적사항 (작업개시 전까지 제출)",
        fields: [
          {
            key: "vulnerable_workers",
            label: "안전취약근로자 식별 (55세 이상 고령자·여성근로자·외국인노동자)",
            type: "textarea",
            placeholder: "성명/소속/구분(고령·여성·외국인)/세부사항(연령·국적·체류자격)/담당 세부공정/배치 시 안전조치사항을 입력하세요",
            default:
              "성명: (미입력) / 소속: (미입력) / 구분: 고령자(만 55세 이상)\n" +
              "담당 세부공정: (미입력)\n" +
              "배치 시 안전조치사항: 중량물 취급 제한, 단독작업 배제(2인1조 편성 우선 적용), 작업시간 조정(휴식시간 추가 부여), 작업 전 건강상태(고혈압·심혈관질환 등) 확인",
          },
          {
            key: "fire_watch_and_director",
            label: "화재감시자·작업지휘자·감시자(신호수) 지정",
            type: "textarea",
            placeholder: "지정구분(화재감시자/작업지휘자/감시자)/성명/소속/담당 작업(장소)/지정일/교육이수사항을 입력하세요",
            default:
              "지정구분: 화재감시자 / 성명: (미입력) / 소속: (미입력)\n" +
              "담당 작업(장소): 용접·용단 등 화기작업 시, 작업반경 11m 이내 가연물이 있거나 불티가 날릴 우려가 있는 장소\n" +
              "지정일: (미입력) / 교육이수사항: 화재감시자 교육 이수\n" +
              "임무: 화재위험 감시, 화재 발생 시 신속한 대피 유도, 소화기 등 소화설비 사용법과 위치 숙지, 초기진압, 작업 종료 후 30분 이상 잔불 확인",
          },
          {
            key: "pair_work",
            label: "위험작업 시 2인1조 편성표",
            type: "textarea",
            placeholder: "작업내용/작업일자/1조(주작업자)/2조(보조·감시자)/소속/비상연락처를 입력하세요",
            default:
              "작업내용: 밀폐공간·고소작업 등 위험작업\n" +
              "작업일자: 착공 후 수시\n" +
              "1조(주작업자): (미입력) / 2조(보조·감시자): (미입력)\n" +
              "소속: (미입력) / 비상연락처: (미입력)",
          },
        ],
      },
      {
        id: "safety_council",
        label: "안전보건관리 협의체 구성 및 운영",
        fields: [
          {
            key: "council_members",
            label: "협의체 구성원 명단",
            type: "textarea",
            placeholder: "현장소장/관리감독자/작업반장/협력업체 현장소장 및 관리감독자/근로자대표를 성명·소속·연락처와 함께 입력하세요",
            default:
              "참석대상: 현장소장, 관리감독자, 작업반장, 협력업체 현장소장 및 관리감독자, 근로자 대표\n" +
              "현장소장: (미입력) / 근로자 대표: (미입력) / 협력업체 현장소장: (미입력)",
          },
          {
            key: "council_meeting_plan",
            label: "협의체 회의 계획 (실시시기·참석대상·회의내용)",
            type: "textarea",
            placeholder: "정기 간담회(예: 매월 2회 이상)·수시 간담회 구분, 참석대상, 주요 안건(안전보건경영방침 달성 모니터링/유해위험요인 제거대책/법령 준수여부 등)을 입력하세요",
            default:
              "실시시기: 정기 간담회 — 현장소장 주재, 매월 2회 이상 / 수시 간담회 — 현장소장이 필요하다고 판단 시\n" +
              "회의내용: 안전보건경영방침 및 목표 달성 모니터링, 안전보건관련 규정의 효율적인 작동상태 확인, 중대재해처벌법·산업안전보건법·건설기술진흥법 등 준수여부 확인, 유해위험요인의 제거·대체 및 통제 방안 검토, 인력 및 예산 등 자원지원 방안, 평가 및 개선활동 결과내용 검토, 종사자 의견청취\n" +
              "사후관리: 결정사항 즉시 실행, 전 조직 전파 및 공유, 경영방침·목표·계획에 반영",
          },
        ],
      },
      {
        // "4.5 세부공정별 유해·위험 기계·기구·설비 및 물질 사용계획"(붙임3, 실제 LH
        // 샘플 화성동탄(2) 90p 참조문구 → 161~164p 표) — 공종(구분)별로 세부공정,
        // 사용 기계·기구·설비, 사용 유해·위험물질, 주요 유해위험요인 및
        // 안전조치사항을 정리한 표다. 회원 요청대로 장비별 "수량"을 직접 입력할 수
        // 있도록, 사용기계·기구·설비 항목마다 (수량: 미입력) 자리를 비워둔 채
        // 기본값을 채웠다(보호구 지급 현황의 "(수량 미입력)"과 동일한 방식).
        id: "process_hazard_equipment",
        label: "세부공정별 유해·위험 기계·기구·설비 및 물질 사용계획",
        fields: [
          {
            key: "equipment_common_temp",
            label: "가설공사(공통가설)",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 가설사무실·창고, 자재 야적장 설치\n" +
              "· 사용 기계·기구·설비: 지게차(수량: 미입력), 이동식크레인(수량: 미입력), 발전기(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 유류(경유), 도료\n" +
              "· 주요 유해위험요인 및 안전조치사항: 협착·전도 위험 → 작업반경 내 출입통제 및 신호수 배치 / 화재 위험 → 소화기 비치 및 유류 보관소 별도 지정\n\n" +
              "▶ 가설전기·용수, 임시배수로 설치\n" +
              "· 사용 기계·기구·설비: 발전기(수량: 미입력), 양수기(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 유류(경유)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 감전 위험 → 누전차단기 설치 및 접지 실시 / 침수·붕괴위험 → 배수로 정기 점검",
          },
          {
            key: "equipment_earthwork",
            label: "토공사(굴착) ※굴착깊이 -11.13~-6.50m(지하 10m 이상 굴착 대상)",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 표토제거 및 터파기(장비굴착)\n" +
              "· 사용 기계·기구·설비: 굴삭기(굴착기)(수량: 미입력), 덤프트럭(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 비산먼지\n" +
              "· 주요 유해위험요인 및 안전조치사항: 떨어짐(추락) 위험 → 굴착 상부 안전난간대 설치(설계안전보건대장 반영 도면 준수) / 장비-근로자 협착 위험 → 유도원 배치 및 장비 작업반경 출입금지\n\n" +
              "▶ 흙막이 배면 굴착(단계별 굴착)\n" +
              "· 사용 기계·기구·설비: 굴삭기(수량: 미입력), 백호(소형)(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 비산먼지, 살수용수\n" +
              "· 주요 유해위험요인 및 안전조치사항: 무너짐(붕괴) 위험 → 굴착사면 및 흙막이 변위 계측관리 / 떨어짐 위험 → 개구부·단부 방호\n\n" +
              "▶ 되메우기·다짐\n" +
              "· 사용 기계·기구·설비: 굴삭기(수량: 미입력), 진동롤러(수량: 미입력)\n" +
              "· 사용 유해·위험물질: -\n" +
              "· 주요 유해위험요인 및 안전조치사항: 협착 위험 → 장비 후진 경보장치 확인 및 신호수 배치",
          },
          {
            key: "equipment_earth_retaining",
            label: "가설공사(흙막이가시설) ※흙막이 지보공 높이 2m 이상",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 흙막이 말뚝(엄지말뚝·CIP 등) 박기\n" +
              "· 사용 기계·기구·설비: 천공기(수량: 미입력), 크레인(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 벤토나이트, 시멘트풀(그라우트재)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 깔림 위험 → 천공 작업계획서 작성 및 천공기 하부 지내력 확보 / 장비 전도 위험 → 지반 다짐 및 받침목 설치 확인\n\n" +
              "▶ 띠장·버팀보(스트럿) 설치 및 해체\n" +
              "· 사용 기계·기구·설비: 이동식크레인(수량: 미입력), 용접기(수량: 미입력), 산소절단기(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 용접흄, 산소·LPG가스\n" +
              "· 주요 유해위험요인 및 안전조치사항: 떨어짐 위험 → 띠장 보걸이 추락방지시설 설치 / 붕괴 위험 → 설치·해체 순서도 작성 및 준수 / 화재 위험 → 화기작업계획서 작성 및 불티 비산 방지막 설치",
          },
          {
            key: "equipment_pipeline",
            label: "관공사(지장물 이설 등)",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 기존 관로 이설, 관로 터파기\n" +
              "· 사용 기계·기구·설비: 굴삭기(수량: 미입력), 크레인(관 인양)(수량: 미입력)\n" +
              "· 사용 유해·위험물질: -\n" +
              "· 주요 유해위험요인 및 안전조치사항: 떨어짐 위험 → 관로 터파기 상부 추락방지 안전난간대 도면 반영·설치 / 깔림 위험 → 크레인 전도방지 작업계획서 작성(지내력 확보)\n\n" +
              "▶ 배관 부설 및 접합\n" +
              "· 사용 기계·기구·설비: 크레인(수량: 미입력), 발전기(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 그라우트재\n" +
              "· 주요 유해위험요인 및 안전조치사항: 질식 위험(밀폐공간) → 산소농도 측정 후 작업 및 환기팬 가동 / 떨어짐 위험 → 관로 개구부 방호덮개 설치",
          },
          {
            key: "equipment_rc",
            label: "철근콘크리트공사",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 거푸집 설치·해체\n" +
              "· 사용 기계·기구·설비: 이동식크레인(수량: 미입력), 건설용리프트(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 박리제(이형제)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 무너짐 위험 → 거푸집 구조검토서 작성 및 설치·해체 작업계획서 준수 / 떨어짐 위험 → 동바리 및 내부 추락방지망 설치\n\n" +
              "▶ 철근 가공·조립\n" +
              "· 사용 기계·기구·설비: 철근절단기(수량: 미입력), 철근절곡기(수량: 미입력), 크레인(수량: 미입력)\n" +
              "· 사용 유해·위험물질: -\n" +
              "· 주요 유해위험요인 및 안전조치사항: 협착·낙하 위험 → 철근 인양 시 2줄걸이 및 유도로프 사용 / 찔림 위험 → 철근 단부 캡 설치\n\n" +
              "▶ 콘크리트 타설\n" +
              "· 사용 기계·기구·설비: 콘크리트펌프카(수량: 미입력), 타워크레인(수량: 미입력), 바이브레이터(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 레미콘(강알칼리성)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 무너짐 위험 → 데크슬래브 임의시공 금지, 타설 순서·속도 준수 및 집중타설 금지 교육 / 피부 화학손상 위험 → 보호장갑·보호안경 착용",
          },
          {
            key: "equipment_waterproof_finish",
            label: "방수·마감 공사",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 방수공사(도막·시트방수)\n" +
              "· 사용 기계·기구·설비: 고소작업대(수량: 미입력), 비계(시스템비계)(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 우레탄·에폭시 방수제, 프라이머(유기용제)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 떨어짐 위험 → 비계작업발판·안전난간 설치 및 안전대 착용 / 중독(유기용제) 위험 → 국소배기장치 가동 및 방독마스크 지급\n\n" +
              "▶ 조적·미장, 도장공사\n" +
              "· 사용 기계·기구·설비: 비계(수량: 미입력), 믹서기(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 도료, 시너(유기용제)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 화재·중독 위험 → 화기취급 금지구역 설정 및 환기 실시 / 떨어짐 위험 → 비계작업발판 틈새 방호",
          },
          {
            key: "equipment_electrical_mechanical",
            label: "전기·기계 설비 공사",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 전기배선·분전반 설치\n" +
              "· 사용 기계·기구·설비: 절연저항계(수량: 미입력), 고소작업대(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 절연유\n" +
              "· 주요 유해위험요인 및 안전조치사항: 감전 위험 → 활선작업금지, 작업 전 검전 실시 및 접지 확인\n\n" +
              "▶ 급배수·환기·소방설비 설치\n" +
              "· 사용 기계·기구·설비: 용접기(수량: 미입력), 고소작업대(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 용접가스(LPG)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 화재 위험 → 화기작업시 소화기 비치 및 감시인 배치 / 떨어짐 위험 → 개구부 방호 및 안전대 착용",
          },
          {
            key: "equipment_paving_landscape",
            label: "포장·외부(공원 복구) 공사",
            type: "textarea",
            placeholder: "세부공정명 / 사용 기계·기구·설비(수량) / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 아스콘 포장, 보도블록 포장\n" +
              "· 사용 기계·기구·설비: 진동롤러(수량: 미입력), 굴삭기(수량: 미입력), 지게차(수량: 미입력)\n" +
              "· 사용 유해·위험물질: 아스콘(고온물질), 유류\n" +
              "· 주요 유해위험요인 및 안전조치사항: 화상 위험 → 고온아스콘 취급 시 보호장갑 착용 / 협착 위험 → 장비 작업반경 내 신호수 배치\n\n" +
              "▶ 조경 복구\n" +
              "· 사용 기계·기구·설비: 굴삭기(수량: 미입력), 지게차(수량: 미입력)\n" +
              "· 사용 유해·위험물질: -\n" +
              "· 주요 유해위험요인 및 안전조치사항: 협착·전도 위험 → 장비-인력 혼재작업 최소화 및 통제원 배치",
          },
          {
            key: "equipment_health_common",
            label: "보건(전 공정 공통)",
            type: "textarea",
            placeholder: "세부공정명 / 사용 유해·위험물질 / 주요 유해위험요인 및 안전조치사항을 입력하세요",
            default:
              "▶ 전 공정 공통(분진·소음·근골격계)\n" +
              "· 사용 기계·기구·설비: -\n" +
              "· 사용 유해·위험물질: 미세먼지(PM10·PM2.5), 소음(85dB 이상)\n" +
              "· 주요 유해위험요인 및 안전조치사항: 호흡기질환 위험 → 미세먼지 정보제공, 마스크 지급착용 및 작업일정 조정 / 근골격계질환 위험 → 2인1조 작업 및 작업 중 스트레칭 실시 / 난청 위험 → 청력보존프로그램 시행 및 청력보호구 지급 / 피부질환 위험 → 작업환경개선 및 보호구 지급, 안전교육 실시",
          },
        ],
      },
      {
        id: "protection_equipment",
        label: "보호구 지급 현황",
        fields: [
          {
            key: "ppe_list",
            label: "품목별 지급 예정수량 및 지급 대상",
            type: "textarea",
            placeholder: "안전모/안전대/안전화/보안경/방진마스크 등 품목별 지급수량과 지급 대상(전 근로자/특정 공종)을 입력하세요",
            default:
              "· 안전모: (수량 미입력) — 근로자 1인별 지급, 훼손 시 추가지급, 해당 전 근로자에게 지급\n" +
              "· 안전대: (수량 미입력) — 높이 또는 깊이 2미터 이상 추락 위험 작업 근로자\n" +
              "· 안전화: (수량 미입력) — 물체의 낙하·충격, 감전 위험이 있는 작업 근로자\n" +
              "· 보안경: (수량 미입력) — 물체가 흩날릴 위험이 있는 작업 근로자\n" +
              "· 방진마스크: (수량 미입력) — 분진이 심하게 발생하는 작업 근로자",
          },
          {
            key: "ppe_management",
            label: "지급·착용확인 및 유지관리 절차",
            type: "textarea",
            placeholder: "지급대장 관리, 작업 전·중 착용상태 확인 절차, 훼손·노후 보호구 폐기 및 재지급 기준을 입력하세요",
            default:
              "현장소장·안전관리자·관리감독자는 매일 순회점검, TBM, 안전교육 등을 통하여 상시 착용하도록 조치하고, 작업 전·중·후 상시적으로 착용한 상태에서 작업할 수 있도록 점검확인한다.\n" +
              "미착용 근로자 발생 시 즉시 착용토록 조치하고, 지속·반복적으로 미착용 시 작업배제 등 강력 조치한다.\n" +
              "심하게 훼손되거나 정상기능을 상실한 노후 보호구는 폐기하고 즉시 재지급한다.",
          },
        ],
      },
      {
        id: "accident_procedure",
        label: "산업재해 사고처리 절차",
        fields: [
          {
            key: "response_steps",
            label: "사고발생 시 조치 순서",
            type: "textarea",
            placeholder: "① 응급조치(119 신고·구호) → ② 작업중지 및 대피 → ③ 관계기관(발주처·고용노동청 등) 신고 → ④ 현장보존 및 원인조사 → ⑤ 재발방지대책 수립 순으로 절차를 입력하세요",
            default:
              "① 119 신고 및 병원 응급신고 → ② 작업중지 → ③ 근로자 등 종사자 대피 및 구호조치(의식상태 확인, 심폐소생술, 지혈, 보온조치) → ④ 발주처·지방고용노동청·본사 대표이사·경찰서·소방서 보고 → ⑤ 위험요인 제거 및 작업중지 해제요청 → ⑥ 추가 피해 방지를 위한 조치(원인조사, 대책수립, 공유) → ⑦ 합의 및 전파교육\n" +
              "※ 산업안전보건법 제54조의 중대재해가 발생하여 작업을 중지시키고 근로자를 안전한 장소에 대피시킨 때에는 지체 없이 발생개요, 피해상황, 조치 및 전망 등을 관할 지방고용노동관서와 발주처 및 대표이사에게 신속하게 보고한다.",
          },
          {
            key: "report_chain",
            label: "보고체계 및 관계기관 연락처",
            type: "textarea",
            placeholder: "발주처 담당자/관할 지방고용노동청/경찰서/소방서/지정 응급의료기관의 연락처와 보고 순서·기한을 입력하세요",
            default:
              "· 발주처(한국토지주택공사) 담당부서: (미입력) / 연락처: (미입력)\n" +
              "· 관할 지방고용노동관서: (미입력) / 연락처: (미입력)\n" +
              "· 관할 경찰서: (미입력) / 연락처: (미입력)\n" +
              "· 관할 소방서: (미입력) / 연락처: (미입력)\n" +
              "· 지정 응급의료기관: (미입력) / 연락처: (미입력)\n" +
              "보고기한: 사망재해는 즉시, 3일 이상 휴업을 요하는 부상재해는 1개월 이내(단, 발주처 공사감독 및 대표이사에게는 즉시 보고)",
          },
        ],
      },
      {
        id: "misc_admin",
        label: "기타사항 (청렴서약·적격업체 선정·정기 위험성평가)",
        fields: [
          {
            key: "integrity_pledge",
            label: "안전보건관리비 집행 청렴서약서",
            type: "textarea",
            placeholder: "목적 외 사용 금지, 증빙서류 정직성 확보, 발주처 감독·시정요구 준수, 위반 시 불이익 감수 등 서약 내용과 서약자(대표자/현장대리인) 정보를 입력하세요",
            default:
              "당사는 본 공사를 수행함에 있어 「산업안전보건법」 제72조, 동법 시행규칙 제89조 및 고용노동부 고시 「건설업 산업안전보건관리비 계상 및 사용기준」을 철저히 준수하며, 계상된 안전보건관리비를 투명하고 공정하게 집행할 것을 다음과 같이 엄중히 서약합니다.\n" +
              "1. 목적 외 사용 금지 및 정당 집행: 법령에서 정한 용도(근로자 안전장구, 안전시설비, 안전진단비, 건강관리비 등) 외의 타 목적으로 전용·유용하거나 부당하게 집행하지 않습니다.\n" +
              "2. 정산 증빙서류의 정직성 확보: 세금계산서, 거래명세서, 지급노무비 내역, 안전장구 지급대장, 현장 사진 등 제반 증빙을 허위 작성하거나 부풀리지 않으며, 실제 집행된 내역만을 사실대로 제출하겠습니다.\n" +
              "3. 발주처 감독 및 시정요구 준수: 안전보건관리비 집행 실태 점검 및 정산 검토 시 관련 자료를 성실히 제출하고, 부적정 집행 지적 시 즉시 시정 및 반납 조치하겠습니다.\n" +
              "4. 위반 시 불이익 감수: 목적 외 사용, 허위 청구 등 불법·부당행위가 확인될 경우 관련 법령 및 계약조건에 따른 감액, 환수, 입찰참가자격 제한, 영업정지 등 어떠한 처분도 이의 없이 감수하겠습니다.\n" +
              "서약자: 상호(법인명) (미입력) / 대표자 (미입력) / 현장대리인 (미입력)",
          },
          {
            key: "subcontractor_evaluation",
            label: "적격업체(관계수급인) 선정 평가기준",
            type: "textarea",
            placeholder: "안전보건관리체계·산업재해발생률·중대재해 발생이력·안전보건교육체계·안전보건경영시스템인증·법령준수 등 평가항목별 배점과 평가결과(우수/적격/부적격)를 입력하세요",
            default:
              "평가목적: 안전보건 역량을 갖춘 협력업체(관계수급인)를 선정하고, 산업재해 발생 이력 등 결격사유가 있는 부적격업체를 사전에 배제하기 위함\n" +
              "평가항목(배점): 안전보건관리체계 20점, 산업재해발생률 25점, 중대재해 발생이력 15점, 안전보건교육체계 15점, 안전보건경영시스템 인증 10점, 법령준수/결격사유 15점 (합계 100점)\n" +
              "평가등급: 90점 이상 우수업체(협력업체 등록 시 가점 부여), 70~89점 적격(계약체결 가능), 70점 미만 부적격(원칙적으로 계약체결 제한), 중대재해 이력 유 또는 결격사유 해당 시 선정 제외\n" +
              "평가시기: 계약체결 전 1회(신규평가), 도급기간 1년 이상인 경우 매년 1회 이상 재평가",
          },
          {
            key: "periodic_risk_assessment_plan",
            label: "정기 위험성평가 실시계획 (도급기간 1년 이상 시)",
            type: "textarea",
            placeholder: "최초 위험성평가 이후 매년 1회 이상 재평가 계획(실시주기, 담당자, 재평가 대상 공종)을 입력하세요",
            default:
              "도급기간이 1년 이상인 경우, 최초 위험성평가 이후 매년 1회 이상 정기 위험성평가를 실시하여 신규·변경된 유해·위험요인을 재평가하고 개선대책을 수립·이행한다.\n" +
              "평가주체: 현장소장(안전관리자 검토·보좌) / 평가방법: 빈도·강도법 / 재평가 대상: 전 공종 (도급기간이 1년 미만인 경우 해당 없음)",
          },
          {
            key: "safety_info_utilization",
            label: "안전보건정보 활용결과",
            type: "textarea",
            placeholder: "안전보건공단·고용노동부 등이 제공하는 재해사례·위험성평가 자료·안전작업지침 등을 어떻게 확보하고 계획서·교육에 반영했는지를 입력하세요",
            default:
              "안전보건공단(KOSHA)의 재해사례 및 위험성평가 지원시스템(KRAS), 고용노동부 고시·지침, 동종 업종 사망재해 사례 등을 확보하여 본 계획서의 위험성평가 항목 및 근로자 안전교육 자료에 반영하였다.\n" +
              "활용자료: (미입력) / 반영내용: (미입력)",
          },
        ],
      },
      {
        id: "safety_cost",
        label: "종사자(관계수급인) 안전보건 관리비용 기준",
        fields: [
          {
            key: "safety_cost_basis",
            label: "산업안전보건관리비 / 안전관리비 계상현황",
            type: "textarea",
            placeholder: "산업안전보건법상 산업안전보건관리비, 건설기술진흥법상 안전관리비(정기안전점검비/가설구조물 안전성확인/안전관리계획 작성/통행안전관리대책/계측 및 CCTV 모니터링 등 세부항목)의 계상금액과 산정기준을 입력하세요",
            default:
              "· 산업안전보건관리비(산업안전보건법): 계상금액 (미입력)원 — Min[① (재료비+직접노무비)×요율×1.2, ② (재료비+직접노무비+지급자재비/1.1)×요율]\n" +
              "· 안전관리비(건설기술진흥법 시행령 제98조, 8개 세부항목): 정기안전점검비, 가설구조물 구조적 안전성 확인비, 안전관리계획 작성 및 검토비용, 공사장 주변 통행안전관리대책 비용, 계측장비·CCTV 등 안전모니터링 장치 설치·운용 비용, 무선설비 및 무선통신 안전관리체계 구축·운용 비용 등\n" +
              "합계: (미입력)원 — 발주처 현장설명서 붙임 「안전관리비 세부현황」 기준, 계약체결·설계변경 등에 따라 금액이 변경될 경우 재확인하여 반영",
          },
          {
            key: "safety_cost_distribution",
            label: "관계수급인 배분 및 사용기준",
            type: "textarea",
            placeholder: "관계수급인별 배분 방식(공사금액·투입인원 비율, 고위험작업 가중치), 사용항목(안전관리자 인건비/안전시설비/개인보호구/교육비 등), 집행 및 확인절차(월별 사용내역서 제출, 공정률별 최소 사용기준)를 입력하세요",
            default:
              "산업안전보건관리비는 원도급사가 관계수급인의 공사금액 비율 또는 실제 투입인원·작업기간 비율에 따라 배분하며, 고위험작업(굴착·흙막이가시설·고소작업·밀폐공간·중장비 사용 등)에 참여하는 관계수급인에는 위험도 가중치(1.2~1.5배)를 적용하여 우선 배분한다.\n" +
              "사용항목: 안전관리자 등 인건비, 안전시설비, 개인보호구, 안전보건교육비 및 행사비, 근로자 건강장해 예방비, 건설재해예방 기술지도비, 스마트 안전장비 등\n" +
              "집행 및 확인절차: 관계수급인은 매월 안전보건관리비 사용내역서를 작성하여 원도급사에 제출, 원도급사는 이를 취합·정산. 공정률별 최소 사용기준(50~70%: 50% 이상, 70~90%: 70% 이상, 90% 이상: 90% 이상) 준수, 미달 시 사유서 제출 및 익월 집행계획 반영",
          },
        ],
      },
      {
        id: "accident_level",
        label: "재해발생 수준",
        fields: [
          {
            key: "accident_history",
            label: "산업재해 현황 (산재요양승인확인서 / 산업재해율 조회결과)",
            type: "textarea",
            placeholder: "근로복지공단 산재요양 승인/반려여부, 최근 3년간 사고사망만인율·재해율(고용노동부 산업재해율 조회결과) 등 실적을 입력하세요",
            default:
              "근로복지공단 확인 결과: 최근 1년간 소속 근로자의 산업재해로 인한 4일 이상 요양사실 없음, 산재 요양신청서 반려 사실 없음\n" +
              "고용노동부 산업재해율 조회결과: 최근 3년간 사고사망만인율 — 당사 0.00‰ (동종동규모 평균 대비 이하), 재해율 — 당사 (미입력)% (동종동규모 평균 (미입력)%)",
          },
          {
            key: "safety_certification",
            label: "안전보건경영시스템 인증 현황",
            type: "textarea",
            placeholder: "ISO45001, KOSHA-MS 등 인증서 번호·인증범위·유효기간을 입력하세요",
            default:
              "인증명: ISO 45001:2018(안전보건경영시스템) / 인증범위: 토목 및 건축 공사\n" +
              "인증서 번호: (미입력) / 최초 인증일: (미입력) / 유효기간: (미입력)\n" +
              "※ 본 인증서는 최초 인증 결정일로부터 12개월 이내에 사후관리 심사가 진행되는 것을 전제로 유지되며, 기한 내 심사가 완료되지 않을 경우 인증 유지에 제한이 있을 수 있습니다.",
          },
        ],
      },
    ],
  },
  {
    agency: "한국전력공사",
    name: "한국전력공사 표준 서식 (2025 개정판)",
    // "구성원별 안전보건 관리 역할"은 특정 발주처 전용이 아니라 모든 안전보건
    // 관리계획서에 공통으로 들어가는 법정 내용이라 LH와 동일하게 켜둔다.
    show_role_responsibilities: true,
    // LH와 동일하게, 안전보건교육 계획도 모든 안전보건관리계획서에 공통으로
    // 들어가는 법정 내용이라 켜둔다.
    show_education_plan: true,
    // 위험성평가 실시규정도 산업안전보건법 제36조에 따른 법정 내용이라 켜둔다.
    show_risk_assessment_rules: true,
    // 유해·위험 기계·기구·물질 방호조치 및 관리계획도 산업안전보건법에 따른 법정
    // 내용이라 켜둔다.
    show_hazard_management: true,
    // 안전점검 및 일일 순회계획(TBM 절차 등)도 산업안전보건법령에 따른 표준
    // 절차라 켜둔다.
    show_daily_inspection_plan: true,
    // 중점 위험작업허가제(PTW)도 산업안전보건법령에 따른 표준 절차라 켜둔다.
    show_ptw_plan: true,
    disabled_common_sections: [],
    sections: [
      {
        id: "electrical_safety",
        label: "전기공사 특별 안전관리 사항",
        fields: [
          {
            key: "outage_plan",
            label: "정전작업 계획 및 절차",
            type: "textarea",
            placeholder: "정전작업 범위, 시간대, 복전 절차를 입력하세요",
            default:
              "정전작업 원칙: 활선작업을 지양하고 정전작업을 원칙으로 한다.\n" +
              "정전 범위: (미입력) / 정전 시간대: (미입력)\n" +
              "절차: ① 작업 전 차단기 확인(전기실/현장) → ② 스위치·차단기 내림 → ③ 잠금장치(LOTO) 시건 및 표지부착 → ④ 검전 실시 → ⑤ 작업 수행 → ⑥ 모든 작업 완료 후 운전부서 입회자의 요청에 의해서만 전원 복구",
          },
          {
            key: "grounding_check",
            label: "접지·활선 근접작업 점검 현황",
            type: "textarea",
            placeholder: "접지 설치 확인 및 활선 근접작업 이격거리 준수 계획을 입력하세요",
            default:
              "접지 설치: 작업 전 접지 설치상태 확인 및 접지저항 측정, 작업 중 수시 확인\n" +
              "활선 근접작업 이격거리: 전압별 안전이격거리 기준(산업안전보건기준에 관한 규칙 별표) 준수, 절연용 방호구 설치 후 작업",
          },
          {
            key: "insulation_gear",
            label: "절연용 보호구·방호구 지급 현황",
            type: "textarea",
            placeholder: "절연장갑, 절연화, 방호관 등 지급/점검 현황을 입력하세요",
            default:
              "지급품목: 절연장갑, 절연화, 절연모, 방호관, 절연용 방호구(고무블랑켓 등)\n" +
              "점검주기: 작업 전 매회 육안점검, 절연내력 정기시험(6개월 1회) — 시험성적서 현장 보관",
          },
        ],
      },
    ],
  },
  {
    agency: "한국수자원공사",
    name: "한국수자원공사(K-water) 표준 서식",
    // 실제 K-water 붙임2 "안전보건관리계획서 작성양식"(5개 장 구성: Ⅰ.과업개요 →
    // Ⅱ.안전보건관리체제 → Ⅲ.안전보건관리 실행 → Ⅳ.안전보건 운영관리 →
    // Ⅴ.재해발생 수준)을 기준으로 만들었다. LH·KEPCO에 이미 만들어 둔 범용
    // 절(경영방침/조직도/역할/교육계획/위험성평가실시규정/기계기구물질관리계획/
    // 안전점검·순회계획/PTW)은 K-water 샘플에도 동일한 법정 내용으로 등장하므로
    // 그대로 재사용하고, K-water 고유 항목(보호구 지급계획, 신호·연락체계,
    // 기계·장비 안전검사표, 장비 안전관리대책, 합동 안전·보건점검)만 아래
    // sections에 새로 추가했다.
    cover_style: "generic",
    overview_label: "과업 개요",
    show_management_policy: true,
    show_org_chart: true,
    show_role_responsibilities: true,
    show_education_plan: true,
    show_risk_assessment_rules: true,
    show_hazard_management: true,
    show_daily_inspection_plan: true,
    show_ptw_plan: true,
    // 실제 목차 순서(Ⅰ.과업개요 → Ⅱ.안전보건관리체제 → Ⅲ.안전보건관리 실행 →
    // Ⅳ.안전보건 운영관리 → Ⅴ.재해발생 수준)에 맞춰 공통 절과 K-water 전용
    // 절을 장(章)별로 묶는다.
    section_order: [
      { roman: "Ⅰ", title: "과업 개요", members: ["overview"] },
      {
        roman: "Ⅱ",
        title: "안전보건관리체제",
        members: ["management-policy", "hazard_machinery", "hazard_vehicle", "hazard_substance", "org_chart", "role_responsibilities"],
      },
      {
        roman: "Ⅲ",
        title: "안전보건관리 실행",
        members: [
          "risk",
          "risk_assessment_rules",
          "education_plan",
          "protection_equipment",
          "daily_inspection_plan",
          "joint_inspection_kwater",
          "ptw_plan",
        ],
      },
      {
        roman: "Ⅳ",
        title: "안전보건 운영관리",
        members: ["signal_contact_kwater", "machinery_inspection_kwater", "equipment_safety_measures_kwater", "emergency"],
      },
      { roman: "Ⅴ", title: "재해발생 수준", members: ["accident_level", "attachments"] },
    ],
    disabled_common_sections: [],
    sections: [
      {
        id: "protection_equipment",
        label: "보호구 지급, 착용 및 관리계획",
        fields: [
          {
            key: "ppe_list",
            label: "품명·수량·지급계획 및 대상",
            type: "textarea",
            placeholder: "품명별 지급수량과 지급 대상을 입력하세요",
            default:
              "· 안전모: 5개 — 근로자 전원 지급\n" +
              "· 안전화: 5개 — 근로자 전원 지급\n" +
              "· 신호수용 반사조끼: 5개 — 신호수·유도자 지급\n" +
              "· 각반: 5개 — 근로자 전원 지급",
          },
          {
            key: "ppe_management",
            label: "유지 및 관리계획",
            type: "textarea",
            placeholder: "지급대장 관리, 착용상태 확인 절차, 훼손 보호구 폐기·재지급 기준을 입력하세요",
            default:
              "현장소장·관리감독자는 보호구 지급대장을 운영하고, 작업 전·중 착용상태를 수시 확인한다. 훼손되거나 성능이 저하된 보호구는 즉시 폐기하고 재지급하며, 개인별 보관·관리 원칙을 교육한다.",
          },
        ],
      },
      {
        id: "joint_inspection_kwater",
        label: "합동 안전·보건점검 이행",
        fields: [
          {
            key: "inspection_overview",
            label: "점검 개요",
            type: "textarea",
            placeholder: "점검 일정, 점검방법, 점검내용을 입력하세요",
            default: "작업 장소에 대한 점검 일정, 점검방법, 점검내용을 정하여 도급인·수급인 합동으로 정기 점검을 실시한다.",
          },
          {
            key: "corrective_action",
            label: "점검결과 조치이행",
            type: "textarea",
            placeholder: "점검결과 위험요인 발견 시 조치계획을 입력하세요",
            default: "점검 결과 위험요인 발견 시 즉시 시정조치하고, 조치 내용과 완료일을 기록·관리하며 차기 점검계획에 반영한다.",
          },
        ],
      },
      {
        id: "signal_contact_kwater",
        label: "신호 및 연락체계",
        fields: [
          {
            key: "contact_and_signal",
            label: "비상연락체계 · LOTO · 신호체계",
            type: "textarea",
            placeholder: "비상연락망, LOTO 절차, 신호체계(신호수·무전기·수신호 등)를 입력하세요",
            default:
              "□ 비상연락체계\n" +
              "관련기관: K-water 담당부서 / 관할 지방고용노동청 / 관할 소방서 / 관할 경찰서 / 인근 병원 — 각 담당자·연락처를 표로 정리하여 현장에 게시\n\n" +
              "□ LOTO(Lock Out, Tag Out) 작업절차 준수\n" +
              "대상: 정비·점검·수리 등 비정형작업\n" +
              "목적: 기계설비의 정비·청소·수리 작업 중 타 근로자가 그 설비를 운전하는 것을 방지\n" +
              "방법: ① 작업 전 전원부 등에 잠금장치 및 표지판 설치 → ② 작업 완료 후 직접 잠금장치 및 표지판 해제 → ③ 관련 작업자에게 공지\n\n" +
              "□ 신호체계\n" +
              "신호수·무전기·깃발 등을 이용한 신호체계를 구축하고, 건설현장 표준 수신호(작업시작/멈춤/비상멈춤/주행방향/포크 올리기·내리기/작업중지 등)를 전 근로자에게 교육한다.",
          },
        ],
      },
      {
        id: "machinery_inspection_kwater",
        label: "기계·장비 안전검사",
        fields: [
          {
            key: "inspection_list",
            label: "종류별 점검사항 및 점검주기",
            type: "textarea",
            placeholder: "현장에 반입되는 기계·장비별 안전검사 항목·주기·관리계획을 입력하세요",
            default:
              "※ 설치 끝난 날(신규 등록)부터 3년 이내 최초 안전검사 실시, 그 이후 2년마다 점검\n" +
              "· 크레인: 과부하방지장치, 권과방지장치, 안전장치, 훅해지장치 등 — 2년에 1회\n" +
              "· 압력용기: 압력방출장치(안전밸브), 압력계 등 — 2년에 1회\n" +
              "· 리프트: 과부하방지장치, 권과방지장치, 낙하방지장치, 비상정지장치 등 — 2년에 1회\n" +
              "· 프레스: 방호장치, 비상정지장치 등 — 2년에 1회\n" +
              "· 전단기: 방호장치(가드식, 광전자식), 비상정지장치 등 — 2년에 1회\n" +
              "· 곤돌라: 비상정지장치, 권과방지장치, 과부하방지장치, 낙하방지장치, 수평조절장치 등 — 2년에 1회\n" +
              "· 국소배기장치: 흡인성능(제어풍속), 댐퍼, 배풍기의 작동상태 등 — 2년에 1회\n" +
              "· 원심기: 비상정지장치, 덮개 브레이크 등 — 2년에 1회\n" +
              "· 롤러기: 급정지장치, 비상정지장치, 안전캡 등 — 2년에 1회\n" +
              "· 사출성형기: 출입문 리미트방호장치, 비상정지장치, 고온부 덮개 등 — 2년에 1회\n" +
              "· 고소작업대: 안전장치 부착 및 작동 유무, 작업대 고정볼트 체결 및 안전난간 설치 상태, 아웃트리거 설치 상태 등 — 2년에 1회\n" +
              "· 컨베이어: 원동기 및 풀리 기능 이상 유무, 이탈 등의 방지장치 기능 이상 유무, 비상정지장치의 기능 이상 유무 등 — 2년에 1회\n" +
              "· 산업용 로봇: 안전매트, 광전자식 안전장치, 안전방책 등 각종 방호장치 작동상태, 비상정지 스위치 작동 상태 등 — 2년에 1회",
          },
        ],
      },
      {
        id: "equipment_safety_measures_kwater",
        label: "장비 안전관리대책",
        fields: [
          {
            key: "measures",
            label: "구분·위험요소·안전대책",
            type: "textarea",
            placeholder: "장비별 위험요소와 안전대책을 입력하세요",
            default:
              "· 고소작업차 — 위험요소: 고소작업차 전도 / 안전대책: 아웃트리거 전개 확인, 작업 전 지반 지내력 확인, 유도자 배치\n" +
              "※ 사용 장비별로 작업 전 체크리스트·안전점검표 작성 및 조치, 작업계획 수립·검토 내용을 추가로 작성하고, 안전작업허가 대상 장비는 안전작업계획서도 함께 첨부한다.",
          },
        ],
      },
      {
        // LH는 이 id를 자체 sections에 정의해 두었지만(안전보건경영시스템 인증
        // 현황 등), K-water는 별도로 정의한 적이 없어 section_order에서 참조만
        // 하고 실제로는 어디에도 나오지 않는 채로 조용히 빠지는 문제가 있었다 —
        // K-water 샘플(Ⅴ.재해발생 수준)에 맞춰 새로 정의한다.
        id: "accident_level",
        label: "재해발생 수준",
        fields: [
          {
            key: "accident_handling",
            label: "산업재해 처리에 관한 사항",
            type: "textarea",
            placeholder: "산업재해 처리 및 산업재해보상보험과 관련된 절차 및 내용을 입력하세요",
            default:
              "산업재해 발생 시 산업재해보상보험법에 따라 근로복지공단에 요양급여를 신청하고, 발생 경위·원인·재발방지대책을 기록·보관한다. 중대재해에 해당하는 경우 관할 지방고용노동청 및 K-water 담당부서에 즉시 보고한다.",
          },
          {
            key: "accident_history",
            label: "산업재해 발생 현황",
            type: "textarea",
            placeholder: "업체명별 최근 3년간 산업재해 현황(건수)을 입력하세요",
            default: "업체명: (미입력) / 최근 3년간 산업재해 현황: 0건",
          },
          {
            key: "insurance_certificate",
            label: "산재보험 가입 증명원",
            type: "textarea",
            placeholder: "산재보험 가입을 증명할 수 있는 서류(스캔본) 첨부 여부를 입력하세요",
            default: "산재보험 가입증명원(스캔본)을 첨부한다.",
          },
        ],
      },
    ],
  },
];

for (const t of TEMPLATES) {
  const { data: existing } = await admin
    .from("agency_templates")
    .select("id")
    .eq("agency", t.agency)
    .maybeSingle();

  const coverStyle = t.cover_style ?? "generic";
  const overviewLabel = t.overview_label ?? null;
  const showCoverNav = t.show_cover_nav ?? false;
  const sectionOrder = t.section_order ?? [];
  const overviewPageStyle = t.overview_page_style ?? null;
  const showManagementPolicy = t.show_management_policy ?? false;
  const showOrgChart = t.show_org_chart ?? false;
  const showRoleResponsibilities = t.show_role_responsibilities ?? false;
  const showEducationPlan = t.show_education_plan ?? false;
  const showRiskAssessmentRules = t.show_risk_assessment_rules ?? false;
  const showHazardManagement = t.show_hazard_management ?? false;
  const showDailyInspectionPlan = t.show_daily_inspection_plan ?? false;
  const showPtwPlan = t.show_ptw_plan ?? false;
  if (existing) {
    const { error } = await admin
      .from("agency_templates")
      .update({
        name: t.name,
        sections: t.sections,
        disabled_common_sections: t.disabled_common_sections,
        cover_style: coverStyle,
        overview_label: overviewLabel,
        show_cover_nav: showCoverNav,
        section_order: sectionOrder,
        overview_page_style: overviewPageStyle,
        show_management_policy: showManagementPolicy,
        show_org_chart: showOrgChart,
        show_role_responsibilities: showRoleResponsibilities,
        show_education_plan: showEducationPlan,
        show_risk_assessment_rules: showRiskAssessmentRules,
        show_hazard_management: showHazardManagement,
        show_daily_inspection_plan: showDailyInspectionPlan,
        show_ptw_plan: showPtwPlan,
      })
      .eq("id", existing.id);
    if (error) throw error;
    console.log(`${t.agency} 표준서식 업데이트 완료:`, existing.id);
  } else {
    const { data, error } = await admin
      .from("agency_templates")
      .insert({
        agency: t.agency,
        name: t.name,
        sections: t.sections,
        disabled_common_sections: t.disabled_common_sections,
        cover_style: coverStyle,
        overview_label: overviewLabel,
        show_cover_nav: showCoverNav,
        section_order: sectionOrder,
        overview_page_style: overviewPageStyle,
        show_management_policy: showManagementPolicy,
        show_org_chart: showOrgChart,
        show_role_responsibilities: showRoleResponsibilities,
        show_education_plan: showEducationPlan,
        show_risk_assessment_rules: showRiskAssessmentRules,
        show_hazard_management: showHazardManagement,
        show_daily_inspection_plan: showDailyInspectionPlan,
        show_ptw_plan: showPtwPlan,
      })
      .select("id")
      .single();
    if (error) throw error;
    console.log(`${t.agency} 표준서식 생성 완료:`, data.id);
  }
}

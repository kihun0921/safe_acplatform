import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const connectionString = (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL).replace(
  /([?&])sslmode=[^&]*/i,
  "$1sslmode=no-verify"
);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ta = (id, value, rows = 2) =>
  `<textarea id="${id}" class="w-full text-[11px] border border-neutral-300 rounded px-2 py-1.5 leading-relaxed" rows="${rows}">${esc(
    value
  )}</textarea>`;
const inp = (id, value) =>
  `<input id="${id}" type="text" class="w-full text-[11px] border border-neutral-300 rounded px-2 py-1" value="${esc(
    value
  )}"/>`;
const levelSelect = (id, selected) =>
  `<select id="${id}" class="w-full text-[11px] border border-neutral-300 rounded px-2 py-1">${["상", "중", "하"]
    .map((lv) => `<option${lv === selected ? ' selected=""' : ""}>${lv}</option>`)
    .join("")}</select>`;

const th = (text, width) =>
  `<th class="text-left px-2 py-1.5 font-bold text-neutral-700 border-b border-neutral-200${
    width ? ` w-[${width}]` : ""
  }">${esc(text)}</th>`;
const td = (html, extra = "") => `<td class="p-1.5 border-b border-neutral-100 align-top ${extra}">${html}</td>`;
const tdStatic = (text, extra = "") =>
  `<td class="px-2 py-1.5 border-b border-neutral-100 align-top text-neutral-700 whitespace-pre-line ${extra}">${esc(
    text
  )}</td>`;

function table(headers, rowsHtml) {
  return `<table class="w-full text-[11px] border border-neutral-200 rounded-lg overflow-hidden table-fixed mb-2">
<thead><tr class="bg-neutral-100">${headers.map(([t, w]) => th(t, w)).join("")}</tr></thead>
<tbody>${rowsHtml.join("\n")}</tbody>
</table>`;
}

// ── 1. 유사 재해사례 및 아차사고 관리 (4행) ────────────────────────────
const ACCIDENTS = [
  {
    type: "굴착기 작업반경 내 근로자 협착·부딪힘",
    cause: "작업반경 출입통제 미흡, 신호수 미배치, 운전자 시야 사각",
    prevention: "작업반경 출입통제, 신호수 배치, 후방경보장치·카메라 확인, 장비 근접 작업 금지",
  },
  {
    type: "터파기 굴착면 붕괴에 의한 토사 매몰",
    cause: "굴착면 기울기 미준수, 굴착면 상부 자재·장비 적치, 우천 후 지반 약화",
    prevention: "법정 기울기 준수, 상부 적치 금지, 우천·해빙 후 굴착면 점검, 필요시 흙막이 설치",
  },
  {
    type: "덤프트럭·레미콘 후진 중 근로자 충돌",
    cause: "유도자 미배치, 차량동선과 작업구간 미분리, 후진경보 불량",
    prevention: "차량 유도자 배치, 동선 분리, 서행, 후진경보장치 점검",
  },
  {
    type: "구조물 헐기·절단 중 파편 비산 및 분진 노출",
    cause: "브레이커·커터 작업 시 접근통제·보호구 착용 미흡, 살수 미실시",
    prevention: "접근통제, 보안경·방진마스크·귀마개 착용, 살수 실시",
  },
];
const accidentsTable = table(
  [
    ["재해(사고) 유형", "22%"],
    ["주요 원인", "33%"],
    ["예방대책 (TBM 시 전파)", ""],
  ],
  ACCIDENTS.map(
    (a, i) =>
      `<tr>${td(ta(`wizard-field-mil-acc-${i}-type`, a.type))}${td(
        ta(`wizard-field-mil-acc-${i}-cause`, a.cause)
      )}${td(ta(`wizard-field-mil-acc-${i}-prevention`, a.prevention))}</tr>`
  )
);

// ── 2. 위험성평가 방법 (3단계 판단법) ────────────────────────────────
const LEVELS = [
  { level: "상", criteria: "사망 또는 중대한 부상(휴업 수반)으로 이어질 가능성이 높은 위험", action: "즉시 작업 중지, 개선대책 수립·이행 후 작업 재개" },
  { level: "중", criteria: "부상 또는 건강장해 가능성이 있으나 중대하지 않은 위험", action: "개선대책 수립·이행, 작업 중 관리감독 강화 및 TBM 교육" },
  { level: "하", criteria: "경미한 부상 가능성이 있거나 안전조치가 이미 되어 있는 위험", action: "현재 안전조치 유지, 안전정보 제공 및 주기적 교육" },
];
// (판단기준/관리기준도 현장 특성에 맞게 고쳐 쓸 수 있도록 입력칸으로 둔다)
const levelsTableFinal = table(
  [
    ["등급", "8%"],
    ["판단 기준", "46%"],
    ["관리 기준(조치)", ""],
  ],
  LEVELS.map((l, i) => {
    return `<tr>${tdStatic(l.level, "font-bold text-center")}${td(
      ta(`wizard-field-mil-level-${i}-criteria`, l.criteria, 2)
    )}${td(ta(`wizard-field-mil-level-${i}-action`, l.action, 2))}</tr>`;
  })
);

// ── 3. 위험성 평가표 (11행) ───────────────────────────────────────
const RISKS = [
  { hazard: "굴착기(0.7㎥, 브레이커 조합)로 구조물 헐기·터파기 작업 중 장비 작업반경 내 근로자 부딪힘·협착 위험", level: "상", action: "장비 작업반경 내 근로자 출입통제, 작업지휘자·신호수 배치, 작업계획서 작성 및 후방경보장치 작동 확인", due: "착공 즉시", done: "상시", owner: "현장소장" },
  { hazard: "측구·배수로 터파기 중 굴착면 붕괴 및 토사 매몰 위험", level: "상", action: "굴착면 기울기 준수(필요 시 흙막이 설치), 상부 장비·자재 적치 금지, 굴착 전 지반·지하매설물 확인", due: "터파기 착수시", done: "상시", owner: "현장소장" },
  { hazard: "콘크리트구조물 헐기·커터 절단 중 비산물 맞음 및 분진·소음 노출 위험", level: "중", action: "보안경·방진마스크·귀마개 착용 확인, 살수로 분진 비산 억제, 절단·헐기 구간 주변 접근통제", due: "헐기 착수시", done: "상시", owner: "현장소장" },
  { hazard: "덤프트럭·레미콘 차량 진출입 및 후진 중 근로자·장비 충돌 위험", level: "상", action: "차량 유도자 배치, 서행·과속금지, 후진경보장치 작동 확인, 작업구간·차량동선 분리", due: "착공 즉시", done: "상시", owner: "현장소장" },
  { hazard: "합판 거푸집 설치·해체 및 철근 가공·조립 중 자재 취급 협착·찔림·넘어짐 위험", level: "중", action: "철근 단부 보호캡 설치, 안전장갑 착용, 해체 자재 즉시 반출·정리정돈, 레미콘 타설 중 장비 이동구간 통제", due: "상시", done: "상시", owner: "현장소장" },
  { hazard: "진동롤러(핸드가이드식) 보조기층 다짐 작업 중 장비 협착·전도 및 진동 장해 위험", level: "하", action: "숙련 운전자 배치, 작업 전 장비 점검, 경사면·측구 인접부 근접작업 금지, 연속작업시간 제한 및 휴식 부여", due: "작업 착수시", done: "상시", owner: "현장소장" },
  { hazard: "폐콘크리트·폐아스콘 상·하차 및 운반 중 낙하·적재물 비산 및 분진 위험", level: "중", action: "적재함 덮개 설치, 적재량 준수, 상차 시 장비 반경 내 출입통제, 상·하차장 살수 및 정리정돈", due: "폐기물 반출시", done: "상시", owner: "현장소장" },
  { hazard: "배수로 내·외 이동 중 미끄러짐·넘어짐 및 우천 시 유입수 급증에 따른 익수 위험", level: "중", action: "우천·강우예보 시 배수로 내 작업 중지, 미끄럼 방지 조치 및 이동통로 확보, 기상정보 수시 확인 및 TBM 시 전파", due: "상시", done: "상시", owner: "현장소장" },
  { hazard: "굴착기 등 장비 주유·유류 보관 및 취급 중 누유·화재 위험", level: "중", action: "지정 장소 주유, 주변 화기 사용 금지, 소화기 비치, 유류 용기 밀폐 보관, 누유 시 흡착포로 즉시 처리", due: "착공 즉시", done: "상시", owner: "현장소장" },
  { hazard: "시멘트(레미콘)·거푸집 박리제 등 화학물질 취급 중 피부·눈 접촉 및 흡입 위험", level: "중", action: "물질안전보건자료(MSDS) 비치·게시 및 교육, 보안경·안전장갑 착용·취급 후 세척, 용기 경고표시 부착", due: "착공 즉시", done: "상시", owner: "현장소장" },
  { hazard: "절단기·발전기·전동공구 사용 중 가설전기 감전 위험", level: "중", action: "누전차단기·접지 설치 및 작동 확인, 전선 피복 손상 점검·물기 접촉 차단, 젖은 손·바닥 사용 금지", due: "착공 즉시", done: "상시", owner: "현장소장" },
];
const riskTable = `<table class="w-full text-[11px] border border-neutral-200 rounded-lg overflow-hidden table-fixed mb-2">
<thead><tr class="bg-neutral-100">${[
  ["번호", "4%"],
  ["유해·위험요인 파악 (위험한 상황과 결과)", "28%"],
  ["위험성 수준", "8%"],
  ["개선대책", "32%"],
  ["개선예정일", "9%"],
  ["개선완료일", "9%"],
  ["담당자", "10%"],
].map(([t, w]) => th(t, w)).join("")}</tr></thead>
<tbody>${RISKS.map(
  (r, i) =>
    `<tr>${tdStatic(String(i + 1), "text-center font-bold")}${td(
      ta(`wizard-field-mil-risk-${i}-hazard`, r.hazard, 3)
    )}${td(levelSelect(`wizard-field-mil-risk-${i}-level`, r.level), "text-center")}${td(
      ta(`wizard-field-mil-risk-${i}-action`, r.action, 3)
    )}${td(inp(`wizard-field-mil-risk-${i}-due`, r.due))}${td(
      inp(`wizard-field-mil-risk-${i}-done`, r.done)
    )}${td(inp(`wizard-field-mil-risk-${i}-owner`, r.owner))}</tr>`
).join("\n")}</tbody>
</table>`;

// ── 4. 보호구 지급 표 (6행) ──────────────────────────────────────
const PPE = [
  { name: "안전모", qty: "5", target: "전 근로자", maint: "매일 작업 전 균열·파손 여부 확인, 파손 시 즉시 교체" },
  { name: "안전화", qty: "5", target: "전 근로자", maint: "매일 작업 전 상태 확인, 3년 주기 교체" },
  { name: "방진마스크", qty: "3", target: "분진발생관련 작업자(헐기·절단·상하차)", maint: "1회용 소모품, 오염·손상시 즉시 교체" },
  { name: "안전장갑", qty: "3", target: "철근·거푸집 취급 작업자", maint: "작업 전 손상 여부 확인, 손상 시 교체" },
  { name: "보안경", qty: "2", target: "브레이커·커터 절단 작업자", maint: "매 사용 전 렌즈 손상 여부 확인" },
  { name: "귀마개", qty: "3", target: "브레이커·커터 작업자 및 인접 근로자", maint: "착용 상태 수시 확인, 오염·손상시 교체" },
];
const ppeTable = `<table class="w-full text-[11px] border border-neutral-200 rounded-lg overflow-hidden table-fixed mb-2">
<thead><tr class="bg-neutral-100">${[
  ["품명", "16%"],
  ["수량", "10%"],
  ["지급계획 및 대상", "34%"],
  ["유지 및 관리계획", ""],
].map(([t, w]) => th(t, w)).join("")}</tr></thead>
<tbody>${PPE.map(
  (p, i) =>
    `<tr>${tdStatic(p.name, "font-medium text-neutral-800")}${td(
      inp(`wizard-field-mil-ppe-${i}-qty`, p.qty),
      "text-center"
    )}${td(ta(`wizard-field-mil-ppe-${i}-target`, p.target, 2))}${td(
      ta(`wizard-field-mil-ppe-${i}-maint`, p.maint, 2)
    )}</tr>`
).join("\n")}</tbody>
</table>`;

// ── 5. 안전·보건교육 계획 표 (5행) ───────────────────────────────
const EDU = [
  { category: "관리감독자 교육", target: "대표이사(또는 현장소장)", hours: "16시간", date: "착공전", org: "산업안전보건공단", cycle: "1년" },
  { category: "근로자 채용시교육", target: "신규 투입 근로자", hours: "1시간", date: "투입 시", org: "자체(현장소장)", cycle: "채용시" },
  { category: "건설업 기초안전·보건교육", target: "건설일용근로자", hours: "4시간", date: "수시", org: "산업안전보건공단", cycle: "고용시" },
  { category: "특별교육(장비기사)", target: "장비기사(굴착기 등)", hours: "4시간", date: "-", org: "산업안전보건공단", cycle: "고용시/작업변경시" },
  { category: "추가교육(TBM)", target: "전 근로자", hours: "매일 10분 이상", date: "매 작업일", org: "자체(현장소장)", cycle: "매일" },
];
const eduTable = `<table class="w-full text-[11px] border border-neutral-200 rounded-lg overflow-hidden table-fixed mb-2">
<thead><tr class="bg-neutral-100">${[
  ["종류", "20%"],
  ["대상", "20%"],
  ["시간", "13%"],
  ["교육이수일", "13%"],
  ["교육기관", "20%"],
  ["주기", ""],
].map(([t, w]) => th(t, w)).join("")}</tr></thead>
<tbody>${EDU.map(
  (e, i) =>
    `<tr>${tdStatic(e.category, "font-medium text-neutral-800")}${td(
      inp(`wizard-field-mil-edu-${i}-target`, e.target)
    )}${td(inp(`wizard-field-mil-edu-${i}-hours`, e.hours))}${td(
      inp(`wizard-field-mil-edu-${i}-date`, e.date)
    )}${td(inp(`wizard-field-mil-edu-${i}-org`, e.org))}${td(
      inp(`wizard-field-mil-edu-${i}-cycle`, e.cycle)
    )}</tr>`
).join("\n")}</tbody>
</table>`;

// ── 6. 현장 점검 체크리스트 요약 표 (9행) ────────────────────────
const CHECKLIST = [
  { category: "일반사항", items: "위험성평가 실시 및 근로자 숙지, 개인보호구 지급·착용, 정리정돈·안전통로 확보, 추락방지 안전시설물, 안전경고표지판, 조도 확보, 휴게시설, 소음관리(50dB 이하 권장)" },
  { category: "화재 및 폭발 예방", items: "가연성·인화성 물질 관리, 화재감지기 작동, 소화기 배치, 가스용단 역화방지기, 가스실린더 전도방지·캡 설치" },
  { category: "붕괴예방", items: "절토·성토 사면 기울기 준수, 법정 기울기 확보 불가 시 흙막이 설치, 사면 상부 장비 위치 시 지반 안전성" },
  { category: "감전예방", items: "전선 피복 상태, 충전부·콘센트 수분 접촉, 누전차단기 설치·작동, 외함접지 상태, 정전작업 시 잔류전하 방전, 절연용 보호구" },
  { category: "물질안전보건자료(MSDS)", items: "MSDS 현장 비치·게시, 작업공정별 관리요령, 경고표시, 근로자 MSDS 교육" },
  { category: "차량계 건설기계 및 하역운반기계", items: "브레이크·클러치 기능, 작업계획서 작성·검토, 작업지휘자·신호수 배치, 전도방지 조치" },
  { category: "근로자의 반복적 중량물 취급 작업", items: "올바른 자세·복장, 보호구 착용, 온도·습기에 따른 취급방법, 하역운반기계 적절한 사용" },
  { category: "화물자동차", items: "제동·조종장치 기능, 하역·유압장치 기능, 바퀴 이상 유무" },
  { category: "특별조치사항", items: "스마트 안전장비(중장비 접근알림, 전자호루라기 등) 사용, 장비유도자 TBM 교육, 위험성평가 시 스마트 안전장비 활용 반영" },
];
const checklistTable = `<table class="w-full text-[11px] border border-neutral-200 rounded-lg overflow-hidden table-fixed mb-2">
<thead><tr class="bg-neutral-100">${[
  ["구분", "20%"],
  ["점검항목", ""],
].map(([t, w]) => th(t, w)).join("")}</tr></thead>
<tbody>${CHECKLIST.map(
  (c, i) =>
    `<tr>${tdStatic(c.category, "font-medium text-neutral-800")}${td(
      ta(`wizard-field-mil-checklist-${i}`, c.items, 2)
    )}</tr>`
).join("\n")}</tbody>
</table>`;

const sections = [
  {
    id: "military_safety_plan",
    label: "도급사업 안전·보건 관리계획서 (군부대 표준서식)",
    fields: [
      {
        key: "risk_assessment_overview",
        label: "Ⅰ-1-가. 위험성평가 개요",
        type: "textarea",
        default:
          "본 공사의 세부 공정[토공(터파기·되메우기), 구조물 헐기, 콘크리트·보조기층포장, U형측구(현장타설)설치 등]별 유해·위험요인을 사전에 파악하고, 「위험성수준 3단계(상·중·하) 판단법」에 따라 자체 위험성평가를 실시하여 개선대책을 수립·이행합니다.\n· 평가 방법: 위험성수준 3단계(상·중·하) 판단법\n· 평가자: 현장소장\n· 평가 시기: 착공 전 1회 실시, 공정 변경 또는 위험요인 추가 발생 시 재평가",
      },
      {
        key: "similar_accident_cases_table",
        label: "Ⅰ-1-나. 유사 재해사례 및 아차사고 관리",
        type: "richHtml",
        default: `<p class="text-[11px] text-neutral-500 mb-2">굴착·장비 작업에서 반복되는 아래 재해 유형을 위험성평가에 반영하고, 착공 후 TBM 시 전파교육을 실시합니다.</p>${accidentsTable}<p class="text-[11px] text-neutral-500">아차사고는 TBM 시 근로자에게 청취하여 기록하고, 위험성평가 재평가 시 유해·위험요인으로 반영합니다.</p>`,
      },
      {
        key: "risk_level_criteria_table",
        label: "Ⅰ-1-다. 위험성평가 방법 (위험성수준 3단계 판단법)",
        type: "richHtml",
        default: levelsTableFinal,
      },
      {
        key: "risk_assessment_table",
        label: "Ⅰ-1-라. 위험성 평가표",
        type: "richHtml",
        default: `${riskTable}<p class="text-[11px] text-neutral-500">※ 상기 평가표는 착공 전 사전평가 결과이며, 착공 후 현장여건 변화 시 재평가를 실시하고 결과를 반영하여 지속 관리합니다.</p>`,
      },
      {
        key: "safety_inspection_plan",
        label: "Ⅰ-2. 안전점검 및 모니터링 개요",
        type: "textarea",
        default:
          "가. 점검 개요: 설치된 장비·설비 등 물질적인 면 및 작업방법 등 인적·관리적인 면을 포함한 종합적인 것으로부터 불안전한 요소를 찾아 개선하는 활동.\n나. 점검 계획\n1) 일일 또는 작업 전 점검 — 점검자: 관리감독자(매일), 방법: 관리감독자 안전점검표(현장 점검 체크리스트)\n  ① 작업 전: TBM 시 위험성평가 결과 전파, 장비·보호구·작업구간 통제 상태 점검\n  ② 작업 중: 장비 작업반경 출입통제, 굴착면 상태, 차량 유도 상태 등 순회점검\n  ③ 작업 후: 장비 주기·정리정돈, 전원 차단, 유류·가연물 보관 상태, 잔여 위험 확인\n2) 특별점검 — 점검자: 관리감독자, 시기: 점검사유 발생 시(천재지변, 작업개시 등)\n다. 점검결과 조치: 심각한 이상 발견 시 즉시 작업 중지 및 근로자 대피, 중대 위험요소 즉시 제거, 지적사항 즉시 조치(불가피시 사유·보완책 마련)\n라. 기록의 작성 및 보관: 안전점검 결과 및 조치 결과는 문서로 작성하여 보관",
      },
      {
        key: "ppe_supply_table",
        label: "Ⅰ-2-마. 보호구 지급",
        type: "richHtml",
        default: ppeTable,
      },
      {
        key: "ppe_management_plan",
        label: "Ⅰ-2-바. 보호구 관리계획",
        type: "textarea",
        default:
          "1) 보호구 구입시 기능점검 실시\n2) 매일 아침 조회 시간 TBM시간을 이용하여 안전모·안전화 등 점검\n3) 일일 점검 및 합동안전점검시에 수시 기능·성능점검 실시\n4) 보호구를 착용하는 실제 근로자가 근무하고 있는 모든 장소 점검\n5) 불량으로 판정된 제품은 즉시 수거 조치 및 납품 금지 조치하여 근로자 피해방지\n6) 점검대상(보호구 11종) — 5년 주기: 방음보호구(귀마개·귀덮개), 송기마스크 / 3년 주기: 안전모·안전대·안전화·안전장갑·보호복·방진마스크·방독마스크·보안경·보안면",
      },
      {
        key: "field_checklist_table",
        label: "Ⅰ-2. 현장 점검 체크리스트 (요약)",
        type: "richHtml",
        default: `<p class="text-[11px] text-neutral-500 mb-2">실제 현장 점검 시 아래 9개 구분별 항목을 양호/불량/해당없음으로 점검하고, 점검일자·점검현장·관리감독자 서명과 함께 기록·보관합니다.</p>${checklistTable}`,
      },
      {
        key: "safety_education_table",
        label: "Ⅰ-3. 안전·보건교육 계획",
        type: "richHtml",
        default: `${eduTable}<p class="text-[11px] text-neutral-500">※ 건설일용근로자 및 작업내용 변경 근로자는 작업 투입 전 교육 이수를 확인하며, 미이수자는 작업에 투입하지 않습니다. 교육 실시 후 교육일지(일시·내용·참석자 서명)를 작성·보관하고 이수증 사본을 비치합니다. 도급작업의 위험성평가 결과는 법정 교육 외에 매일 TBM 시간에 근로자에게 전파교육합니다.</p>`,
      },
      {
        key: "accident_history_summary",
        label: "Ⅱ-1. 재해발생수준 (산업재해 현황)",
        type: "textarea",
        default:
          "최근 3년간 산업재해 발생현황은 근로복지공단 고용·산재보험 토탈서비스에서 발급받은 「사업장 산업재해율 조회 결과」(사고사망만인율·재해율)를 첨부로 제출합니다.\n또한 최근 3년간 산업재해로 인한 4일 이상의 요양 사실이 없음을 「산재요양 승인/반려여부 확인서」로 확인하며, 「4대 사회보험 사업장 가입자 명부」를 함께 제출해 소속 근로자 현황을 증빙합니다.\n(※ 실제 수치·증빙서류는 회사별로 상이하므로 근로복지공단 고용·산재보험 토탈서비스 및 4대 사회보험 정보연계센터에서 직접 발급받아 첨부하세요.)",
      },
    ],
  },
];

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  // 군부대는 부대마다 발주기관명이 다르므로(제1군수지원사령부/제17보병사단 등)
  // 개별 부대명이 아니라 범용 "군부대" 이름으로 등록한다 — 매칭은
  // src/lib/agencyTemplates.ts의 findMatchingAgencyTemplates()가 발주기관명에
  // 군 부대 패턴(사령부/사단/여단 등)이 있으면 이 서식 하나로 연결해 준다.
  const AGENCY = "군부대";
  const existing = await client.query("select id from agency_templates where agency = $1", [AGENCY]);
  if (existing.rows.length > 0) {
    await client.query("update agency_templates set sections = $1, name = $2, updated_at = now() where id = $3", [
      JSON.stringify(sections),
      "군부대공사표준서식",
      existing.rows[0].id,
    ]);
    console.log("updated existing row:", existing.rows[0].id);
  } else {
    const inserted = await client.query(
      "insert into agency_templates (agency, name, sections) values ($1, $2, $3) returning id",
      [AGENCY, "군부대공사표준서식", JSON.stringify(sections)]
    );
    console.log("inserted new row:", inserted.rows[0].id);
  }
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

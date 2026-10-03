import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("No POSTGRES_URL_NON_POOLING / POSTGRES_URL found in .env.local");
  process.exit(1);
}

const sections = [
  {
    id: "school_safety_plan",
    label: "안전보건관리계획서 (붙임4 제출서식)",
    fields: [
      { key: "worker_count", label: "작업 투입 종사자수", type: "text", placeholder: "예: 5명" },
      {
        key: "site_safety_manager",
        label: "현장 안전·보건 관리책임자 (성명 / 연락처)",
        type: "text",
        placeholder: "예: 홍길동 (010-0000-0000)",
      },
      {
        key: "permit_target",
        label: "➊ 안전작업 허가서 발급 대상 여부 (산업안전보건법 제63조)",
        type: "textarea",
        default:
          "☑ 대상\n(굴착 30cm 이상, 고소작업 2m 이상 등 유해·위험 작업 개시 전 안전작업허가서를 사전 제출·허가받음)",
      },
      {
        key: "risk_hazards",
        label: "➋ 위험성평가 - 작업 중 유해·위험사항 (산업안전보건법 제36조, 제63조)",
        type: "textarea",
        default:
          "1. 수목 식재 작업\n① 굴착기 등 중장비 인접 작업 중 협착 위험\n② 수목 하역·운반 중 낙하·전도 위험\n\n2. 포장·경계석 설치 작업\n① 절단기 사용 중 비래·베임 위험\n③ 중량물(경계석) 운반 중 요통·협착 위험",
      },
      {
        key: "risk_countermeasures",
        label: "➋ 위험성평가 - 안전보건관리 대책",
        type: "textarea",
        default:
          "1. 수목 식재 작업\n① 유도자 배치 및 중장비 작업반경 출입통제\n② 수목 고정 및 2인 1조 운반\n\n2. 포장·경계석 설치 작업\n① 보안경 등 개인보호구 착용, 절단기 방호덮개 확인\n② 중량물 취급 시 2인 이상 공동 작업",
      },
      {
        key: "equipment_plan",
        label: "➌ 사용 기계·기구·설비 종류 및 관리계획 (산업안전보건법 제63조)",
        type: "textarea",
        default:
          "- 사용 장비: 굴착기, 절단기, 콘크리트믹서, 운반차량 등\n- 기계·기구 및 설비 대장 작성·비치\n- 사용 전 안전점검 실시(점검표 작성) 및 작업 중 주기적 점검 실시",
      },
      {
        key: "inspection_items",
        label: "➍ 안전점검 및 조치사항 (산업안전보건법 제63조)",
        type: "textarea",
        default:
          "- 개인보호구 지급현황(대장) 및 착용 준수 여부: 준수\n- 작업장 안전수칙 준수 여부: 준수\n- 추락위험 장소(2인1조·작업발판·안전대 걸이시설): 해당없음\n- 로프작업 안전조치: 해당없음\n- 차량탑재용 고소작업대(스카이) 사용 시 안전조치: 해당없음\n- 작업장 내외부 출입금지 조치 등 주변 안전관리: 준수",
      },
      {
        key: "safety_education_status",
        label: "➎ 안전보건교육 실시 여부 (산업안전보건법 제64조①4호)",
        type: "text",
        default: "☑ 준수 (근로자 작업 전 안전보건교육 실시)",
      },
      {
        key: "emergency_plan_status",
        label: "➏ 비상대책 및 대피방법 근로자 숙지 여부 (산업안전보건법 제64조①5호)",
        type: "textarea",
        default:
          "☑ 준수\n중대재해 발생 → 작업중지 → 초기대응(필요 시) → 긴급대피 → 재해자 응급처치 및 신고 → 원인조사 및 대책 수립\n(비상연락망) 인근 병원: (입력 필요), 중부 또는 북부고용노동지청: 032-000-0000",
      },
      {
        key: "council_status",
        label: "➐ 안전보건협의체 구성 여부 - 도급인/발주자 (산업안전보건법 제64조①1호)",
        type: "text",
        default: "☑ 비대상 (연간 총 작업일수 60일을 초과하지 않는 간헐적 작업)",
      },
      {
        key: "patrol_status",
        label: "➑ 작업장 순회점검 여부 - 도급인/발주자 (산업안전보건법 제64조①2호)",
        type: "text",
        default: "☑ 대상 (주 1회 이상 순회점검 및 점검일지 작성)",
      },
      {
        key: "work_overlap_status",
        label: "➒ 작업혼재로 인한 작업시기·내용 조정 여부 (산업안전보건법 제64조①8호)",
        type: "text",
        default: "☑ 비대상",
      },
      {
        key: "joint_inspection_status",
        label: "➓ 작업장 합동 안전보건점검 여부 (산업안전보건법 제64조②)",
        type: "text",
        default: "☑ 비대상 (공사기간 60일 이내)",
      },
      {
        key: "info_sharing_status",
        label: "⓫ 안전보건에 관한 정보 제공 여부 (산업안전보건법 제65조)",
        type: "text",
        default: "☑ 비대상 (화학물질·질식·붕괴 위험 작업 없음)",
      },
    ],
  },
];

const sanitizedConnectionString = connectionString.replace(/([?&])sslmode=[^&]*/i, "$1sslmode=no-verify");
const client = new pg.Client({
  connectionString: sanitizedConnectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const existing = await client.query("select id from agency_templates where agency = $1", ["백석중학교"]);
  if (existing.rows.length > 0) {
    await client.query("update agency_templates set sections = $1, name = $2, updated_at = now() where id = $3", [
      JSON.stringify(sections),
      "인천광역시교육청 수의계약(학교시설) 표준서식",
      existing.rows[0].id,
    ]);
    console.log("updated existing row:", existing.rows[0].id);
  } else {
    const inserted = await client.query(
      "insert into agency_templates (agency, name, sections) values ($1, $2, $3) returning id",
      ["백석중학교", "인천광역시교육청 수의계약(학교시설) 표준서식", JSON.stringify(sections)]
    );
    console.log("inserted new row:", inserted.rows[0].id);
  }
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

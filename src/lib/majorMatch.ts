// 1단계에서 고른 대학/학과 → 추천 과목 행(RecRow) 해결.
//
// 우선순위:
//   1) majorCourseMap.json  학과명 정확일치(2028 대학별 권장과목, 학과명 통합)
//   2) 키워드 규칙          학과명에 특정 단어 포함 → 프로파일
//   3) 계열 기본            fieldCourseDefaults.json (학과의 계열로 폴백)
//   (그래도 없으면 호출부가 기존 진로군 careerCourseMap으로 폴백)
//
// 값 형식은 기존 careerCourseMap 행(CareerCourseMapping)과 동일하게 맞춰
// recommend.ts의 점수식을 그대로 재사용한다.

import type { CareerCourseMapping, EvidenceRef, RelevanceLevel } from './types';
import coursesJson from '../data/courses.json';
import majorCourseMapJson from '../data/majorCourseMap.json';
import fieldDefaultsJson from '../data/fieldCourseDefaults.json';
import { fieldById } from '../data';

// ---- 이름 → courseId ----
const idByName = new Map<string, string>();
for (const c of coursesJson as { courseId: string; standardName: string }[]) {
  idByName.set(c.standardName, c.courseId);
}
function idsOfNames(names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    const id = idByName.get(n);
    if (id) out.push(id);
  }
  return out;
}

// ---- 정규화(공백 제거, 로마숫자→아라비아) : 학과명 정확일치용 ----
function norm(s: string): string {
  return s
    .replace(/Ⅰ/g, '1').replace(/Ⅱ/g, '2').replace(/Ⅲ/g, '3')
    .replace(/\s+/g, '')
    .toLowerCase();
}

type Profile = { core: string[]; recommended: string[] };

// majorCourseMap: { 학과명: { core: courseId[], recommended: courseId[], sourceUniv } }
const majorMap = majorCourseMapJson as Record<
  string,
  { core: string[]; recommended: string[]; sourceUniv: number }
>;
const majorMapByNorm = new Map<string, { core: string[]; recommended: string[] }>();
for (const [k, v] of Object.entries(majorMap)) {
  majorMapByNorm.set(norm(k), { core: v.core, recommended: v.recommended });
}

// _comment 키가 있어 직접 캐스팅이 안 되므로 unknown 경유(접근 키는 계열명뿐이라 안전).
const fieldDefaults = fieldDefaultsJson as unknown as Record<string, Profile>;

// ---- 키워드 규칙(학과명에 포함되면 해당 프로파일). 위에서부터 우선. ----
// 계열 기본으로 충분한 인문/사회/교육/일반공학·자연은 규칙을 두지 않고 계열 폴백에 맡긴다.
// 여기 프로파일은 courses.json standardName.
const P = {
  AIDATA: { core: ['대수', '미적분Ⅰ', '확률과 통계', '정보', '인공지능 수학'], recommended: ['미적분Ⅱ', '물리학'] },
  CS: { core: ['대수', '미적분Ⅰ', '확률과 통계', '정보', '물리학'], recommended: ['인공지능 수학', '미적분Ⅱ'] },
  ELEC: { core: ['대수', '미적분Ⅰ', '미적분Ⅱ', '물리학', '화학', '확률과 통계'], recommended: ['전자기와 양자', '역학과 에너지'] },
  MECH: { core: ['대수', '미적분Ⅰ', '미적분Ⅱ', '기하', '물리학', '확률과 통계'], recommended: ['역학과 에너지'] },
  CHEMENG: { core: ['화학', '물리학', '대수', '미적분Ⅰ', '확률과 통계'], recommended: ['화학 반응의 세계'] },
  CIVIL: { core: ['대수', '미적분Ⅰ', '기하', '물리학', '확률과 통계'], recommended: [] },
  INDUS: { core: ['대수', '확률과 통계', '미적분Ⅰ', '정보'], recommended: [] },
  MED: { core: ['생명과학', '화학', '대수', '미적분Ⅰ', '확률과 통계'], recommended: ['세포와 물질대사', '생물의 유전'] },
  HEALTH: { core: ['생명과학', '화학', '확률과 통계', '대수'], recommended: ['세포와 물질대사'] },
  BIO: { core: ['생명과학', '화학', '대수', '미적분Ⅰ'], recommended: ['세포와 물질대사', '생물의 유전'] },
  FOOD: { core: ['화학', '생명과학', '대수'], recommended: [] },
  MATH: { core: ['대수', '미적분Ⅰ', '미적분Ⅱ', '기하', '확률과 통계'], recommended: [] },
  PHYS: { core: ['물리학', '대수', '미적분Ⅰ', '미적분Ⅱ', '기하'], recommended: ['역학과 에너지', '전자기와 양자'] },
  CHEM: { core: ['화학', '대수', '미적분Ⅰ', '물리학'], recommended: ['화학 반응의 세계'] },
  EARTH: { core: ['지구과학', '화학', '대수', '미적분Ⅰ'], recommended: ['지구시스템과학'] },
  PE: { core: ['스포츠 과학', '운동과 건강', '스포츠 문화'], recommended: ['스포츠 생활'] },
  MUSIC: { core: ['음악', '음악 연주와 창작'], recommended: ['음악 감상과 비평', '음악과 미디어'] },
  ART: { core: ['미술', '미술 창작'], recommended: ['미술 감상과 비평', '미술과 매체'] },
  DRAMA: { core: ['연극', '미술'], recommended: ['문학과 영상', '음악과 미디어'] },
} satisfies Record<string, Profile>;

const KEYWORD_RULES: { re: RegExp; label: string; profile: Profile }[] = [
  { re: /인공지능|AI|빅데이터|데이터\s*사이언스|데이터과학|지능정보/i, label: 'AI·데이터', profile: P.AIDATA },
  { re: /컴퓨터|소프트웨어|소프트웨|\bSW\b|전산|정보통신|정보보안|사이버보안|게임공학|게임소프트/i, label: '컴퓨터·소프트웨어', profile: P.CS },
  { re: /반도체|전자공학|전기공학|전자전기|전기전자|광공학|전파/, label: '전자·전기', profile: P.ELEC },
  { re: /기계|자동차|항공|우주|조선|로봇|메카트로닉스/, label: '기계', profile: P.MECH },
  { re: /화학공학|화공|신소재|재료공학|고분자|섬유공학/, label: '화공·소재', profile: P.CHEMENG },
  { re: /건축|토목|도시공학|건설|교통공학|환경공학/, label: '건설·건축', profile: P.CIVIL },
  { re: /산업공학|산업경영/, label: '산업공학', profile: P.INDUS },
  { re: /의예|치의|한의|약학|수의|의학과/, label: '의약(의·치·한·약·수의)', profile: P.MED },
  { re: /간호|보건|재활|물리치료|작업치료|임상병리|방사선|응급구조|치위생|안경광학/, label: '간호·보건', profile: P.HEALTH },
  { re: /생명|생물|바이오|유전공학|의생명|미생물|분자생물/, label: '생명·바이오', profile: P.BIO },
  { re: /식품|영양|조리|외식|제과제빵/, label: '식품·영양', profile: P.FOOD },
  { re: /수학|통계/, label: '수학·통계', profile: P.MATH },
  { re: /물리|천문/, label: '물리·천문', profile: P.PHYS },
  { re: /지구|지질|대기과학|해양/, label: '지구·환경', profile: P.EARTH },
  { re: /화학/, label: '화학', profile: P.CHEM },
  { re: /체육|스포츠|태권도|무용|경호/, label: '체육·스포츠', profile: P.PE },
  { re: /음악|실용음악|작곡|성악|기악|국악|피아노|관현악/, label: '음악', profile: P.MUSIC },
  { re: /미술|디자인|회화|조소|공예|서양화|한국화|조형/, label: '미술·디자인', profile: P.ART },
  { re: /연극|영화|영상|만화|애니메이션|웹툰|사진|공연예술/, label: '연극·영상', profile: P.DRAMA },
];

// ---- RecRow 조립 ----
function evidence(detail: string): EvidenceRef[] {
  return [{
    sourceName: '2028학년도 권역별 대학별 권장과목(대교협)',
    sourceDetail: detail,
    effectiveDate: '2025-09-30',
  }];
}

function rowsFromIds(
  coreIds: string[],
  recoIds: string[],
  targetId: string,
  rationaleCore: string,
  rationaleReco: string,
  detail: string,
): CareerCourseMapping[] {
  const ev = evidence(detail);
  const mk = (courseId: string, level: RelevanceLevel, weight: number, rationale: string) =>
    ({ targetId, courseId, relevanceLevel: level, weight, rationale, evidence: ev });
  const seen = new Set<string>();
  const rows: CareerCourseMapping[] = [];
  for (const id of coreIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(mk(id, 'core', 0.9, rationaleCore));
  }
  for (const id of recoIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(mk(id, 'recommended', 0.6, rationaleReco));
  }
  return rows;
}

export interface MajorRef {
  /** 순수 학과명(대학교명 제외) — session.selectedMajorName */
  name?: string;
  /** 학과의 계열 fieldId (F-*) — session.selectedFieldId */
  fieldId?: string;
}

/**
 * 학과 기준 추천 행을 해결한다. 학과 정보가 없거나 어디에도 안 걸리면 null
 * (→ 호출부가 진로군 careerCourseMap으로 폴백).
 */
export function resolveMajorRows(ref: MajorRef): CareerCourseMapping[] | null {
  const name = (ref.name || '').trim();
  const fieldName = ref.fieldId ? fieldById.get(ref.fieldId)?.name : undefined;

  // 1) 학과명 정확일치
  if (name) {
    const hit = majorMapByNorm.get(norm(name));
    if (hit && (hit.core.length || hit.recommended.length)) {
      return rowsFromIds(
        hit.core, hit.recommended, `MAJOR:${name}`,
        `${name}에서 권장하는 과목이에요.`,
        `${name} 진학에 도움이 되는 과목이에요.`,
        '학과별 반영·권장과목(학과명 통합)',
      );
    }
  }

  // 2) 키워드 규칙
  if (name) {
    for (const rule of KEYWORD_RULES) {
      if (rule.re.test(name)) {
        return rowsFromIds(
          idsOfNames(rule.profile.core), idsOfNames(rule.profile.recommended), `KW:${rule.label}`,
          `${rule.label} 분야에서 권장하는 과목이에요.`,
          `${rule.label} 분야에 도움이 되는 과목이에요.`,
          `${rule.label} 계열 권장과목`,
        );
      }
    }
  }

  // 3) 계열 기본
  if (fieldName && fieldDefaults[fieldName]) {
    const p = fieldDefaults[fieldName];
    if (p.core.length || p.recommended.length) {
      return rowsFromIds(
        idsOfNames(p.core), idsOfNames(p.recommended), `FIELD:${fieldName}`,
        `${fieldName}에서 대체로 권장하는 과목이에요.`,
        `${fieldName} 진학에 도움이 되는 과목이에요.`,
        `${fieldName} 계열 기본 권장과목`,
      );
    }
  }

  return null;
}

// 추천 과목 계산 + 학교 편제표 매칭
// 핵심 추천은 AI가 아니라 데이터와 명시적 점수식으로 계산한다.

import type {
  CareerCourseMapping,
  Course,
  CurriculumArea,
  CurriculumEntry,
  MatchStatus,
  Offering,
  RecommendedCourse,
  SubjectArea,
} from './types';
import { careerCourseMap, courseById, offerings } from './schoolData';
import { resolveMajorRows } from './majorMatch';

/**
 * 추천 대상. 학과(대학/학과)를 고른 경우 majorName·fieldId로 학과 맞춤 추천을,
 * 없으면 진로군(groupId)으로 기존 추천을 낸다.
 */
export interface RecTarget {
  /** 순수 학과명 (session.selectedMajorName) */
  majorName?: string;
  /** 학과 계열 fieldId (session.selectedFieldId) */
  fieldId?: string;
  /** 진로군 groupId (session.selectedGroupId) — 최종 폴백 */
  groupId?: string;
}

/** RecTarget → 추천 행. 학과 해결 실패 시 진로군 careerCourseMap으로 폴백. */
function rowsForTarget(target: RecTarget | undefined): CareerCourseMapping[] {
  if (!target) return [];
  if (target.majorName || target.fieldId) {
    const viaMajor = resolveMajorRows({ name: target.majorName, fieldId: target.fieldId });
    if (viaMajor && viaMajor.length) return viaMajor;
  }
  if (target.groupId) return careerCourseMap.filter((m) => m.targetId === target.groupId);
  return [];
}

/** RecTarget 기준 추천 과목 courseId 집합 (배치 화면 ⭐ 등 태깅용). */
export function recommendedIdSet(target: RecTarget | undefined): Set<string> {
  return new Set(rowsForTarget(target).map((m) => m.courseId));
}

/** 교과 영역 표시 순서 */
const AREA_ORDER: SubjectArea[] = [
  '국어',
  '수학',
  '영어',
  '사회',
  '과학',
  '체육',
  '예술',
  '기술·가정',
  '정보',
  '제2외국어/한문',
  '교양',
  '기타',
];

const LEVEL_RANK = { core: 0, recommended: 1, exploratory: 2 } as const;

/**
 * 선택한 학교의 편제표 전체를 교과 영역별로 묶어 돌려준다.
 * 진로군(targetId)에 해당하는 과목에는 추천 정보를 붙인다.
 */
export function getSchoolCurriculum(
  schoolId: string | undefined,
  target: RecTarget | undefined,
): CurriculumArea[] {
  if (!schoolId) return [];

  // 이 학교가 개설하는 과목(courseId) → 필수 여부
  const offeredReq = new Map<string, boolean>();
  for (const o of offerings) {
    if (o.schoolId !== schoolId) continue;
    offeredReq.set(o.courseId, offeredReq.get(o.courseId) || !!o.required);
  }

  // 진로 추천 정보 맵 (학과 맞춤 → 진로군 폴백)
  const recMap = new Map<
    string,
    { level: CurriculumEntry['recommended'] }
  >();
  for (const m of rowsForTarget(target)) {
    recMap.set(m.courseId, {
      level: {
        level: m.relevanceLevel,
        rationale: m.rationale,
        evidence: m.evidence,
      },
    });
  }

  // 영역별로 분류
  const byArea = new Map<SubjectArea, CurriculumEntry[]>();
  for (const [cid, required] of offeredReq) {
    const course = courseById.get(cid);
    if (!course) continue;
    const rec = recMap.get(cid)?.level;
    const entry: CurriculumEntry = { course, required, recommended: rec };
    const arr = byArea.get(course.subjectArea) ?? [];
    arr.push(entry);
    byArea.set(course.subjectArea, arr);
  }

  // 영역 순서 + 영역 안에서는 추천 과목 먼저, 그다음 이름순
  const result: CurriculumArea[] = [];
  for (const area of AREA_ORDER) {
    const entries = byArea.get(area);
    if (!entries || entries.length === 0) continue;
    entries.sort((a, b) => {
      const ra = a.recommended ? LEVEL_RANK[a.recommended.level] : 9;
      const rb = b.recommended ? LEVEL_RANK[b.recommended.level] : 9;
      if (ra !== rb) return ra - rb;
      return a.course.standardName.localeCompare(b.course.standardName, 'ko');
    });
    result.push({ area, entries });
  }
  return result;
}

/** 특정 학교에서 특정 과목이 개설되는 편제표 항목들 */
export function offeringsFor(schoolId: string, courseId: string): Offering[] {
  return offerings.filter(
    (o) => o.schoolId === schoolId && o.courseId === courseId,
  );
}

/** 학교 편제표와 대조해 과목의 개설 상태를 판정한다. */
export function matchStatusFor(
  course: Course,
  schoolId: string | undefined,
): MatchStatus {
  if (!schoolId) return 'verify';
  const rows = offeringsFor(schoolId, course.courseId);
  if (rows.length === 0) return 'not_offered';

  const confirmed = rows.filter((r) => r.availabilityStatus === 'confirmed');
  if (confirmed.length > 0) {
    // 원문 과목명이 표준명과 같으면 '개설 확인', 다르면 '유사 과목명'
    const exact = confirmed.some((r) => r.rawCourseName === course.standardName);
    return exact ? 'offered' : 'offered_similar';
  }
  // planned / verify 만 있는 경우
  return 'verify';
}

const MATCH_SCORE: Record<MatchStatus, { fit: number; grade: number }> = {
  offered: { fit: 20, grade: 10 },
  offered_similar: { fit: 16, grade: 10 },
  verify: { fit: 8, grade: 5 },
  not_offered: { fit: 0, grade: 0 },
};

/**
 * 진로군(또는 진로) 기준 추천 과목 목록을 계산한다.
 * 점수식(PRD 8.2 참고):
 *   진로 연관성(40) + 대학 권장 근거(25) + 학교 개설 적합성(20) + 학년·학기 적합성(10)
 */
export function computeRecommendations(
  target: RecTarget | undefined,
  schoolId: string | undefined,
): RecommendedCourse[] {
  const rows = rowsForTarget(target);
  if (rows.length === 0) return [];

  const result: RecommendedCourse[] = [];

  for (const m of rows) {
    const course = courseById.get(m.courseId);
    if (!course) continue;

    const matchStatus = matchStatusFor(course, schoolId);
    const ms = MATCH_SCORE[matchStatus];

    const relevance = m.weight * 40;
    const evidenceScore = m.evidence.length > 0 ? 25 : 0;
    const score = Math.round(relevance + evidenceScore + ms.fit + ms.grade);

    const offeredAt = schoolId
      ? offeringsFor(schoolId, course.courseId).map((o) => ({
          grade: o.grade,
          semester: o.semester,
          credits: o.credits,
        }))
      : [];

    result.push({
      course,
      level: m.relevanceLevel,
      score,
      rationale: m.rationale,
      evidence: m.evidence,
      matchStatus,
      offeredAt,
    });
  }

  // 점수 높은 순 정렬 (같으면 핵심 추천 우선)
  const levelRank = { core: 0, recommended: 1, exploratory: 2 } as const;
  result.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return levelRank[a.level] - levelRank[b.level];
  });

  return result;
}

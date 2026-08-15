// 편제표(학교 교육과정) 관련 데이터 + 헬퍼.
//
// 왜 별도 모듈인가:
//   offerings.json(약 0.5MB)·curriculum·courses·careerCourseMap 등은 용량이 크고,
//   '학교 선택 이후' 화면(편제표/위저드/점검/졸업장)에서만 쓰인다.
//   이 모듈은 그 화면들(App.tsx에서 React.lazy로 분할)에서만 import 되므로,
//   번들러가 자동으로 별도의 '지연 청크'로 떼어낸다. → 첫 로딩이 가벼워진다.

import type {
  CareerCourseMapping,
  Course,
  Offering,
  School,
  SchoolCurriculum,
  SchoolRule,
  SelectionGroup,
  SlotTargets,
} from './types';

import coursesJson from '../data/courses.json';
import schoolsJson from '../data/schools.json';
import offeringsJson from '../data/offerings.json';
import careerCourseMapJson from '../data/careerCourseMap.json';
import schoolRulesJson from '../data/schoolRules.json';
import selectionGroupsJson from '../data/selectionGroups.json';
import curriculumJson from '../data/curriculum.json';
import grade1Json from '../data/grade1.json';

export const courses = coursesJson as Course[];
export const schools = schoolsJson as School[];
export const offerings = offeringsJson as Offering[];
export const careerCourseMap = careerCourseMapJson as CareerCourseMapping[];

/** 1학년 공통과정 (표시 전용, 학기별 과목명) */
export const grade1 = grade1Json as {
  note: string;
  semesters: { g1s1: string[]; g1s2: string[] };
};

const schoolRules = schoolRulesJson.rules as Record<string, SchoolRule>;
const defaultElective = schoolRulesJson._default as SlotTargets;

/** 학교별 학기 이수 규정 (없으면 표준 추정치) */
export function schoolRuleFor(schoolId: string | undefined): SchoolRule {
  if (schoolId && schoolRules[schoolId]) return schoolRules[schoolId];
  return { electiveCredits: defaultElective, exact: false };
}

const selectionGroups = selectionGroupsJson.groups as Record<
  string,
  SelectionGroup[]
>;

const curricula = curriculumJson.schools as Record<string, SchoolCurriculum>;

/** 학교별 학기순 교육과정(위저드용). 없으면 null */
export function curriculumFor(
  schoolId: string | undefined,
): SchoolCurriculum | null {
  if (schoolId && curricula[schoolId]) return curricula[schoolId];
  return null;
}

/** 학교별 선택군(택N) 규정. curriculum이 있으면 그로부터 파생(우선),
 *  없으면 selectionGroups.json, 그것도 없으면 빈 배열 → 학점 규정으로 폴백 */
export function selectionGroupsFor(schoolId: string | undefined): SelectionGroup[] {
  const cur = curriculumFor(schoolId);
  if (cur) {
    return cur.semesters.flatMap((sem) =>
      sem.groups.map((g) => ({
        label: g.label,
        courseIds: g.courseIds,
        slot: sem.slot,
        choose: g.choose,
      })),
    );
  }
  if (schoolId && selectionGroups[schoolId]) return selectionGroups[schoolId];
  return [];
}

// 빠른 조회를 위한 인덱스
export const courseById = new Map(courses.map((c) => [c.courseId, c]));
export const schoolById = new Map(schools.map((s) => [s.schoolId, s]));

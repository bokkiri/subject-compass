// 학기별 이수 학점 계산 + 규정 비교 유틸
import type {
  PlannedCourse,
  SelectionGroup,
  SlotId,
  SlotTargets,
} from './types';
import { courseById, schoolRuleFor } from './schoolData';

/** 과목이 선택군 풀에 속하는가 (courseIds 우선, 없으면 areas) */
export function courseInGroup(courseId: string, g: SelectionGroup): boolean {
  if (g.courseIds && g.courseIds.length > 0) return g.courseIds.includes(courseId);
  const c = courseById.get(courseId);
  return !!c && !!g.areas && g.areas.includes(c.subjectArea);
}

/** 선택군에 배치된 과목 수 */
export function groupPlacedCount(
  planned: PlannedCourse[],
  g: SelectionGroup,
): number {
  return planned.filter((p) => p.slot === g.slot && courseInGroup(p.courseId, g))
    .length;
}

export const SEMESTER_SLOTS: Exclude<SlotId, 'unplaced'>[] = [
  'g2s1',
  'g2s2',
  'g3s1',
  'g3s2',
];

/** 배치된 과목의 학기별 학점 합계 */
export function placedCreditsBySlot(
  planned: PlannedCourse[],
): Record<SlotId, number> {
  const out: Record<SlotId, number> = {
    g2s1: 0,
    g2s2: 0,
    g3s1: 0,
    g3s2: 0,
    unplaced: 0,
  };
  for (const p of planned) {
    const c = courseById.get(p.courseId);
    if (!c) continue;
    out[p.slot] += c.credits;
  }
  return out;
}

/** 학교의 학기별 목표 학점 */
export function slotTargets(schoolId: string | undefined): SlotTargets {
  return schoolRuleFor(schoolId).electiveCredits;
}

/** 학점 충족 상태 (허용 오차 ±3학점) */
export type CreditStatus = 'empty' | 'under' | 'ok' | 'over';
export const CREDIT_TOLERANCE = 3;

export function creditStatus(placed: number, target: number): CreditStatus {
  if (placed === 0) return 'empty';
  if (placed < target - CREDIT_TOLERANCE) return 'under';
  if (placed > target + CREDIT_TOLERANCE) return 'over';
  return 'ok';
}

// 계획의 '잘한 점'을 규칙으로 도출 (AI 아님, 단정 표현 금지)
import type { PlannedCourse } from './types';
import { careerCourseMap, courseById, selectionGroupsFor } from './schoolData';
import { matchStatusFor } from './recommend';
import { creditStatus, groupPlacedCount, placedCreditsBySlot, SEMESTER_SLOTS, slotTargets } from './plan';

export function computeStrengths(
  planned: PlannedCourse[],
  schoolId: string | undefined,
  targetId: string | undefined,
): string[] {
  const placed = planned.filter((p) => p.slot !== 'unplaced');
  const placedIds = new Set(placed.map((p) => p.courseId));
  const out: string[] = [];

  if (placed.length === 0) return out;

  // 0) 이수 규정 충족 — 선택군(택N)이 있으면 그것으로, 없으면 학점으로 판단
  const groups = selectionGroupsFor(schoolId);
  if (groups.length > 0) {
    const allMet = groups.every((g) => groupPlacedCount(placed, g) === g.choose);
    if (allMet) out.push('모든 학기의 선택군 규정(택N)을 정확히 맞췄어요.');
  } else {
    const targets = slotTargets(schoolId);
    const credits = placedCreditsBySlot(planned);
    if (SEMESTER_SLOTS.every((s) => creditStatus(credits[s], targets[s]) === 'ok')) {
      out.push('모든 학년·학기의 이수 학점을 학교 규정에 맞게 채웠어요.');
    }
  }

  // 1) 핵심 추천 과목을 담았는가
  if (targetId) {
    const coreIds = careerCourseMap
      .filter((m) => m.targetId === targetId && m.relevanceLevel === 'core')
      .map((m) => m.courseId);
    const gotCore = coreIds.filter((id) => placedIds.has(id));
    if (gotCore.length > 0) {
      const names = gotCore
        .map((id) => courseById.get(id)?.standardName)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      out.push(`진로와 관련된 핵심 추천 과목(${names})을 계획에 담았어요.`);
    }
  }

  // 2) 학교에서 개설이 확인된 과목 위주인가
  const offeredCount = placed.filter((p) => {
    const c = courseById.get(p.courseId);
    if (!c) return false;
    const s = matchStatusFor(c, schoolId);
    return s === 'offered' || s === 'offered_similar';
  }).length;
  if (offeredCount >= Math.max(2, Math.ceil(placed.length * 0.6))) {
    out.push(`선택한 과목 대부분이 이 학교에서 실제로 개설이 확인돼요.`);
  }

  // 3) 여러 교과 영역에 걸쳐 균형 있게 골랐는가
  const areas = new Set(
    placed.map((p) => courseById.get(p.courseId)?.subjectArea).filter(Boolean),
  );
  if (areas.size >= 3) {
    out.push(`${areas.size}개 교과 영역에 걸쳐 균형 있게 선택했어요.`);
  }

  return out;
}

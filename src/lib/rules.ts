// 규칙 기반 계획 점검 (AI 아님)
// 오류(error) / 확인 필요(verify) / 권고(recommendation) 로 구분한다.

import type { CheckResult, PlannedCourse, SlotId } from './types';
import { content, groupById } from '../data';
import {
  careerCourseMap,
  courseById,
  selectionGroupsFor,
} from './schoolData';
import { matchStatusFor, offeringsFor } from './recommend';
import {
  creditStatus,
  groupPlacedCount,
  placedCreditsBySlot,
  SEMESTER_SLOTS,
  slotTargets,
} from './plan';

/** 슬롯 → 학년/학기 */
const SLOT_GS: Record<Exclude<SlotId, 'unplaced'>, { grade: number; semester: number }> = {
  g2s1: { grade: 2, semester: 1 },
  g2s2: { grade: 2, semester: 2 },
  g3s1: { grade: 3, semester: 1 },
  g3s2: { grade: 3, semester: 2 },
};

/** 시간 순서 비교용 슬롯 인덱스 */
const SLOT_ORDER: Record<SlotId, number> = {
  g2s1: 0,
  g2s2: 1,
  g3s1: 2,
  g3s2: 3,
  unplaced: 99,
};

export function checkPlan(
  planned: PlannedCourse[],
  schoolId: string | undefined,
  targetId: string | undefined,
): CheckResult[] {
  const results: CheckResult[] = [];
  const placed = planned.filter((p) => p.slot !== 'unplaced');
  const placedIds = new Set(placed.map((p) => p.courseId));
  const slotOf = new Map(placed.map((p) => [p.courseId, p.slot]));

  for (const p of placed) {
    const course = courseById.get(p.courseId);
    if (!course || p.slot === 'unplaced') continue;
    const name = course.standardName;
    const status = matchStatusFor(course, schoolId);

    // (편제표에 있는 과목만 선택 가능하므로 미개설/확인필요 경고는 두지 않는다)
    if (status === 'not_offered') continue;

    // 2) 실제 개설 학년·학기와 다른 위치에 배치
    const gs = SLOT_GS[p.slot];
    const rows = offeringsFor(schoolId ?? '', p.courseId);
    // 학기(semester)가 편제표에 명시되지 않은 경우(선택과목 풀)에는 학기 위치를 검사하지 않는다.
    const rowsWithSemester = rows.filter((r) => r.semester != null);
    if (rowsWithSemester.length > 0) {
      const okHere = rowsWithSemester.some(
        (r) => r.grade === gs.grade && r.semester === gs.semester,
      );
      if (!okHere) {
        const where = rowsWithSemester
          .map((r) => `${r.grade}학년 ${r.semester}학기`)
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(', ');
        results.push({
          severity: 'verify',
          courseName: name,
          message: `‘${name}’을(를) ${gs.grade}학년 ${gs.semester}학기에 두었지만, 학교 자료에는 ${where}에 개설돼요. 위치를 옮겨 보세요.`,
        });
      }
    }

    // 3) 선수과목 관계
    for (const preId of course.prerequisites) {
      const pre = courseById.get(preId);
      if (!pre) continue;
      if (!placedIds.has(preId)) {
        results.push({
          severity: 'recommendation',
          courseName: name,
          message: `‘${name}’ 전에 ‘${pre.standardName}’을(를) 먼저 듣는 것을 권해요.`,
        });
      } else {
        const preSlot = slotOf.get(preId)!;
        if (SLOT_ORDER[preSlot] > SLOT_ORDER[p.slot]) {
          results.push({
            severity: 'error',
            courseName: name,
            message: `‘${pre.standardName}’(선수과목)이 ‘${name}’보다 뒤에 배치됐어요. 순서를 바꿔야 해요.`,
          });
        }
      }
    }
  }

  // 4) 같은 선택군을 같은 학기에 여러 개 배치
  const groupSlotCount = new Map<string, string[]>();
  for (const p of placed) {
    if (p.slot === 'unplaced') continue;
    const slot = p.slot;
    const gs = SLOT_GS[slot];
    const rows = offeringsFor(schoolId ?? '', p.courseId);
    const row = rows.find(
      (r) => r.grade === gs.grade && r.semester === gs.semester,
    );
    if (row?.selectionGroup) {
      const key = `${slot}::${row.selectionGroup}`;
      const arr = groupSlotCount.get(key) ?? [];
      arr.push(courseById.get(p.courseId)?.standardName ?? p.courseId);
      groupSlotCount.set(key, arr);
    }
  }
  for (const [key, names] of groupSlotCount.entries()) {
    if (names.length >= 2) {
      const groupName = key.split('::')[1];
      results.push({
        severity: 'verify',
        message: `같은 선택군(‘${groupName}’)에서 ${names.join(', ')}을(를) 동시에 골랐어요. 학교에 따라 하나만 선택해야 할 수 있어요.`,
      });
    }
  }

  // 5) 진로 핵심 추천 과목 누락 (개설되는데 안 담은 경우만)
  if (targetId) {
    const coreRows = careerCourseMap.filter(
      (m) => m.targetId === targetId && m.relevanceLevel === 'core',
    );
    for (const m of coreRows) {
      const course = courseById.get(m.courseId);
      if (!course) continue;
      if (placedIds.has(m.courseId)) continue;
      const status = matchStatusFor(course, schoolId);
      if (status === 'offered' || status === 'offered_similar') {
        results.push({
          severity: 'recommendation',
          courseName: course.standardName,
          message: `핵심 추천 과목 ‘${course.standardName}’이(가) 이 학교에서 개설되는데 아직 계획에 없어요. 추가를 고려해 보세요.`,
        });
      }
    }
  }

  // 6) 한 교과 영역에 과도한 편중
  if (placed.length >= 4) {
    const areaCount = new Map<string, number>();
    for (const p of placed) {
      const c = courseById.get(p.courseId);
      if (!c) continue;
      areaCount.set(c.subjectArea, (areaCount.get(c.subjectArea) ?? 0) + 1);
    }
    for (const [area, count] of areaCount.entries()) {
      if (count / placed.length > 0.6) {
        results.push({
          severity: 'recommendation',
          message: `선택 과목이 ‘${area}’ 영역에 치우쳐 있어요. 균형을 위해 다른 영역도 살펴보세요.`,
        });
      }
    }
  }

  // 7) 이수 규정 검증 — 선택군(택N)이 있으면 우선, 없으면 학기별 학점 규정
  const groups = selectionGroupsFor(schoolId);
  if (groups.length > 0) {
    for (const g of groups) {
      const cnt = groupPlacedCount(placed, g);
      const where = content.slotLabels[g.slot];
      if (cnt < g.choose) {
        results.push({
          severity: 'verify',
          message: `[${where}] ‘${g.label}’에서 ${g.choose}과목을 선택해야 하는데 현재 ${cnt}과목이에요. ${g.choose - cnt}과목 더 배치하세요.`,
        });
      } else if (cnt > g.choose) {
        results.push({
          severity: 'verify',
          message: `[${where}] ‘${g.label}’은(는) ${g.choose}과목만 선택할 수 있는데 현재 ${cnt}과목이에요. ${cnt - g.choose}과목을 빼거나 옮기세요.`,
        });
      }
    }
  } else {
    const targets = slotTargets(schoolId);
    const credits = placedCreditsBySlot(planned);
    for (const slot of SEMESTER_SLOTS) {
      const target = targets[slot];
      const c = credits[slot];
      const label = content.slotLabels[slot];
      const st = creditStatus(c, target);
      if (st === 'empty') {
        results.push({
          severity: 'recommendation',
          message: `${label}에 아직 과목을 배치하지 않았어요. 목표 ${target}학점을 채워 보세요.`,
        });
      } else if (st === 'under') {
        results.push({
          severity: 'verify',
          message: `${label} 이수 학점이 부족해요. 현재 ${c}학점 / 목표 ${target}학점 (약 ${target - c}학점 더 필요).`,
        });
      } else if (st === 'over') {
        results.push({
          severity: 'verify',
          message: `${label} 이수 학점이 많아요. 현재 ${c}학점 / 목표 ${target}학점. 일부를 다른 학기로 옮겨 보세요.`,
        });
      }
    }
  }

  // 동일한(심각도+메시지) 결과는 한 번만 남긴다 (중복 표시 방지)
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.severity}::${r.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 진로군/진로 이름 (표시용) */
export function targetName(targetId: string | undefined): string {
  if (!targetId) return '';
  return groupById.get(targetId)?.name ?? targetId;
}

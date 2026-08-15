import { useMemo } from 'react';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { courseById, curriculumFor } from '../lib/schoolData';
import { checkPlan } from '../lib/rules';
import { computeStrengths } from '../lib/strengths';
import type { CheckResult } from '../lib/types';

function Group({ items }: { items: CheckResult[] }) {
  return (
    <div className="list-gap">
      {items.map((c, i) => (
        <div key={i} className={`check-item ${c.severity}`}>
          <span className="ci-icon" aria-hidden>
            {c.severity === 'error' ? '🚫' : c.severity === 'verify' ? '❔' : '💡'}
          </span>
          <span className="ci-msg">{c.message}</span>
        </div>
      ))}
    </div>
  );
}

export function CheckScreen() {
  const { session, goTo } = useSession();

  const checks = useMemo(
    () =>
      checkPlan(
        session.plannedCourses,
        session.selectedSchoolId,
        session.selectedGroupId,
      ),
    [session.plannedCourses, session.selectedSchoolId, session.selectedGroupId],
  );

  const strengths = useMemo(
    () => computeStrengths(session.plannedCourses, session.selectedSchoolId, session.selectedGroupId),
    [session.plannedCourses, session.selectedSchoolId, session.selectedGroupId],
  );

  const errors = checks.filter((c) => c.severity === 'error');
  const verifies = checks.filter((c) => c.severity === 'verify');
  const recs = checks.filter((c) => c.severity === 'recommendation');

  const placedCount = session.plannedCourses.filter((p) => p.slot !== 'unplaced').length;

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo(curriculumFor(session.selectedSchoolId) ? 'curriculum' : 'planner')} />
        <span className="eyebrow">5단계 · 점검</span>
        <h2 className="title">계획을 점검했어요</h2>
        <p className="subtitle">
          규칙에 따라 자동으로 확인한 결과예요. (AI가 아닌 정해진 규칙 기반)
        </p>

        {placedCount === 0 && (
          <div className="notice warn">
            아직 배치한 과목이 없어요. 이전으로 돌아가 과목을 배치하면 더 자세한
            점검을 받을 수 있어요.
          </div>
        )}

        <div className="section-label">✅ 잘한 점</div>
        {strengths.length > 0 ? (
          <div className="list-gap">
            {strengths.map((s, i) => (
              <div key={i} className="check-item recommendation">
                <span className="ci-icon" aria-hidden>
                  ✅
                </span>
                <span className="ci-msg">{s}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">과목을 배치하면 잘한 점을 찾아드려요.</div>
        )}

        {errors.length > 0 && (
          <>
            <div className="section-label">🚫 오류 ({errors.length})</div>
            <Group items={errors} />
          </>
        )}

        {verifies.length > 0 && (
          <>
            <div className="section-label">❔ 확인 필요 ({verifies.length})</div>
            <Group items={verifies} />
          </>
        )}

        {recs.length > 0 && (
          <>
            <div className="section-label">💡 권고 ({recs.length})</div>
            <Group items={recs} />
          </>
        )}

        {checks.length === 0 && placedCount > 0 && (
          <div className="notice mt-16">
            특별한 오류나 확인할 점이 발견되지 않았어요. 좋아요! 👍
          </div>
        )}

        <div className="section-label">🙋 선생님께 물어보면 좋은 질문</div>
        <div className="list-gap">
          {buildTeacherQuestions(session.plannedCourses, verifies).map((q, i) => (
            <div key={i} className="notice">
              {q}
            </div>
          ))}
        </div>
      </Screen>

      <Footer primaryLabel="결과 저장하기" onPrimary={() => goTo('result')} />
    </>
  );
}

function buildTeacherQuestions(
  planned: { courseId: string; slot: string }[],
  verifies: CheckResult[],
): string[] {
  const qs: string[] = [];
  if (verifies.length > 0) {
    const name = verifies.find((v) => v.courseName)?.courseName;
    if (name) qs.push(`‘${name}’ 과목이 실제로 매년 개설되는지 확인해 주실 수 있나요?`);
  }
  const placed = planned.filter((p) => p.slot !== 'unplaced');
  if (placed.length > 0) {
    const first = courseById.get(placed[0].courseId)?.standardName;
    if (first) qs.push(`제 진로를 생각할 때 ‘${first}’ 외에 더 들으면 좋은 과목이 있을까요?`);
  }
  qs.push('제가 고른 과목들이 제 진로에 어떻게 도움이 되는지 더 알고 싶어요.');
  return qs;
}

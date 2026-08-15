import { useEffect, useMemo, useState } from 'react';
import { Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { useToast } from '../toast';
import { courseById, curriculumFor, grade1, offerings } from '../lib/schoolData';
import { recommendedIdSet } from '../lib/recommend';
import { JOURNEY_TOTAL } from '../lib/runnerSprite';
import type { PlannedCourse, SelectionGroupDef, SlotId } from '../lib/types';

/** 6학기 여정: 1-1 → 3-2. 1학년은 공통과정 안내, 2·3학년은 선택. */
const RUNNER_TOTAL = JOURNEY_TOTAL;

/** 학기 순서(선수과목 '이전 학기' 판정용). 1학년은 plannedCourses에 없지만 순서에 포함. */
const SLOT_SEQ = ['g1s1', 'g1s2', 'g2s1', 'g2s2', 'g3s1', 'g3s2'];
const orderOf = (slot: string) => SLOT_SEQ.indexOf(slot);

/** 슬롯 → 짧은 학기 표기 (다른 학기 선택 안내용) */
const SLOT_SHORT: Record<string, string> = {
  g1s1: '1-1',
  g1s2: '1-2',
  g2s1: '2-1',
  g2s2: '2-2',
  g3s1: '3-1',
  g3s2: '3-2',
};

/** 선택과목 유형 → 배지 라벨/클래스 (2022 개정 교육과정) */
const ELECTIVE_BADGE: Record<string, { label: string; cls: string }> = {
  일반: { label: '일반', cls: 'gen' },
  진로: { label: '진로', cls: 'car' },
  융합: { label: '융합', cls: 'fus' },
  공통: { label: '공통', cls: 'com' },
};

const SEASONS = [
  'season-spring',
  'season-summer',
  'season-autumn',
  'season-winter',
  'season-bloom',
  'season-gold',
];

/** 학기별 마음가짐·응원 문구 (0=1-1 … 5=3-2) */
const CHEER = [
  '드디어 고등학생이 됐어요! 설레는 마음으로 첫 학기를 시작해요 🌱',
  '이제 학교에 익숙해졌죠? 나에게 맞는 공부 리듬을 찾아가는 시기예요 🌿',
  '내 진로에 맞춰 과목을 고르는 진짜 선택이 시작돼요. 나를 믿고 골라봐요! ✨',
  '한 학기 해봤으니 감이 왔죠? 관심 분야를 조금 더 깊이 파고들 시간이에요 🔎',
  '마지막 1년의 시작! 지금까지의 선택이 진로로 이어져요. 끝까지 힘내요 💪',
  '졸업이 눈앞이에요. 마지막 학기, 나의 3년을 멋지게 완성해봐요 🎓',
];

export function CurriculumWizardScreen() {
  const { session, update, goTo } = useSession();
  const { showToast } = useToast();
  const curriculum = curriculumFor(session.selectedSchoolId);
  // 현재 학기는 세션에 저장(상단 헤더의 러너 진행바가 함께 읽음)
  const semIdx = Math.min(session.wizardStep ?? 0, RUNNER_TOTAL - 1);
  const setStep = (n: number) => update({ wizardStep: n });
  // 선택이 덜 된 선택군을 잠시 붉게 강조
  const [flashGroup, setFlashGroup] = useState<number | null>(null);

  // 지정(필수) 과목은 각 학기 슬롯에 자동 포함(한 번만) — 2·3학년만
  useEffect(() => {
    if (!curriculum) return;
    update((s) => {
      const planned = [...s.plannedCourses];
      const has = (cid: string, slot: string) =>
        planned.some((p) => p.courseId === cid && p.slot === slot);
      let changed = false;
      for (const sem of curriculum.semesters) {
        for (const cid of sem.required) {
          if (!has(cid, sem.slot)) {
            planned.push({ courseId: cid, slot: sem.slot });
            changed = true;
          }
        }
      }
      return changed ? { plannedCourses: planned } : {};
    });
    // curriculum은 모듈 상수라 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum]);

  // 진로 추천 과목(⭐) — 학과(정확일치·키워드·계열) 또는 진로군 어느 쪽이든 동일 경로로 해결
  const recIds = useMemo(
    () =>
      recommendedIdSet({
        majorName: session.selectedMajorName,
        fieldId: session.selectedFieldId,
        groupId: session.selectedGroupId,
      }),
    [session.selectedMajorName, session.selectedFieldId, session.selectedGroupId],
  );

  // 선수과목 '이수 인정'용: 1학년 공통과목 courseId 집합
  const grade1Ids = useMemo(() => {
    const names = new Set<string>([...grade1.semesters.g1s1, ...grade1.semesters.g1s2]);
    const ids = new Set<string>();
    for (const c of courseById.values()) if (names.has(c.standardName)) ids.add(c.courseId);
    return ids;
  }, []);
  // 이 학교가 개설(offerings)하는 과목 courseId 집합
  const schoolOfferedIds = useMemo(() => {
    const ids = new Set<string>();
    const sid = session.selectedSchoolId;
    if (sid) for (const o of offerings) if (o.schoolId === sid) ids.add(o.courseId);
    return ids;
  }, [session.selectedSchoolId]);

  if (!curriculum) {
    return (
      <main className="screen">
        <BackLink onClick={() => goTo('school')} />
        <p className="subtitle">이 학교는 학기별 안내 데이터가 아직 없어요.</p>
      </main>
    );
  }

  // 0,1 = 1학년(공통), 2~5 = 2·3학년(선택)
  const isGrade1 = semIdx < 2;
  const grade = isGrade1 ? 1 : semIdx < 4 ? 2 : 3;
  const semester = semIdx % 2 === 0 ? 1 : 2;
  const g1key = semIdx === 0 ? 'g1s1' : 'g1s2';
  const sem = isGrade1 ? null : curriculum.semesters[semIdx - 2];
  // 1학년 슬롯(g1s1/g1s2)은 plannedCourses에 기록하지 않으므로 select 단계에서만 실제 SlotId로 쓰인다.
  const slot = (sem?.slot ?? g1key) as SlotId;
  const season = SEASONS[semIdx] ?? 'season-spring';
  const isLast = semIdx === RUNNER_TOTAL - 1;

  const inSlot = (cid: string) =>
    session.plannedCourses.some((p) => p.courseId === cid && p.slot === slot);
  // 이미 다른 학기에 배치했는지
  const otherSlotOf = (cid: string): SlotId | undefined =>
    session.plannedCourses.find((p) => p.courseId === cid && p.slot !== slot)?.slot;
  // 같은/이전 학기에 선택(배치)한 과목 집합 — 선수과목 판정용
  const selectedUpToNow = new Set(
    session.plannedCourses
      .filter((p) => orderOf(p.slot) <= orderOf(slot))
      .map((p) => p.courseId),
  );
  // 선수과목 '이수 인정' 판정: (a)1학년 공통 (b)이 학교 개설 (c)같은/이전 학기 선택 중 하나면 충족.
  // 학교가 실제로 개설하지 않는 과목만 잠금+힌트 대상이 된다(평평한 통합선택 편제표 대응).
  const prereqMet = (p: string) =>
    grade1Ids.has(p) || schoolOfferedIds.has(p) || selectedUpToNow.has(p);
  // 선수과목 미충족 → 첫 번째 미충족 과목명 반환(없으면 undefined)
  const missingPrereq = (cid: string): string | undefined => {
    const pre = courseById.get(cid)?.prerequisites ?? [];
    const miss = pre.find((p) => !prereqMet(p));
    return miss ? courseById.get(miss)?.standardName ?? miss : undefined;
  };

  const groupCount = (g: SelectionGroupDef) => g.courseIds.filter(inSlot).length;

  function toggle(g: SelectionGroupDef, cid: string) {
    update((s) => {
      let planned: PlannedCourse[] = s.plannedCourses;
      const selected = planned.some((p) => p.courseId === cid && p.slot === slot);
      // 다른 학기에 이미 배치된 과목은 이 학기에서 새로 선택할 수 없다(중복 이수 방지)
      if (!selected && planned.some((p) => p.courseId === cid && p.slot !== slot)) {
        return {};
      }
      if (g.choose === 1) {
        planned = planned.filter(
          (p) => !(p.slot === slot && g.courseIds.includes(p.courseId)),
        );
        if (!selected) planned = [...planned, { courseId: cid, slot }];
      } else if (selected) {
        planned = planned.filter((p) => !(p.courseId === cid && p.slot === slot));
      } else {
        const cnt = g.courseIds.filter((x) =>
          planned.some((p) => p.courseId === x && p.slot === slot),
        ).length;
        if (cnt < g.choose) planned = [...planned, { courseId: cid, slot }];
      }
      return { plannedCourses: planned };
    });
  }

  function goNext() {
    // 선택군이 덜 찼으면: 토스트 안내 + 해당 영역으로 스크롤 + 붉게 강조
    if (!isGrade1 && sem) {
      const idx = sem.groups.findIndex((g) => groupCount(g) !== g.choose);
      if (idx !== -1) {
        const g = sem.groups[idx];
        const remain = g.choose - groupCount(g);
        showToast(`‘${g.label}’에서 ${remain}과목 더 골라 주세요`, 'warn');
        const reduce =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const el = document.getElementById(`wiz-group-${idx}`);
        el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        setFlashGroup(idx);
        window.setTimeout(() => setFlashGroup(null), 1300);
        return;
      }
    }
    if (isLast) {
      goTo('result');
    } else {
      setStep(semIdx + 1);
      window.scrollTo({ top: 0 });
    }
  }
  function goBack() {
    if (semIdx > 0) {
      setStep(semIdx - 1);
      window.scrollTo({ top: 0 });
    } else {
      goTo('entrance');
    }
  }

  return (
    <>
      <main className={`screen scene ${season} wiz-scene`}>
        <div className="wiz-term">
          <BackLink onClick={goBack} />
          <h2 className="wiz-term-title">
            {grade}학년 {semester}학기
          </h2>
        </div>

        <p className="subtitle wiz-intro">{CHEER[semIdx] ?? ''}</p>

        {isGrade1 ? (
          <>
            <div className="wiz-required">
              <div className="wiz-required-head">📚 이 학기에 함께 듣는 과목</div>
              <div className="wiz-chips">
                {grade1.semesters[g1key].map((nm) => (
                  <span key={nm} className="wiz-chip locked">
                    {nm}
                  </span>
                ))}
              </div>
            </div>
            <p className="wiz-common-note">{grade1.note}</p>
          </>
        ) : (
          <>
            <div className="wiz-legend">
              <span className="wiz-legend-item">
                <span className="wiz-star" aria-hidden>⭐</span> 진로 추천 과목
              </span>
              <span className="wiz-legend-item">
                <span className="wiz-type gen">일반</span>
                <span className="wiz-type car">진로</span>
                <span className="wiz-type fus">융합</span>
                선택과목 유형
              </span>
            </div>

            {sem!.required.length > 0 && (
              <div className="wiz-required">
                <div className="wiz-required-head">🔒 이 학기 필수 과목 (자동 포함)</div>
                <div className="wiz-chips">
                  {sem!.required.map((cid) => {
                    const c = courseById.get(cid);
                    return (
                      <span key={cid} className="wiz-chip locked">
                        {c?.standardName ?? cid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {sem!.groups.map((g, gi) => {
              const cnt = groupCount(g);
              const met = cnt === g.choose;
              const full = cnt >= g.choose;
              return (
                <div
                  key={gi}
                  id={`wiz-group-${gi}`}
                  className={`wiz-group ${met ? 'met' : ''} ${flashGroup === gi ? 'flash' : ''}`}
                >
                  <div className="wiz-group-head">
                    <span className="wiz-group-label">{g.label}</span>
                    <span className={`wiz-count ${met ? 'ok' : ''}`}>
                      {cnt}/{g.choose}
                    </span>
                  </div>
                  <div className="wiz-chips">
                    {g.courseIds.map((cid) => {
                      const c = courseById.get(cid);
                      const sel = inSlot(cid);
                      const rec = recIds.has(cid);
                      const otherSlot = sel ? undefined : otherSlotOf(cid);
                      // 알 수 없는 슬롯(예전 세션 잔재 등)이어도 'undefined'가 보이지 않게 폴백
                      const otherLabel = otherSlot
                        ? SLOT_SHORT[otherSlot] ?? '다른 학기'
                        : undefined;
                      const preMiss = sel || otherSlot ? undefined : missingPrereq(cid);
                      const disabled =
                        !!otherSlot || !!preMiss || (!sel && full && g.choose > 1);
                      const note = otherLabel
                        ? `· ${otherLabel} 선택됨`
                        : preMiss
                          ? `· 선수과목 '${preMiss}' 먼저`
                          : '';
                      const title = otherLabel
                        ? `${otherLabel}에 이미 선택한 과목이에요`
                        : preMiss
                          ? `먼저 '${preMiss}'을(를) 들어야 선택할 수 있어요`
                          : undefined;
                      return (
                        <button
                          key={cid}
                          className={`wiz-chip pick ${sel ? 'on' : ''} ${rec ? 'rec' : ''} ${
                            otherSlot ? 'taken' : ''
                          } ${preMiss ? 'locked-pre' : ''}`}
                          onClick={() => toggle(g, cid)}
                          disabled={disabled}
                          aria-pressed={sel}
                          title={title}
                        >
                          {rec && (
                            <span className="wiz-star" aria-hidden>
                              ⭐
                            </span>
                          )}
                          {c?.standardName ?? cid}
                          {c?.electiveType && ELECTIVE_BADGE[c.electiveType] && (
                            <span
                              className={`wiz-type ${ELECTIVE_BADGE[c.electiveType].cls}`}
                            >
                              {ELECTIVE_BADGE[c.electiveType].label}
                            </span>
                          )}
                          {note && <span className="wiz-taken-note">{note}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>

      <Footer
        primaryLabel={isLast ? '졸업하기 🎓 →' : '다음 학기로 →'}
        onPrimary={goNext}
      />
    </>
  );
}

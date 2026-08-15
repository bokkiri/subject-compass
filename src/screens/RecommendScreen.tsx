import { useMemo, useState } from 'react';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { careerById, groupById } from '../data';
import { schoolById } from '../lib/schoolData';
import { getSchoolCurriculum } from '../lib/recommend';
import type { CurriculumEntry, RelevanceLevel } from '../lib/types';

type Filter = 'all' | 'recommended';

const AREA_EMOJI: Record<string, string> = {
  국어: '📖',
  수학: '➗',
  영어: '🔤',
  사회: '🌍',
  과학: '🔬',
  체육: '🤸',
  예술: '🎨',
  '기술·가정': '🔧',
  정보: '💻',
  '제2외국어/한문': '🗣️',
  교양: '🧭',
  기타: '🧩',
};

const LEVEL_MARK: Record<RelevanceLevel, string> = {
  core: '핵심',
  recommended: '추천',
  exploratory: '탐색',
};

export function RecommendScreen() {
  const { session, update, goTo } = useSession();
  const [filter, setFilter] = useState<Filter>('all');

  const school = schoolById.get(session.selectedSchoolId ?? '');
  const curriculum = useMemo(
    () =>
      getSchoolCurriculum(session.selectedSchoolId, {
        majorName: session.selectedMajorName,
        fieldId: session.selectedFieldId,
        groupId: session.selectedGroupId,
      }),
    [
      session.selectedSchoolId,
      session.selectedMajorName,
      session.selectedFieldId,
      session.selectedGroupId,
    ],
  );

  const targetName = session.selectedMajorLabel
    ? session.selectedMajorLabel
    : session.selectedCareerId
      ? careerById.get(session.selectedCareerId)?.name
      : groupById.get(session.selectedGroupId ?? '')?.name;

  const planned = new Set(session.plannedCourses.map((p) => p.courseId));

  function toggle(courseId: string) {
    update((s) => ({
      plannedCourses: s.plannedCourses.some((p) => p.courseId === courseId)
        ? s.plannedCourses.filter((p) => p.courseId !== courseId)
        : [...s.plannedCourses, { courseId, slot: 'unplaced' }],
    }));
  }

  // 필수(학교지정) / 선택 분리
  const requiredNames: string[] = [];
  const electiveAreas: { area: string; entries: CurriculumEntry[] }[] = [];
  for (const a of curriculum) {
    const electives = a.entries.filter((e) => !e.required);
    for (const e of a.entries) if (e.required) requiredNames.push(e.course.standardName);
    if (electives.length) electiveAreas.push({ area: a.area, entries: electives });
  }

  const totalElective = electiveAreas.reduce((n, a) => n + a.entries.length, 0);
  const recCount = electiveAreas.reduce(
    (n, a) => n + a.entries.filter((e) => e.recommended).length,
    0,
  );

  const areas = electiveAreas
    .map((a) => ({
      area: a.area,
      entries:
        filter === 'recommended' ? a.entries.filter((e) => e.recommended) : a.entries,
    }))
    .filter((a) => a.entries.length > 0);

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo('school')} />
        <span className="eyebrow">3단계 · 교육과정 편제표</span>
        <h2 className="title">{school?.schoolName} 편제표</h2>
        <p className="subtitle">
          {targetName && (
            <>
              <b>{targetName}</b>에 맞는 과목엔 <b>추천</b> 표시가 붙어요.{' '}
            </>
          )}
          담고 싶은 <b>선택과목</b>을 골라 주세요.
        </p>

        {/* 필수(학교지정) 과목 — 선택 불가, 요약만 */}
        {requiredNames.length > 0 && (
          <div className="req-box">
            <div className="req-head">
              ✅ 필수 이수 과목 <span className="muted">(모든 학생 공통 · 자동 이수)</span>
            </div>
            <div className="req-chips">
              {requiredNames.map((n) => (
                <span key={n} className="req-chip">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="filters">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 선택과목 ({totalElective})
          </button>
          <button
            className={`filter-tab ${filter === 'recommended' ? 'active' : ''}`}
            onClick={() => setFilter('recommended')}
          >
            진로 추천만 ({recCount})
          </button>
        </div>

        {areas.map((a) => (
          <section key={a.area}>
            <div className="area-head">
              {AREA_EMOJI[a.area] ?? '📘'} {a.area}{' '}
              <span className="muted">({a.entries.length})</span>
            </div>
            <div className="crow-list">
              {a.entries.map((e) => {
                const added = planned.has(e.course.courseId);
                return (
                  <button
                    key={e.course.courseId}
                    className={`crow ${added ? 'on' : ''}`}
                    onClick={() => toggle(e.course.courseId)}
                  >
                    <span className="crow-check" aria-hidden>
                      {added ? '✓' : '＋'}
                    </span>
                    <span className="crow-name">{e.course.standardName}</span>
                    {e.recommended && (
                      <span className={`rec-tag ${e.recommended.level}`}>
                        {LEVEL_MARK[e.recommended.level]}
                      </span>
                    )}
                    <span className="crow-cr">{e.course.credits}학점</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </Screen>

      <Footer
        primaryLabel={
          planned.size > 0
            ? `${planned.size}과목 담음 · 계획 세우기`
            : '선택과목을 담아 주세요'
        }
        onPrimary={() => goTo('planner')}
        primaryDisabled={planned.size === 0}
      />
    </>
  );
}

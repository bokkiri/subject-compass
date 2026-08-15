import { useMemo, useState } from 'react';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { schools, curriculumFor } from '../lib/schoolData';

export function SchoolScreen() {
  const { session, update, goTo } = useSession();
  const [q, setQ] = useState('');
  const selectedId = session.selectedSchoolId;

  const backTo =
    session.careerDecisionState === 'undecided' ? 'candidates' : 'careerSearch';

  const filtered = useMemo(() => {
    const query = q.trim().replace(/\s/g, '');
    if (!query) return schools;
    return schools.filter((s) => s.schoolName.replace(/\s/g, '').includes(query));
  }, [q]);

  // 데이터 기준일(대표) — 화면 맨 아래 조용히
  const asOf = schools[0]?.lastReviewedAt;

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo(backTo)} />
        <span className="eyebrow">2단계 · 학교</span>
        <h2 className="title">어느 고등학교가 궁금해요?</h2>
        <p className="subtitle">학교마다 배울 수 있는 과목이 달라요.</p>

        <input
          className="search-input"
          style={{ marginBottom: 12 }}
          placeholder="🔎 학교 이름으로 찾기 (예: 두정, 여자)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="school-grid">
          {filtered.map((s) => (
            <button
              key={s.schoolId}
              className={`school-card ${selectedId === s.schoolId ? 'selected' : ''}`}
              onClick={() => update({ selectedSchoolId: s.schoolId })}
            >
              <span className="school-emoji" aria-hidden>
                🏫
              </span>
              <span className="school-name">
                {s.schoolName.replace('등학교', '')}
              </span>
              {selectedId === s.schoolId && (
                <span className="school-check" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="notice">‘{q}’와 일치하는 학교가 없어요.</div>
        )}

        <div className="fine-print">
          <p>데이터 기준: 학교알리미 2026학년도 공시 ({asOf} 갱신)</p>
        </div>
      </Screen>

      <Footer
        primaryLabel={curriculumFor(selectedId) ? '이 학교로 입학하기 🎒 →' : '편제표 보기'}
        onPrimary={() => goTo(curriculumFor(selectedId) ? 'entrance' : 'recommend')}
        primaryDisabled={!selectedId}
      />
    </>
  );
}

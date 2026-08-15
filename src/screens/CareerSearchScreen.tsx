import { useMemo, useState } from 'react';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { majorFields, fieldByName } from '../data';
import { majorLabel } from '../lib/majorData';
import { useMajorData } from '../lib/useMajorData';
import type { MajorOption } from '../lib/types';

/** 결과는 항상 짧게(최대 8개) */
const MAX_RESULTS = 8;

export function CareerSearchScreen() {
  const { session, update, goTo } = useSession();
  const { data, loading } = useMajorData();
  const [q, setQ] = useState('');
  const selectedId = session.selectedMajorId;

  const results = useMemo(() => {
    if (!data) return [];
    const query = q.trim();
    // 검색어가 있으면 정확도·선호 대학 순 짧은 목록,
    // 없으면 계열별 대표 학과(선호 대학) 예시를 하나씩 보여준다.
    if (query) return data.searchMajors(query, MAX_RESULTS);
    return majorFields
      .flatMap((f) => data.exampleMajorsByField(f.name, 1))
      .slice(0, MAX_RESULTS);
  }, [q, data]);

  function select(major: MajorOption) {
    update({
      selectedMajorId: major.majorId,
      selectedMajorLabel: majorLabel(major),
      selectedMajorName: major.name,
      selectedFieldId: fieldByName.get(major.field)?.fieldId,
      // 큐레이션 학과는 과목추천용 진로군이 있고, 수집 학과는 없다(사용자 데이터로 연결 예정)
      selectedGroupId: major.groupId,
      selectedCareerId: undefined,
    });
  }

  const selectedMajor = selectedId ? data?.majorById.get(selectedId) : undefined;
  // 아직 데이터가 로딩 중이면 세션에 저장해 둔 라벨을 사용
  const selectedLabel = selectedMajor
    ? majorLabel(selectedMajor)
    : session.selectedMajorLabel;
  const fieldEmoji = (fieldName: string) =>
    majorFields.find((f) => f.name === fieldName)?.emoji ?? '🎓';

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo('decision')} />
        <span className="eyebrow">1단계 · 학과</span>
        <h2 className="title">관심 있는 학과를 찾아볼까요?</h2>
        <p className="subtitle">
          학과 이름으로 검색해요. <b>대학과 학과를 함께</b> 치면 더 정확해요(예: 서울대 컴퓨터).
        </p>

        <input
          className="search-input"
          placeholder="예: 컴퓨터공학과 · 서울대 컴퓨터 · 간호"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {loading ? (
          <div className="notice mt-16">학과 데이터를 불러오는 중이에요… ⏳</div>
        ) : (
          <>
            {!q && <div className="muted mt-8">🎓 이런 학과가 있어요</div>}

            <div className="stack mt-16">
              {results.map((m) => (
                <button
                  key={m.majorId}
                  className={`option ${selectedId === m.majorId ? 'selected' : ''}`}
                  onClick={() => select(m)}
                >
                  <span className="opt-body">
                    <span className="opt-title">{m.name}</span>
                    {m.university && (
                      <span className="opt-desc">
                        🏫 {m.university}
                        {m.region ? ` · ${m.region}` : ''}
                      </span>
                    )}
                    <span className="opt-desc" style={{ color: 'var(--brand-ink)' }}>
                      {fieldEmoji(m.field)} {m.field}
                    </span>
                  </span>
                  <span className="opt-check" aria-hidden>
                    {selectedId === m.majorId ? '✓' : ''}
                  </span>
                </button>
              ))}
              {results.length === 0 && q && (
                <div className="notice">
                  ‘{q}’와 일치하는 학과가 없어요. 다른 단어로 검색하거나, 위로 돌아가
                  ‘아직 잘 모르겠어요’로 탐색해 볼 수 있어요.
                </div>
              )}
            </div>

            {q && results.length >= MAX_RESULTS && (
              <div className="muted mt-8" style={{ fontSize: 12 }}>
                💡 찾는 학과가 안 보이면 <b>대학 이름을 함께</b> 입력해 보세요 (예: 연세대 경영).
              </div>
            )}
          </>
        )}
      </Screen>

      <Footer
        primaryLabel={
          selectedLabel ? `‘${selectedLabel}’(으)로 계속` : '학과를 골라 주세요'
        }
        onPrimary={() => goTo('school')}
        primaryDisabled={!selectedId}
      />
    </>
  );
}

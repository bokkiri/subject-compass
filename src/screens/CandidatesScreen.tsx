import { useMemo } from 'react';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { content, fieldByName } from '../data';
import { majorLabel } from '../lib/majorData';
import { useMajorData } from '../lib/useMajorData';
import { answeredCount, scoreFields } from '../lib/explore';
import type { MajorOption } from '../lib/types';

/** 한 계열에서 결과 화면에 바로 보여줄 학과 최대 개수 */
const MAJORS_PER_FIELD = 8;

export function CandidatesScreen() {
  const { session, update, goTo } = useSession();
  const { data, loading } = useMajorData();
  const fields = useMemo(
    () => scoreFields(session.interestAnswers),
    [session.interestAnswers],
  );
  const selectedMajorId = session.selectedMajorId;
  const answered = answeredCount(session.interestAnswers);

  function selectMajor(fieldName: string, m: MajorOption) {
    update({
      selectedMajorId: m.majorId,
      selectedMajorLabel: majorLabel(m),
      selectedMajorName: m.name,
      selectedFieldId: fieldByName.get(fieldName)?.fieldId,
      selectedGroupId: m.groupId,
      selectedCareerId: undefined,
    });
  }

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo('explore')} />
        <span className="eyebrow">학과 탐색 결과</span>
        <h2 className="title">지금 답변과 가까운 계열·학과예요</h2>
        <p className="subtitle">
          계열별로 어울리는 학과를 모았어요. 먼저 살펴볼 <b>학과</b>를 하나 골라 주세요. 나중에 바꿀 수 있어요.
        </p>

        {answered < 3 && (
          <div className="notice warn" style={{ marginBottom: 12 }}>
            답변이 적어 확신도가 낮아요. 답변을 더 하면 결과가 정확해져요.
          </div>
        )}

        <div className="list-gap">
          {fields.map((c, i) => {
            const majors = data ? data.majorsByFieldName(c.field.name) : [];
            const shown = data
              ? data.exampleMajorsByField(c.field.name, MAJORS_PER_FIELD)
              : [];
            return (
              <div
                key={c.field.fieldId}
                className="option"
                style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="opt-title">
                    {i + 1}. {c.field.emoji} {c.field.name}
                  </span>
                  <span className="badge core">일치도 {c.score}</span>
                </div>
                <span className="opt-desc" style={{ marginTop: 4 }}>
                  {c.field.description}
                </span>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: 'var(--ink-soft)',
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <b>왜 나왔나요?</b>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                    {c.reasons.map((r, ri) => (
                      <li key={ri}>{r}</li>
                    ))}
                  </ul>
                </div>

                {loading ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    학과 불러오는 중… ⏳
                  </div>
                ) : shown.length > 0 ? (
                  <div className="cand-majors">
                    {shown.map((m) => (
                      <button
                        key={m.majorId}
                        className={`cand-major-chip ${
                          selectedMajorId === m.majorId ? 'on' : ''
                        }`}
                        onClick={() => selectMajor(c.field.name, m)}
                        aria-pressed={selectedMajorId === m.majorId}
                      >
                        {selectedMajorId === m.majorId ? '✓ ' : ''}
                        {majorLabel(m)}
                      </button>
                    ))}
                    {majors.length > shown.length && (
                      <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
                        외 {majors.length - shown.length}개 (검색에서 더 볼 수 있어요)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    이 계열의 학과 데이터가 아직 없어요.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="notice mt-16">💡 {content.exploreDisclaimer}</div>
      </Screen>

      <Footer
        primaryLabel={selectedMajorId ? '이 학과로 과목 찾기' : '학과를 골라 주세요'}
        onPrimary={() => goTo('school')}
        primaryDisabled={!selectedMajorId}
        secondaryLabel="답변 수정"
        onSecondary={() => goTo('explore')}
      />
    </>
  );
}

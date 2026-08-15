import { useState } from 'react';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { questions } from '../data';

export function ExploreScreen() {
  const { session, update, goTo } = useSession();
  const [idx, setIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const q = questions[idx];
  const answers = session.interestAnswers;
  const chosen = answers[q.questionId] ?? [];

  function toggle(optionId: string) {
    setShowHint(false);
    const cur = answers[q.questionId] ?? [];
    let next: string[];
    if (q.multi) {
      next = cur.includes(optionId)
        ? cur.filter((x) => x !== optionId)
        : [...cur, optionId];
    } else {
      next = cur.includes(optionId) ? [] : [optionId];
    }
    update({ interestAnswers: { ...answers, [q.questionId]: next } });
  }

  const isLast = idx === questions.length - 1;
  const answered = chosen.length > 0;

  function next() {
    // 최소 1개는 선택해야 넘어갈 수 있다.
    if (!answered) {
      setShowHint(true);
      return;
    }
    setShowHint(false);
    if (isLast) goTo('candidates');
    else setIdx((i) => i + 1);
  }

  function back() {
    setShowHint(false);
    if (idx === 0) goTo('decision');
    else setIdx((i) => i - 1);
  }

  return (
    <>
      <Screen>
        <BackLink onClick={back} />
        <span className="eyebrow">
          진로 탐색 · 질문 {idx + 1}/{questions.length}
        </span>
        <h2 className="title">{q.text}</h2>
        <p className="subtitle">
          {q.multi ? '여러 개 골라도 돼요.' : '하나만 골라 주세요.'} 정답은 없어요, 편하게요.
        </p>

        <div className="opt-grid">
          {q.options.map((o) => (
            <button
              key={o.optionId}
              className={`opt-card ${chosen.includes(o.optionId) ? 'selected' : ''}`}
              onClick={() => toggle(o.optionId)}
            >
              {o.emoji && <span className="opt-card-emoji" aria-hidden>{o.emoji}</span>}
              <span className="opt-card-label">{o.label}</span>
            </button>
          ))}
        </div>

        {showHint && (
          <div className="notice warn mt-16">
            하나 이상 골라 주세요. 마땅한 게 없으면 가장 가까운 걸 고르면 돼요. 🙂
          </div>
        )}
      </Screen>

      <Footer
        primaryLabel={isLast ? '결과 보기' : '다음'}
        onPrimary={next}
        primaryDisabled={!answered}
        secondaryLabel="이전"
        onSecondary={back}
      />
    </>
  );
}

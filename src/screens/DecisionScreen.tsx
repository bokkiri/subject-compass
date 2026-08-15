import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import type { CareerDecisionState } from '../lib/types';

const OPTIONS: {
  value: CareerDecisionState;
  emoji: string;
  title: string;
  desc: string;
}[] = [
  {
    value: 'decided',
    emoji: '🎯',
    title: '정해져 있어요',
    desc: '희망하는 학과가 있어요.',
  },
  {
    value: 'undecided',
    emoji: '🤔',
    title: '아직 잘 모르겠어요',
    desc: '몇 가지 질문으로 어울리는 분야를 찾아볼게요.',
  },
];

export function DecisionScreen() {
  const { session, update, goTo } = useSession();
  const selected = session.careerDecisionState;

  function next() {
    if (!selected) return;
    if (selected === 'undecided') goTo('explore');
    else goTo('careerSearch');
  }

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo('start')} />
        <span className="eyebrow">1단계 · 진로</span>
        <h2 className="title">희망하는 학과가 정해져 있나요?</h2>
        <p className="subtitle">정답은 없어요. 지금 생각에 가장 가까운 걸 골라 주세요.</p>

        <div className="stack">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`option ${selected === o.value ? 'selected' : ''}`}
              onClick={() => update({ careerDecisionState: o.value })}
            >
              <span className="opt-emoji" aria-hidden>
                {o.emoji}
              </span>
              <span className="opt-body">
                <span className="opt-title">{o.title}</span>
                <span className="opt-desc">{o.desc}</span>
              </span>
              <span className="opt-check" aria-hidden>
                {selected === o.value ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      </Screen>

      <Footer primaryLabel="다음" onPrimary={next} primaryDisabled={!selected} />
    </>
  );
}

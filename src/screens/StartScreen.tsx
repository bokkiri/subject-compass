import { Screen, Footer } from '../ui';
import { content } from '../data';
import { useSession } from '../context';

const STEP_EMOJI = ['🧭', '🏫', '📋', '🧩', '💾'];

export function StartScreen() {
  const { goTo } = useSession();

  return (
    <>
      <Screen>
        <div className="center" style={{ padding: '18px 0 4px' }}>
          <div style={{ fontSize: 56 }} aria-hidden>
            🧭
          </div>
          <h1 className="title">{content.appName}</h1>
          <p className="subtitle">{content.tagline}</p>
        </div>

        {/* 진행 흐름 (flow) */}
        <div className="flow">
          {content.intro.steps.map((s, i) => (
            <div key={s} className="flow-node" style={{ animationDelay: `${i * 0.12}s` }}>
              <div className="flow-bubble">
                <span aria-hidden>{STEP_EMOJI[i] ?? '•'}</span>
              </div>
              <div className="flow-label">{s}</div>
              {i < content.intro.steps.length - 1 && (
                <div className="flow-arrow" aria-hidden>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="start-hint center">
          몇 가지만 답하면 나에게 맞는 과목을 찾아드려요. 5~10분이면 충분해요.
        </div>

        {/* 안내는 하단에 옅게 */}
        <div className="fine-print">
          <p>🔒 {content.intro.privacyNotice}</p>
          <p>{content.intro.sampleNotice}</p>
        </div>
      </Screen>

      <Footer primaryLabel="시작하기" onPrimary={() => goTo('decision')} />
    </>
  );
}

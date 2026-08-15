// 공통 UI 조각들 (헤더, 진행바, 하단 버튼, 배지 등)
import { useState, type ReactNode } from 'react';
import type { MatchStatus, RelevanceLevel, Screen as ScreenName } from './lib/types';
import { content } from './data';
import { useSession } from './context';
import { RaffleEvent } from './screens/RaffleEvent';
import {
  JOURNEY_TOTAL,
  RUN_MS,
  RUNNER_GIF_URL,
  RUNNER_H,
  RUNNER_STILL_URL,
  RUNNER_W,
} from './lib/runnerSprite';

const STAGES = ['진로', '학교', '입학', '학기', '졸업'];

const SCREEN_STAGE: Record<ScreenName, number> = {
  start: -1,
  decision: 0,
  careerSearch: 0,
  explore: 0,
  candidates: 0,
  school: 1,
  recommend: 3,
  planner: 3,
  entrance: 2,
  curriculum: 3,
  check: 3,
  result: 4,
};

export function Header() {
  const { session, reset } = useSession();
  const stage = SCREEN_STAGE[session.screen];
  const [confirming, setConfirming] = useState(false);
  const [showRaffle, setShowRaffle] = useState(false);

  return (
    <>
    <header className="app-header">
      <div className="app-header-row">
        <div className="app-brand">
          {/* 나침반: 숨은 이벤트 이스터에그 트리거 */}
          <span
            className="logo"
            onClick={() => setShowRaffle(true)}
            role="button"
            tabIndex={-1}
          >
            🧭
          </span>
          {content.appName}
        </div>
        {confirming ? (
          <div className="reset-confirm">
            <span className="reset-confirm-q">처음부터?</span>
            <button
              className="reset-yes"
              onClick={() => {
                reset();
                setConfirming(false);
              }}
            >
              네
            </button>
            <button className="reset-no" onClick={() => setConfirming(false)}>
              아니오
            </button>
          </div>
        ) : (
          <button className="reset-btn" onClick={() => setConfirming(true)}>
            처음부터
          </button>
        )}
      </div>
      {session.screen === 'curriculum' ? (
        <RunnerBar step={Math.min(session.wizardStep ?? 0, JOURNEY_TOTAL - 1)} />
      ) : (
        stage >= 0 && (
          <>
            <div className="progress" aria-hidden>
              {STAGES.map((_, i) => (
                <div key={i} className={`seg ${i <= stage ? 'done' : ''}`} />
              ))}
            </div>
            <div className="progress-label">
              {stage + 1}/{STAGES.length} · {STAGES[stage]}
            </div>
          </>
        )
      )}
    </header>
    <RaffleEvent open={showRaffle} onClose={() => setShowRaffle(false)} />
    </>
  );
}

/** 상단 스티키 진행바 — 학생이 제자리에서 계속 달리고(연속 GIF), 학기가 바뀌면 다음 칸으로 이동한다. */
function RunnerBar({ step }: { step: number }) {
  const total = JOURNEY_TOTAL;
  const pct = total > 1 ? (step / (total - 1)) * 100 : 0;

  // 애니메이션을 줄이는 사용자에겐 정지 스틸(움직임 없음)
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const styleVars = { '--run-ms': `${RUN_MS}ms` } as React.CSSProperties;

  return (
    <div className="runbar" style={styleVars}>
      <div className="runbar-track">
        <div className="runbar-line">
          <div className="runbar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="runbar-flag" aria-hidden>
          🏁
        </div>
        <img
          className="runner-sprite"
          src={reduce ? RUNNER_STILL_URL : RUNNER_GIF_URL}
          style={{ left: `${pct}%` }}
          width={RUNNER_W}
          height={RUNNER_H}
          alt="달리는 학생"
        />
      </div>
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <main className="screen">{children}</main>;
}

export function Footer({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="footer-bar">
      <div className="footer-inner">
        {secondaryLabel && onSecondary && (
          <button className="btn btn-ghost" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button className="back-link" onClick={onClick}>
      ← 이전
    </button>
  );
}

const MATCH_BADGE: Record<MatchStatus, { cls: string; icon: string }> = {
  offered: { cls: 'ok', icon: '✓' },
  offered_similar: { cls: 'teal', icon: '≈' },
  verify: { cls: 'warn', icon: '?' },
  not_offered: { cls: 'gray', icon: '—' },
};

export function MatchBadge({ status }: { status: MatchStatus }) {
  const b = MATCH_BADGE[status];
  return (
    <span className={`badge ${b.cls}`}>
      <span aria-hidden>{b.icon}</span>
      {content.matchStatusLabels[status]}
    </span>
  );
}

export function LevelBadge({ level }: { level: RelevanceLevel }) {
  return <span className={`badge ${level}`}>{content.levelLabels[level]}</span>;
}

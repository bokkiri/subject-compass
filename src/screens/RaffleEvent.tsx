// 나침반 숨은 이벤트 모달.
// 흐름: 졸업장 코드 게이트 → 중/고(/특강) 선택 → (중)퀴즈 O/X 5문제 / (고)30%·(특강)5% 뽑기 → 결과(1회 고정)
// 주소에 ?lecture 가 있으면 특강 버튼만, 없으면 중/고 버튼만 보인다.
import { useEffect, useState } from 'react';
import { useSession } from '../context';
import type { RaffleAttempt } from '../lib/types';
import {
  QUIZ,
  gradeQuiz,
  isAdminCode,
  isHighWin,
  isLectureMode,
  isLectureWin,
  isValidCode,
} from '../lib/raffle';

type View = 'gate' | 'branch' | 'quiz' | 'drawing' | 'result';

/** 뽑기 두근두근 연출 시간(ms) */
const DRAW_MS = 2600;

export function RaffleEvent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, update } = useSession();

  const [view, setView] = useState<View>('gate');
  const [codeInput, setCodeInput] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [gateError, setGateError] = useState('');

  // 열릴 때마다 코드 게이트부터 다시 시작(코드가 곧 신원이므로)
  useEffect(() => {
    if (!open) return;
    setCodeInput('');
    setEnteredCode('');
    setGateError('');
    setView('gate');
    // open 토글 시에만 초기화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 두근두근 연출 후 결과 공개
  useEffect(() => {
    if (view !== 'drawing') return;
    const t = setTimeout(() => setView('result'), DRAW_MS);
    return () => clearTimeout(t);
  }, [view]);

  if (!open) return null;

  // 코드별 참여 기록(코드 1개당 1회)
  const results = session.raffleResults ?? {};
  const attempt = enteredCode ? results[enteredCode] : undefined;
  const answers = attempt?.answers ?? [];
  const qIndex = answers.length; // 다음 풀 문제 인덱스

  /** 특정 코드의 참여 기록을 저장(다른 코드 기록은 보존) */
  function saveAttempt(code: string, next: RaffleAttempt) {
    update({ raffleResults: { ...(session.raffleResults ?? {}), [code]: next } });
  }

  function submitCode() {
    const c = codeInput.trim();
    if (!isValidCode(c)) {
      setGateError('코드가 맞지 않아요. 졸업장 맨 아래 “No.” 뒤 숫자를 확인해 주세요.');
      return;
    }
    setEnteredCode(c);
    // 관리자 코드는 항상 새로 시작(잠기지 않음 → 반복 테스트 가능)
    if (isAdminCode(c)) {
      setView('branch');
      return;
    }
    const rec = (session.raffleResults ?? {})[c];
    if (rec?.result) setView('result');
    else if (rec?.branch === 'mid') setView('quiz');
    else setView('branch');
  }

  function draw(branch: 'high' | 'lecture', win: boolean) {
    // 결과는 미리 정해 저장하되, 화면은 두근두근 연출 후 공개
    saveAttempt(enteredCode, { branch, result: win ? 'win' : 'lose' });
    setView('drawing');
  }

  function pickMid() {
    saveAttempt(enteredCode, { branch: 'mid', answers: [] });
    setView('quiz');
  }

  function answer(val: boolean) {
    const next = [...answers, val];
    if (next.length >= QUIZ.length) {
      const win = gradeQuiz(next);
      saveAttempt(enteredCode, { branch: 'mid', answers: next, result: win ? 'win' : 'lose' });
      setView('result');
    } else {
      saveAttempt(enteredCode, { branch: 'mid', answers: next });
    }
  }

  const win = attempt?.result === 'win';

  return (
    <div className="raffle-overlay" onClick={onClose}>
      <div className="raffle-box" onClick={(e) => e.stopPropagation()}>
        <button className="raffle-x" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        {view === 'gate' && (
          <>
            <div className="raffle-emoji" aria-hidden>🧭✨</div>
            <h3 className="raffle-title">숨은 이벤트</h3>
            <p className="raffle-sub">졸업장에 숨은 6자리 코드를 입력하면 이벤트가 열려요.</p>
            <input
              className="raffle-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="6자리 코드"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                setGateError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitCode()}
            />
            {gateError && <p className="raffle-err">{gateError}</p>}
            <button className="btn btn-primary btn-block" onClick={submitCode}>
              확인
            </button>
            <p className="raffle-hint">힌트: 졸업장 맨 아래 “No.” 뒤의 숫자예요.</p>
          </>
        )}

        {view === 'branch' && (
          <>
            <h3 className="raffle-title">너는 누구야?</h3>
            <div className="raffle-choices">
              {isLectureMode() ? (
                <button
                  className="raffle-choice"
                  onClick={() => draw('lecture', isLectureWin(enteredCode))}
                >
                  🎤 특강 참가자
                </button>
              ) : (
                <>
                  <button className="raffle-choice" onClick={pickMid}>
                    중학생
                  </button>
                  <button
                    className="raffle-choice"
                    onClick={() => draw('high', isHighWin(enteredCode))}
                  >
                    고등학생
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {view === 'drawing' && (
          <div className="raffle-drawing">
            <div className="raffle-drum" aria-hidden>🎁</div>
            <h3 className="raffle-title">두근두근…</h3>
            <p className="raffle-sub">결과를 뽑는 중이에요!</p>
            <div className="raffle-dots" aria-hidden>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {view === 'quiz' && qIndex < QUIZ.length && (
          <>
            <div className="raffle-progress">
              {qIndex + 1} / {QUIZ.length}
            </div>
            <h3 className="raffle-title">O · X 퀴즈</h3>
            <p className="raffle-q">{QUIZ[qIndex].q}</p>
            <div className="raffle-ox">
              <button className="raffle-o" onClick={() => answer(true)} aria-label="맞음(O)">
                O
              </button>
              <button className="raffle-xbtn" onClick={() => answer(false)} aria-label="틀림(X)">
                X
              </button>
            </div>
            <p className="raffle-hint">5문제를 모두 맞히면 당첨!</p>
          </>
        )}

        {view === 'result' && (
          <div className={`raffle-result ${win ? 'win' : 'lose'}`}>
            <div className="raffle-result-emoji" aria-hidden>
              {win ? '🎉' : '🍀'}
            </div>
            <h3 className="raffle-title">{win ? '당첨!' : '아쉽지만 꽝!'}</h3>
            <p className="raffle-sub">
              {win
                ? attempt?.branch === 'lecture'
                  ? '축하해요! 이 화면을 높이 들어 보여주세요 🙌'
                  : '축하해요! 이 화면을 선생님께 보여주세요.'
                : '다음 기회에! 참여해 줘서 고마워요.'}
            </p>
            <button className="btn btn-primary btn-block" onClick={onClose}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

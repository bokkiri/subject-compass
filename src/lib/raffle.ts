// 나침반 숨은 이벤트 로직 (서버 없이 클라이언트 전용).
// - 졸업장에 박히는 6자리 코드 생성
// - 고등학생: 코드 기반 결정적 30% 당첨 (같은 코드는 항상 같은 결과)
// - 중학생: 퀴즈 5문제 전부 정답이면 당첨

/** 문자열 → 부호 없는 32비트 해시 (결정적) */
function hash32(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a offset
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** 앞 4자리로부터 뒤 2자리 검증 숫자("00"~"99") 계산 (앱이 만든 코드인지 확인용) */
function checkPart(base4: string): string {
  return (hash32('C:' + base4) % 100).toString().padStart(2, '0');
}

/**
 * 6자리 코드 생성. 앞 4자리는 랜덤, 뒤 2자리는 검증 숫자.
 * 검증 숫자 덕분에 세션 상태 없이도 "앱이 만든 코드"인지 확인할 수 있다.
 * (유효 코드는 10,000개 = 전체의 1% → 무작위 입력이 맞을 확률 1%)
 */
export function gen6(): string {
  let base = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    for (let i = 0; i < 4; i++) base += (a[i] % 10).toString();
  } else {
    for (let i = 0; i < 4; i++) base += Math.floor(Math.random() * 10).toString();
  }
  return base + checkPart(base);
}

/**
 * 관리자/테스트용 코드. 항상 게이트를 통과하고 결과가 잠기지 않아
 * 몇 번이든 반복해서 이벤트를 열어볼 수 있다. (수업 전 점검용)
 */
export const ADMIN_CODE = '777000';

/** 관리자 코드인지 */
export function isAdminCode(code: string): boolean {
  return code.trim() === ADMIN_CODE;
}

/** 앱이 만든 올바른 코드인지 검증 (세션과 무관, 어느 기기에서든 동작) */
export function isValidCode(code: string): boolean {
  const c = code.trim();
  if (isAdminCode(c)) return true; // 관리자 코드는 체크숫자와 무관하게 통과
  if (!/^\d{6}$/.test(c)) return false;
  return checkPart(c.slice(0, 4)) === c.slice(4);
}

/** 고등학생 뽑기: 코드로부터 결정적 30% 당첨 */
export function isHighWin(code: string): boolean {
  // 'H' 솔트로 코드 자체 용도와 분리
  return hash32('H:' + code) % 1000 < 300;
}

export interface QuizQ {
  q: string;
  /** 정답: true = O(맞음), false = X(틀림) */
  answer: boolean;
}

// 고교학점제·2028 대입 안내 PPT 기반 O/X 5문항 (쉽게).
export const QUIZ: QuizQ[] = [
  {
    q: '고교학점제에서는 학생이 자신의 진로와 적성에 따라 과목을 직접 고른다.',
    answer: true,
  },
  {
    q: '고교학점제는 2025년부터 전국 모든 고등학교에 전면 적용되었다.',
    answer: true,
  },
  {
    q: '2028학년도 수능부터는 선택과목 없이 “공통”으로 응시한다(통합형).',
    answer: true,
  },
  {
    q: '수학은 과목 순서(위계)가 없어서 아무 과목이나 먼저 들어도 된다.',
    answer: false, // 대수 → 미적분Ⅰ → 미적분Ⅱ 처럼 위계가 있음
  },
  {
    q: '학교알리미(schoolinfo.go.kr)에서 우리 학교가 개설한 과목을 확인할 수 있다.',
    answer: true,
  },
];

/** 중학생 퀴즈 채점: 모든 문항 정답이면 true */
export function gradeQuiz(answers: (boolean | undefined)[]): boolean {
  if (answers.length < QUIZ.length) return false;
  return QUIZ.every((item, i) => answers[i] === item.answer);
}

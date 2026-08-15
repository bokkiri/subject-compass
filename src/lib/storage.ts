// 브라우저 로컬 저장 (로그인·서버 없음)
import type { StudentSession } from './types';

const KEY = 'gwamok-nachimban-session-v1';
const CURRENT_VERSION = 1;

export function newSession(): StudentSession {
  const now = new Date().toISOString();
  return {
    version: CURRENT_VERSION,
    createdAt: now,
    updatedAt: now,
    screen: 'start',
    interestAnswers: {},
    plannedCourses: [],
  };
}

export function loadSession(): StudentSession {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newSession();
    const parsed = JSON.parse(raw) as StudentSession;
    if (parsed.version !== CURRENT_VERSION) return newSession();
    return parsed;
  } catch {
    return newSession();
  }
}

export function saveSession(session: StudentSession): void {
  try {
    session.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // 저장 실패는 조용히 무시 (사생활 보호 모드 등)
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

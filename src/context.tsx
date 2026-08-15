// 세션 상태를 앱 전체에서 공유 (로컬 저장 자동 반영)
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Screen, StudentSession } from './lib/types';
import { clearSession, loadSession, newSession, saveSession } from './lib/storage';

type Updater =
  | Partial<StudentSession>
  | ((prev: StudentSession) => Partial<StudentSession>);

interface SessionContextValue {
  session: StudentSession;
  update: (updater: Updater) => void;
  goTo: (screen: Screen) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StudentSession>(() => loadSession());

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      update: (updater) =>
        setSession((s) => ({
          ...s,
          ...(typeof updater === 'function' ? updater(s) : updater),
        })),
      goTo: (screen) => {
        setSession((s) => ({ ...s, screen }));
        window.scrollTo({ top: 0 });
      },
      reset: () => {
        clearSession();
        setSession(newSession());
        window.scrollTo({ top: 0 });
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

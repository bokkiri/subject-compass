import { lazy, Suspense } from 'react';
import { SessionProvider, useSession } from './context';
import { ToastProvider } from './toast';
import { Header } from './ui';
// 초기 흐름(진로·학과 탐색) 화면은 바로 필요하니 그대로 불러온다.
import { StartScreen } from './screens/StartScreen';
import { DecisionScreen } from './screens/DecisionScreen';
import { CareerSearchScreen } from './screens/CareerSearchScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { CandidatesScreen } from './screens/CandidatesScreen';

// 학교 선택 이후 화면은 편제표(대용량) 데이터를 쓰므로 지연 로딩(코드 분할).
// → 이 화면들에 도달할 때 비로소 offerings/curriculum 등이 별도 청크로 내려온다.
const SchoolScreen = lazy(() =>
  import('./screens/SchoolScreen').then((m) => ({ default: m.SchoolScreen })),
);
const RecommendScreen = lazy(() =>
  import('./screens/RecommendScreen').then((m) => ({ default: m.RecommendScreen })),
);
const PlannerScreen = lazy(() =>
  import('./screens/PlannerScreen').then((m) => ({ default: m.PlannerScreen })),
);
const EntranceScreen = lazy(() =>
  import('./screens/EntranceScreen').then((m) => ({ default: m.EntranceScreen })),
);
const CurriculumWizardScreen = lazy(() =>
  import('./screens/CurriculumWizardScreen').then((m) => ({
    default: m.CurriculumWizardScreen,
  })),
);
const CheckScreen = lazy(() =>
  import('./screens/CheckScreen').then((m) => ({ default: m.CheckScreen })),
);
const ResultScreen = lazy(() =>
  import('./screens/ResultScreen').then((m) => ({ default: m.ResultScreen })),
);

function CurrentScreen() {
  const { session } = useSession();
  switch (session.screen) {
    case 'start':
      return <StartScreen />;
    case 'decision':
      return <DecisionScreen />;
    case 'careerSearch':
      return <CareerSearchScreen />;
    case 'explore':
      return <ExploreScreen />;
    case 'candidates':
      return <CandidatesScreen />;
    case 'school':
      return <SchoolScreen />;
    case 'recommend':
      return <RecommendScreen />;
    case 'planner':
      return <PlannerScreen />;
    case 'entrance':
      return <EntranceScreen />;
    case 'curriculum':
      return <CurriculumWizardScreen />;
    case 'check':
      return <CheckScreen />;
    case 'result':
      return <ResultScreen />;
    default:
      return <StartScreen />;
  }
}

export default function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className="app-shell">
          <Header />
          <Suspense
            fallback={<main className="screen"><p className="subtitle">불러오는 중… ⏳</p></main>}
          >
            <CurrentScreen />
          </Suspense>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}

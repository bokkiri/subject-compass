import { Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { schoolById } from '../lib/schoolData';

/** 입학 환영 오프닝 — 봄 느낌으로 고교 시뮬레이션 시작을 알린다. */
export function EntranceScreen() {
  const { session, goTo, update } = useSession();
  const school = schoolById.get(session.selectedSchoolId ?? '');
  const name = school?.schoolName ?? 'OO고등학교';

  return (
    <>
      <main className="screen scene season-spring entrance">
        <BackLink onClick={() => goTo('school')} />

        <div className="entrance-inner">
          <div className="entrance-petals" aria-hidden>
            🌸🌸🌸
          </div>
          <div className="entrance-gate" aria-hidden>
            {/* 학교 정문 일러스트 */}
            <svg viewBox="0 0 220 140" width="200" height="128" role="img" aria-label="학교 정문">
              <rect x="30" y="40" width="160" height="80" rx="6" fill="#fff" stroke="#2f8f2f" strokeWidth="3" />
              <rect x="30" y="40" width="160" height="22" rx="6" fill="#8ed36a" />
              <path d="M20 40 L110 12 L200 40 Z" fill="#f6a5c0" stroke="#e26d97" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="110" cy="26" r="6" fill="#fff" stroke="#e26d97" strokeWidth="2" />
              <rect x="66" y="72" width="30" height="48" rx="3" fill="#cfeecb" stroke="#2f8f2f" strokeWidth="2" />
              <rect x="124" y="72" width="30" height="48" rx="3" fill="#cfeecb" stroke="#2f8f2f" strokeWidth="2" />
              <circle cx="90" cy="96" r="2.5" fill="#2f8f2f" />
              <circle cx="130" cy="96" r="2.5" fill="#2f8f2f" />
            </svg>
          </div>

          <div className="entrance-badge">🎒 입학을 축하합니다</div>
          <h1 className="entrance-title">
            {name}에<br />입학하신 것을 환영합니다
          </h1>
          <p className="entrance-sub">
            지금부터 <b>3년간의 고등학교 생활</b>을 함께 따라가며,
            <br />
            학기마다 어떤 과목을 배우는지 살펴볼 거예요.
          </p>
          {school && (
            <p className="entrance-meta">
              {school.region} · {school.curriculumYear}학년도 교육과정 기준
            </p>
          )}
        </div>
      </main>

      <Footer
        primaryLabel={`${name} 1학년 1학기 시작! →`}
        onPrimary={() => {
          update({ wizardStep: 0 });
          goTo('curriculum');
        }}
      />
    </>
  );
}

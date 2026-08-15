import { useEffect, useMemo, useState } from 'react';
import { Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { useToast } from '../toast';
import { careerById, content, groupById } from '../data';
import { courseById, grade1, schoolById } from '../lib/schoolData';
import { computeRecommendations } from '../lib/recommend';
import { renderDiplomaToBlob } from '../lib/diplomaCanvas';
import { gen6 } from '../lib/raffle';
import type { SlotId } from '../lib/types';

const SEMESTER_SLOTS: SlotId[] = ['g2s1', 'g2s2', 'g3s1', 'g3s2'];

export function ResultScreen() {
  const { session, goTo, reset, update } = useSession();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // 졸업장에 박힐 숨은 6자리 코드(나침반 이벤트 게이트). 없으면 한 번 생성해 고정.
  const raffleCode = session.raffleCode;
  useEffect(() => {
    if (!raffleCode) update({ raffleCode: gen6() });
  }, [raffleCode, update]);

  const targetName = session.selectedMajorLabel
    ? session.selectedMajorLabel
    : session.selectedCareerId
      ? careerById.get(session.selectedCareerId)?.name
      : groupById.get(session.selectedGroupId ?? '')?.name;
  const school = schoolById.get(session.selectedSchoolId ?? '');
  const schoolName = school?.schoolName ?? 'OO고등학교';
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dateKo = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  const topRecs = useMemo(
    () =>
      computeRecommendations(
        {
          majorName: session.selectedMajorName,
          fieldId: session.selectedFieldId,
          groupId: session.selectedGroupId,
        },
        session.selectedSchoolId,
      ).slice(0, 3),
    [
      session.selectedMajorName,
      session.selectedFieldId,
      session.selectedGroupId,
      session.selectedSchoolId,
    ],
  );

  // 1학년 공통 + 2·3학년 선택 = 전체 이수 과목
  const transcript = [
    { label: '1학년 1학기', courses: grade1.semesters.g1s1 },
    { label: '1학년 2학기', courses: grade1.semesters.g1s2 },
    ...SEMESTER_SLOTS.map((slot) => ({
      label: content.slotLabels[slot],
      courses: session.plannedCourses
        .filter((p) => p.slot === slot)
        .map((p) => courseById.get(p.courseId)?.standardName)
        .filter(Boolean) as string[],
    })),
  ].filter((x) => x.courses.length > 0);

  async function saveImage() {
    setSaving(true);
    const filename = `${schoolName}_졸업장_${today}.png`;

    // claude.ai 런타임 다운로드 기능(비공개 아티팩트에서만 사용 가능)
    const claudeDl = (
      window as Window & {
        claude?: {
          downloads?: {
            save: (r: { filename: string; data: Blob }) => Promise<{ status: string }>;
          };
        };
      }
    ).claude?.downloads;

    try {
      // 졸업장을 Canvas로 직접 그려 PNG Blob 생성 (SVG/foreignObject 미사용)
      const blob = await renderDiplomaToBlob({
        schoolName,
        name,
        targetName,
        dateKo,
        transcript,
        recs: topRecs.map((r) => r.course.standardName),
        appName: content.appName,
        disclaimer: content.disclaimer,
        raffleCode: session.raffleCode ?? '',
      });

      // 미리보기·자동 다운로드 공용 dataURL
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(new Error('read-fail'));
        fr.readAsDataURL(blob);
      });

      // 1) claude 런타임 저장(가장 매끄러움). 공유 아티팩트 등에서 막히면 아래로 폴백.
      if (claudeDl?.save) {
        try {
          await claudeDl.save({ filename, data: blob });
          showToast('졸업장을 저장했어요. 📷', 'success');
          return;
        } catch {
          /* capability not available 등 → 오버레이 저장으로 폴백 */
        }
      }

      // 2) 일반 브라우저 자동 다운로드 시도
      try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
      } catch {
        /* 막히면 오버레이로 직접 저장 */
      }

      // 3) 어떤 환경에서도 확실히 저장 가능하도록 오버레이 표시
      setPreviewUrl(dataUrl);
    } catch {
      showToast('이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <main className="screen scene season-gold">
        <BackLink onClick={() => goTo('curriculum')} />
        <span className="eyebrow">🎓 완주</span>
        <h2 className="title">축하합니다, 로드맵 완성이에요!</h2>
        <p className="subtitle">3년간의 과목 선택 여정을 미래 졸업장으로 담았어요. 이미지로 저장해 보관하세요.</p>

        <input
          className="search-input"
          style={{ marginBottom: 16 }}
          placeholder="이름 (선택 · 비워도 됩니다)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
        />

        {/* === 화면용 졸업장(저장 이미지는 Canvas로 별도 렌더) === */}
        <div className="diploma2">
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />

          <div className="d2-content">
            <div className="d2-title">미래 졸업장</div>
            <div className="d2-subtitle">가상 진로·과목 선택 시뮬레이션</div>

            <div className="d2-school-rule">
              <span className="d2-school">{schoolName}</span>
            </div>

            <div className="d2-name">
              성&nbsp;&nbsp;명&nbsp;&nbsp;&nbsp;{name.trim() || '　　　　'}
            </div>
            {targetName && (
              <div className="d2-target">희망 학과&nbsp;&nbsp;&nbsp;&nbsp;{targetName}</div>
            )}

            <div className="d2-date">만든 날 · {dateKo}</div>

            {/* 학기별 선택 과목 */}
            <div className="d2-appendix">
              {transcript.map((x) => (
                <div key={x.label} className="d2-term">
                  <span className="d2-term-name">{x.label}</span>
                  <span className="d2-term-courses">{x.courses.join(' · ')}</span>
                </div>
              ))}
              {topRecs.length > 0 && (
                <div className="d2-recs">
                  <span className="d2-recs-label">진로 추천 과목</span>
                  {topRecs.map((r) => (
                    <span key={r.course.courseId} className="d2-rec">
                      {r.course.standardName}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="d2-notice">
              본 이미지는 진로 탐색을 위한 가상 결과물이며, 학교가 발급한 공식 졸업장이나 증명서가
              아닙니다.
            </div>

            {/* 숨은 이벤트 코드 — 은근한 시리얼처럼 (나침반 이벤트 게이트) */}
            {session.raffleCode && (
              <div className="d2-serial" aria-hidden>
                No. {session.raffleCode}
              </div>
            )}
          </div>
        </div>

        {resetConfirm ? (
          <div className="reset-inline mt-16">
            <span>결과를 지우고 처음부터 다시 시작할까요?</span>
            <div className="reset-inline-btns">
              <button className="btn btn-ghost" onClick={() => setResetConfirm(false)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={() => reset()}>
                네, 처음부터
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-block mt-16"
            onClick={() => setResetConfirm(true)}
          >
            처음부터 다시
          </button>
        )}
      </main>

      <Footer
        primaryLabel={saving ? '저장 중…' : '졸업장 이미지로 저장 🎓'}
        onPrimary={saveImage}
        primaryDisabled={saving}
      />

      {previewUrl && (
        <div className="save-overlay" onClick={() => setPreviewUrl('')}>
          <div className="save-overlay-box" onClick={(e) => e.stopPropagation()}>
            <p className="save-overlay-tip">
              📥 아래 이미지를 <b>길게 누르거나</b>(휴대폰) <b>마우스 오른쪽 클릭</b>(PC) 후
              <br />
              <b>‘이미지 저장’</b>을 선택하면 졸업장이 저장돼요.
            </p>
            <img className="save-overlay-img" src={previewUrl} alt="졸업장" />
            <button
              className="btn btn-primary btn-block"
              onClick={() => setPreviewUrl('')}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** 졸업장 네 모서리 장식 문양 */
function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <svg className={`d2-corner d2-corner-${pos}`} viewBox="0 0 52 52" aria-hidden>
      <path d="M5 50 L5 17 Q5 5 17 5 L50 5" fill="none" stroke="#6f9350" strokeWidth="2.6" />
      <path d="M12 50 L12 21 Q12 12 21 12 L50 12" fill="none" stroke="#c9a227" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="3.4" fill="#c9a227" />
      <path
        d="M6 26 q11 -1 13 -12 q1 9 10 10 q-9 1 -10 11 q-2 -10 -13 -9Z"
        fill="#6f9350"
        opacity="0.55"
      />
    </svg>
  );
}

import { useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Screen, Footer, BackLink } from '../ui';
import { useSession } from '../context';
import { content } from '../data';
import { courseById, selectionGroupsFor } from '../lib/schoolData';
import { matchStatusFor, offeringsFor } from '../lib/recommend';
import { creditStatus, groupPlacedCount, placedCreditsBySlot, slotTargets } from '../lib/plan';
import type { CreditStatus } from '../lib/plan';
import type { PlannedCourse, SlotId } from '../lib/types';

const SEMESTER_SLOTS: SlotId[] = ['g2s1', 'g2s2', 'g3s1', 'g3s2'];
const SLOT_GS: Record<string, { grade: number; semester: number }> = {
  g2s1: { grade: 2, semester: 1 },
  g2s2: { grade: 2, semester: 2 },
  g3s1: { grade: 3, semester: 1 },
  g3s2: { grade: 3, semester: 2 },
};

/** 이 과목이 이 슬롯에서 문제 없는지 → 'ok' | 'warn' | 'err' */
function chipSeverity(
  courseId: string,
  slot: SlotId,
  schoolId: string | undefined,
): 'ok' | 'warn' | 'err' {
  const course = courseById.get(courseId);
  if (!course) return 'ok';
  const status = matchStatusFor(course, schoolId);
  if (status === 'not_offered') return 'err';
  if (status === 'verify') return 'warn';
  if (slot !== 'unplaced') {
    const gs = SLOT_GS[slot];
    // 학기가 명시된 개설정보만 위치 검사에 사용 (선택과목 풀은 학기 미지정)
    const rows = offeringsFor(schoolId ?? '', courseId).filter((r) => r.semester != null);
    if (rows.length > 0 && !rows.some((r) => r.grade === gs.grade && r.semester === gs.semester)) {
      return 'warn';
    }
  }
  return 'ok';
}

export function PlannerScreen() {
  const { session, update, goTo } = useSession();
  const [sheetFor, setSheetFor] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const planned = session.plannedCourses;

  function move(courseId: string, slot: SlotId) {
    update((s) => ({
      plannedCourses: s.plannedCourses.map((p) =>
        p.courseId === courseId ? { ...p, slot } : p,
      ),
    }));
  }

  function remove(courseId: string) {
    update((s) => ({
      plannedCourses: s.plannedCourses.filter((p) => p.courseId !== courseId),
    }));
    setSheetFor(null);
  }

  function onDragEnd(e: DragEndEvent) {
    const courseId = e.active.id as string;
    const overSlot = e.over?.id as SlotId | undefined;
    if (overSlot) move(courseId, overSlot);
  }

  const bySlot = (slot: SlotId) => planned.filter((p) => p.slot === slot);
  const unplacedCount = bySlot('unplaced').length;

  // 학기별 이수 학점 목표/현황
  const targets = slotTargets(session.selectedSchoolId);
  const credits = placedCreditsBySlot(planned);
  const totalTarget = targets.g2s1 + targets.g2s2 + targets.g3s1 + targets.g3s2;
  const totalPlaced =
    credits.g2s1 + credits.g2s2 + credits.g3s1 + credits.g3s2;

  // 선택군(택N) 규정이 있으면 학기별 필요 과목 수를 안내
  const groups = selectionGroupsFor(session.selectedSchoolId);
  const groupsBySlot = SEMESTER_SLOTS.map((slot) => ({
    slot,
    rules: groups.filter((g) => g.slot === slot),
  })).filter((x) => x.rules.length > 0);
  // 각 그룹 현재 배치 수
  const groupCount = (g: (typeof groups)[number]) => groupPlacedCount(planned, g);

  return (
    <>
      <Screen>
        <BackLink onClick={() => goTo('recommend')} />
        <span className="eyebrow">4단계 · 과목 배치</span>
        <h2 className="title">담은 과목을 학기로 옮겨요</h2>
        <p className="subtitle">
          위 과목을 아래 <b>학년·학기 칸으로 끌어다 놓으세요.</b> 학기마다 <b>목표 학점</b>을 맞춰야 해요.
        </p>

        {/* 이수 규정 안내: 선택군(택N)이 있으면 학기별 필요 과목 수, 없으면 총 학점 */}
        {groupsBySlot.length > 0 ? (
          <div className="rule-box">
            <div className="rule-title">📏 이 학교 학기별 선택 규정</div>
            {groupsBySlot.map(({ slot, rules }) => (
              <div key={slot} className="rule-row">
                <span className="rule-slot">{content.slotLabels[slot]}</span>
                <span className="rule-items">
                  {rules.map((g, i) => {
                    const cnt = groupCount(g);
                    const ok = cnt === g.choose;
                    return (
                      <span key={i} className={`rule-chip ${ok ? 'ok' : ''}`}>
                        {g.label} {cnt}/{g.choose}
                      </span>
                    );
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`credit-summary ${totalPlaced >= totalTarget ? 'done' : ''}`}>
            <span>선택 이수 학점</span>
            <b>
              {totalPlaced} / {totalTarget}학점
            </b>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          {/* 미배치 트레이 (드래그 시작점) */}
          <Slot
            slot="unplaced"
            items={bySlot('unplaced')}
            schoolId={session.selectedSchoolId}
            onMoveClick={setSheetFor}
          />

          {/* 학년·학기 2×2 그리드 (드롭 대상) */}
          <div className="sem-grid">
            {SEMESTER_SLOTS.map((slot) => (
              <Slot
                key={slot}
                slot={slot}
                items={bySlot(slot)}
                schoolId={session.selectedSchoolId}
                onMoveClick={setSheetFor}
                placedCredits={credits[slot]}
                targetCredits={targets[slot as keyof typeof targets]}
              />
            ))}
          </div>
        </DndContext>

        {unplacedCount > 0 && (
          <div className="muted center mt-8">
            아직 {unplacedCount}과목이 미배치예요. 다 안 옮겨도 넘어갈 수 있어요.
          </div>
        )}
      </Screen>

      {sheetFor && (
        <MoveSheet
          courseId={sheetFor}
          onPick={(slot) => {
            move(sheetFor, slot);
            setSheetFor(null);
          }}
          onRemove={() => remove(sheetFor)}
          onClose={() => setSheetFor(null)}
        />
      )}

      <Footer primaryLabel="계획 점검하기" onPrimary={() => goTo('check')} />
    </>
  );
}

const CREDIT_CLASS: Record<CreditStatus, string> = {
  empty: 'cs-empty',
  under: 'cs-under',
  ok: 'cs-ok',
  over: 'cs-over',
};

function Slot({
  slot,
  items,
  schoolId,
  onMoveClick,
  placedCredits,
  targetCredits,
}: {
  slot: SlotId;
  items: PlannedCourse[];
  schoolId: string | undefined;
  onMoveClick: (courseId: string) => void;
  placedCredits?: number;
  targetCredits?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot });
  const isSem = slot !== 'unplaced' && targetCredits != null;
  const status: CreditStatus = isSem
    ? creditStatus(placedCredits ?? 0, targetCredits ?? 0)
    : 'ok';

  return (
    <div
      ref={setNodeRef}
      className={`slot ${slot === 'unplaced' ? 'unplaced' : ''} ${isOver ? 'drop-over' : ''}`}
    >
      <div className="slot-head">
        <span className="slot-title">{content.slotLabels[slot]}</span>
        {isSem && (
          <span className={`slot-credits ${CREDIT_CLASS[status]}`}>
            {placedCredits ?? 0}/{targetCredits}학점
          </span>
        )}
      </div>
      <div className="slot-body">
        {items.length === 0 && (
          <div className="slot-empty">
            {slot === 'unplaced' ? '모든 과목을 배치했어요 👍' : '여기로 과목을 옮겨 보세요'}
          </div>
        )}
        {items.map((p) => (
          <CourseChip
            key={p.courseId}
            courseId={p.courseId}
            severity={chipSeverity(p.courseId, slot, schoolId)}
            onMoveClick={() => onMoveClick(p.courseId)}
          />
        ))}
      </div>
    </div>
  );
}

function CourseChip({
  courseId,
  severity,
  onMoveClick,
}: {
  courseId: string;
  severity: 'ok' | 'warn' | 'err';
  onMoveClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: courseId,
  });
  const course = courseById.get(courseId);
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  const sevClass = severity === 'err' ? 'badge-err' : severity === 'warn' ? 'badge-warn' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chip-course ${sevClass} ${isDragging ? 'dragging' : ''}`}
    >
      <span className="cc-grip" {...listeners} {...attributes} aria-hidden>
        ⠿
      </span>
      <span className="cc-title" {...listeners} {...attributes}>
        {course?.standardName}
        {severity === 'err' && ' ⚠️'}
        {severity === 'warn' && ' ❔'}
      </span>
      <button className="cc-move" onClick={onMoveClick}>
        이동
      </button>
    </div>
  );
}

function MoveSheet({
  courseId,
  onPick,
  onRemove,
  onClose,
}: {
  courseId: string;
  onPick: (slot: SlotId) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const course = courseById.get(courseId);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>‘{course?.standardName}’을(를) 어디로?</h3>
        <div className="sheet-options">
          {SEMESTER_SLOTS.map((slot) => (
            <button key={slot} className="sheet-option" onClick={() => onPick(slot)}>
              {content.slotLabels[slot]}
            </button>
          ))}
          <button className="sheet-option" onClick={() => onPick('unplaced')}>
            미배치로
          </button>
          <button className="sheet-option remove" onClick={onRemove}>
            계획에서 빼기
          </button>
        </div>
      </div>
    </div>
  );
}

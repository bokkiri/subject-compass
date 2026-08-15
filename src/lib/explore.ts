// 진로 탐색(미결정) 결과 계산
// 학생의 답변을 '계열' 점수로 바꿔 상위 후보 계열을 만든다.
// ※ 능력·적성 점수가 아니라 "지금 답변과의 일치도"일 뿐이다.
// ※ 계열(F-*)은 커리어넷 학과 데이터의 lClass와 매칭되므로, 결과가 실제 학과로 이어진다.

import type { MajorField } from './types';
import { majorFields, fieldById, questions } from '../data';

/** 계열 후보 하나의 점수 결과 */
export interface FieldScore {
  field: MajorField;
  /** 0~100 일치도 */
  score: number;
  /** 왜 이 계열이 나왔는지 근거 문구 */
  reasons: string[];
}

interface Contribution {
  fieldId: string;
  points: number;
  optionLabel: string;
}

/**
 * @param answers { questionId: 선택한 optionId[] }
 * @returns 점수 높은 순으로 정렬된 계열 후보 (최소 2, 최대 5개)
 */
export function scoreFields(answers: Record<string, string[]>): FieldScore[] {
  const totals = new Map<string, number>();
  const contributions: Contribution[] = [];

  for (const q of questions) {
    const chosen = answers[q.questionId] ?? [];
    for (const optionId of chosen) {
      const option = q.options.find((o) => o.optionId === optionId);
      if (!option) continue;
      for (const [fieldId, points] of Object.entries(option.scores)) {
        totals.set(fieldId, (totals.get(fieldId) ?? 0) + points);
        contributions.push({ fieldId, points, optionLabel: option.label });
      }
    }
  }

  const maxScore = Math.max(1, ...totals.values());

  const scored: FieldScore[] = [];
  for (const [fieldId, raw] of totals.entries()) {
    const field = fieldById.get(fieldId);
    if (!field) continue;
    // 0~100 사이의 "일치도"로 환산
    const score = Math.round((raw / maxScore) * 100);
    scored.push({ field, score, reasons: buildReasons(fieldId, contributions) });
  }

  scored.sort((a, b) => b.score - a.score);

  // 상위 후보: 점수 있는 것 중 최대 5개
  const top = scored.filter((s) => s.score > 0).slice(0, 5);

  // 답변이 너무 적어 후보가 2개 미만이면 대표 계열로 보충
  if (top.length < 2) {
    for (const f of majorFields) {
      if (top.some((t) => t.field.fieldId === f.fieldId)) continue;
      top.push({ field: f, score: 0, reasons: ['답변이 적어 참고용으로 함께 보여드려요.'] });
      if (top.length >= 2) break;
    }
  }

  return top;
}

function buildReasons(fieldId: string, contributions: Contribution[]): string[] {
  // 이 계열에 점수를 준 선택지들을 점수 순으로 모아 상위 3개를 근거로
  const mine = contributions
    .filter((c) => c.fieldId === fieldId)
    .sort((a, b) => b.points - a.points);

  const seen = new Set<string>();
  const reasons: string[] = [];
  for (const c of mine) {
    if (seen.has(c.optionLabel)) continue;
    seen.add(c.optionLabel);
    reasons.push(`‘${c.optionLabel}’을(를) 골랐어요.`);
    if (reasons.length >= 3) break;
  }
  if (reasons.length === 0) reasons.push('선택한 답변과 관련이 있어요.');
  return reasons;
}

/** 답변이 충분한지(확신도) 대략 판단 */
export function answeredCount(answers: Record<string, string[]>): number {
  return Object.values(answers).filter((v) => v.length > 0).length;
}

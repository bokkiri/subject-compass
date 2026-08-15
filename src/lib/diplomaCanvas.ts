// 졸업장을 Canvas 2D로 직접 그려 PNG Blob을 만든다.
// html-to-image(foreignObject→SVG→img→canvas)가 샌드박스/모바일에서
// 실패·hang하던 문제를 피하기 위해 외부 리소스 없이 캔버스에 직접 렌더한다.
// 모바일 캔버스 한계 대비: (1) 높이를 먼저 측정 → 딱 맞는 크기로만 캔버스를 만든다,
// (2) toBlob 실패 시 toDataURL로 폴백한다.

export interface DiplomaData {
  schoolName: string;
  name: string;
  targetName?: string;
  dateKo: string;
  transcript: { label: string; courses: string[] }[];
  recs: string[];
  appName: string;
  disclaimer: string;
  /** 숨은 이벤트 코드(은근한 시리얼처럼 표시) */
  raffleCode: string;
}

// 공식 졸업장이 아닌 가상 결과물임을 명시하는 필수 안내 문구
const NOT_OFFICIAL =
  '본 이미지는 진로 탐색을 위한 가상 결과물이며, 학교가 발급한 공식 졸업장이나 증명서가 아닙니다.';

const SERIF =
  "'궁서','궁서체',Gungsuh,GungsuhChe,Batang,BatangChe,'바탕',serif";
const SANS = "'Nunito',system-ui,-apple-system,'Malgun Gothic',sans-serif";
const CREAM = '#fdfcf6';
const W = 680; // 논리 폭(px)
const PAD = 40;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of [...text]) {
    if (line && ctx.measureText(line + ch).width > maxW) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 졸업장을 그린다. `render=false`면 실제 그리기 없이 최종 높이만 계산한다(측정 패스).
 * @returns 최종 높이(px)
 */
function drawDiploma(ctx: CanvasRenderingContext2D, d: DiplomaData, render: boolean): number {
  const cx = W / 2;
  const contentL = PAD + 14;
  const contentR = W - PAD - 14;
  const contentW = contentR - contentL;

  ctx.textBaseline = 'alphabetic';
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    if (!render) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const text = (t: string, x: number, y: number) => {
    if (render) ctx.fillText(t, x, y);
  };

  let y = PAD + 40;

  // 미래 졸업장 (제목)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2a2a2a';
  ctx.font = `800 40px ${SERIF}`;
  text('미래 졸업장', cx, y);
  y += 24;

  // 부제
  ctx.font = `700 13px ${SANS}`;
  ctx.fillStyle = '#8a6d1e';
  text('가상 진로·과목 선택 시뮬레이션', cx, y);
  y += 34;

  // 학교명(상하 룰)
  ctx.strokeStyle = '#e6cf80';
  ctx.lineWidth = 1;
  line(contentL, y, contentR, y);
  y += 28;
  ctx.fillStyle = '#2a2a2a';
  ctx.font = `900 22px ${SERIF}`;
  text(d.schoolName, cx, y);
  y += 12;
  line(contentL, y, contentR, y);
  y += 34;

  // 성명 / 희망 진로
  ctx.fillStyle = '#333';
  ctx.font = `700 16px ${SERIF}`;
  text(`성  명     ${d.name.trim() || '_________'}`, cx, y);
  y += 30;
  if (d.targetName) {
    ctx.fillStyle = '#4d6b34';
    ctx.font = `700 15px ${SERIF}`;
    text(`희망 학과     ${d.targetName}`, cx, y);
    y += 30;
  }
  y += 20;

  // 날짜
  ctx.font = `600 13px ${SANS}`;
  ctx.fillStyle = '#777';
  text(`만든 날 · ${d.dateKo}`, cx, y);
  y += 34;

  // 구분선
  ctx.strokeStyle = '#cdbb87';
  if (render) ctx.setLineDash([4, 4]);
  line(contentL, y, contentR, y);
  if (render) ctx.setLineDash([]);
  y += 28;

  // 이수 교과 내역
  ctx.textAlign = 'center';

  // 학기별 과목
  ctx.textAlign = 'left';
  for (const term of d.transcript) {
    ctx.fillStyle = '#7c6a2e';
    ctx.font = `800 13px ${SANS}`;
    text(term.label, contentL, y);
    y += 20;
    ctx.fillStyle = '#333';
    ctx.font = `600 12.5px ${SANS}`;
    for (const ln of wrap(ctx, term.courses.join(' · '), contentW)) {
      text(ln, contentL, y);
      y += 18;
    }
    y += 8;
  }
  y += 6;

  // 진로 추천 과목
  if (d.recs.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a6d1e';
    ctx.font = `800 12px ${SANS}`;
    text('진로 추천 과목', cx, y);
    y += 20;
    ctx.fillStyle = '#7c5e12';
    ctx.font = `800 13px ${SANS}`;
    text(d.recs.join('   ·   '), cx, y);
    y += 28;
  }

  // 필수 안내 — 공식 문서 아님(강조)
  y += 4;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a6d1e';
  ctx.font = `700 11px ${SANS}`;
  for (const ln of wrap(ctx, NOT_OFFICIAL, contentW)) {
    text(ln, cx, y);
    y += 16;
  }

  // 숨은 이벤트 코드 — 은근한 시리얼처럼(옅게)
  if (d.raffleCode) {
    y += 8;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9bfa0';
    ctx.font = `600 10px ${SANS}`;
    text(`No. ${d.raffleCode}`, cx, y);
    y += 12;
  }
  y += PAD;

  const finalH = Math.ceil(y);

  // 테두리(초록+금색 이중) + 모서리 점
  if (render) {
    ctx.strokeStyle = '#6f9350';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6, 6, W - 12, finalH - 12);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(11, 11, W - 22, finalH - 22);
    for (const [ox, oy] of [
      [16, 16],
      [W - 16, 16],
      [16, finalH - 16],
      [W - 16, finalH - 16],
    ]) {
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return finalH;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('dataurl-noComma');
  const head = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  if (!b64) throw new Error('dataurl-empty');
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** 주어진 배율(S)로 캔버스에 그려 PNG Blob 생성. 실패 시 예외를 던진다. */
async function renderAt(d: DiplomaData, finalH: number, S: number): Promise<Blob> {
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * S);
  cv.height = Math.round(finalH * S);
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error(`ctx-null@${S}`);
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, finalH);

  drawDiploma(ctx, d, true);

  // toBlob 시도(미동작/hang 대비 타임아웃) → 실패 시 toDataURL 폴백
  const viaBlob = await Promise.race([
    new Promise<Blob | null>((resolve) => {
      try {
        if (typeof cv.toBlob === 'function') cv.toBlob((b) => resolve(b), 'image/png');
        else resolve(null);
      } catch {
        resolve(null);
      }
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
  ]);
  if (viaBlob && viaBlob.size > 0) return viaBlob;

  let url = '';
  try {
    url = cv.toDataURL('image/png');
  } catch (e) {
    throw new Error(`toDataURL:${(e as Error).name || 'err'}`);
  }
  if (!url.startsWith('data:image/png') || url.length < 200) {
    throw new Error('dataurl-invalid');
  }
  return dataUrlToBlob(url);
}

export async function renderDiplomaToBlob(d: DiplomaData): Promise<Blob> {
  // 1) 측정 패스: 작은 캔버스로 최종 높이만 계산 (큰 캔버스 미리 할당 금지)
  const mc = document.createElement('canvas');
  mc.width = 8;
  mc.height = 8;
  const mctx = mc.getContext('2d');
  if (!mctx) throw new Error('ctx-null@measure');
  const finalH = drawDiploma(mctx, d, false);

  // 2) 실제 렌더 — 고배율 실패(모바일 캔버스/메모리 한계) 시 1배로 재시도
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const S = Math.min(2, Math.max(1, Math.round(dpr)));
  try {
    return await renderAt(d, finalH, S);
  } catch (e) {
    if (S !== 1) return await renderAt(d, finalH, 1);
    throw e;
  }
}

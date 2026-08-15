// Vite 빌드 산출물(dist/)을 아티팩트용 단일 HTML 한 개로 인라인한다.
// - CSS/JS를 모두 <style>/<script>로 인라인 (아티팩트는 외부 요청이 차단됨)
// - Google Fonts(Nunito)는 CSP로 차단되므로 artifact-assets/fonts.css(base64 임베드)를 인라인
// - 아티팩트 스켈레톤이 <!doctype><head><body>를 감싸므로 body 콘텐츠만 출력
// 사용: npm run build:artifact  (= vite build 후 이 스크립트 실행)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const outFile = join(root, 'artifact', 'index.html');

// 임베드 폰트(있으면 인라인). 없으면 시스템 폰트로 폴백.
let fontsCss = '';
try {
  fontsCss = await readFile(join(root, 'artifact-assets', 'fonts.css'), 'utf8');
} catch {
  console.warn('⚠ artifact-assets/fonts.css 없음 — 폰트는 시스템 폰트로 폴백됩니다.');
}

const html = await readFile(join(dist, 'index.html'), 'utf8');

const jsSrc = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*>\s*<\/script>/i)?.[1];
const cssHref = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/i)?.[1];
if (!jsSrc || !cssHref) {
  throw new Error(`dist/index.html에서 js/css 경로를 못 찾음 (js=${jsSrc}, css=${cssHref})`);
}

const js = await readFile(join(dist, jsSrc.replace(/^\//, '')), 'utf8');
const css = await readFile(join(dist, cssHref.replace(/^\//, '')), 'utf8');

// 인라인 시 조기 종료 방지: </script>, </style> 시퀀스를 안전하게 이스케이프
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');
const safeCss = css.replace(/<\/style>/gi, '<\\/style>');

const fontBlock = fontsCss ? `<style>\n${fontsCss}\n</style>\n` : '';

const out = `${fontBlock}<style>
${safeCss}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, out, 'utf8');

const kb = (out.length / 1024).toFixed(0);
console.log(`✓ artifact/index.html 생성 (${kb} KB, JS+CSS 인라인)`);

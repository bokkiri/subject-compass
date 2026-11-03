import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 상대 경로: GitHub Pages 하위 경로(/subject-compass/)와 아티팩트 인라인 빌드 모두에서 동작
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 아티팩트는 단일 HTML로 인라인되므로, 코드 스플리팅(동적 import 청크)을
        // 끄고 모든 코드를 하나의 번들로 합친다. 그렇지 않으면 지연 로딩된
        // assets/*.js 청크가 인라인되지 않아 화면이 비어 버린다.
        inlineDynamicImports: true,
      },
    },
  },
})

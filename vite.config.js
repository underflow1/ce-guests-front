import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения из .env файлов
  const buildOutDir = process.env.BUILD_OUT_DIR || 'dist'
  
  return {
    plugins: [react()],
    build: {
      outDir: buildOutDir,
      emptyOutDir: true,
    },
  }
})

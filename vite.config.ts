import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative paths, so the build works under any sub-path (GitHub Pages serves from /<repo-name>/).
export default defineConfig({
  base: './',
  plugins: [react()],
})

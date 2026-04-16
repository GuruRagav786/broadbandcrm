import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /broadband-crm/ for GitHub Pages, / for Vercel
const base = process.env.DEPLOY_TARGET === 'github' ? '/broadband-crm/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/broadband-crm/',  // <-- important for GitHub Pages!
})
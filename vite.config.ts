import { svelte } from '@sveltejs/vite-plugin-svelte'
import glslify from 'vite-plugin-glslify'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte(), glslify()],
})

import { svelte } from '@sveltejs/vite-plugin-svelte'
import glslify from 'vite-plugin-glslify'
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  plugins: [svelte(), glslify()],
  base: process.env.NODE_ENV === 'production' ? `/${pkg.name}` : '',
})

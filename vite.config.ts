import { svelte } from '@sveltejs/vite-plugin-svelte'
import glslify from 'vite-plugin-glslify'
import { configDefaults, defineConfig } from 'vitest/config'
import pkg from './package.json'

export default defineConfig({
  plugins: [svelte(), glslify()],
  base: process.env.NODE_ENV === 'production' ? `/${pkg.name}` : '',
  // worktrees are full checkouts of other branches; their tests aren't ours
  test: { exclude: [...configDefaults.exclude, '.worktrees/**'] },
})

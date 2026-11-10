/// <reference types="vite/client" />
import { mount } from 'svelte'
import App from './App.svelte'
import { canonicalizeOrbitalParam } from './lib/routing/orbitalRoute.svelte'
import { setParam } from './lib/routing/url.svelte'

// TEMP (dev convenience): the bare home URL opens the debug view.
// Remove once the student/teacher UI exists.
if (window.location.search === '') setParam('debug', '')

canonicalizeOrbitalParam()

const target = document.getElementById('app')
if (!target) throw new Error('Missing #app mount target')

const app = mount(App, { target })

export default app

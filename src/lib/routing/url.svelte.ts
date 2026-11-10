import { on } from 'svelte/events'
import { createSubscriber } from 'svelte/reactivity'

/**
 * The page URL is the single source of truth for anything linkable; this
 * module just tells Svelte when to re-read `window.location`. Listeners attach
 * lazily on the first reactive read (via createSubscriber) and detach when no
 * effect is reading, so importing has no side effects.
 */

// pushState/replaceState don't fire popstate, so setParam announces its own changes
const URL_CHANGE = 'urlchange'

const subscribe = createSubscriber((update) => {
  const offPopstate = on(window, 'popstate', update)
  const offOwn = on(window, URL_CHANGE, update)
  return () => {
    offPopstate()
    offOwn()
  }
})

/** Current query params: reactive inside `$derived`/templates, a plain read elsewhere. */
export function searchParams(): URLSearchParams {
  subscribe()
  return new URLSearchParams(window.location.search)
}

export type HistoryMode = 'replace' | 'push'

/** Set (or with `null`, remove) one query param and record it in history. */
export function setParam(
  name: string,
  value: string | null,
  mode: HistoryMode = 'replace',
): void {
  const next = new URL(window.location.href)
  if (value === null) next.searchParams.delete(name)
  else next.searchParams.set(name, value)
  if (mode === 'push') window.history.pushState(null, '', next)
  else window.history.replaceState(null, '', next)
  window.dispatchEvent(new Event(URL_CHANGE))
}

import { BehaviorSubject } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { separationAmounts } from './spinSeparation.js'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function harness(initial: boolean) {
  const split$ = new BehaviorSubject(initial)
  const amounts: number[] = []
  const subscription = separationAmounts({
    split$,
    config$: new BehaviorSubject({ duration: 120, easing: 'linear' }),
  }).subscribe((amount) => amounts.push(amount))
  return { split$, amounts, subscription }
}

describe('separationAmounts', () => {
  it('snaps to the first setting', () => {
    const on = harness(true)
    const off = harness(false)
    expect(on.amounts).toEqual([1])
    expect(off.amounts).toEqual([0])
    on.subscription.unsubscribe()
    off.subscription.unsubscribe()
  })

  it('tweens to a new setting, passing through the values between', async () => {
    const { split$, amounts, subscription } = harness(false)
    split$.next(true)
    await sleep(60)
    const mid = amounts.at(-1)!
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    await sleep(200)
    expect(amounts.at(-1)).toBe(1)
    subscription.unsubscribe()
  })

  it('turns back mid-flight without jumping', async () => {
    const { split$, amounts, subscription } = harness(false)
    split$.next(true)
    await sleep(60)
    split$.next(false)
    await sleep(250)
    expect(amounts.at(-1)).toBe(0)
    const largestStep = amounts.reduce(
      (largest, amount, i) =>
        i === 0 ? 0 : Math.max(largest, Math.abs(amount - amounts[i - 1]!)),
      0,
    )
    expect(largestStep).toBeLessThan(0.5)
    subscription.unsubscribe()
  })

  it('does not animate when the setting is unchanged', async () => {
    const { split$, amounts, subscription } = harness(true)
    split$.next(true)
    await sleep(100)
    expect(amounts).toEqual([1])
    subscription.unsubscribe()
  })
})

<script lang="ts">
import {
  Checkbox,
  Color,
  Folder,
  List,
  Pane,
  Slider,
} from 'svelte-tweakpane-ui'
import { formatHydrogenStateNotation } from '../orbital/hydrogenStateNotation'
import { ORBITAL_PARAM } from '../routing/orbitalParam'
import { currentOrbital } from '../routing/orbitalRoute.svelte'
import { currentSpin, selectSpin } from '../routing/spinRoute.svelte'
import { setParam } from '../routing/url.svelte'
import {
  countOptions,
  GI_SCREEN_SPACE,
  giStrategyOptions,
  lutOptions,
  morphEasingOptions,
  orbitalOptions,
  resScaleOptions,
  spinOptions,
} from './devOptions'
import type { DevSettings } from './devSettings'

let { settings = $bindable() }: { settings: DevSettings } = $props()

const WIDTH = 300
const MARGIN = 16

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`
const percent = (v: number) => `±${Math.round(v * 100)}%`
</script>

<!-- starts docked top-right; once dragged, tweakpane remembers the spot -->
<Pane
  title="Dev"
  position="draggable"
  x={window.innerWidth - WIDTH - MARGIN}
  y={MARGIN}
  width={WIDTH}
>
  <Folder title="Orbital">
    <List label="orbital" options={orbitalOptions} bind:value={
        () => formatHydrogenStateNotation(currentOrbital()),
        (notation) => setParam(ORBITAL_PARAM, notation)
      } />
    <List label="spin" options={spinOptions} bind:value={currentSpin, selectSpin} />
    <Slider label="speed" min={0} max={0.005} step={0.0001} bind:value={settings.speed} />
    <Slider
      label="morph"
      min={200}
      max={5000}
      step={100}
      format={seconds}
      bind:value={settings.morphDuration}
    />
    <List label="easing" options={morphEasingOptions} bind:value={settings.morphEasing} />
  </Folder>

  <Folder title="Render">
    <List label="GI" options={giStrategyOptions} bind:value={settings.giStrategy} />
    <List label="spheres" options={countOptions} bind:value={settings.count} />
    <List label="resolution" options={resScaleOptions} bind:value={settings.resScale} />
    <List label="LUT" options={lutOptions} bind:value={settings.lutPath} />
    {#if settings.giStrategy === GI_SCREEN_SPACE}
      <Slider label="blend" min={0.02} max={1} step={0.01} bind:value={settings.blend} />
      <Checkbox label="randomize" bind:value={settings.randomize} />
      <Checkbox label="indirect" bind:value={settings.indirect} />
    {:else}
      <Slider label="blend" min={0.01} max={0.5} step={0.005} bind:value={settings.objBlend} />
      <Slider label="samples" min={1} max={32} step={1} bind:value={settings.objSamples} />
    {/if}
  </Folder>

  <Folder title="Spheres">
    <Slider label="radius" min={0.007} max={0.02} step={0.0001} bind:value={settings.radius} />
    <Slider
      label="variation"
      min={0}
      max={1}
      step={0.01}
      format={percent}
      bind:value={settings.radiusVariation}
    />
    <Color label="sphere" bind:value={settings.sphereColor} />
    <Color label="background" bind:value={settings.bgColor} />
  </Folder>

  <Folder title="Cutaway">
    <Checkbox label="cutaway" bind:value={settings.cutaway} />
    {#if settings.cutaway}
      <Slider label="feather" min={0} max={0.3} step={0.001} bind:value={settings.cutawayFeather} />
    {/if}
  </Folder>
</Pane>

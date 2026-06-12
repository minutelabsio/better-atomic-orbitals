<script lang="ts">
import ColorPicker from 'svelte-awesome-color-picker'
import { lightingPresets } from './lib/scenes/lightingPresets.js'
import ManySpheres from './lib/scenes/manySpheres/ManySpheres.svelte'
import ManySpheresObjGI from './lib/scenes/manySpheres/ManySpheresObjGI.svelte'
import OrbitalField from './lib/scenes/orbitalField/OrbitalField.svelte'
import OrbitalScatter from './lib/scenes/orbitalScatter/OrbitalScatter.svelte'
import OrbitalGlass from './lib/scenes/orbitalGlass/OrbitalGlass.svelte'
import RaySphereScene from './lib/scenes/raySphere/RaySphereScene.svelte'
import TinySpheres from './lib/scenes/tinySpheres/TinySpheres.svelte'
import Three from './lib/Three.svelte'
import { LUTS } from './luts.js'

const luts = LUTS

const scenes = [
  { id: 'manySpheres', label: 'Many Spheres (RT)', component: ManySpheres },
  {
    id: 'orbitalField',
    label: 'Orbital Density (Field)',
    component: OrbitalField,
  },
  {
    id: 'orbitalScatter',
    label: 'Orbital Scatter (Volumetric)',
    component: OrbitalScatter,
  },
  {
    id: 'orbitalGlass',
    label: 'Orbital Glass (Refraction)',
    component: OrbitalGlass,
  },
  { id: 'tinySpheres', label: 'Tiny Spheres', component: TinySpheres },
  { id: 'raySphere', label: 'Ray Sphere', component: RaySphereScene },
]

const giStrategies = [
  { label: 'Screen-space temporal', value: 0 },
  { label: 'Object-space per-sphere', value: 1 },
]

// all valid hydrogen orbitals up to n = 6 (l < n, |m| <= l)
const orbitalLetters = ['s', 'p', 'd', 'f', 'g', 'h']
const orbitals: { n: number; l: number; m: number; label: string }[] = []
for (let n = 1; n <= 6; n++) {
  for (let l = 0; l < n; l++) {
    for (let mq = -l; mq <= l; mq++) {
      const letter = orbitalLetters[l] ?? `l${l}`
      const mTag = l > 0 ? ` m=${mq > 0 ? '+' : ''}${mq}` : ''
      orbitals.push({ n, l, m: mq, label: `${n}${letter}${mTag}` })
    }
  }
}
const manyCounts = [2000, 10000, 50000, 100000]
const manyResScales = [
  { label: 'Full res', value: 1 },
  { label: '¾ res', value: 0.75 },
  { label: '½ res', value: 0.5 },
]

let giStrategy = $state(1)
let selectedSceneIdx = $state(0)
let selectedLutIdx = $state(0)
let lightingPresetIdx = $state(0)
let manyCountIdx = $state(2)
let manyResIdx = $state(2)
let orbitalIdx = $state(
  orbitals.findIndex((o) => o.n === 2 && o.l === 1 && o.m === 1),
)
let manySpeed = $state(0.001)
let manyBlend = $state(0.28)
let manyObjBlend = $state(0.01)
let manyObjSamples = $state(1)
let manyRandomize = $state(true)
let manyIndirect = $state(true)
let manyCutaway = $state(false)
let manyCutawayFeather = $state(0.05)
let manyRadius = $state(0.012)
let manyRadiusVar = $state(0)
// Orbital Density (Field) scene controls
let fieldGain = $state(3.0)
let fieldSteps = $state(192)
let fieldCutaway = $state(false)
let fieldColorHex = $state<string | null>('#1b1b2f')
let fieldBgHex = $state<string | null>('#ffffff')
// other nice colors: #80354d, #8bb10d
// Orbital Scatter (volumetric, Henyey-Greenstein) scene controls
let scatterGain = $state(3.0)
let scatterSteps = $state(48)
let scatterCutaway = $state(false)
let scatterColorHex = $state<string | null>('#e9ecff')
let scatterBgHex = $state<string | null>('#86b0e6')
let scatterAnisotropy = $state(0.12)
let scatterLightIntensity = $state(1.8)
// Orbital Glass (isosurface refraction) scene controls
let glassSteps = $state(80)
let glassIso = $state(0.01)
let glassIOR = $state(1.5)
let glassAbsorb = $state(1.2)
let glassDensityGraded = $state(false)
let glassCutaway = $state(false)
let glassTintHex = $state<string | null>('#bfe9ff')
let sphereHex = $state<string | null>('#f1921f')
let bgHex = $state<string | null>('#ffffff')

const orbital = $derived(orbitals[orbitalIdx]!)
const selected = $derived(scenes[selectedSceneIdx]!)
const lutPath = $derived(luts[selectedLutIdx]!.path)
const manyCount = $derived(manyCounts[manyCountIdx]!)
const manyResScale = $derived(manyResScales[manyResIdx]!.value)
</script>

<div class="app">
  <Three {lutPath}>
    {#if selected.id === 'tinySpheres'}
      <TinySpheres presetIdx={lightingPresetIdx} />
    {:else if selected.id === 'manySpheres'}
      {#key `${manyCount}-${giStrategy}`}
        {#if giStrategy === 1}
          <ManySpheresObjGI
            count={manyCount}
            resScale={manyResScale}
            blend={manyObjBlend}
            samples={manyObjSamples}
            sphereColor={sphereHex ?? '#ec7813'}
            bgColor={bgHex ?? '#33373d'}
            cutaway={manyCutaway}
            cutawayFeather={manyCutawayFeather}
            sphereRadius={manyRadius}
            radiusVariation={manyRadiusVar}
            n={orbital.n}
            l={orbital.l}
            m={orbital.m}
            speed={manySpeed}
          />
        {:else}
          <ManySpheres
            count={manyCount}
            resScale={manyResScale}
            blend={manyBlend}
            randomize={manyRandomize}
            indirect={manyIndirect}
            sphereColor={sphereHex ?? '#ec7813'}
            bgColor={bgHex ?? '#33373d'}
            cutaway={manyCutaway}
            cutawayFeather={manyCutawayFeather}
            sphereRadius={manyRadius}
            radiusVariation={manyRadiusVar}
            n={orbital.n}
            l={orbital.l}
            m={orbital.m}
            speed={manySpeed}
          />
        {/if}
      {/key}
    {:else if selected.id === 'orbitalField'}
      <OrbitalField
        n={orbital.n}
        l={orbital.l}
        m={orbital.m}
        gain={fieldGain}
        steps={fieldSteps}
        cutaway={fieldCutaway}
        orbitalColor={fieldColorHex ?? '#1b1b2f'}
        bgColor={fieldBgHex ?? '#ffffff'}
      />
    {:else if selected.id === 'orbitalScatter'}
      <OrbitalScatter
        n={orbital.n}
        l={orbital.l}
        m={orbital.m}
        gain={scatterGain}
        steps={scatterSteps}
        cutaway={scatterCutaway}
        orbitalColor={scatterColorHex ?? '#e9ecff'}
        bgColor={scatterBgHex ?? '#86b0e6'}
        anisotropy={scatterAnisotropy}
        lightIntensity={scatterLightIntensity}
      />
    {:else if selected.id === 'orbitalGlass'}
      <OrbitalGlass
        n={orbital.n}
        l={orbital.l}
        m={orbital.m}
        steps={glassSteps}
        iso={glassIso}
        ior={glassIOR}
        absorb={glassAbsorb}
        densityGraded={glassDensityGraded}
        glassTint={glassTintHex ?? '#bfe9ff'}
        cutaway={glassCutaway}
      />
    {:else}
      <RaySphereScene />
    {/if}
  </Three>

  <div class="controls">
    <select bind:value={selectedSceneIdx}>
      {#each scenes as scene, i}
        <option value={i}>{scene.label}</option>
      {/each}
    </select>

    <select bind:value={selectedLutIdx}>
      {#each luts as lut, i}
        <option value={i}>{lut.label}</option>
      {/each}
    </select>

    {#if selected.id === 'tinySpheres'}
      <select bind:value={lightingPresetIdx}>
        {#each lightingPresets as preset, i}
          <option value={i}>{preset.name}</option>
        {/each}
      </select>
    {:else if selected.id === 'manySpheres'}
      <select bind:value={giStrategy}>
        {#each giStrategies as s}
          <option value={s.value}>{s.label}</option>
        {/each}
      </select>
      <select bind:value={manyCountIdx}>
        {#each manyCounts as c, i}
          <option value={i}>{c.toLocaleString()} spheres</option>
        {/each}
      </select>
      <select bind:value={manyResIdx}>
        {#each manyResScales as r, i}
          <option value={i}>{r.label}</option>
        {/each}
      </select>
      <select bind:value={orbitalIdx}>
        {#each orbitals as o, i}
          <option value={i}>{o.label}</option>
        {/each}
      </select>
      <label class="ctl">
        <span>Speed: {manySpeed.toFixed(4)}</span>
        <input
          type="range"
          min="0"
          max="0.005"
          step="0.0001"
          bind:value={manySpeed}
        />
      </label>
      {#if giStrategy === 0}
        <label class="ctl">
          <span>Blend: {manyBlend.toFixed(2)}</span>
          <input
            type="range"
            min="0.02"
            max="1"
            step="0.01"
            bind:value={manyBlend}
          />
        </label>
      {:else}
        <label class="ctl">
          <span>Blend: {manyObjBlend.toFixed(3)}</span>
          <input
            type="range"
            min="0.01"
            max="0.5"
            step="0.005"
            bind:value={manyObjBlend}
          />
        </label>
        <label class="ctl">
          <span>Samples/frame: {manyObjSamples}</span>
          <input
            type="range"
            min="1"
            max="32"
            step="1"
            bind:value={manyObjSamples}
          />
        </label>
      {/if}
      <label class="ctl">
        <span>Radius: {manyRadius.toFixed(3)}</span>
        <input
          type="range"
          min="0.007"
          max="0.02"
          step="0.0001"
          bind:value={manyRadius}
        />
      </label>
      <label class="ctl">
        <span>Radius variation: ±{Math.round(manyRadiusVar * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={manyRadiusVar}
        />
      </label>
      {#if giStrategy === 0}
        <label class="ctl checkbox">
          <input type="checkbox" bind:checked={manyRandomize} />
          <span>Randomize samples</span>
        </label>
        <label class="ctl checkbox">
          <input type="checkbox" bind:checked={manyIndirect} />
          <span>Indirect bounce (color bleed)</span>
        </label>
      {/if}
      <label class="ctl checkbox">
        <input type="checkbox" bind:checked={manyCutaway} />
        <span>Cutaway (top-front quarter)</span>
      </label>
      {#if manyCutaway}
        <label class="ctl">
          <span>Cutaway feather: {manyCutawayFeather.toFixed(2)}</span>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.001"
            bind:value={manyCutawayFeather}
          />
        </label>
      {/if}
      <div class="ctl colors">
        <ColorPicker
          bind:hex={sphereHex}
          label="Sphere color"
          isAlpha={false}
          position="responsive"
        />
        <ColorPicker
          bind:hex={bgHex}
          label="Background"
          isAlpha={false}
          position="responsive"
        />
      </div>
    {:else if selected.id === 'orbitalField'}
      <select bind:value={orbitalIdx}>
        {#each orbitals as o, i}
          <option value={i}>{o.label}</option>
        {/each}
      </select>
      <label class="ctl">
        <span>Density gain: {fieldGain.toFixed(2)}</span>
        <input
          type="range"
          min="0.1"
          max="15"
          step="0.05"
          bind:value={fieldGain}
        />
      </label>
      <label class="ctl">
        <span>Quality: {fieldSteps} steps</span>
        <input
          type="range"
          min="48"
          max="512"
          step="8"
          bind:value={fieldSteps}
        />
      </label>
      <label class="ctl checkbox">
        <input type="checkbox" bind:checked={fieldCutaway} />
        <span>Cutaway (slice +Z half)</span>
      </label>
      <div class="ctl colors">
        <ColorPicker
          bind:hex={fieldColorHex}
          label="Orbital color"
          isAlpha={false}
          position="responsive"
        />
        <ColorPicker
          bind:hex={fieldBgHex}
          label="Background"
          isAlpha={false}
          position="responsive"
        />
      </div>
    {:else if selected.id === 'orbitalScatter'}
      <select bind:value={orbitalIdx}>
        {#each orbitals as o, i}
          <option value={i}>{o.label}</option>
        {/each}
      </select>
      <label class="ctl">
        <span>Density gain: {scatterGain.toFixed(2)}</span>
        <input
          type="range"
          min="0.1"
          max="15"
          step="0.05"
          bind:value={scatterGain}
        />
      </label>
      <label class="ctl">
        <span>Quality: {scatterSteps} steps</span>
        <input
          type="range"
          min="48"
          max="512"
          step="8"
          bind:value={scatterSteps}
        />
      </label>
      <label class="ctl">
        <span>Scattering (HG g): {scatterAnisotropy.toFixed(2)}</span>
        <input
          type="range"
          min="-0.9"
          max="0.9"
          step="0.05"
          bind:value={scatterAnisotropy}
        />
      </label>
      <label class="ctl">
        <span>Light intensity: {scatterLightIntensity.toFixed(2)}</span>
        <input
          type="range"
          min="0"
          max="5"
          step="0.05"
          bind:value={scatterLightIntensity}
        />
      </label>
      <label class="ctl checkbox">
        <input type="checkbox" bind:checked={scatterCutaway} />
        <span>Cutaway (slice +Z half)</span>
      </label>
      <div class="ctl colors">
        <ColorPicker
          bind:hex={scatterColorHex}
          label="Cloud color"
          isAlpha={false}
          position="responsive"
        />
        <ColorPicker
          bind:hex={scatterBgHex}
          label="Sky / background"
          isAlpha={false}
          position="responsive"
        />
      </div>
    {:else if selected.id === 'orbitalGlass'}
      <select bind:value={orbitalIdx}>
        {#each orbitals as o, i}
          <option value={i}>{o.label}</option>
        {/each}
      </select>
      <label class="ctl">
        <span>Iso threshold: {glassIso.toFixed(4)}</span>
        <input
          type="range"
          min="0.0005"
          max="0.05"
          step="0.0005"
          bind:value={glassIso}
        />
      </label>
      <label class="ctl">
        <span>Index of refraction: {glassIOR.toFixed(2)}</span>
        <input
          type="range"
          min="1"
          max="2.4"
          step="0.01"
          bind:value={glassIOR}
        />
      </label>
      <label class="ctl">
        <span>Tint absorption: {glassAbsorb.toFixed(2)}</span>
        <input
          type="range"
          min="0"
          max="5"
          step="0.05"
          bind:value={glassAbsorb}
        />
      </label>
      <label class="ctl">
        <span>Quality: {glassSteps} steps</span>
        <input
          type="range"
          min="64"
          max="512"
          step="8"
          bind:value={glassSteps}
        />
      </label>
      <label class="ctl checkbox">
        <input type="checkbox" bind:checked={glassDensityGraded} />
        <span>Density-graded tint (denser = more glass)</span>
      </label>
      <label class="ctl checkbox">
        <input type="checkbox" bind:checked={glassCutaway} />
        <span>Cutaway (slice +Z half)</span>
      </label>
      <div class="ctl colors">
        <ColorPicker
          bind:hex={glassTintHex}
          label="Glass tint"
          isAlpha={false}
          position="responsive"
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
  }

  .controls {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    z-index: 10;
  }

  select {
    background: rgba(10, 10, 20, 0.75);
    color: #aac8e0;
    border: 1px solid rgba(100, 160, 220, 0.35);
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }

  .ctl {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(10, 10, 20, 0.75);
    color: #aac8e0;
    border: 1px solid rgba(100, 160, 220, 0.35);
    border-radius: 6px;
    padding: 0.35rem 0.6rem;
    font-size: 0.8rem;
    backdrop-filter: blur(6px);
  }

  .ctl input[type='range'] {
    width: 100%;
    cursor: pointer;
    accent-color: #66a0dc;
  }

  .ctl.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    cursor: pointer;
  }

  .ctl.checkbox input {
    cursor: pointer;
    accent-color: #66a0dc;
  }

  .ctl.colors {
    gap: 0.5rem;
    /* theme svelte-awesome-color-picker to match the dark panel */
    --cp-bg-color: rgba(10, 10, 20, 0.96);
    --cp-border-color: rgba(100, 160, 220, 0.35);
    --cp-text-color: #aac8e0;
    --cp-input-color: rgba(255, 255, 255, 0.06);
    --cp-button-hover-color: rgba(255, 255, 255, 0.14);
  }

  /* the picker's label + swatch row */
  .ctl.colors :global(.color-picker > label.container) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #aac8e0;
  }
</style>

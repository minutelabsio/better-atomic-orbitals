<script lang="ts">
import { lightingPresets } from './lib/scenes/lightingPresets.js'
import ManySpheres from './lib/scenes/manySpheres/ManySpheres.svelte'
import RaySphereScene from './lib/scenes/raySphere/RaySphereScene.svelte'
import TinySpheres from './lib/scenes/tinySpheres/TinySpheres.svelte'
import Three from './lib/Three.svelte'

const scenes = [
  { id: 'tinySpheres', label: 'Tiny Spheres', component: TinySpheres },
  { id: 'raySphere', label: 'Ray Sphere', component: RaySphereScene },
  { id: 'manySpheres', label: 'Many Spheres (RT)', component: ManySpheres },
]

const luts = [
  { label: 'Bourbon 64', path: '/luts/Bourbon 64.CUBE' },
  { label: 'Faded 47', path: '/luts/Faded 47.CUBE' },
  { label: 'Remy 24', path: '/luts/Remy 24.CUBE' },
  { label: 'Clayton 33', path: '/luts/Clayton 33.CUBE' },
  { label: 'Chemical 168', path: '/luts/Chemical 168.CUBE' },
  { label: 'Cubicle 99', path: '/luts/Cubicle 99.CUBE' },
  { label: 'Presetpro Cinematic', path: '/luts/Presetpro-Cinematic.cube' },
]

const manyCounts = [2000, 10000, 50000, 100000]
const manyResScales = [
  { label: 'Full res', value: 1 },
  { label: '¾ res', value: 0.75 },
  { label: '½ res', value: 0.5 },
]

let selectedSceneIdx = $state(0)
let selectedLutIdx = $state(0)
let lightingPresetIdx = $state(0)
let manyCountIdx = $state(2)
let manyResIdx = $state(0)
let manyBlend = $state(0.12)
let manyRandomize = $state(true)

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
      {#key manyCount}
        <ManySpheres
          count={manyCount}
          resScale={manyResScale}
          blend={manyBlend}
          randomize={manyRandomize}
        />
      {/key}
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
      <label class="ctl checkbox">
        <input type="checkbox" bind:checked={manyRandomize} />
        <span>Randomize samples</span>
      </label>
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
</style>

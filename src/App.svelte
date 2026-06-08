<script lang="ts">
import { lightingPresets } from './lib/scenes/lightingPresets.js'
import RaySphereScene from './lib/scenes/RaySphereScene.svelte'
import TinySpheres from './lib/scenes/TinySpheres.svelte'
import Three from './lib/Three.svelte'

const scenes = [
  { id: 'tinySpheres', label: 'Tiny Spheres', component: TinySpheres },
  { id: 'raySphere', label: 'Ray Sphere', component: RaySphereScene },
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

let selectedSceneIdx = $state(0)
let selectedLutIdx = $state(0)
let lightingPresetIdx = $state(0)

const selected = $derived(scenes[selectedSceneIdx]!)
const lutPath = $derived(luts[selectedLutIdx]!.path)
</script>

<div class="app">
  <Three {lutPath}>
    {#if selected.id === 'tinySpheres'}
      <TinySpheres presetIdx={lightingPresetIdx} />
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
</style>

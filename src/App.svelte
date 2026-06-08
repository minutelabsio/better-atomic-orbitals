<script lang="ts">
import Three from './lib/Three.svelte'
import SphericalCloud from './lib/scenes/SphericalCloud.svelte'
import TinySpheres from './lib/scenes/TinySpheres.svelte'

const scenes = [
  { id: 'sphericalCloud', label: 'Spherical Cloud', component: SphericalCloud },
  { id: 'tinySpheres', label: 'Tiny Spheres', component: TinySpheres },
]

let selectedIdx = $state(0)
const selected = $derived(scenes[selectedIdx])
</script>

<div class="app">
  <Three>
    <selected.component />
  </Three>

  <select class="scene-selector" bind:value={selectedIdx}>
    {#each scenes as scene, i}
      <option value={i}>{scene.label}</option>
    {/each}
  </select>
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
  }

  .scene-selector {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 10;
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

<script lang="ts">
import Three from './lib/Three.svelte'
import SphericalCloud from './lib/scenes/SphericalCloud.svelte'

const scenes = {
  sphericalCloud: SphericalCloud,
}

let selected = $state({ scene: scenes.sphericalCloud })
</script>

<div class="app">
  <Three>
    <selected.scene />
  </Three>
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
  }
</style>

<script lang="ts">
import DevPanel from './lib/dev/DevPanel.svelte'
import { GI_OBJECT_SPACE } from './lib/dev/devOptions'
import { defaultDevSettings } from './lib/dev/devSettings'
import { currentColoring } from './lib/routing/colorRoute.svelte'
import { currentOrbital } from './lib/routing/orbitalRoute.svelte'
import { currentSpin } from './lib/routing/spinRoute.svelte'
import { searchParams } from './lib/routing/url.svelte'
import ManySpheres from './lib/scenes/manySpheres/ManySpheres.svelte'
import ManySpheresObjGI from './lib/scenes/manySpheres/ManySpheresObjGI.svelte'
import Three from './lib/Three.svelte'

// linkable state lives in the URL; dev-only render settings stay local
const orbital = $derived(currentOrbital())
const spin = $derived(currentSpin())
const colorBySpin = $derived(currentColoring() === 'spin')
const debug = $derived(searchParams().has('debug'))

let settings = $state(defaultDevSettings())
</script>

<div class="app">
  <Three lutPath={settings.lutPath}>
    {#key `${settings.count}-${settings.giStrategy}`}
      {#if settings.giStrategy === GI_OBJECT_SPACE}
        <ManySpheresObjGI
          count={settings.count}
          resScale={settings.resScale}
          blend={settings.objBlend}
          samples={settings.objSamples}
          sphereColor={settings.sphereColor}
          {colorBySpin}
          bgColor={settings.bgColor}
          cutaway={settings.cutaway}
          cutawayFeather={settings.cutawayFeather}
          sphereRadius={settings.radius}
          radiusVariation={settings.radiusVariation}
          {orbital}
          {spin}
          speed={settings.speed}
          morphDuration={settings.morphDuration}
          morphEasing={settings.morphEasing}
        />
      {:else}
        <ManySpheres
          count={settings.count}
          resScale={settings.resScale}
          blend={settings.blend}
          randomize={settings.randomize}
          indirect={settings.indirect}
          sphereColor={settings.sphereColor}
          {colorBySpin}
          bgColor={settings.bgColor}
          cutaway={settings.cutaway}
          cutawayFeather={settings.cutawayFeather}
          sphereRadius={settings.radius}
          radiusVariation={settings.radiusVariation}
          {orbital}
          {spin}
          speed={settings.speed}
          morphDuration={settings.morphDuration}
          morphEasing={settings.morphEasing}
        />
      {/if}
    {/key}
  </Three>

  {#if debug}
    <DevPanel bind:settings />
  {/if}
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
  }
</style>

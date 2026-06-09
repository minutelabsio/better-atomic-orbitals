# Project

Goal: replicate the atomic-orbital visualizations in https://www.youtube.com/watch?v=W2Xb2GFK2yc — a large, slowly-orbiting cloud of tiny spheres rendered with soft, realistic lighting where each sphere picks up bounced color from its neighbors.

The flagship is the **Many Spheres (RT)** scene (`src/lib/scenes/manySpheres/`): a GPU ray tracer for up to ~50k+ spheres.

Strategy:
- **Acceleration:** a single-level uniform grid (`sphereGrid.ts`), rebuilt every frame on the CPU via counting sort (O(N); spheres orbit + are equal-ish size, so a grid beats a BVH). Packed into float data textures.
- **Render:** a fullscreen-quad fragment shader (`manySpheres.frag.glsl`, GLSL3) does Amanatides–Woo DDA grid traversal + analytic ray–sphere intersection.
- **Lighting:** direct diffuse (+ key-light shadow ray) plus one cosine-weighted diffuse bounce = inter-sphere color bleeding. Noise is cleaned by **temporal accumulation** (EMA over frames in ping-pong render targets). Tradeoff: moving geometry causes motion blur — the planned fix is motion-vector reprojection (see `planning/motion-vector-reprojection.md`).
- **Controls** (`App.svelte`, live props): sphere count, resolution scale, blend (accumulation), radius + variation, randomize (stochastic vs deterministic bounce), cutaway (cull top-front quarter — done in the grid build so it's also a perf win), sphere/background colors.

Run/verify: `pnpm dev`. No GPU in the sandbox — screenshot via headless Chromium + SwiftShader (software WebGL2); the setup is non-obvious, so check agent memory before reinventing it. `pnpm typecheck` must stay clean.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

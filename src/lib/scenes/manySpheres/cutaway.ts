/** The cutaway removes the top-front quarter of the cloud. */
export function isInCutQuadrant(y: number, z: number): boolean {
  return y > 0 && z > 0
}

/**
 * Radius scale for a sphere near the cut: a smoothstep of its distance to the
 * cut quadrant, 0 inside it and 1 beyond `feather`. Spheres shrink to nothing
 * as they enter the cut and grow back as they leave, instead of popping.
 */
export function cutawayFeatherScale(
  y: number,
  z: number,
  feather: number,
): number {
  if (feather <= 0) return 1
  // most spheres are clear of the band on one axis alone; skip the sqrt
  if (y <= -feather || z <= -feather) return 1
  const outsideY = Math.max(-y, 0)
  const outsideZ = Math.max(-z, 0)
  const distanceToCut = Math.sqrt(outsideY * outsideY + outsideZ * outsideZ)
  const t = Math.min(distanceToCut / feather, 1)
  return t * t * (3 - 2 * t)
}

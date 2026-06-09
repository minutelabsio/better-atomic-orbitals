export interface Cylindrical {
  /** distance from the spin axis */
  rho: number
  /** position along the spin axis */
  y: number
}

/**
 * Spherical (r, polar) -> cylindrical about the spin axis (our spin axis = Y).
 * `polar` is the angle measured from the +Y axis, so rho = r sin(polar) is the
 * distance from the axis and y = r cos(polar) is the height along it. (Azimuth is
 * carried separately, unchanged, since the motion is a rotation in azimuth.)
 */
export function sphericalToCylindrical(r: number, polar: number): Cylindrical {
  return { rho: r * Math.sin(polar), y: r * Math.cos(polar) }
}

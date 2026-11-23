/** A cubic uniform grid centred on the origin. */
export interface GridGeometry {
  /** cells per axis */
  readonly gridRes: number
  readonly cellCount: number
  /** the domain's min corner, on every axis */
  readonly boundMin: number
  readonly cellSize: number
}

/** Where the grid sits: what may change between builds at a fixed resolution. */
export type GridExtent = Pick<GridGeometry, 'boundMin' | 'cellSize'>

export function gridGeometry({
  gridRes,
  boundRadius,
}: {
  gridRes: number
  /** half-extent of the domain; must comfortably contain the cloud */
  boundRadius: number
}): GridGeometry {
  return {
    gridRes,
    cellCount: gridRes ** 3,
    ...gridExtent(gridRes, boundRadius),
  }
}

/** The extent of a cube of half-width `boundRadius` centred on the origin. */
export function gridExtent(gridRes: number, boundRadius: number): GridExtent {
  return { boundMin: -boundRadius, cellSize: (2 * boundRadius) / gridRes }
}

/** The cell index along one axis containing `coordinate`, clamped to [0, last]. */
export function clampedCellIndex(
  coordinate: number,
  boundMin: number,
  cellSize: number,
  last: number,
): number {
  const cell = Math.floor((coordinate - boundMin) / cellSize)
  return cell < 0 ? 0 : cell > last ? last : cell
}

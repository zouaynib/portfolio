import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * The lab: a low modern pavilion.
 *
 * Deliberately the opposite of the studio next door — flat roof instead of
 * pitched, a full-height glazed front instead of a small door, straight
 * cantilevered edges instead of exposed timber. The contrast is the point: one
 * building is where she paints, the other is where she builds models.
 */

export const LAB_DIMS = {
  width: 11,
  depth: 10,
  height: 3.5,
  thickness: 0.3,
  doorWidth: 2.0,
  doorHeight: 2.6,
  overhang: 0.6,
  roofThickness: 0.34,
}

const box = (w, h, d, x, y, z) => {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

/** Concrete shell: back and side walls. The front is glazed, so it is absent. */
export const makeLabShell = () => {
  const { width: W, depth: D, height: H, thickness: t } = LAB_DIMS
  return mergeGeometries(
    [
      box(W, H, t, 0, H / 2, -D / 2 + t / 2),
      box(t, H, D - t, -W / 2 + t / 2, H / 2, -t / 2),
      box(t, H, D - t, W / 2 - t / 2, H / 2, -t / 2),
    ],
    false,
  )
}

/**
 * Flat roof slab with a deep cantilever.
 *
 * The overhang is what makes it read as modern rather than as a shed with the
 * pitch removed — it throws a hard horizontal shadow line across the glazing.
 */
export const makeLabRoof = () => {
  const { width: W, depth: D, height: H, overhang: o, roofThickness: rt } = LAB_DIMS
  return box(W + o * 2, rt, D + o * 2, 0, H + rt / 2, o / 2)
}

/** Terrace slab, extended in front and sunk deep enough to clear the terrain. */
export const makeLabPlinth = () => {
  const { width: W, depth: D } = LAB_DIMS
  return mergeGeometries(
    [
      box(W + 1.0, 5.0, D + 1.0, 0, -2.45, 0),
      // A shallow step out toward the meadow.
      box(W - 1.0, 0.22, 2.2, 0, -0.11, D / 2 + 1.1),
    ],
    false,
  )
}

/** Interior floor. */
export const makeLabFloor = () => {
  const { width: W, depth: D, thickness: t } = LAB_DIMS
  return box(W - t * 2, 0.12, D - t * 2, 0, 0.06, 0)
}

/**
 * Glazed front: dark mullions and rails framing the bays.
 *
 * The door is simply a gap in the frame rather than a moving panel — the
 * camera walks through it, and a hinged door would only ever be in the way.
 */
export const makeLabGlazing = () => {
  const { width: W, depth: D, height: H, doorWidth: dW, doorHeight: dH } = LAB_DIMS

  const z = D / 2 - 0.1
  const post = 0.1
  const depth = 0.16

  // Mullion positions: the outer frame, two intermediate bays each side, and
  // the two door jambs.
  const xs = [-W / 2, -3.6, -1.8, -dW / 2, dW / 2, 1.8, 3.6, W / 2]
  const parts = xs.map((x) => box(post, H, depth, x, H / 2, z))

  // Head rail, sill rail, and a transom at door height.
  parts.push(box(W, post, depth, 0, H - post / 2, z))
  parts.push(box(W, post, depth, 0, post / 2, z))
  parts.push(box(dW + post, post, depth, 0, dH, z))

  return mergeGeometries(parts, false)
}

/**
 * Glass panes.
 *
 * Separate geometry because they need a transparent material. The doorway is
 * left empty so you can see straight into the room from across the meadow.
 */
export const makeLabGlass = () => {
  const { width: W, depth: D, height: H, doorWidth: dW, doorHeight: dH } = LAB_DIMS

  const z = D / 2 - 0.1
  const parts = []

  // Full-height bays either side of the door.
  const bays = [
    [-W / 2, -1.8],
    [1.8, W / 2],
  ]
  for (const [x0, x1] of bays) {
    const w = x1 - x0
    const g = new THREE.PlaneGeometry(w, H)
    g.translate((x0 + x1) / 2, H / 2, z)
    parts.push(g)
  }

  // The transom pane above the door.
  const above = new THREE.PlaneGeometry(dW, H - dH)
  above.translate(0, dH + (H - dH) / 2, z)
  parts.push(above)

  return mergeGeometries(parts, false)
}

/** Interior surfaces the room is read from: walls, ceiling. */
export const makeLabLiner = () => {
  const { width: W, depth: D, height: H, thickness: t } = LAB_DIMS

  const iw = W - t * 2
  const id = D - t * 2
  const eps = 0.012
  const parts = []

  const back = new THREE.PlaneGeometry(iw, H)
  back.translate(0, H / 2, -id / 2 + eps)
  parts.push(back)

  const left = new THREE.PlaneGeometry(id, H)
  left.rotateY(Math.PI / 2)
  left.translate(-iw / 2 + eps, H / 2, 0)
  parts.push(left)

  const right = new THREE.PlaneGeometry(id, H)
  right.rotateY(-Math.PI / 2)
  right.translate(iw / 2 - eps, H / 2, 0)
  parts.push(right)

  const ceiling = new THREE.PlaneGeometry(iw, id)
  ceiling.rotateX(Math.PI / 2)
  ceiling.translate(0, H - eps, 0)
  parts.push(ceiling)

  return mergeGeometries(parts, false)
}

export const PEDESTAL = { height: 1.05, top: 0.46, base: 0.5 }

/**
 * Where the display plinths stand.
 *
 * A shallow arc with the ends stepped forward, so every robot is visible from
 * the doorway at once and none is hidden behind another. A straight row would
 * hide the far ones; a deep arc would push the end ones into the walls.
 */
export const pedestalLayout = (count) =>
  Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2
    return { x: t * 3.0, z: -3.2 + Math.abs(t) * 1.4 }
  })

/** One tapered plinth, plus a darker cap the robot stands on. */
export const makePedestal = () => {
  const { height: h, top, base } = PEDESTAL
  const g = new THREE.CylinderGeometry(top / 2, base / 2, h, 4, 1)
  g.rotateY(Math.PI / 4)
  g.translate(0, h / 2, 0)
  return g
}

export const makePedestalCap = () => {
  const { height: h, top } = PEDESTAL
  return box(top + 0.07, 0.045, top + 0.07, 0, h + 0.02, 0)
}

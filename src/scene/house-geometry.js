import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * The studio: a small pitched-roof cottage you can walk into.
 *
 * Built from boxes rather than an imported model, so it stays consistent with
 * the rest of the scene's hand-made look and needs no asset pipeline. The ridge
 * runs front-to-back so the front gable sits directly above the door, which
 * gives the entrance a clear focal point from across the meadow.
 */

export const HOUSE_DIMS = {
  width: 7,
  depth: 9,
  wallHeight: 3.6,
  thickness: 0.28,
  doorWidth: 1.7,
  doorHeight: 2.5,
  roofRise: 2.2,
  overhang: 0.55,
}

const box = (w, h, d, x, y, z) => {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

/** Four walls with a doorway cut into the front (+Z) face. */
export const makeWalls = () => {
  const { width: W, depth: D, wallHeight: H, thickness: t, doorWidth: dW, doorHeight: dH } =
    HOUSE_DIMS

  const halfW = W / 2
  const halfD = D / 2
  const panelW = (W - dW) / 2
  const panelX = dW / 2 + panelW / 2

  return mergeGeometries(
    [
      // Back wall (solid) and the two side walls.
      box(W, H, t, 0, H / 2, -halfD + t / 2),
      box(t, H, D - t * 2, -halfW + t / 2, H / 2, 0),
      box(t, H, D - t * 2, halfW - t / 2, H / 2, 0),

      // Front wall in three pieces, leaving the doorway open.
      box(panelW, H, t, -panelX, H / 2, halfD - t / 2),
      box(panelW, H, t, panelX, H / 2, halfD - t / 2),
      box(dW, H - dH, t, 0, dH + (H - dH) / 2, halfD - t / 2),
    ],
    false,
  )
}

/**
 * Stone plinth.
 *
 * Extends well below the floor so the uneven terrain cannot poke through the
 * building — cheaper and more reliable than flattening the height field.
 */
export const makePlinth = () => {
  const { width: W, depth: D } = HOUSE_DIMS
  // Deep enough to bridge the drop from the footprint's high point (where the
  // floor sits) down to its lowest corner, with room to spare.
  return box(W + 0.7, 5.0, D + 0.7, 0, -2.4, 0)
}

/** Interior floorboards. */
export const makeFloor = () => {
  const { width: W, depth: D, thickness: t } = HOUSE_DIMS
  return box(W - t * 2, 0.16, D - t * 2, 0, 0.08, 0)
}

/** Two pitched slabs plus the gable infill at each end. */
export const makeRoof = () => {
  const { width: W, depth: D, wallHeight: H, roofRise: rise, overhang: o } = HOUSE_DIMS

  const run = W / 2 + o
  const drop = 0.1
  const slabLength = Math.hypot(run, rise + drop)
  const angle = Math.atan2(rise + drop, run)
  const slabDepth = D + o * 2
  const slabThickness = 0.24

  const parts = []

  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(slabLength, slabThickness, slabDepth)
    // Tilt so the ridge end is high and the eave end low, then slide the slab
    // into place along its own centre line.
    g.rotateZ(side * angle)
    g.translate((side * -run) / 2, H + (rise - drop) / 2 + 0.35, 0)
    parts.push(g)
  }

  // Gable triangles close the ends under the ridge.
  const shape = new THREE.Shape()
  shape.moveTo(-W / 2, 0)
  shape.lineTo(W / 2, 0)
  shape.lineTo(0, rise)
  shape.closePath()

  for (const side of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: false })
    g.translate(0, H, side * (D / 2) - (side > 0 ? 0 : 0.26))
    parts.push(g)
  }

  // BoxGeometry is indexed and ExtrudeGeometry is not; mergeGeometries needs
  // them uniform or it silently returns null. Flatten everything to
  // non-indexed and strip UVs, which none of these materials sample.
  return mergeGeometries(
    parts.map((p) => {
      const flat = p.index ? p.toNonIndexed() : p
      flat.deleteAttribute('uv')
      return flat
    }),
    false,
  )
}

/**
 * Interior liner: the inward-facing surfaces the artwork hangs on.
 *
 * Separate from the wall shell so the inside can carry its own warm, mostly
 * sun-independent lighting. Relying on the wall boxes' inner faces would leave
 * the room almost black, since the sun is outside and behind.
 */
export const makeInteriorLiner = () => {
  const { width: W, depth: D, wallHeight: H, thickness: t } = HOUSE_DIMS

  const iw = W - t * 2
  const id = D - t * 2
  const eps = 0.012

  const parts = []

  // Back wall.
  const back = new THREE.PlaneGeometry(iw, H)
  back.translate(0, H / 2, -id / 2 + eps)
  parts.push(back)

  // Side walls, rotated to face inward.
  const left = new THREE.PlaneGeometry(id, H)
  left.rotateY(Math.PI / 2)
  left.translate(-iw / 2 + eps, H / 2, 0)
  parts.push(left)

  const right = new THREE.PlaneGeometry(id, H)
  right.rotateY(-Math.PI / 2)
  right.translate(iw / 2 - eps, H / 2, 0)
  parts.push(right)

  // Ceiling.
  const ceiling = new THREE.PlaneGeometry(iw, id)
  ceiling.rotateX(Math.PI / 2)
  ceiling.translate(0, H - eps, 0)
  parts.push(ceiling)

  return mergeGeometries(parts, false)
}

/** Door frame and a couple of exposed beams, for the timber material. */
export const makeTimber = () => {
  const { width: W, depth: D, wallHeight: H, doorWidth: dW, doorHeight: dH, roofRise: rise } =
    HOUSE_DIMS

  const halfD = D / 2
  const jamb = 0.16

  const parts = [
    // Door jambs and head.
    box(jamb, dH + jamb, 0.42, -dW / 2 - jamb / 2, (dH + jamb) / 2, halfD - 0.1),
    box(jamb, dH + jamb, 0.42, dW / 2 + jamb / 2, (dH + jamb) / 2, halfD - 0.1),
    box(dW + jamb * 2, jamb, 0.42, 0, dH + jamb / 2, halfD - 0.1),

    // Ridge beam, poking out past each gable.
    box(0.22, 0.26, D + 1.6, 0, H + rise - 0.1, 0),
  ]

  // A low bench either side of the door, so the entrance reads as lived-in.
  parts.push(box(1.5, 0.16, 0.5, -W / 2 + 1.1, 0.62, halfD + 0.45))
  parts.push(box(0.14, 0.62, 0.4, -W / 2 + 0.5, 0.31, halfD + 0.45))
  parts.push(box(0.14, 0.62, 0.4, -W / 2 + 1.7, 0.31, halfD + 0.45))

  return mergeGeometries(parts, false)
}

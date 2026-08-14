import * as THREE from 'three'
import { terrainHeight } from './heightfield'

/**
 * Shared placement maths for anything that sits on the meadow as a building.
 *
 * Two things every building needs and neither should re-derive:
 *
 *  - A floor level sampled across the *whole* footprint. The ground rolls by up
 *    to a metre over a 10m building, so seating a floor at the centre height
 *    lets the terrain push through the floorboards at the corners.
 *  - A footprint test, so scattered grass and flowers can be culled from
 *    underneath rather than growing up through the floor.
 */

/**
 * @param {object} options
 * @param {number[]} options.position  World [x, z].
 * @param {number}   options.rotation  Yaw in radians.
 * @param {number}   options.halfWidth  Half-extent to keep clear, local X.
 * @param {number}   options.halfDepth  Half-extent to keep clear, local Z.
 * @param {number}   options.lift       Height above the footprint's high point.
 */
export const makeBuildingTransform = ({
  position: [x, z],
  rotation,
  halfWidth,
  halfDepth,
  lift = 0.22,
}) => {
  // Sample on a grid covering the clearance area, and take the peak.
  let peak = -Infinity
  const stepX = halfWidth / 5
  const stepZ = halfDepth / 6
  for (let i = -5; i <= 5; i++) {
    for (let j = -6; j <= 6; j++) {
      peak = Math.max(peak, terrainHeight(x + i * stepX, z + j * stepZ))
    }
  }

  const origin = new THREE.Vector3(x, peak + lift, z)
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  /** Local space -> world space. */
  const toWorld = (lx, ly, lz, target = new THREE.Vector3()) =>
    target.set(
      origin.x + lx * cos + lz * sin,
      origin.y + ly,
      origin.z - lx * sin + lz * cos,
    )

  /** Is this world XZ inside the footprint? */
  const isInside = (wx, wz) => {
    const dx = wx - origin.x
    const dz = wz - origin.z
    const localX = dx * cos - dz * sin
    const localZ = dx * sin + dz * cos
    return Math.abs(localX) < halfWidth && Math.abs(localZ) < halfDepth
  }

  return { origin, yaw: rotation, toWorld, isInside, halfWidth, halfDepth }
}

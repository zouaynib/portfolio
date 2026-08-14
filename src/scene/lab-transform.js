import { LAB } from '../data/content'
import { makeBuildingTransform } from './building-transform'

/** The lab's placement in the world. Mirrors house-transform. */

/** Footprint to keep clear of grass — covers the terrace and roof overhang. */
export const LAB_CLEARANCE = { halfWidth: 6.4, halfDepth: 5.0 }

const transform = makeBuildingTransform({
  position: LAB.position,
  rotation: LAB.rotation,
  halfWidth: LAB_CLEARANCE.halfWidth,
  halfDepth: LAB_CLEARANCE.halfDepth,
})

export const LAB_ORIGIN = transform.origin
export const LAB_YAW = transform.yaw
export const labToWorld = transform.toWorld

/** Is this world XZ inside the lab's footprint? */
export const isInsideLab = (x, z) => transform.isInside(x, z)

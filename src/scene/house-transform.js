import { HOUSE } from '../data/content'
import { makeBuildingTransform } from './building-transform'

/**
 * The studio's placement in the world.
 *
 * Shared by the house mesh, the artwork on its walls and the camera rig, so
 * "just inside the door" means the same point to all three.
 */

/** Footprint to keep clear of grass — covers the plinth and the roof overhang. */
export const HOUSE_CLEARANCE = { halfWidth: 4.2, halfDepth: 5.2 }

const transform = makeBuildingTransform({
  position: HOUSE.position,
  rotation: HOUSE.rotation,
  halfWidth: HOUSE_CLEARANCE.halfWidth,
  halfDepth: HOUSE_CLEARANCE.halfDepth,
})

export const HOUSE_ORIGIN = transform.origin
export const HOUSE_YAW = transform.yaw
export const houseToWorld = transform.toWorld

/** Is this world XZ inside the studio's footprint? */
export const isInsideHouse = (x, z) => transform.isInside(x, z)

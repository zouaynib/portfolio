import * as THREE from 'three'
import { fbm3 } from './tree-geometry'

/**
 * Weathered marker stone.
 *
 * Standing stones sunk into the grass are the navigation, instead of signposts
 * with labels painted on them. They belong to the landscape, so the meadow
 * stays a place rather than becoming a menu with a garden texture.
 */
export const makeStone = (seed, size) => {
  // Detail 2, not 3. Combined with flat shading below this yields broad
  // planar faces — stone fractures along planes, and a finely-subdivided
  // smooth surface reads as an egg or a potato instead of as rock.
  const geo = new THREE.IcosahedronGeometry(size, 2)
  const pos = geo.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const len = Math.hypot(x, y, z) || 1

    // Strong low-frequency displacement carves the overall block; the finer
    // octave chips the edges.
    const block = fbm3(x * 0.42 + seed * 3.7, y * 0.42, z * 0.42 + seed * 1.9, 2)
    const chip = fbm3(x * 1.6 + seed, y * 1.6, z * 1.6, 2)
    const disp = 1 + (block - 0.5) * 0.95 + (chip - 0.5) * 0.3

    // Taller than wide, and leaning — a symmetric upright stone looks placed
    // by a level rather than weathered in situ.
    const nx = (x / len) * size * disp * 0.68
    const ny = (y / len) * size * disp * 1.45
    const nz = (z / len) * size * disp * 0.6

    pos.setXYZ(i, nx + ny * 0.15, ny, nz - ny * 0.08)
  }

  pos.needsUpdate = true

  // Flat shading: each triangle needs its own vertices so it gets a single
  // face normal, which is what produces crisp facets. IcosahedronGeometry is
  // already non-indexed, so recomputing normals in place is enough — calling
  // toNonIndexed() here only emits a warning.
  geo.computeVertexNormals()

  // Bake upward-facing-ness for the moss mask.
  const normal = geo.attributes.normal
  const up = new Float32Array(normal.count)
  for (let i = 0; i < normal.count; i++) up[i] = normal.getY(i)
  geo.setAttribute('aUp', new THREE.BufferAttribute(up, 1))
  geo.deleteAttribute('uv')

  return geo
}

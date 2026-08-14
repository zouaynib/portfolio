import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Procedural tree geometry.
 *
 * The goal is silhouette. A sphere on a cylinder reads as a primitive no matter
 * how it is lit, so canopies here are built from several overlapping blobs whose
 * surfaces are pushed around by 3D noise — the resulting outline is lumpy and
 * asymmetric, which is what makes a tree read as a tree.
 */

const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123
  return s - Math.floor(s)
}

const smooth = (t) => t * t * (3 - 2 * t)

const noise3 = (x, y, z) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi

  const u = smooth(xf)
  const v = smooth(yf)
  const w = smooth(zf)

  const lerp = (a, b, t) => a + (b - a) * t

  const c000 = hash3(xi, yi, zi)
  const c100 = hash3(xi + 1, yi, zi)
  const c010 = hash3(xi, yi + 1, zi)
  const c110 = hash3(xi + 1, yi + 1, zi)
  const c001 = hash3(xi, yi, zi + 1)
  const c101 = hash3(xi + 1, yi, zi + 1)
  const c011 = hash3(xi, yi + 1, zi + 1)
  const c111 = hash3(xi + 1, yi + 1, zi + 1)

  return lerp(
    lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
    lerp(lerp(c001, c101, u), lerp(c011, c111, u), v),
    w,
  )
}

const fbm3 = (x, y, z, octaves = 3) => {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += amp * noise3(x * freq, y * freq, z * freq)
    freq *= 2.11
    amp *= 0.5
  }
  return value
}

export { noise3, fbm3 }

/** Deterministic PRNG so a given seed always grows the same tree. */
const makeRng = (seed) => {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * Tapered tube swept along a curve, with bark irregularity.
 * Trunks lean and bend; a perfectly vertical cylinder is the giveaway.
 */
const makeTaperedTube = (curve, baseRadius, tipRadius, rings, radial, rng) => {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []

  const frames = curve.computeFrenetFrames(rings, false)

  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    const point = curve.getPointAt(t)
    const normal = frames.normals[i]
    const binormal = frames.binormals[i]

    // Radius tapers with a slight flare at the base (root buttress).
    const flare = 1 + Math.pow(1 - t, 4) * 0.85
    const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, t ** 0.75) * flare

    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2
      const sin = Math.sin(v)
      const cos = Math.cos(v)

      const nx = cos * normal.x + sin * binormal.x
      const ny = cos * normal.y + sin * binormal.y
      const nz = cos * normal.z + sin * binormal.z

      // Bark ripples, stronger toward the base.
      const bump =
        1 + (fbm3(nx * 2.5 + t * 6, ny * 2.5, nz * 2.5 + i * 0.4) - 0.5) * 0.28 * (1 - t * 0.6)
      const r = radius * bump

      positions.push(point.x + nx * r, point.y + ny * r, point.z + nz * r)
      normals.push(nx, ny, nz)
      uvs.push(j / radial, t)
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j
      const b = a + radial + 1
      indices.push(a, b, a + 1)
      indices.push(b, b + 1, a + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

/** Trunk plus a few limbs reaching up into the canopy. */
export const makeTrunk = (seed, height, radius) => {
  const rng = makeRng(seed)
  const parts = []

  const lean = (rng() - 0.5) * 0.5
  const leanZ = (rng() - 0.5) * 0.5

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.3, height * 0.3, leanZ * 0.3),
    new THREE.Vector3(lean * 0.8, height * 0.62, leanZ * 0.8),
    new THREE.Vector3(lean * 1.3, height, leanZ * 1.3),
  ])

  parts.push(makeTaperedTube(trunkCurve, radius, radius * 0.34, 14, 9, rng))

  const limbCount = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < limbCount; i++) {
    const t = 0.55 + rng() * 0.35
    const start = trunkCurve.getPointAt(t)
    const angle = (i / limbCount) * Math.PI * 2 + rng() * 1.2
    const reach = height * (0.26 + rng() * 0.22)
    const rise = height * (0.16 + rng() * 0.16)

    const limbCurve = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(
        start.x + Math.cos(angle) * reach * 0.45,
        start.y + rise * 0.55,
        start.z + Math.sin(angle) * reach * 0.45,
      ),
      new THREE.Vector3(
        start.x + Math.cos(angle) * reach,
        start.y + rise,
        start.z + Math.sin(angle) * reach,
      ),
    ])

    parts.push(makeTaperedTube(limbCurve, radius * 0.3, radius * 0.08, 8, 6, rng))
  }

  return mergeGeometries(parts, false)
}

/**
 * Canopy: overlapping noise-displaced blobs.
 *
 * `aCanopyH` (0 at the underside, 1 at the crown) drives both the colour
 * gradient and how much each vertex is thrown by the wind.
 */
export const makeCanopy = (seed, height, spread) => {
  const rng = makeRng(seed + 977)
  const blobs = []

  const blobCount = 6 + Math.floor(rng() * 4)
  const centers = []

  for (let i = 0; i < blobCount; i++) {
    // Blobs cluster into a tall, billowing crown. Pushing the outer blobs
    // steeply downward (or flattening the whole cluster) produces a mushroom
    // cap — the silhouette needs vertical spread and uneven radii to read as
    // foliage rather than as a single domed volume.
    const a = (i / blobCount) * Math.PI * 2 + rng() * 0.9
    const rad = spread * (0.12 + rng() * 0.58)
    const cx = Math.cos(a) * rad
    const cz = Math.sin(a) * rad
    const cy = height + (rng() - 0.22) * spread * 0.95 - (rad / spread) * spread * 0.14

    const r = spread * (0.3 + rng() * 0.42)
    centers.push({ cx, cy, cz, r })
  }

  // A big central mass so the blobs read as one crown rather than a bunch of balls.
  centers.push({ cx: 0, cy: height + spread * 0.3, cz: 0, r: spread * 0.62 })

  let minY = Infinity
  let maxY = -Infinity
  centers.forEach(({ cy, r }) => {
    minY = Math.min(minY, cy - r)
    maxY = Math.max(maxY, cy + r)
  })

  centers.forEach(({ cx, cy, cz, r }, idx) => {
    const geo = new THREE.IcosahedronGeometry(r, 3)
    const pos = geo.attributes.position
    const canopyH = new Float32Array(pos.count)
    const blobId = new Float32Array(pos.count)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const len = Math.hypot(x, y, z) || 1

      // Large-scale lumps plus finer detail, offset per blob so neighbouring
      // blobs never deform identically.
      const big = fbm3(x * 0.09 + idx * 13.3, y * 0.09, z * 0.09 + idx * 7.1, 2)
      const small = fbm3(x * 0.34 + idx * 5.5, y * 0.34, z * 0.34, 3)
      const disp = 1 + (big - 0.5) * 0.55 + (small - 0.5) * 0.22

      // Flatten the underside — foliage mass sits on top of the branches.
      const squash = y < 0 ? 1 + (y / r) * 0.28 : 1

      const nx = (x / len) * r * disp * squash
      const ny = (y / len) * r * disp * squash * 0.97
      const nz = (z / len) * r * disp * squash

      pos.setXYZ(i, nx + cx, ny + cy, nz + cz)
      canopyH[i] = THREE.MathUtils.clamp((ny + cy - minY) / (maxY - minY), 0, 1)
      blobId[i] = idx / centers.length
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
    geo.setAttribute('aCanopyH', new THREE.BufferAttribute(canopyH, 1))
    geo.setAttribute('aBlobId', new THREE.BufferAttribute(blobId, 1))
    geo.deleteAttribute('uv')
    blobs.push(geo)
  })

  return mergeGeometries(blobs, false)
}

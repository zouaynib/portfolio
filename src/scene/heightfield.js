/**
 * Terrain height field.
 *
 * This is the single source of truth for ground elevation. The terrain mesh is
 * displaced with it on the CPU, and every scattered object (grass, flowers,
 * trees) samples the same function, so nothing ever floats or sinks.
 */

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

const smooth = (t) => t * t * (3 - 2 * t)

/** Value noise in [0,1]. */
const noise2 = (x, z) => {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const xf = x - xi
  const zf = z - zi

  const a = hash(xi, zi)
  const b = hash(xi + 1, zi)
  const c = hash(xi, zi + 1)
  const d = hash(xi + 1, zi + 1)

  const u = smooth(xf)
  const v = smooth(zf)

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

/** Fractal brownian motion — layered noise for natural-looking relief. */
const fbm = (x, z, octaves = 4) => {
  let value = 0
  let amplitude = 0.5
  let frequency = 1

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2(x * frequency, z * frequency)
    frequency *= 2.07
    amplitude *= 0.5
  }
  return value
}

/**
 * Ground elevation at a world position.
 *
 * Deliberately gentle: broad rolling swells rather than hills, so the horizon
 * stays soft and the camera can sit low in the grass without the ground
 * clipping through frame.
 */
export const terrainHeight = (x, z) => {
  const broad = fbm(x * 0.012, z * 0.012, 3) * 9.0
  const medium = fbm(x * 0.045 + 31.4, z * 0.045 + 17.2, 3) * 1.6
  const fine = noise2(x * 0.15, z * 0.15) * 0.25

  // Sink a shallow bowl around the origin so the opening camera sits nestled
  // in the meadow with grass rising on the horizon line.
  const d = Math.sqrt(x * x + z * z)
  const bowl = -1.8 * Math.exp(-(d * d) / 900)

  return broad + medium + fine + bowl
}

/** Approximate surface normal via finite differences. */
export const terrainNormal = (x, z, eps = 0.75) => {
  const hL = terrainHeight(x - eps, z)
  const hR = terrainHeight(x + eps, z)
  const hD = terrainHeight(x, z - eps)
  const hU = terrainHeight(x, z + eps)

  const nx = hL - hR
  const nz = hD - hU
  const ny = 2 * eps
  const len = Math.hypot(nx, ny, nz)

  return [nx / len, ny / len, nz / len]
}

/** Steepness in [0,1]; used to keep grass and flowers off the steepest faces. */
export const terrainSlope = (x, z) => 1 - terrainNormal(x, z)[1]

export { noise2, fbm }

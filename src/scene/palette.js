import * as THREE from 'three'

/**
 * Art direction constants.
 *
 * Everything visual reads from here. Golden hour, sun low and slightly behind
 * the meadow so foliage is rim-lit and the grass glows translucent when you
 * look toward it.
 */

const c = (hex) => new THREE.Color(hex).convertSRGBToLinear()

// Sun sits low (about 20 degrees) and to the north-west of the origin. Lower
// than this and the whole meadow flattens into orange silhouette.
export const SUN_POSITION = new THREE.Vector3(-120, 58, -95)
export const SUN_DIRECTION = SUN_POSITION.clone().normalize()

export const PALETTE = {
  // --- light ---
  sun: c('#ffd9a0'),
  sunCore: c('#fff2d4'),
  sky: c('#bcd9e8'),
  bounce: c('#a8c47a'),

  // --- sky dome, horizon to zenith ---
  skyZenith: c('#5fa8d3'),
  skyMid: c('#a9d3e6'),
  skyHorizon: c('#f6e3c0'),
  skyGlow: c('#ffcf8e'),
  cloud: c('#fffaf0'),
  cloudShadow: c('#c9d8e6'),

  // --- grass, root to tip ---
  grassRoot: c('#2f4f21'),
  grassMid: c('#5c8a34'),
  grassTip: c('#a8c85a'),
  grassDry: c('#d4c46a'),

  // --- ground ---
  // Green, not brown. Grass geometry can never be dense enough to hide the
  // ground completely, so the ground itself has to read as more grass — this
  // is what stops gaps between blades looking like bare dirt.
  soil: c('#41652a'),
  soilFar: c('#8fae66'),

  // --- foliage ---
  leafDark: c('#274a24'),
  leafMid: c('#3f7233'),
  leafLight: c('#7fae45'),
  bark: c('#5b432c'),
  barkLight: c('#8a6b48'),

  // --- atmosphere ---
  fog: c('#cfe0e2'),
  dust: c('#ffe9c2'),
}

export const FOG = {
  color: PALETTE.fog,
  // Held well back: fog starting close washes the mid-ground out and kills
  // the sense that the meadow is large.
  near: 95,
  far: 520,
}

export const WIND = {
  // Blowing roughly toward the camera's default position, so gusts read as
  // moving *at* the viewer rather than sideways past them.
  direction: new THREE.Vector2(0.82, 0.57).normalize(),
  strength: 0.34,
}

export const WORLD = {
  /**
   * Grass is concentrated in a tight disc around the camera rather than spread
   * thin across the whole meadow. Blade density is what sells a field, and
   * density is count/area — spreading the same blades over 190m gives under one
   * blade per square metre, which reads as spikes on dirt. Past this radius the
   * terrain's own green plus aerial perspective carry the distance.
   */
  grassRadius: 58,
  meadowRadius: 190,
  terrainSize: 620,
  terrainSegments: 220,
}

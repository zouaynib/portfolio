import * as THREE from 'three'
import { PALETTE, SUN_DIRECTION, WIND } from './palette'

/**
 * Singleton uniform objects shared by every wind- and light-aware material.
 *
 * These are the *same object references* across all materials, so advancing
 * `time.value` once per frame keeps the entire meadow in phase. Handing each
 * material its own clock is how you end up with grass and trees blowing out of
 * sync, which instantly breaks the illusion.
 */
export const shared = {
  time: { value: 0 },
  windDir: { value: WIND.direction.clone() },
  windStrength: { value: WIND.strength },
  sunDir: { value: SUN_DIRECTION.clone() },
  sunColor: { value: PALETTE.sun.clone() },
  skyColor: { value: PALETTE.sky.clone() },
  bounceColor: { value: PALETTE.bounce.clone() },
}

/** Uniform block to spread into any material using the shared wind/light chunks. */
export const windLightUniforms = () => ({
  uTime: shared.time,
  uWindDir: shared.windDir,
  uWindStrength: shared.windStrength,
  uSunDir: shared.sunDir,
  uSunColor: shared.sunColor,
  uSkyColor: shared.skyColor,
  uBounceColor: shared.bounceColor,
})

/**
 * Merge fog + shared wind/light + custom uniforms into one block.
 *
 * Fog uniforms are cloned per material (the renderer writes into them), while
 * wind and light uniforms are intentionally shared by reference.
 */
export const buildUniforms = (custom = {}) =>
  Object.assign(
    THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    windLightUniforms(),
    custom,
  )

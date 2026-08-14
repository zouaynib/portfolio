import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect } from 'react'

import Sky from './Sky'
import Terrain from './Terrain'
import Grass from './Grass'
import Flowers from './Flowers'
import Trees from './Trees'
import GroundShadows from './GroundShadows'
import DustMotes from './DustMotes'
import Hotspots from './Hotspots'
import House from './House'
import Lab from './Lab'
import CameraRig from './CameraRig'
import Effects from './Effects'

import { shared } from './uniforms'
import { FOG, WORLD } from './palette'

/**
 * Detail tier.
 *
 * The full blade count is comfortable on a desktop GPU and miserable on a
 * phone. Decided once at module load from coarse-pointer + core-count hints —
 * good enough, and avoids a mid-session quality pop.
 */
const isHandheld =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(pointer: coarse)').matches &&
  Math.min(window.screen?.width ?? 9999, window.screen?.height ?? 9999) < 900

// The reduced tier shrinks the *radius* alongside the count. Cutting blades
// without cutting area just thins the meadow into bare ground — density, not
// count, is what makes grass read as grass, so both tiers hold ~20 blades/m².
const DETAIL = isHandheld
  // Radius must still clear the marker arc (36) or the stones stand on bare
  // ground, so the count is set from that radius at matching density.
  ? { grass: 100000, flowers: 6500, radius: 40 }
  : { grass: 220000, flowers: 14000, radius: WORLD.grassRadius }

/** Advances the single shared clock every material reads from. */
function Clock() {
  useFrame((_, delta) => {
    // Clamp so a backgrounded tab does not jump the wind on return.
    shared.time.value += Math.min(delta, 0.05)
  })
  return null
}

export default function Garden() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(FOG.color, FOG.near, FOG.far)
    return () => {
      scene.fog = null
    }
  }, [scene])

  return (
    <>
      <Clock />
      <CameraRig />

      <Sky />
      <Terrain />
      <GroundShadows />
      <Grass count={DETAIL.grass} radius={DETAIL.radius} />
      <Flowers count={DETAIL.flowers} radius={DETAIL.radius} />
      <Trees />
      <House />
      <Lab />
      <DustMotes />
      <Hotspots />

      <Effects />
    </>
  )
}

import { useMemo } from 'react'
import * as THREE from 'three'

import { terrainHeight } from './heightfield'
import { PALETTE, SUN_DIRECTION } from './palette'
import { TREE_LAYOUT } from './Trees'
import { SECTIONS } from '../data/content'

/**
 * Painterly contact shadows.
 *
 * The scene's materials are custom shaders that never sample a shadow map, so
 * rather than wiring up real shadows this places soft pooled darkness under each
 * object. It is what hand-painted backgrounds do anyway — a soft blot that
 * anchors the object — and it costs one transparent disc per tree.
 *
 * Discs are displaced to follow the terrain so they never slice into a slope.
 */

const SEGMENTS = 24
const RINGS = 5

const vertexShader = /* glsl */ `
  varying vec2 vLocal;

  #include <fog_pars_vertex>

  void main() {
    vLocal = position.xz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRadius;

  varying vec2 vLocal;

  #include <fog_pars_fragment>

  void main() {
    // Soft radial falloff, denser in the middle than a linear ramp.
    float d = length(vLocal) / uRadius;
    float a = 1.0 - smoothstep(0.15, 1.0, d);
    a = pow(a, 1.6) * 0.42;
    if (a < 0.005) discard;

    gl_FragColor = vec4(uColor, a);

    #include <fog_fragment>
  }
`

/** Elliptical disc, stretched away from the sun and following the ground. */
const makeShadowGeometry = (cx, cz, radius) => {
  const positions = []
  const indices = []

  // Shadows stretch away from a low sun rather than sitting circular.
  const stretch = 1.9
  const dirX = -SUN_DIRECTION.x
  const dirZ = -SUN_DIRECTION.z
  const len = Math.hypot(dirX, dirZ) || 1
  const ux = dirX / len
  const uz = dirZ / len

  // All heights are relative to the disc's own origin, which the mesh places.
  positions.push(0, 0.06, 0)

  for (let r = 1; r <= RINGS; r++) {
    const rr = (r / RINGS) * radius
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2
      let lx = Math.cos(a) * rr
      let lz = Math.sin(a) * rr

      // Stretch along the sun-away axis.
      const along = lx * ux + lz * uz
      lx += ux * along * (stretch - 1)
      lz += uz * along * (stretch - 1)

      const y = terrainHeight(cx + lx, cz + lz) - terrainHeight(cx, cz)
      positions.push(lx, y + 0.06, lz)
    }
  }

  for (let s = 0; s < SEGMENTS; s++) {
    indices.push(0, 1 + s, 1 + ((s + 1) % SEGMENTS))
  }
  for (let r = 0; r < RINGS - 1; r++) {
    const base = 1 + r * SEGMENTS
    const next = base + SEGMENTS
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS
      indices.push(base + s, next + s, base + s1)
      indices.push(base + s1, next + s, next + s1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  return geo
}

const shadowColor = () => PALETTE.grassRoot.clone().multiplyScalar(0.5)

export default function GroundShadows() {
  const blobs = useMemo(() => {
    const list = [
      ...TREE_LAYOUT.map((t) => ({
        key: `tree-${t.x}-${t.z}`,
        x: t.x,
        z: t.z,
        radius: t.spread * 0.95,
      })),
      ...SECTIONS.map((s) => ({
        key: `marker-${s.id}`,
        x: s.position[0],
        z: s.position[1],
        radius: 1.9,
      })),
    ]

    // Geometry and material are built once per blob. Cloning a material during
    // render would allocate a fresh GPU program every frame.
    return list.map((b) => ({
      ...b,
      geometry: makeShadowGeometry(b.x, b.z, b.radius),
      material: new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uColor: { value: shadowColor() },
          uRadius: { value: b.radius },
        },
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    }))
  }, [])

  return (
    <group>
      {blobs.map((b) => (
        <mesh
          key={b.key}
          geometry={b.geometry}
          material={b.material}
          position={[b.x, terrainHeight(b.x, b.z), b.z]}
          renderOrder={1}
        />
      ))}
    </group>
  )
}

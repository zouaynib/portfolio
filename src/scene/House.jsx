import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

import { glslNoise, glslPainterlyLight } from '../shaders/common'
import { makeInteriorMaterial } from '../shaders/interior'
import { buildUniforms } from './uniforms'
import { HOUSE_ORIGIN, HOUSE_YAW } from './house-transform'
import {
  HOUSE_DIMS,
  makeWalls,
  makeRoof,
  makePlinth,
  makeFloor,
  makeInteriorLiner,
  makeTimber,
} from './house-geometry'
import Artworks from './Artworks'
import { useStore } from '../state/store'

const c = (hex) => new THREE.Color(hex).convertSRGBToLinear()

/* ------------------------------------------------------------------ *
 * Exterior: plaster, roof tile and timber all share this shader, and
 * differ only by colour and how much grain they show.
 * ------------------------------------------------------------------ */

const exteriorVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_vertex>

  void main() {
    vLocalPos = position;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const exteriorFragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTint;
  uniform float uGrainScale;
  uniform float uStreak;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_fragment>

  ${glslNoise}
  ${glslPainterlyLight}

  void main() {
    // Plaster mottling. The streak term is what gives roof tiles their
    // directional banding without needing a texture.
    float grain = fbm2(vLocalPos.xz * uGrainScale + vLocalPos.y * uGrainScale * 0.6);
    float streak = noise2(vec2(vLocalPos.z * 5.0, vLocalPos.y * 1.2));

    vec3 albedo = mix(uBase, uTint, smoothstep(0.3, 0.75, grain));
    albedo = mix(albedo, uTint, streak * uStreak);

    // Weathering: slightly dirtier toward the ground.
    albedo *= mix(0.82, 1.03, smoothstep(-0.5, 2.4, vLocalPos.y));

    vec3 color = painterlyLight(normalize(vNormal), vViewDir, albedo, 0.12);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

/* ------------------------------------------------------------------ *
 * Interior: deliberately NOT lit by the sun.
 *
 * The sun is outside and behind the building, so a physically-consistent
 * interior would be near black. This uses a warm constant fill that falls off
 * with height and brightens toward the doorway, which reads as daylight
 * spilling in and keeps the artwork legible.
 * ------------------------------------------------------------------ */

const makeExteriorMaterial = (base, tint, grainScale, streak) =>
  new THREE.ShaderMaterial({
    vertexShader: exteriorVertex,
    fragmentShader: exteriorFragment,
    uniforms: buildUniforms({
      uBase: { value: c(base) },
      uTint: { value: c(tint) },
      uGrainScale: { value: grainScale },
      uStreak: { value: streak },
    }),
    fog: true,
  })

export default function House() {
  const doorRef = useRef()

  const inside = useStore((s) => s.active === 'gallery')
  const hovered = useStore((s) => s.hovered === 'gallery')
  const setHovered = useStore((s) => s.setHovered)
  const open = useStore((s) => s.open)

  const parts = useMemo(() => {
    const plaster = makeExteriorMaterial('#d9cdb4', '#f0e7d2', 1.6, 0.06)
    const roof = makeExteriorMaterial('#7d5344', '#9c6b53', 0.9, 0.35)
    const timber = makeExteriorMaterial('#5b432c', '#7d5f3f', 3.0, 0.2)
    const stone = makeExteriorMaterial('#6f6a60', '#8e887a', 2.0, 0.1)

    const warmRoom = {
      shadow: [0.62, 0.55, 0.46],
      opening: [1.18, 1.08, 0.93],
      openingZ: HOUSE_DIMS.depth / 2,
      ceiling: HOUSE_DIMS.wallHeight,
    }

    const interior = makeInteriorMaterial({
      ...warmRoom,
      wall: c('#e6dcc6'),
      tint: c('#fff0d2'),
      side: THREE.DoubleSide,
    })

    const floor = makeInteriorMaterial({
      ...warmRoom,
      wall: c('#8a6a44'),
      tint: c('#c9a271'),
    })

    return {
      walls: { geometry: makeWalls(), material: plaster },
      roof: { geometry: makeRoof(), material: roof },
      plinth: { geometry: makePlinth(), material: stone },
      timber: { geometry: makeTimber(), material: timber },
      liner: { geometry: makeInteriorLiner(), material: interior },
      floor: { geometry: makeFloor(), material: floor },
    }
  }, [])

  // Invisible slab across the doorway: the click target for going inside.
  // Using the door opening itself means the hit area matches what it looks
  // like you should click.
  useFrame(() => {
    if (doorRef.current) doorRef.current.visible = false
  })

  const showLabel = hovered && !inside

  return (
    <group position={HOUSE_ORIGIN} rotation={[0, HOUSE_YAW, 0]}>
      <mesh geometry={parts.plinth.geometry} material={parts.plinth.material} />
      <mesh geometry={parts.walls.geometry} material={parts.walls.material} />
      <mesh geometry={parts.roof.geometry} material={parts.roof.material} />
      <mesh geometry={parts.timber.geometry} material={parts.timber.material} />
      <mesh geometry={parts.liner.geometry} material={parts.liner.material} />
      <mesh geometry={parts.floor.geometry} material={parts.floor.material} />

      <Artworks />

      <mesh
        ref={doorRef}
        position={[0, HOUSE_DIMS.doorHeight / 2, HOUSE_DIMS.depth / 2 - 0.05]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered('gallery')
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          open('gallery')
        }}
      >
        <boxGeometry args={[HOUSE_DIMS.doorWidth, HOUSE_DIMS.doorHeight, 0.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {showLabel && (
        <Html
          center
          position={[0, HOUSE_DIMS.wallHeight + HOUSE_DIMS.roofRise + 0.9, HOUSE_DIMS.depth / 2]}
          distanceFactor={26}
          zIndexRange={[10, 0]}
        >
          <div className="marker-label">The studio</div>
        </Html>
      )}
    </group>
  )
}

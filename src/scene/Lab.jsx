import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

import { glslNoise, glslPainterlyLight } from '../shaders/common'
import { makeInteriorMaterial } from '../shaders/interior'
import { buildUniforms } from './uniforms'
import { LAB_ORIGIN, LAB_YAW } from './lab-transform'
import {
  LAB_DIMS,
  PEDESTAL,
  makeLabShell,
  makeLabRoof,
  makeLabPlinth,
  makeLabFloor,
  makeLabGlazing,
  makeLabGlass,
  makeLabLiner,
  makePedestal,
  makePedestalCap,
  pedestalLayout,
} from './lab-geometry'
import { MODELS } from '../data/models'
import { ROBOTS } from './robots/RobotModels'
import { useStore } from '../state/store'

const c = (hex) => new THREE.Color(hex).convertSRGBToLinear()

/* ------------------------------------------------------------------ *
 * Exterior concrete. Same painterly light as the rest of the meadow, so
 * the pavilion sits in the same world as the studio despite the very
 * different architecture.
 * ------------------------------------------------------------------ */

const vertexShader = /* glsl */ `
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

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTint;
  uniform float uGrainScale;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_fragment>

  ${glslNoise}
  ${glslPainterlyLight}

  void main() {
    // Fine, even mottling — poured concrete, not plaster, so the variation is
    // tighter and less blotchy than the studio's walls.
    float grain = fbm2(vLocalPos.xz * uGrainScale + vLocalPos.y * uGrainScale * 0.5);
    vec3 albedo = mix(uBase, uTint, smoothstep(0.38, 0.72, grain));

    // Slight darkening toward the base, where rain would splash it.
    albedo *= mix(0.88, 1.02, smoothstep(-0.4, 1.6, vLocalPos.y));

    vec3 color = painterlyLight(normalize(vNormal), vViewDir, albedo, 0.08);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

const makeConcrete = (base, tint, grainScale) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: buildUniforms({
      uBase: { value: c(base) },
      uTint: { value: c(tint) },
      uGrainScale: { value: grainScale },
    }),
    fog: true,
  })

/** One plinth with its robot standing on top. */
function Display({ model, position }) {
  const groupRef = useRef()

  const hovered = useStore((s) => s.hoveredModel === model.id)
  const opened = useStore((s) => s.openedModel === model.id)
  const inside = useStore((s) => s.active === 'lab')
  const setHoveredModel = useStore((s) => s.setHoveredModel)
  const openModel = useStore((s) => s.openModel)

  const Robot = ROBOTS[model.robot]

  useFrame((_, delta) => {
    if (!groupRef.current) return
    // The whole display lifts a little when it is the one being read.
    const k = 1 - Math.exp(-delta * 9)
    const target = hovered || opened ? 0.05 : 0
    groupRef.current.position.y += (target - groupRef.current.position.y) * k
  })

  const interactive = {
    onPointerOver: (e) => {
      if (!inside) return
      e.stopPropagation()
      setHoveredModel(model.id)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHoveredModel(null)
      document.body.style.cursor = 'auto'
    },
    onClick: (e) => {
      if (!inside) return
      e.stopPropagation()
      openModel(model.id)
    },
  }

  return (
    <group position={[position.x, 0, position.z]}>
      <group ref={groupRef}>
        <group position={[0, PEDESTAL.height + 0.045, 0]} {...interactive}>
          <Robot palette={model.palette} hovered={hovered || opened} />
          {/*
            An invisible pick volume around the robot. Raycasting the robot's
            own small parts makes it fiddly to click; this gives the whole
            figure one forgiving hit area.
          */}
          <mesh position={[0, 0.26, 0]} visible={false}>
            <boxGeometry args={[0.62, 0.72, 0.62]} />
          </mesh>
        </group>
      </group>

      {hovered && !opened && (
        <Html center position={[0, PEDESTAL.height + 1.05, 0]} distanceFactor={9} zIndexRange={[10, 0]}>
          <div className="marker-label marker-label--small">{model.name}</div>
        </Html>
      )}
    </group>
  )
}

export default function Lab() {
  const doorRef = useRef()

  const inside = useStore((s) => s.active === 'lab')
  const hovered = useStore((s) => s.hovered === 'lab')
  const setHovered = useStore((s) => s.setHovered)
  const open = useStore((s) => s.open)

  const parts = useMemo(() => {
    const coolRoom = {
      shadow: [0.78, 0.8, 0.86],
      opening: [1.16, 1.12, 1.04],
      openingZ: LAB_DIMS.depth / 2,
      ceiling: LAB_DIMS.height,
      grainScale: 1.4,
    }

    return {
      shell: { geometry: makeLabShell(), material: makeConcrete('#cfcbc2', '#e6e2d8', 2.4) },
      roof: { geometry: makeLabRoof(), material: makeConcrete('#b9b5ab', '#cdc9bf', 1.8) },
      plinth: { geometry: makeLabPlinth(), material: makeConcrete('#a9a59b', '#bcb8ae', 2.0) },
      glazing: { geometry: makeLabGlazing(), material: makeConcrete('#2e3238', '#3d434b', 6.0) },
      floor: {
        geometry: makeLabFloor(),
        material: makeInteriorMaterial({
          ...coolRoom,
          wall: c('#b9bcc0'),
          tint: c('#eef2f5'),
          exposure: 1.05,
        }),
      },
      liner: {
        geometry: makeLabLiner(),
        material: makeInteriorMaterial({
          ...coolRoom,
          wall: c('#eef0f2'),
          tint: c('#ffffff'),
          side: THREE.DoubleSide,
          exposure: 1.1,
        }),
      },
      glass: {
        geometry: makeLabGlass(),
        material: new THREE.MeshBasicMaterial({
          color: c('#cfe4ee'),
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      },
      pedestal: makePedestal(),
      cap: makePedestalCap(),
      pedestalMaterial: makeInteriorMaterial({
        ...coolRoom,
        wall: c('#e4e6e8'),
        tint: c('#ffffff'),
        exposure: 1.05,
      }),
      capMaterial: makeInteriorMaterial({
        ...coolRoom,
        wall: c('#5c6167'),
        tint: c('#aab2ba'),
        exposure: 1.0,
      }),
    }
  }, [])

  const layout = useMemo(() => pedestalLayout(MODELS.length), [])

  useFrame(() => {
    if (doorRef.current) doorRef.current.visible = false
  })

  return (
    <group position={LAB_ORIGIN} rotation={[0, LAB_YAW, 0]}>
      <mesh geometry={parts.plinth.geometry} material={parts.plinth.material} />
      <mesh geometry={parts.shell.geometry} material={parts.shell.material} />
      <mesh geometry={parts.roof.geometry} material={parts.roof.material} />
      <mesh geometry={parts.liner.geometry} material={parts.liner.material} />
      <mesh geometry={parts.floor.geometry} material={parts.floor.material} />
      <mesh geometry={parts.glazing.geometry} material={parts.glazing.material} />
      <mesh geometry={parts.glass.geometry} material={parts.glass.material} renderOrder={2} />

      {/*
        Interior lighting for the robots only. Everything else in the scene uses
        unlit custom shaders, so these lights touch nothing but the standard
        materials the robots are built from.
      */}
      <hemisphereLight args={['#eef4ff', '#6e7480', 2.1]} />
      <directionalLight position={[2, 6, 8]} intensity={1.5} />
      <directionalLight position={[-4, 3, -2]} intensity={0.4} />

      {layout.map((position, i) => (
        <group key={MODELS[i].id}>
          <mesh
            geometry={parts.pedestal}
            material={parts.pedestalMaterial}
            position={[position.x, 0, position.z]}
          />
          <mesh
            geometry={parts.cap}
            material={parts.capMaterial}
            position={[position.x, 0, position.z]}
          />
          <Display model={MODELS[i]} position={position} />
        </group>
      ))}

      <mesh
        ref={doorRef}
        position={[0, LAB_DIMS.doorHeight / 2, LAB_DIMS.depth / 2 - 0.05]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered('lab')
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          open('lab')
        }}
      >
        <boxGeometry args={[LAB_DIMS.doorWidth, LAB_DIMS.doorHeight, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {hovered && !inside && (
        <Html
          center
          position={[0, LAB_DIMS.height + 1.3, LAB_DIMS.depth / 2]}
          distanceFactor={26}
          zIndexRange={[10, 0]}
        >
          <div className="marker-label">The lab</div>
        </Html>
      )}
    </group>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

import { glslNoise, glslPainterlyLight } from '../shaders/common'
import { buildUniforms } from './uniforms'
import { PALETTE } from './palette'
import { terrainHeight } from './heightfield'
import { makeStone } from './stone-geometry'
import { SECTIONS } from '../data/content'
import { useStore } from '../state/store'

const c = (hex) => new THREE.Color(hex).convertSRGBToLinear()

const vertexShader = /* glsl */ `
  attribute float aUp;

  varying float vUp;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_vertex>

  void main() {
    vUp = aUp;
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
  uniform vec3 uStone;
  uniform vec3 uStoneLight;
  uniform vec3 uMoss;
  uniform float uHighlight;

  varying float vUp;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_fragment>

  ${glslNoise}
  ${glslPainterlyLight}

  void main() {
    // Two grain scales: broad banding across the face, plus fine speckle.
    float grain = fbm2(vLocalPos.xz * 1.1 + vLocalPos.y * 0.7);
    float speckle = noise2(vLocalPos.xz * 6.0 + vLocalPos.y * 4.0);
    vec3 albedo = mix(uStone, uStoneLight, smoothstep(0.3, 0.72, grain));
    albedo *= mix(0.9, 1.08, speckle);

    // Moss gathers on upward faces and creeps up from the grass line.
    float moss = smoothstep(0.15, 0.65, vUp) * smoothstep(0.25, 0.7, grain);
    moss += smoothstep(0.4, -0.9, vLocalPos.y) * 0.6;
    albedo = mix(albedo, uMoss, clamp(moss, 0.0, 0.9));

    vec3 color = painterlyLight(normalize(vNormal), vViewDir, albedo, 0.2);

    // Hover: warm the stone rather than adding an outline, so the feedback
    // reads as sunlight catching it. Kept subtle — a strong additive term
    // blows the facets out to a flat white blob, which loses the silhouette
    // the stone is doing all its work with.
    color += uHighlight * vec3(0.13, 0.10, 0.05);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

function Marker({ section }) {
  const groupRef = useRef()

  const hovered = useStore((s) => s.hovered === section.id)
  const active = useStore((s) => s.active === section.id)
  const anyActive = useStore((s) => s.active !== null)
  const setHovered = useStore((s) => s.setHovered)
  const open = useStore((s) => s.open)

  const [x, z] = section.position
  const groundY = useMemo(() => terrainHeight(x, z), [x, z])

  const { geometry, material } = useMemo(() => {
    // Sized to stand clearly proud of the grass canopy. At the blade height
    // used here a smaller stone is simply swallowed and the navigation becomes
    // invisible.
    const seed = section.id.charCodeAt(0) + section.id.length * 7
    const geo = makeStone(seed, 2.2)
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: buildUniforms({
        uStone: { value: c('#6b6a63') },
        uStoneLight: { value: c('#9c978a') },
        uMoss: { value: c('#47692f') },
        uHighlight: { value: 0 },
      }),
      fog: true,
    })
    return { geometry: geo, material: mat }
  }, [section.id])

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta * 8)

    // Lift and warm on hover; both ease rather than snap.
    const targetLift = hovered || active ? 0.42 : 0
    const targetGlow = hovered ? 1 : active ? 0.25 : 0

    if (groupRef.current) {
      groupRef.current.position.y += (groundY - 0.9 + targetLift - groupRef.current.position.y) * k
    }
    const u = material.uniforms.uHighlight
    u.value += (targetGlow - u.value) * k
  })

  // Labels only make sense when you are roaming; hide them once a panel is open.
  const showLabel = hovered && !anyActive

  return (
    <group ref={groupRef} position={[x, groundY - 0.9, z]}>
      <mesh
        geometry={geometry}
        material={material}
       
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(section.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          open(section.id)
        }}
      />

      {showLabel && (
        <Html center position={[0, 2.6, 0]} distanceFactor={22} zIndexRange={[10, 0]}>
          <div className="marker-label">{section.label}</div>
        </Html>
      )}
    </group>
  )
}

export default function Hotspots() {
  return (
    <group>
      {SECTIONS.map((section) => (
        <Marker key={section.id} section={section} />
      ))}
    </group>
  )
}

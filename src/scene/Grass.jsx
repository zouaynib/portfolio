import { useMemo } from 'react'
import * as THREE from 'three'

import { glslNoise, glslWind, glslPainterlyLight } from '../shaders/common'
import { buildUniforms } from './uniforms'
import { PALETTE, WORLD } from './palette'
import { terrainHeight, terrainSlope } from './heightfield'
import { isInsideHouse } from './house-transform'
import { isInsideLab } from './lab-transform'

const SEGMENTS = 5

/**
 * A single blade: a tapered strip, narrow and pointed, subdivided enough along
 * its length that the wind bend reads as a curve rather than a hinge.
 */
const makeBladeGeometry = () => {
  const positions = []
  const heights = []
  const indices = []

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    // Taper: full width at the base, pinching to a point at the tip.
    const width = 0.5 * (1 - t * t * 0.85) * (1 - t) ** 0.35

    positions.push(-width, t, 0)
    positions.push(width, t, 0)
    heights.push(t, t)
  }

  for (let i = 0; i < SEGMENTS; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2)
    indices.push(a + 1, a + 3, a + 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aHeight', new THREE.Float32BufferAttribute(heights, 1))
  geo.setIndex(indices)
  return geo
}

/**
 * Scatter blades in clumps.
 *
 * Uniform random scatter is the single clearest tell of a procedural meadow —
 * real grass grows in tufts of varying height and dryness. Each clump gets its
 * own height and colour bias, and blades fall off toward its edge.
 */
const scatter = (count, radius) => {
  const offset = new Float32Array(count * 3)
  const scale = new Float32Array(count * 2)
  const rotation = new Float32Array(count)
  const tilt = new Float32Array(count)
  const phase = new Float32Array(count)
  const colorVar = new Float32Array(count)
  const dry = new Float32Array(count)

  const bladesPerClump = 26
  const clumpCount = Math.ceil(count / bladesPerClump)

  let i = 0
  for (let cIdx = 0; cIdx < clumpCount && i < count; cIdx++) {
    // Uniform-area disc sampling, biased slightly toward the camera's basin.
    const r = radius * Math.sqrt(Math.random()) ** 1.08
    const a = Math.random() * Math.PI * 2
    const cx = Math.cos(a) * r
    const cz = Math.sin(a) * r

    const clumpSpread = 0.35 + Math.random() * 0.95
    const clumpHeight = 0.55 + Math.random() * 0.5
    const clumpDry = Math.random() ** 2.2
    const clumpHue = Math.random()

    const n = Math.min(bladesPerClump + ((Math.random() * 14) | 0) - 7, count - i)

    for (let b = 0; b < n; b++, i++) {
      // Gaussian-ish falloff from the clump centre.
      const rr = clumpSpread * Math.sqrt(-2 * Math.log(1 - Math.random() * 0.98)) * 0.5
      const ra = Math.random() * Math.PI * 2
      const x = cx + Math.cos(ra) * rr
      const z = cz + Math.sin(ra) * rr

      // Thin out on steep faces so hillsides show soil and read as slopes.
      const slope = terrainSlope(x, z)
      if (slope > 0.34 && Math.random() < slope * 1.6) {
        i--
        continue
      }

      // Never grow through the studio floor or up through its eaves.
      if (isInsideHouse(x, z) || isInsideLab(x, z)) {
        i--
        continue
      }

      offset[i * 3] = x
      offset[i * 3 + 1] = terrainHeight(x, z)
      offset[i * 3 + 2] = z

      // One world unit is one metre, so blades land at roughly 0.3-1.5m —
      // meadow grass. Scale has to stay honest against the stones (~2.5m) and
      // the trees (10-20m) or nothing in the scene reads at a believable size.
      const h = clumpHeight * (0.6 + Math.random() * 0.85)
      scale[i * 2] = 0.06 + Math.random() * 0.05
      scale[i * 2 + 1] = h * 1.05

      rotation[i] = Math.random() * Math.PI * 2
      tilt[i] = 0.15 + Math.random() * 0.5
      phase[i] = Math.random()
      colorVar[i] = clumpHue * 0.65 + Math.random() * 0.35
      dry[i] = Math.min(1, clumpDry + (Math.random() - 0.5) * 0.25)
    }
  }

  return { offset, scale, rotation, tilt, phase, colorVar, dry, used: i }
}

const vertexShader = /* glsl */ `
  attribute float aHeight;
  attribute vec3 aOffset;
  attribute vec2 aScale;
  attribute float aRotation;
  attribute float aTilt;
  attribute float aPhase;
  attribute float aColorVar;
  attribute float aDry;

  varying float vHeight;
  varying float vColorVar;
  varying float vDry;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  #include <fog_pars_vertex>

  ${glslNoise}
  ${glslWind}

  mat2 rot2(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vHeight = aHeight;
    vColorVar = aColorVar;
    vDry = aDry;

    vec3 pos = position;
    pos.x *= aScale.x;
    pos.y *= aScale.y;

    // Natural resting arc — blades are never perfectly straight.
    float arc = aTilt * aHeight * aHeight;
    pos.z += arc * aScale.y * 0.42;

    // Wind bend, then rotate the whole blade to its facing direction.
    vec2 wind = windOffset(aOffset.xz, aHeight, aPhase, 1.75);
    pos.xz = rot2(aRotation) * pos.xz;
    pos.xz += wind * aScale.y;

    // Bending shortens vertical reach, otherwise blades visibly stretch.
    pos.y -= (arc * arc + dot(wind, wind)) * aScale.y * 0.3;

    vec3 worldPos = aOffset + pos;

    // Blade normal: facing direction rotated with the blade, tipped back by bend.
    vec3 n = normalize(vec3(rot2(aRotation) * vec2(0.0, 1.0), 0.35));
    n = normalize(vec3(n.x, 0.45 + arc * 0.5, n.y));
    vNormal = n;

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    vViewDir = normalize(cameraPosition - worldPos);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uRoot;
  uniform vec3 uMid;
  uniform vec3 uTip;
  uniform vec3 uDryColor;

  varying float vHeight;
  varying float vColorVar;
  varying float vDry;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  #include <fog_pars_fragment>

  ${glslPainterlyLight}

  void main() {
    // Root -> mid -> tip gradient is what gives a field depth: the darkness
    // low down reads as self-shadowing between blades.
    vec3 albedo = mix(uRoot, uMid, smoothstep(0.0, 0.45, vHeight));
    albedo = mix(albedo, uTip, smoothstep(0.4, 1.0, vHeight));
    albedo = mix(albedo, uDryColor, vDry * smoothstep(0.25, 1.0, vHeight) * 0.75);

    // Per-clump hue drift keeps large areas from flattening into one green.
    albedo *= mix(0.82, 1.18, vColorVar);

    // Ambient occlusion toward the ground. The floor is kept well off zero:
    // from any camera above grass height you look down *into* the canopy, and
    // a deep AO turns that whole region into a black mass.
    albedo *= mix(0.55, 1.0, smoothstep(0.0, 0.55, vHeight));

    vec3 normal = gl_FrontFacing ? vNormal : -vNormal;
    vec3 color = painterlyLight(normal, vViewDir, albedo, 0.95);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

export default function Grass({ count = 220000, radius = WORLD.grassRadius }) {
  const { geometry, material } = useMemo(() => {
    const geo = makeBladeGeometry()
    const data = scatter(count, radius)
    const n = data.used

    const instanced = new THREE.InstancedBufferGeometry()
    instanced.index = geo.index
    instanced.attributes.position = geo.attributes.position
    instanced.attributes.aHeight = geo.attributes.aHeight

    const attr = (arr, size) =>
      new THREE.InstancedBufferAttribute(arr.subarray(0, n * size), size)

    instanced.setAttribute('aOffset', attr(data.offset, 3))
    instanced.setAttribute('aScale', attr(data.scale, 2))
    instanced.setAttribute('aRotation', attr(data.rotation, 1))
    instanced.setAttribute('aTilt', attr(data.tilt, 1))
    instanced.setAttribute('aPhase', attr(data.phase, 1))
    instanced.setAttribute('aColorVar', attr(data.colorVar, 1))
    instanced.setAttribute('aDry', attr(data.dry, 1))
    instanced.instanceCount = n

    // Blades are positioned entirely in the shader, so the auto-computed
    // bounds are wrong and the mesh would pop out of view. Set them by hand.
    instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius * 2)

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: buildUniforms({
        uRoot: { value: PALETTE.grassRoot },
        uMid: { value: PALETTE.grassMid },
        uTip: { value: PALETTE.grassTip },
        uDryColor: { value: PALETTE.grassDry },
      }),
      side: THREE.DoubleSide,
      fog: true,
    })

    return { geometry: instanced, material: mat }
  }, [count, radius])

  // Blades are positioned entirely in the vertex shader, so three's culling
  // bounds do not describe where they actually are.
  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}

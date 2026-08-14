import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { glslNoise, glslWind, glslPainterlyLight } from '../shaders/common'
import { buildUniforms } from './uniforms'
import { WORLD } from './palette'
import { terrainHeight, terrainSlope } from './heightfield'
import { isInsideHouse } from './house-transform'
import { isInsideLab } from './lab-transform'

/**
 * Wildflowers scattered in drifts.
 *
 * Flowers in a real meadow arrive in patches of a single species, so drifts get
 * one colour each rather than every bloom picking randomly. That patchiness is
 * most of what makes the field look observed rather than generated.
 */

const c = (hex) => new THREE.Color(hex).convertSRGBToLinear()

const FLOWER_COLORS = [
  c('#fdfbf2'), // white daisy
  c('#fdfbf2'),
  c('#ffe98a'), // buttercup
  c('#ffd9e8'), // pale pink
  c('#d8c9f0'), // lavender
  c('#ffb56b'), // soft orange
]

/**
 * Stem, a ring of cupped petals, and a seed centre.
 *
 * `aPart` tags each vertex: 0 = stem, 1 = petal, 2 = centre.
 *
 * Petals are narrow, tapered, and lifted at the tip so the bloom forms a shallow
 * cup rather than a flat star — a flat ring of wide quads reads as origami, and
 * from a low camera it presents as a solid plate.
 */
const makeFlowerGeometry = () => {
  const parts = []
  const stemH = 1.0

  // Stem: a narrow tapered strip, same construction as a grass blade.
  const segs = 4
  const sPos = []
  const sH = []
  const sIdx = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const w = 0.013 * (1 - t * 0.4)
    sPos.push(-w, t * stemH, 0, w, t * stemH, 0)
    sH.push(t, t)
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2
    sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const stem = new THREE.BufferGeometry()
  stem.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3))
  stem.setAttribute('aHeight', new THREE.Float32BufferAttribute(sH, 1))
  stem.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(sH.length), 1))
  stem.setIndex(sIdx)
  parts.push(stem)

  // Petals: tapered triangles-ish quads, cupped upward at the tip.
  const petals = 9
  const pPos = []
  const pH = []
  const pPart = []
  const pIdx = []
  let v = 0

  const inner = 0.012
  const outer = 0.062
  const innerW = 0.016
  const outerW = 0.021
  const cup = 0.026

  for (let p = 0; p < petals; p++) {
    const a = (p / petals) * Math.PI * 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)

    pPos.push(cos * inner - sin * innerW, stemH, sin * inner + cos * innerW)
    pPos.push(cos * inner + sin * innerW, stemH, sin * inner - cos * innerW)
    pPos.push(cos * outer - sin * outerW, stemH + cup, sin * outer + cos * outerW)
    pPos.push(cos * outer + sin * outerW, stemH + cup, sin * outer - cos * outerW)

    for (let k = 0; k < 4; k++) {
      pH.push(1)
      pPart.push(1)
    }
    pIdx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3)
    v += 4
  }

  const bloom = new THREE.BufferGeometry()
  bloom.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3))
  bloom.setAttribute('aHeight', new THREE.Float32BufferAttribute(pH, 1))
  bloom.setAttribute('aPart', new THREE.Float32BufferAttribute(pPart, 1))
  bloom.setIndex(pIdx)
  parts.push(bloom)

  // Seed centre: a small raised fan. Without it the bloom has a hole in the
  // middle and loses the thing that makes a daisy legible at a glance.
  const cSeg = 7
  const cPos = [0, stemH + 0.012, 0]
  const cH = [1]
  const cPart = [2]
  const cIdx = []
  for (let i = 0; i < cSeg; i++) {
    const a = (i / cSeg) * Math.PI * 2
    cPos.push(Math.cos(a) * 0.016, stemH + 0.004, Math.sin(a) * 0.016)
    cH.push(1)
    cPart.push(2)
  }
  for (let i = 0; i < cSeg; i++) {
    cIdx.push(0, 1 + i, 1 + ((i + 1) % cSeg))
  }

  const centre = new THREE.BufferGeometry()
  centre.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3))
  centre.setAttribute('aHeight', new THREE.Float32BufferAttribute(cH, 1))
  centre.setAttribute('aPart', new THREE.Float32BufferAttribute(cPart, 1))
  centre.setIndex(cIdx)
  parts.push(centre)

  return mergeGeometries(parts, false)
}

const scatterFlowers = (count, radius) => {
  const offset = new Float32Array(count * 3)
  const scale = new Float32Array(count)
  const rotation = new Float32Array(count)
  const phase = new Float32Array(count)
  const color = new Float32Array(count * 3)

  const perDrift = 55
  const driftCount = Math.ceil(count / perDrift)

  let i = 0
  for (let d = 0; d < driftCount && i < count; d++) {
    const r = radius * Math.sqrt(Math.random())
    const a = Math.random() * Math.PI * 2
    const cx = Math.cos(a) * r
    const cz = Math.sin(a) * r

    const spread = 3 + Math.random() * 9
    const tint = FLOWER_COLORS[(Math.random() * FLOWER_COLORS.length) | 0]
    const driftScale = 0.7 + Math.random() * 0.7

    const n = Math.min(perDrift + ((Math.random() * 40) | 0) - 20, count - i)

    for (let b = 0; b < n; b++, i++) {
      const rr = spread * Math.sqrt(Math.random())
      const ra = Math.random() * Math.PI * 2
      const x = cx + Math.cos(ra) * rr
      const z = cz + Math.sin(ra) * rr

      if (terrainSlope(x, z) > 0.3) {
        i--
        continue
      }

      // Keep the studio's footprint clear.
      if (isInsideHouse(x, z) || isInsideLab(x, z)) {
        i--
        continue
      }

      offset[i * 3] = x
      offset[i * 3 + 1] = terrainHeight(x, z)
      offset[i * 3 + 2] = z

      // Tall enough to clear the grass canopy, but not so tall they read as
      // lollipops on bare stems.
      scale[i] = driftScale * (0.8 + Math.random() * 0.55) * 0.95
      rotation[i] = Math.random() * Math.PI * 2
      phase[i] = Math.random()

      const jitter = 0.88 + Math.random() * 0.24
      color[i * 3] = tint.r * jitter
      color[i * 3 + 1] = tint.g * jitter
      color[i * 3 + 2] = tint.b * jitter
    }
  }

  return { offset, scale, rotation, phase, color, used: i }
}

const vertexShader = /* glsl */ `
  attribute float aHeight;
  attribute float aPart;
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aRotation;
  attribute float aPhase;
  attribute vec3 aColor;

  varying float vHeight;
  varying float vPart;
  varying vec3 vColor;
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
    vPart = aPart;
    vColor = aColor;

    vec3 pos = position * aScale;
    pos.xz = rot2(aRotation) * pos.xz;

    // Stiffer than grass: stems hold the bloom up and nod rather than whip.
    vec2 wind = windOffset(aOffset.xz, aHeight, aPhase, 1.45);
    pos.xz += wind * aScale * 0.85;

    vec3 worldPos = aOffset + pos;

    // Bloom faces up (tipped by the wind); the stem faces the viewer.
    float isBloom = step(0.5, aPart);
    vec3 bloomNormal = normalize(vec3(wind.x * 0.5, 1.0, wind.y * 0.5));
    vNormal = mix(vec3(0.0, 0.4, 1.0), bloomNormal, isBloom);
    vViewDir = normalize(cameraPosition - worldPos);

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uStemColor;
  uniform vec3 uCentreColor;

  varying float vHeight;
  varying float vPart;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  #include <fog_pars_fragment>

  ${glslPainterlyLight}

  void main() {
    // aPart: 0 = stem, 1 = petal, 2 = seed centre.
    float isBloom = step(0.5, vPart);
    float isCentre = step(1.5, vPart);

    vec3 albedo = mix(uStemColor, vColor, isBloom);
    albedo = mix(albedo, uCentreColor, isCentre);
    albedo *= mix(0.45, 1.0, smoothstep(0.0, 0.5, vHeight));

    vec3 normal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);

    // Petals are thin and glow strongly when backlit; the centre does not.
    float translucency = mix(0.4, 1.2, isBloom) * (1.0 - isCentre * 0.75);
    vec3 color = painterlyLight(normal, vViewDir, albedo, translucency);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

export default function Flowers({ count = 14000, radius = WORLD.grassRadius }) {
  const { geometry, material } = useMemo(() => {
    const base = makeFlowerGeometry()
    const data = scatterFlowers(count, radius * 0.95)
    const n = data.used

    const instanced = new THREE.InstancedBufferGeometry()
    instanced.index = base.index
    instanced.attributes.position = base.attributes.position
    instanced.attributes.aHeight = base.attributes.aHeight
    instanced.attributes.aPart = base.attributes.aPart

    const attr = (arr, size) =>
      new THREE.InstancedBufferAttribute(arr.subarray(0, n * size), size)

    instanced.setAttribute('aOffset', attr(data.offset, 3))
    instanced.setAttribute('aScale', attr(data.scale, 1))
    instanced.setAttribute('aRotation', attr(data.rotation, 1))
    instanced.setAttribute('aPhase', attr(data.phase, 1))
    instanced.setAttribute('aColor', attr(data.color, 3))
    instanced.instanceCount = n
    instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius * 2)

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: buildUniforms({
        uStemColor: { value: c('#4a7030') },
        uCentreColor: { value: c('#e8b338') },
      }),
      side: THREE.DoubleSide,
      fog: true,
    })

    return { geometry: instanced, material: mat }
  }, [count, radius])

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}

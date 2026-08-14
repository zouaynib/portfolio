import { useMemo } from 'react'
import * as THREE from 'three'

import { shared } from './uniforms'
import { PALETTE } from './palette'

/**
 * Pollen and dust drifting in the light.
 *
 * Cheap but disproportionately effective: motes give the air itself volume, and
 * because they catch the sun they make the space feel lit rather than coloured.
 * Motion is computed in the shader and wraps within a box that follows nothing —
 * the volume simply surrounds the camera's working area.
 */

const COUNT = 900
const VOLUME = { x: 150, y: 26, z: 150 }

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;

  uniform float uTime;
  uniform vec3 uVolume;
  uniform vec2 uWindDir;

  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Rise slowly and drift downwind, wrapping through the volume.
    float t = uTime * aSpeed;
    pos.y = mod(pos.y + t * 0.55 + aPhase * uVolume.y, uVolume.y);
    pos.x = mod(pos.x + uWindDir.x * t * 1.4 + uVolume.x * 0.5, uVolume.x) - uVolume.x * 0.5;
    pos.z = mod(pos.z + uWindDir.y * t * 1.4 + uVolume.z * 0.5, uVolume.z) - uVolume.z * 0.5;

    // Gentle spiralling so motes never travel in dead-straight lines.
    pos.x += sin(uTime * 0.7 + aPhase * 20.0) * 0.5;
    pos.z += cos(uTime * 0.55 + aPhase * 17.0) * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Fade in the distance and as they rise out of the light.
    float dist = -mvPosition.z;
    vAlpha = smoothstep(90.0, 30.0, dist) * smoothstep(0.0, 3.0, pos.y);
    vAlpha *= 1.0 - smoothstep(uVolume.y * 0.6, uVolume.y, pos.y);

    // Also fade motes that are almost touching the lens. Indoors the camera
    // sits within a couple of metres of the volume, and an un-faded mote at
    // that range fills a quarter of the screen as a glowing orb.
    vAlpha *= smoothstep(1.5, 6.0, dist);

    gl_PointSize = min(aSize * (240.0 / max(dist, 1.0)), 26.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // Soft round falloff — square points are an instant tell.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.05, d) * vAlpha;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(uColor, alpha * 0.55);
  }
`

export default function DustMotes() {
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)
    const phases = new Float32Array(COUNT)
    const speeds = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * VOLUME.x
      positions[i * 3 + 1] = Math.random() * VOLUME.y
      positions[i * 3 + 2] = (Math.random() - 0.5) * VOLUME.z
      sizes[i] = 0.6 + Math.random() * 2.2
      phases[i] = Math.random()
      speeds[i] = 0.35 + Math.random() * 0.8
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 200)

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: shared.time,
        uWindDir: shared.windDir,
        uVolume: { value: new THREE.Vector3(VOLUME.x, VOLUME.y, VOLUME.z) },
        uColor: { value: PALETTE.dust },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })

    return { geometry: geo, material: mat }
  }, [])

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

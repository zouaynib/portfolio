import { useMemo } from 'react'
import * as THREE from 'three'

import { glslNoise } from '../shaders/common'
import { shared } from './uniforms'
import { PALETTE, SUN_DIRECTION } from './palette'

/**
 * Hand-painted sky dome.
 *
 * Deliberately not a physical sky model. The gradient is built from a few
 * smoothstep bands rather than a linear ramp, which is what gives painted
 * skies their distinct horizon glow, and soft fbm clouds sit low and stretched
 * so they read as distance rather than as texture.
 */

const vertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = normalize(position);

    // Strip translation from the view matrix so the dome is locked to the
    // camera: it rotates with the view but can never be approached or exited.
    mat4 rotOnly = mat4(mat3(modelViewMatrix));
    gl_Position = projectionMatrix * rotOnly * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uCloud;
  uniform vec3 uCloudShadow;
  uniform vec3 uSunDir;
  uniform float uTime;

  varying vec3 vDir;

  ${glslNoise}

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -1.0, 1.0);

    // Banded vertical gradient — the tight horizon band is the painterly tell.
    float horizonBand = 1.0 - smoothstep(-0.02, 0.20, h);
    float midBand = smoothstep(0.02, 0.42, h);
    float zenithBand = smoothstep(0.34, 0.85, h);

    vec3 color = mix(uMid, uHorizon, horizonBand);
    color = mix(color, uMid, midBand * 0.65);
    color = mix(color, uZenith, zenithBand);

    // Warm glow pooling around the sun, stretched along the horizon.
    float sunDot = clamp(dot(dir, normalize(uSunDir)), 0.0, 1.0);
    float glow = pow(sunDot, 6.0) * 0.55 + pow(sunDot, 60.0) * 0.9;
    glow += pow(sunDot, 2.0) * (1.0 - smoothstep(0.0, 0.35, h)) * 0.35;
    color += uGlow * glow;

    // Clouds: sampled in a flattened projection so they compress at the
    // horizon the way real cloud decks do.
    vec2 cloudUV = dir.xz / max(h + 0.22, 0.06);
    float drift = uTime * 0.004;
    float c = fbm2(cloudUV * 0.55 + vec2(drift, drift * 0.35));
    c += fbm2(cloudUV * 1.4 - vec2(drift * 1.7, 0.0)) * 0.35;

    float coverage = smoothstep(0.52, 0.92, c);
    coverage *= smoothstep(0.0, 0.22, h);        // none below the horizon
    coverage *= 1.0 - smoothstep(0.55, 0.95, h); // thin out overhead

    // Lit from the sun side, shadowed away from it.
    vec3 cloudColor = mix(uCloudShadow, uCloud, smoothstep(0.3, 0.85, c));
    cloudColor = mix(cloudColor, uGlow, pow(sunDot, 3.0) * 0.5);
    color = mix(color, cloudColor, coverage * 0.85);

    gl_FragColor = vec4(color, 1.0);

    #include <colorspace_fragment>
  }
`

export default function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uZenith: { value: PALETTE.skyZenith },
          uMid: { value: PALETTE.skyMid },
          uHorizon: { value: PALETTE.skyHorizon },
          uGlow: { value: PALETTE.skyGlow },
          uCloud: { value: PALETTE.cloud },
          uCloudShadow: { value: PALETTE.cloudShadow },
          uSunDir: { value: SUN_DIRECTION },
          uTime: shared.time,
        },
        side: THREE.BackSide,
        // Drawn first with no depth interaction at all, so the rest of the
        // scene simply paints over it regardless of the dome's actual radius.
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    [],
  )

  return (
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 32]} />
    </mesh>
  )
}

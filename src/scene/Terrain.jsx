import { useMemo } from 'react'
import * as THREE from 'three'

import { glslNoise, glslPainterlyLight } from '../shaders/common'
import { buildUniforms } from './uniforms'
import { PALETTE, WORLD } from './palette'
import { terrainHeight } from './heightfield'

/**
 * The ground plane.
 *
 * Mostly hidden by grass near the camera, so its real job is the *distance* —
 * it carries the meadow out to the fog line. Colour shifts toward a hazy green
 * with distance so the far field reads as atmosphere, not as flat geometry.
 */

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  #include <fog_pars_vertex>

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    // three's fog_vertex chunk reads a variable named exactly mvPosition.
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uSoil;
  uniform vec3 uSoilFar;
  uniform vec3 uGrassRoot;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  #include <fog_pars_fragment>

  ${glslNoise}
  ${glslPainterlyLight}

  void main() {
    // Broad mottling so the ground never reads as a flat swatch.
    // Named "mottle" because "patch" is a reserved word in GLSL.
    float mottle = fbm2(vWorldPos.xz * 0.035);
    float fine = noise2(vWorldPos.xz * 0.4);

    vec3 albedo = mix(uSoil, uGrassRoot, smoothstep(0.35, 0.75, mottle));
    albedo *= mix(0.88, 1.12, fine);

    // Bare earth on the steepest faces, where grass was thinned out.
    float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);
    albedo = mix(albedo, uSoil * 1.25, smoothstep(0.25, 0.55, slope));

    // Aerial perspective: distant ground drifts toward the hazy sunlit green
    // before fog takes over, which is what builds the sense of scale.
    float dist = length(vWorldPos.xz);
    albedo = mix(albedo, uSoilFar, smoothstep(60.0, 300.0, dist) * 0.8);

    vec3 color = painterlyLight(normalize(vNormal), vViewDir, albedo, 0.25);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

export default function Terrain() {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      WORLD.terrainSize,
      WORLD.terrainSize,
      WORLD.terrainSegments,
      WORLD.terrainSegments,
    )
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, terrainHeight(x, z))
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: buildUniforms({
        uSoil: { value: PALETTE.soil },
        uSoilFar: { value: PALETTE.soilFar },
        uGrassRoot: { value: PALETTE.grassRoot },
      }),
      fog: true,
    })

    return { geometry: geo, material: mat }
  }, [])

  return <mesh geometry={geometry} material={material} />
}

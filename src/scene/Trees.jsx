import { useMemo } from 'react'
import * as THREE from 'three'

import { glslNoise, glslWind, glslPainterlyLight } from '../shaders/common'
import { buildUniforms } from './uniforms'
import { PALETTE } from './palette'
import { terrainHeight } from './heightfield'
import { makeTrunk, makeCanopy } from './tree-geometry'

/**
 * Trees are placed by hand rather than scattered.
 *
 * Composition is the point: a close pair frames the left edge, a distant grove
 * sits on the horizon for depth, and the middle is left open so the meadow can
 * breathe. Random placement produces an even mush with no focal point.
 */
export const TREE_LAYOUT = [
  { x: -56, z: 32, height: 15, spread: 9.5, seed: 3 },
  { x: -58, z: 40, height: 11.5, spread: 7.6, seed: 11 },
  { x: 41, z: -6, height: 17, spread: 10.5, seed: 27 },
  { x: 62, z: 24, height: 13, spread: 8.4, seed: 41 },
  { x: 74, z: 38, height: 10, spread: 6.8, seed: 52 },
  { x: -88, z: -52, height: 19, spread: 12, seed: 66 },
  { x: -104, z: -40, height: 15.5, spread: 9.8, seed: 71 },
  { x: -70, z: -74, height: 13, spread: 8.6, seed: 88 },
  { x: 112, z: -70, height: 18, spread: 11.4, seed: 95 },
  { x: 132, z: -48, height: 14, spread: 9, seed: 103 },
  { x: 8, z: -118, height: 20, spread: 13, seed: 117 },
  { x: -26, z: -136, height: 16, spread: 10.2, seed: 129 },
  { x: 150, z: 60, height: 15, spread: 9.6, seed: 141 },
  { x: -150, z: 70, height: 17, spread: 11, seed: 158 },
]

const foliageVertex = /* glsl */ `
  attribute float aCanopyH;
  attribute float aBlobId;
  attribute float aWindH;

  varying float vCanopyH;
  varying float vBlobId;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  #include <fog_pars_vertex>

  ${glslNoise}
  ${glslWind}

  void main() {
    vCanopyH = aCanopyH;
    vBlobId = aBlobId;

    vec3 pos = position;

    // Wind pivots the whole crown from the trunk. Low stiffness (compared with
    // grass) because a tree bends as one mass rather than whipping at the tip.
    vec3 treeOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec2 sway = windOffset(treeOrigin.xz, aWindH, aBlobId, 1.3) * 2.6;

    // Outer foliage flutters a little more than the interior mass.
    float flutter = sin(uTime * 3.1 + aBlobId * 24.0 + pos.y * 0.35) * 0.12;
    sway += uWindDir * flutter * aCanopyH * uWindStrength;

    pos.xz += sway;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const foliageFragment = /* glsl */ `
  uniform vec3 uLeafDark;
  uniform vec3 uLeafMid;
  uniform vec3 uLeafLight;

  varying float vCanopyH;
  varying float vBlobId;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  #include <fog_pars_fragment>

  ${glslNoise}
  ${glslPainterlyLight}

  void main() {
    // Vertical gradient: shaded underside, sunlit crown.
    vec3 albedo = mix(uLeafDark, uLeafMid, smoothstep(0.0, 0.55, vCanopyH));
    albedo = mix(albedo, uLeafLight, smoothstep(0.5, 1.0, vCanopyH) * 0.85);

    // Clumping: patches of lighter and darker foliage break up the mass so it
    // does not read as one smooth painted volume.
    float clump = fbm2(vWorldPos.xz * 0.55 + vWorldPos.y * 0.35);
    albedo = mix(albedo, uLeafLight, smoothstep(0.55, 0.85, clump) * 0.45);
    albedo *= mix(0.85, 1.1, noise2(vWorldPos.xz * 1.9 + vBlobId * 30.0));

    // Foliage is very translucent — this is what produces the glowing
    // backlit crowns when the camera looks toward the sun.
    vec3 color = painterlyLight(normalize(vNormal), vViewDir, albedo, 1.0);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

const barkVertex = /* glsl */ `
  attribute float aWindH;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_vertex>

  ${glslNoise}
  ${glslWind}

  void main() {
    vLocalPos = position;

    vec3 pos = position;
    vec3 treeOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // Same wind call as the canopy, so trunk and crown stay welded together.
    pos.xz += windOffset(treeOrigin.xz, aWindH, 0.0, 1.3) * 2.6;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const barkFragment = /* glsl */ `
  uniform vec3 uBark;
  uniform vec3 uBarkLight;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  #include <fog_pars_fragment>

  ${glslNoise}
  ${glslPainterlyLight}

  void main() {
    // Vertical streaking reads as bark grain without a texture map.
    float grain = fbm2(vec2(atan(vLocalPos.z, vLocalPos.x) * 3.0, vLocalPos.y * 1.6));
    vec3 albedo = mix(uBark, uBarkLight, smoothstep(0.35, 0.8, grain));

    // Darker toward the base where the canopy shades it.
    albedo *= mix(0.7, 1.05, smoothstep(0.0, 8.0, vLocalPos.y));

    vec3 color = painterlyLight(normalize(vNormal), vViewDir, albedo, 0.15);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`

/** Bake wind height (0 at the roots, 1 at the crown) so one material fits all trees. */
const addWindHeight = (geometry, totalHeight) => {
  const pos = geometry.attributes.position
  const windH = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    windH[i] = THREE.MathUtils.clamp(pos.getY(i) / totalHeight, 0, 1)
  }
  geometry.setAttribute('aWindH', new THREE.BufferAttribute(windH, 1))
  return geometry
}

export default function Trees() {
  const { trees, foliageMaterial, barkMaterial } = useMemo(() => {
    const foliage = new THREE.ShaderMaterial({
      vertexShader: foliageVertex,
      fragmentShader: foliageFragment,
      uniforms: buildUniforms({
        uLeafDark: { value: PALETTE.leafDark },
        uLeafMid: { value: PALETTE.leafMid },
        uLeafLight: { value: PALETTE.leafLight },
      }),
      side: THREE.DoubleSide,
      fog: true,
    })

    const bark = new THREE.ShaderMaterial({
      vertexShader: barkVertex,
      fragmentShader: barkFragment,
      uniforms: buildUniforms({
        uBark: { value: PALETTE.bark },
        uBarkLight: { value: PALETTE.barkLight },
      }),
      fog: true,
    })

    const built = TREE_LAYOUT.map((t) => {
      const trunkHeight = t.height * 0.62
      const canopyBase = trunkHeight * 0.78
      const total = t.height + t.spread

      const trunk = addWindHeight(
        makeTrunk(t.seed, trunkHeight, t.height * 0.055),
        total,
      )
      const canopy = addWindHeight(
        makeCanopy(t.seed, canopyBase, t.spread),
        total,
      )

      return {
        key: `${t.x}:${t.z}`,
        position: [t.x, terrainHeight(t.x, t.z) - 0.4, t.z],
        rotation: [0, (t.seed % 10) * 0.63, 0],
        trunk,
        canopy,
      }
    })

    return { trees: built, foliageMaterial: foliage, barkMaterial: bark }
  }, [])

  return (
    <group>
      {trees.map((tree) => (
        <group key={tree.key} position={tree.position} rotation={tree.rotation}>
          <mesh geometry={tree.trunk} material={barkMaterial} />
          <mesh geometry={tree.canopy} material={foliageMaterial} />
        </group>
      ))}
    </group>
  )
}

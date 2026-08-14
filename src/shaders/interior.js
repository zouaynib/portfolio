import * as THREE from 'three'
import { glslNoise } from './common'

/**
 * Interior lighting, shared by the studio and the lab.
 *
 * Deliberately not lit by the scene's sun. The sun sits outside and behind
 * both buildings, so a physically consistent interior would be near black.
 * Instead a constant fill brightens toward the opening, which reads as daylight
 * spilling in and keeps the contents legible.
 *
 * The two rooms differ only in colour: the studio is warm plaster, the lab is a
 * cool white showroom with warm light leaking through its glazing.
 */

const vertexShader = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vNormal;

  void main() {
    vLocalPos = position;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uWall;
  uniform vec3 uTint;
  uniform vec3 uShadowLight;
  uniform vec3 uOpeningLight;
  uniform float uOpeningZ;
  uniform float uGrainScale;
  uniform float uCeilingHeight;
  uniform float uExposure;

  varying vec3 vLocalPos;
  varying vec3 vNormal;

  ${glslNoise}

  void main() {
    float grain = fbm2(vLocalPos.xz * uGrainScale + vLocalPos.y * uGrainScale * 0.7);
    vec3 albedo = mix(uWall, uWall * 1.12, smoothstep(0.35, 0.7, grain));

    // Daylight from the opening: brightest near the front of the room. Both
    // ends of the ramp are tinted RGB multipliers rather than a neutral grey —
    // a neutral shadow end desaturates the back wall to mud, which is exactly
    // where the contents are displayed.
    float fromOpening = smoothstep(-uOpeningZ, uOpeningZ, vLocalPos.z);
    vec3 light = mix(uShadowLight, uOpeningLight, fromOpening);

    // Soft vertical falloff, darker where wall meets ceiling.
    light *= mix(1.05, 0.74, smoothstep(0.6, uCeilingHeight, vLocalPos.y));

    // Ceilings catch less light than walls.
    light *= mix(1.0, 0.72, step(0.5, -vNormal.y));

    // Tint rather than multiply outright — applying a saturated colour at full
    // strength on top of an already-tinted ramp floods the whole room with it.
    vec3 tint = mix(vec3(1.0), uTint, 0.45);

    gl_FragColor = vec4(albedo * light * tint * uExposure, 1.0);

    #include <colorspace_fragment>
  }
`

/**
 * @param {object} options
 * @param {THREE.Color} options.wall      Base surface colour.
 * @param {THREE.Color} options.tint      Overall colour cast of the room.
 * @param {number[]}    options.shadow    RGB multiplier at the back of the room.
 * @param {number[]}    options.opening   RGB multiplier at the opening.
 * @param {number}      options.openingZ  Half-depth, i.e. where the opening is.
 * @param {number}      options.ceiling   Ceiling height, for the vertical ramp.
 */
export const makeInteriorMaterial = ({
  wall,
  tint,
  shadow,
  opening,
  openingZ,
  ceiling = 3.4,
  grainScale = 2.2,
  exposure = 1.2,
  side = THREE.FrontSide,
}) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uWall: { value: wall },
      uTint: { value: tint },
      uShadowLight: { value: new THREE.Vector3(...shadow) },
      uOpeningLight: { value: new THREE.Vector3(...opening) },
      uOpeningZ: { value: openingZ },
      uGrainScale: { value: grainScale },
      uCeilingHeight: { value: ceiling },
      uExposure: { value: exposure },
    },
    side,
    fog: false,
  })

import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Shared robot bits.
 *
 * Robots use standard lit materials rather than the scene's painterly shaders:
 * they are small, close to the camera and want soft even shading, which the
 * lab's own lights give for free. Their glowing parts are unlit basic materials
 * so the bloom pass catches them and the eyes actually read as *on*.
 */

const srgb = (hex) => new THREE.Color(hex).convertSRGBToLinear()

/** Matte shell — the main body colour. */
export function useShell(hex, { roughness = 0.62, metalness = 0.06 } = {}) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: srgb(hex),
        roughness,
        metalness,
      }),
    [hex, roughness, metalness],
  )
}

/** Emissive part. `toneMapped: false` keeps it above the bloom threshold. */
export function useGlow(hex) {
  return useMemo(
    () => new THREE.MeshBasicMaterial({ color: srgb(hex), toneMapped: false }),
    [hex],
  )
}

/** Rounded box, used for almost every body part. */
export function RoundedBox({ size = [1, 1, 1], radius = 0.06, ...props }) {
  // Depend on the numbers, not the array: a literal `size={[...]}` prop is a
  // fresh array every render and would rebuild the geometry every frame.
  const [w, h, d] = size
  const geometry = useMemo(() => {
    // Cheap rounding: a box scaled from a high-segment sphere reads soft at the
    // scale these are viewed at, without pulling in a rounded-box dependency.
    const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3)
    const pos = g.attributes.position
    const half = new THREE.Vector3(w / 2, h / 2, d / 2)
    const v = new THREE.Vector3()

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      // Pull each vertex toward the inner box, then push back out along a
      // normalised offset — the corners round, the faces stay flat.
      const inner = new THREE.Vector3(
        THREE.MathUtils.clamp(v.x, -half.x + radius, half.x - radius),
        THREE.MathUtils.clamp(v.y, -half.y + radius, half.y - radius),
        THREE.MathUtils.clamp(v.z, -half.z + radius, half.z - radius),
      )
      const offset = v.clone().sub(inner)
      if (offset.lengthSq() > 1e-8) {
        offset.setLength(radius)
        pos.setXYZ(i, inner.x + offset.x, inner.y + offset.y, inner.z + offset.z)
      }
    }

    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [w, h, d, radius])

  return <mesh geometry={geometry} {...props} />
}

/** A single round glowing eye with a dark socket behind it. */
export function Eye({ position, radius = 0.045, glow, trim, scaleY = 1 }) {
  return (
    <group position={position}>
      <mesh material={trim} position={[0, 0, -0.012]}>
        <sphereGeometry args={[radius * 1.45, 12, 10]} />
      </mesh>
      <mesh material={glow} scale={[1, scaleY, 1]}>
        <sphereGeometry args={[radius, 12, 10]} />
      </mesh>
    </group>
  )
}

/** Thin glowing bar — visors, screens, status strips. */
export function Bar({ position, size = [0.2, 0.03, 0.01], material, ...props }) {
  return (
    <mesh position={position} material={material} {...props}>
      <boxGeometry args={size} />
    </mesh>
  )
}

/** Little antenna with a glowing tip. */
export function Antenna({ position, height = 0.16, shell, glow }) {
  return (
    <group position={position}>
      <mesh material={shell} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, height, 6]} />
      </mesh>
      <mesh material={glow} position={[0, height, 0]}>
        <sphereGeometry args={[0.022, 10, 8]} />
      </mesh>
    </group>
  )
}

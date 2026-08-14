import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { RoundedBox, Eye, Bar, Antenna, useShell, useGlow } from './parts'

/**
 * Six robots, one per model.
 *
 * Each is built from primitives and given an idle animation that says something
 * about the project it stands for — the personality is the point, so silhouette
 * and motion matter more here than part count. Hovering makes each one notice
 * you, in whatever way suits it.
 */

const srgb = (hex) => new THREE.Color(hex).convertSRGBToLinear()

/* ------------------------------------------------------------------ *
 * Flash — FlashAttention. Low, aerodynamic, physically incapable of
 * standing still. Bobs fast and periodically darts sideways.
 * ------------------------------------------------------------------ */
function Flash({ palette, hovered }) {
  const ref = useRef()
  const shell = useShell(palette.body)
  const trim = useShell(palette.trim, { roughness: 0.4 })
  const accent = useShell(palette.accent, { roughness: 0.35, metalness: 0.2 })
  const glow = useGlow(palette.glow)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime

    // A fast hover bob, plus a dart that fires every ~3.2s.
    const dash = Math.sin(t * 1.95) ** 24
    ref.current.position.x = Math.sin(t * 6.3) * 0.012 + dash * Math.sin(t * 30) * 0.09
    ref.current.position.y = 0.11 + Math.sin(t * 5.1) * 0.014
    ref.current.rotation.z = -dash * 0.22
    ref.current.rotation.y = Math.sin(t * 0.8) * 0.12 + (hovered ? 0.25 : 0)
  })

  return (
    <group ref={ref}>
      <RoundedBox size={[0.3, 0.17, 0.46]} radius={0.075} material={shell} />
      {/* Nose cone toward the front. */}
      <mesh material={accent} position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.09, 0.16, 12]} />
      </mesh>
      {/* Visor. */}
      <Bar position={[0, 0.035, 0.2]} size={[0.17, 0.035, 0.02]} material={glow} />
      {/* Tail fins. */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={accent} position={[s * 0.14, 0.06, -0.19]} rotation={[0, 0, s * 0.4]}>
          <boxGeometry args={[0.02, 0.14, 0.12]} />
        </mesh>
      ))}
      {/* Thruster glow. */}
      <mesh material={glow} position={[0, -0.01, -0.245]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.03, 0.02, 12]} />
      </mesh>
      {/* Hover pad — it never touches the plinth. */}
      <mesh material={trim} position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.025, 16]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Sentinel — the PHM model. Heavy, planted, forever sweeping a sensor
 * arm across machinery it is quietly worried about.
 * ------------------------------------------------------------------ */
function Sentinel({ palette, hovered }) {
  const armRef = useRef()
  const needleRef = useRef()
  const bodyRef = useRef()

  const shell = useShell(palette.body)
  const trim = useShell(palette.trim, { roughness: 0.45 })
  const accent = useShell(palette.accent, { roughness: 0.4, metalness: 0.25 })
  const glow = useGlow(palette.glow)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (armRef.current) armRef.current.rotation.y = Math.sin(t * 0.85) * 0.85
    // The gauge needle tracks whatever the arm is pointed at.
    if (needleRef.current) needleRef.current.rotation.z = Math.sin(t * 0.85 + 0.4) * 0.7
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(t * 1.1) * 0.006
      bodyRef.current.rotation.x = hovered ? -0.1 : 0
    }
  })

  return (
    <group ref={bodyRef}>
      <RoundedBox size={[0.42, 0.12, 0.34]} radius={0.05} material={trim} position={[0, 0.06, 0]} />
      <RoundedBox size={[0.32, 0.3, 0.26]} radius={0.06} material={shell} position={[0, 0.27, 0]} />

      {/* Gauge face. */}
      <mesh material={trim} position={[0, 0.29, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 20]} />
      </mesh>
      <mesh material={glow} position={[0, 0.29, 0.146]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.008, 20]} />
      </mesh>
      <group ref={needleRef} position={[0, 0.29, 0.153]}>
        <mesh material={trim} position={[0, 0.035, 0]}>
          <boxGeometry args={[0.012, 0.07, 0.006]} />
        </mesh>
      </group>

      {/* Shoulder and sweeping sensor arm. */}
      <group ref={armRef} position={[0, 0.42, 0]}>
        <mesh material={accent} position={[0.13, 0.02, 0]} rotation={[0, 0, -0.55]}>
          <cylinderGeometry args={[0.022, 0.022, 0.26, 10]} />
        </mesh>
        <mesh material={trim} position={[0.24, 0.11, 0]}>
          <sphereGeometry args={[0.045, 12, 10]} />
        </mesh>
        <mesh material={glow} position={[0.27, 0.13, 0]}>
          <sphereGeometry args={[0.018, 10, 8]} />
        </mesh>
      </group>

      <Antenna position={[-0.11, 0.42, 0]} shell={accent} glow={glow} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Mochi — MeowFM. A cat, obviously. Sits, sways its tail, blinks, and
 * tilts its head when you look at it.
 * ------------------------------------------------------------------ */
function Mochi({ palette, hovered }) {
  const headRef = useRef()
  const tailRef = useRef()
  const leftEye = useRef()
  const rightEye = useRef()

  const shell = useShell(palette.body, { roughness: 0.8 })
  const accent = useShell(palette.accent, { roughness: 0.75 })
  const glow = useGlow(palette.glow)
  const trim = useShell(palette.trim, { roughness: 0.7 })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (tailRef.current) tailRef.current.rotation.z = Math.sin(t * 1.3) * 0.45
    if (headRef.current) {
      headRef.current.rotation.z = hovered ? 0.28 : Math.sin(t * 0.6) * 0.06
      headRef.current.rotation.y = Math.sin(t * 0.42) * 0.16
    }

    // Blink: a brief squash every few seconds, on a sharp power curve so the
    // eyes are open almost all of the time.
    const blink = 1 - Math.sin(t * 0.9) ** 40
    for (const eye of [leftEye.current, rightEye.current]) {
      if (eye) eye.scale.y = blink
    }
  })

  return (
    <group>
      {/* Haunches. */}
      <mesh material={shell} position={[0, 0.16, -0.03]} scale={[1, 0.9, 1.05]}>
        <sphereGeometry args={[0.19, 20, 16]} />
      </mesh>

      {/* Tail: a chain of shrinking spheres, swung from the base. */}
      <group ref={tailRef} position={[0, 0.12, -0.18]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            material={shell}
            position={[0, i * 0.055 + 0.03, -0.03 - i * 0.035]}
          >
            <sphereGeometry args={[0.036 - i * 0.005, 10, 8]} />
          </mesh>
        ))}
      </group>

      <group ref={headRef} position={[0, 0.36, 0.02]}>
        <mesh material={shell}>
          <sphereGeometry args={[0.145, 20, 16]} />
        </mesh>

        {/* Ears, with a pink inner. */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.075, 0.125, 0]} rotation={[0, 0, s * 0.25]}>
            <mesh material={shell}>
              <coneGeometry args={[0.045, 0.09, 10]} />
            </mesh>
            <mesh material={accent} position={[0, -0.004, 0.02]} scale={0.6}>
              <coneGeometry args={[0.045, 0.09, 10]} />
            </mesh>
          </group>
        ))}

        {/*
          Eyes sit proud of the head. The head sphere has radius 0.145, so
          anything placed inside that is simply swallowed — they have to clear
          the surface to read at all.
        */}
        <group ref={leftEye}>
          <Eye position={[-0.058, 0.025, 0.138]} radius={0.03} glow={glow} trim={trim} />
        </group>
        <group ref={rightEye}>
          <Eye position={[0.058, 0.025, 0.138]} radius={0.03} glow={glow} trim={trim} />
        </group>

        {/* Nose. */}
        <mesh material={accent} position={[0, -0.045, 0.15]}>
          <sphereGeometry args={[0.018, 10, 8]} />
        </mesh>
      </group>

      {/* Front paws. */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={shell} position={[s * 0.075, 0.045, 0.13]}>
          <sphereGeometry args={[0.045, 12, 10]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * The Trio — the multi-agent swarm. Three identical units circling a
 * common centre, each on its own phase. No leader, by design.
 * ------------------------------------------------------------------ */
function Swarm({ palette, hovered }) {
  const refs = [useRef(), useRef(), useRef()]

  const shell = useShell(palette.body, { roughness: 0.55 })
  const trim = useShell(palette.accent, { roughness: 0.5 })
  const glow = useGlow(palette.glow)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const radius = hovered ? 0.2 : 0.145

    refs.forEach((ref, i) => {
      if (!ref.current) return
      const phase = (i / 3) * Math.PI * 2 + t * 0.75
      ref.current.position.x = Math.cos(phase) * radius
      ref.current.position.z = Math.sin(phase) * radius
      ref.current.position.y = 0.1 + Math.sin(t * 2.4 + i * 2.1) * 0.022
      // Each unit faces the direction it is travelling.
      ref.current.rotation.y = -phase + Math.PI / 2
    })
  })

  return (
    <group>
      {refs.map((ref, i) => (
        <group key={i} ref={ref}>
          <mesh material={shell}>
            <cylinderGeometry args={[0.062, 0.072, 0.07, 12]} />
          </mesh>
          <mesh material={trim} position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.03, 12]} />
          </mesh>
          <mesh material={glow} position={[0, 0.045, 0.05]}>
            <sphereGeometry args={[0.017, 10, 8]} />
          </mesh>
          {/* Tiny hazard stripe. */}
          <mesh material={trim} position={[0, -0.005, 0]}>
            <cylinderGeometry args={[0.066, 0.066, 0.016, 12]} />
          </mesh>
        </group>
      ))}

      {/* The waste they are tidying up. */}
      <mesh material={trim} position={[0, 0.018, 0]}>
        <icosahedronGeometry args={[0.035, 0]} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Ledger — churn prediction. A walking dashboard. Its bar chart is
 * always busy, and it tilts as though about to deliver bad news gently.
 * ------------------------------------------------------------------ */
function Ledger({ palette, hovered }) {
  const bodyRef = useRef()
  const barRefs = [useRef(), useRef(), useRef(), useRef()]

  const shell = useShell(palette.body)
  const trim = useShell(palette.trim, { roughness: 0.45 })
  const glow = useGlow(palette.glow)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(t * 0.7) * 0.05
      bodyRef.current.rotation.x = hovered ? -0.12 : 0
      bodyRef.current.position.y = Math.sin(t * 1.4) * 0.008
    }

    // Bars settle and re-read, like a live dashboard.
    barRefs.forEach((ref, i) => {
      if (!ref.current) return
      const h = 0.35 + (Math.sin(t * 1.1 + i * 1.7) * 0.5 + 0.5) * 0.65
      ref.current.scale.y = h
      ref.current.position.y = (h * 0.16) / 2
    })
  })

  return (
    <group ref={bodyRef}>
      {/* Base. */}
      <mesh material={trim} position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.07, 16]} />
      </mesh>

      <RoundedBox size={[0.34, 0.4, 0.18]} radius={0.055} material={shell} position={[0, 0.28, 0]} />

      {/* Screen, inset. */}
      <mesh material={trim} position={[0, 0.3, 0.093]}>
        <boxGeometry args={[0.26, 0.24, 0.01]} />
      </mesh>

      {/* Live bars. */}
      <group position={[0, 0.21, 0.1]}>
        {barRefs.map((ref, i) => (
          <mesh key={i} ref={ref} material={glow} position={[(i - 1.5) * 0.055, 0, 0]}>
            <boxGeometry args={[0.032, 0.16, 0.006]} />
          </mesh>
        ))}
      </group>

      {/* Stubby arms. */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={shell} position={[s * 0.2, 0.28, 0]} rotation={[0, 0, s * 0.3]}>
          <capsuleGeometry args={[0.028, 0.1, 4, 8]} />
        </mesh>
      ))}

      <Antenna position={[0, 0.48, 0]} height={0.1} shell={trim} glow={glow} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Tick — the RL trader. Tall, thin, permanently on edge. Its eyes flip
 * green and red with the position it is imagining.
 * ------------------------------------------------------------------ */
function Tick({ palette, hovered }) {
  const bodyRef = useRef()
  const headRef = useRef()

  const shell = useShell(palette.body)
  const trim = useShell(palette.trim, { roughness: 0.4 })

  // One material, recoloured in place — cheaper than swapping meshes, and the
  // flip between long and short is the whole personality.
  const eyeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: srgb('#4ade80'), toneMapped: false }),
    [],
  )
  const up = useMemo(() => srgb('#4ade80'), [])
  const down = useMemo(() => srgb('#f0563f'), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Jittery idle with an occasional startled hop.
    const hop = Math.sin(t * 0.61) ** 30
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.abs(Math.sin(t * 3.1)) * 0.012 + hop * 0.07
      bodyRef.current.rotation.z = Math.sin(t * 2.2) * 0.03
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 1.7) * 0.35 + (hovered ? 0.3 : 0)
      headRef.current.rotation.x = -hop * 0.2
    }

    // The market turns roughly every couple of seconds.
    eyeMaterial.color.copy(Math.sin(t * 0.55) > 0 ? up : down)
  })

  return (
    <group ref={bodyRef}>
      <mesh material={trim} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.06, 14]} />
      </mesh>

      <RoundedBox size={[0.2, 0.42, 0.17]} radius={0.05} material={shell} position={[0, 0.27, 0]} />

      <group ref={headRef} position={[0, 0.56, 0]}>
        <RoundedBox size={[0.25, 0.19, 0.19]} radius={0.055} material={shell} />
        {/* Two screen eyes. */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={eyeMaterial} position={[s * 0.055, 0.01, 0.098]}>
            <boxGeometry args={[0.06, 0.05, 0.008]} />
          </mesh>
        ))}
      </group>

      {/* Thin arms held anxiously close. */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={trim} position={[s * 0.125, 0.3, 0.02]} rotation={[0.3, 0, s * 0.15]}>
          <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
        </mesh>
      ))}
    </group>
  )
}

/** Registry — `robot` in models.js selects one of these. */
export const ROBOTS = {
  flash: Flash,
  sentinel: Sentinel,
  mochi: Mochi,
  swarm: Swarm,
  ledger: Ledger,
  tick: Tick,
}

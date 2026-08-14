import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { terrainHeight } from './heightfield'
import { houseToWorld } from './house-transform'
import { HOUSE_DIMS } from './house-geometry'
import { labToWorld } from './lab-transform'
import { LAB_DIMS } from './lab-geometry'
import { SECTIONS } from '../data/content'
import { useStore } from '../state/store'

/**
 * Camera behaviour.
 *
 * Free orbit by default, with a slow drift so the meadow is never completely
 * still. Opening a marker eases the camera into a framed view of that stone and
 * takes the controls away, so the composition while reading is always one we
 * chose. The studio is the exception: once the camera has settled inside, the
 * controls are handed back so you can turn and look at every wall.
 */

// Aimed into the arc of marker stones rather than at the world origin, so the
// opening shot shows several of them and the "click a stone" affordance is
// discoverable without hunting.
const DEFAULT_TARGET = new THREE.Vector3(-22, 2.6, -16)
const DEFAULT_POSITION = new THREE.Vector3(16, 5.8, 16)

/** How far right of a marker the camera aims, to clear the content panel. */
const PANEL_OFFSET = 3.5

/** Keep the camera above the grass line wherever it ends up. */
const clampToGround = (v, clearance = 2.2) => {
  const min = terrainHeight(v.x, v.z) + clearance
  if (v.y < min) v.y = min
  return v
}

export default function CameraRig() {
  const controlsRef = useRef()
  const previousActive = useRef(null)
  // State, not a ref: this drives the controls' `enabled` prop, and a ref
  // mutation would never re-render to actually hand the controls back.
  const [settled, setSettled] = useState(false)
  const { camera } = useThree()

  const active = useStore((s) => s.active)
  const hovered = useStore((s) => s.hovered)
  const entered = useStore((s) => s.entered)
  const enter = useStore((s) => s.enter)

  // Both buildings behave the same way: ease in, then hand the controls back so
  // you can turn and look around the room.
  const inGallery = active === 'gallery'
  const inLab = active === 'lab'
  const indoors = inGallery || inLab

  const desired = useMemo(
    () => ({ position: new THREE.Vector3(), target: new THREE.Vector3() }),
    [],
  )

  // Resolve the goal pose whenever the active section changes.
  useEffect(() => {
    setSettled(false)

    // Stepping outside: put the camera on the path in front of the building
    // rather than leaving it wherever it was standing indoors, which drops you
    // face-first into the outside of the wall you were just looking at.
    const controls = controlsRef.current
    if (active === null) {
      if (previousActive.current === 'gallery') {
        houseToWorld(0, 3.4, HOUSE_DIMS.depth / 2 + 9, camera.position)
        if (controls) houseToWorld(0, 1.6, HOUSE_DIMS.depth / 2, controls.target)
      } else if (previousActive.current === 'lab') {
        labToWorld(0, 3.6, LAB_DIMS.depth / 2 + 10, camera.position)
        if (controls) labToWorld(0, 1.7, LAB_DIMS.depth / 2, controls.target)
      }
    }
    previousActive.current = active

    if (active === 'gallery') {
      // Just inside the doorway, looking down the room at the back wall.
      houseToWorld(0, 1.75, HOUSE_DIMS.depth / 2 - 1.6, desired.position)
      houseToWorld(0, 1.85, -1.0, desired.target)
      return
    }

    if (active === 'lab') {
      // Inside the glazing, facing the arc of plinths.
      labToWorld(0, 1.8, LAB_DIMS.depth / 2 - 1.6, desired.position)
      labToWorld(0, 1.28, -2.8, desired.target)
      return
    }

    const section = SECTIONS.find((s) => s.id === active)

    if (!section) {
      desired.position.copy(DEFAULT_POSITION)
      desired.target.copy(DEFAULT_TARGET)
      return
    }

    const [x, z] = section.position
    const groundY = terrainHeight(x, z)
    const { distance, height, azimuth } = section.view

    desired.position.set(
      x + Math.sin(azimuth) * distance,
      groundY + height,
      z + Math.cos(azimuth) * distance,
    )
    clampToGround(desired.position)

    // Aim past the stone rather than straight at it. The content panel covers
    // the right of the screen, so looking slightly right of the marker pushes
    // the marker into the visible left half instead of behind the panel.
    const dirX = x - desired.position.x
    const dirZ = z - desired.position.z
    const len = Math.hypot(dirX, dirZ) || 1

    desired.target.set(
      x + (-dirZ / len) * PANEL_OFFSET,
      groundY + 1.4,
      z + (dirX / len) * PANEL_OFFSET,
    )
  }, [active, desired, camera])

  useEffect(() => {
    camera.position.copy(DEFAULT_POSITION)
  }, [camera])

  // A wider lens indoors. Rooms are only a few metres deep, so the outdoor
  // 42mm-equivalent framing can only ever hold two plinths at once; widening
  // lets the whole arc read from the doorway without moving the walls apart.
  useEffect(() => {
    camera.fov = indoors ? 58 : 42
    camera.updateProjectionMatrix()
  }, [camera, indoors])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (active) {
      if (!settled) {
        // Exponential ease — framerate independent, and it settles rather than
        // arriving abruptly the way a fixed lerp factor does.
        const k = 1 - Math.exp(-delta * 3.2)
        camera.position.lerp(desired.position, k)
        controls.target.lerp(desired.target, k)

        // Inside the studio, stop steering once we have arrived so the visitor
        // can look around freely. Outside, the framing stays locked.
        if (indoors && camera.position.distanceTo(desired.position) < 0.25) {
          setSettled(true)
        }
      }
    } else {
      // Free roam: only nudge the orbit centre back, leave position to the user.
      const k = 1 - Math.exp(-delta * 2.0)
      controls.target.lerp(DEFAULT_TARGET, k)
      clampToGround(camera.position)
    }

    controls.update()
  })

  const controlsEnabled = indoors ? settled : !active

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={controlsEnabled}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={indoors ? -0.3 : 0.45}
      zoomSpeed={0.7}
      // Inside, the orbit radius has to stay within the room or the camera
      // punches through a wall — but it must also be large enough to contain
      // the entry pose, or the controls yank the camera forward the instant
      // they are handed back.
      minDistance={indoors ? 0.6 : 8}
      maxDistance={indoors ? 9 : 95}
      minPolarAngle={Math.PI * (indoors ? 0.3 : 0.18)}
      maxPolarAngle={Math.PI * (indoors ? 0.62 : 0.495)}
      onStart={enter}
      // Idle attract only. Rotating under the cursor makes the stones drift
      // away mid-hover, so it stops permanently at the first interaction and
      // pauses whenever a stone is hovered.
      autoRotate={!active && !entered && !hovered}
      autoRotateSpeed={0.18}
    />
  )
}

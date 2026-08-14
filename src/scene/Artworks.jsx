import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { HOUSE_DIMS } from './house-geometry'
import { ARTWORKS } from '../data/artwork'
import useArtworkTexture from './useArtworkTexture'
import { useStore } from '../state/store'

/**
 * Framed pictures on the studio's interior walls.
 *
 * Rendered in the house's local space, so this component must stay a child of
 * the House group. Each frame sizes itself to its image's aspect ratio, which
 * is why the geometry is derived per-piece rather than shared.
 */

const { width: W, depth: D, thickness: t } = HOUSE_DIMS

const INNER_W = W - t * 2
const INNER_D = D - t * 2

/** Longest edge of a canvas, in metres. */
const MAX_EDGE = 1.15
const HANG_HEIGHT = 1.85
const FRAME_BORDER = 0.075

/**
 * Where a piece hangs, given its wall and its index among that wall's pieces.
 *
 * Spacing is derived from how many pieces share the wall rather than fixed per
 * slot, so adding or removing a painting re-centres the whole wall instead of
 * leaving a gap at one end.
 */
const placement = (wall, index, count) => {
  const clearance = 0.05

  // Usable run of the wall, leaving a margin at each corner.
  const extent = wall === 'back' ? INNER_W - 1.5 : INNER_D - 1.8
  const offset = count <= 1 ? 0 : ((index + 0.5) / count - 0.5) * extent

  if (wall === 'back') {
    return { position: [offset, HANG_HEIGHT, -INNER_D / 2 + clearance], rotation: 0 }
  }
  if (wall === 'left') {
    return { position: [-INNER_W / 2 + clearance, HANG_HEIGHT, offset], rotation: Math.PI / 2 }
  }
  return { position: [INNER_W / 2 - clearance, HANG_HEIGHT, offset], rotation: -Math.PI / 2 }
}

function Piece({ art, index, count }) {
  const groupRef = useRef()
  const { texture, aspect } = useArtworkTexture(art)

  const hovered = useStore((s) => s.hoveredArt === art.id)
  const setHoveredArt = useStore((s) => s.setHoveredArt)
  const openArt = useStore((s) => s.openArt)
  const inside = useStore((s) => s.active === 'gallery')

  const { position, rotation } = placement(art.wall, index, count)

  const height = aspect >= 1 ? MAX_EDGE / aspect : MAX_EDGE
  const width = aspect >= 1 ? MAX_EDGE : MAX_EDGE * aspect

  useFrame((_, delta) => {
    if (!groupRef.current) return
    // Lean the frame very slightly off the wall on hover — a small, physical
    // acknowledgement rather than an outline.
    const k = 1 - Math.exp(-delta * 10)
    const target = hovered ? 0.045 : 0
    groupRef.current.position.z += (target - groupRef.current.position.z) * k
  })

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={groupRef}>
        {/* Frame */}
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[width + FRAME_BORDER * 2, height + FRAME_BORDER * 2, 0.05]} />
          <meshBasicMaterial color="#4a3726" toneMapped={false} />
        </mesh>

        {/* Canvas */}
        <mesh
          position={[0, 0, 0.042]}
          onPointerOver={(e) => {
            if (!inside) return
            e.stopPropagation()
            setHoveredArt(art.id)
            document.body.style.cursor = 'zoom-in'
          }}
          onPointerOut={() => {
            setHoveredArt(null)
            document.body.style.cursor = 'auto'
          }}
          onClick={(e) => {
            if (!inside) return
            e.stopPropagation()
            openArt(art.id)
          }}
        >
          <planeGeometry args={[width, height]} />
          {/*
            Basic, not lit: the interior shader already carries the room's
            light, and running paintings through the painterly terminator
            would tint and posterise the artwork itself.
          */}
          <meshBasicMaterial map={texture} toneMapped={false} side={THREE.FrontSide} />
        </mesh>
      </group>
    </group>
  )
}

export default function Artworks() {
  // Group by wall so each piece knows how many neighbours it is sharing with.
  const byWall = ARTWORKS.reduce((acc, art) => {
    ;(acc[art.wall] ||= []).push(art)
    return acc
  }, {})

  return (
    <group>
      {Object.values(byWall).flatMap((wallArt) =>
        wallArt.map((art, index) => (
          <Piece key={art.id} art={art} index={index} count={wallArt.length} />
        )),
      )}
    </group>
  )
}

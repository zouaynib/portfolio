import { useState } from 'react'
import { EffectComposer, GodRays, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import * as THREE from 'three'

import { PALETTE, SUN_DIRECTION } from './palette'
import { useStore } from '../state/store'

/**
 * Atmosphere pass.
 *
 * God rays are the reason the scene is lit from behind: the sun disc is a real
 * mesh far out along the sun direction, and anything between it and the camera
 * (tree crowns, especially) carves the shafts. Bloom then blooms the rim-lit
 * foliage edges, and the vignette keeps attention centred.
 */

const SUN_DISTANCE = 900

export default function Effects() {
  // GodRays needs the sun mesh instance, which only exists after the first
  // render — hence state rather than a ref, so the composer mounts afterwards.
  const [sun, setSun] = useState(null)

  // Indoors the sun disc reads straight through the ceiling: the god-ray pass
  // composites it in screen space, so scene depth does not fully hide it.
  // Hiding the mesh removes both the disc and its shafts, which is right
  // anyway — you should not get god rays while standing in a room.
  const active = useStore((s) => s.active)
  const indoors = active === 'gallery' || active === 'lab'

  const position = SUN_DIRECTION.clone().multiplyScalar(SUN_DISTANCE)

  return (
    <>
      <mesh
        ref={(node) => {
          if (node && node !== sun) setSun(node)
        }}
        position={position}
        frustumCulled={false}
        visible={!indoors}
      >
        <sphereGeometry args={[38, 24, 16]} />
        <meshBasicMaterial
          color={PALETTE.sunCore}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/*
        GodRays samples scene depth. With `disableNormalPass` the composer hands
        it the same depth-stencil attachment it is writing to, and the driver
        rejects the blit ("read and write depth stencil attachments cannot be
        the same image") — which silently drops the entire frame. Letting the
        depth pass exist, and dropping the stencil buffer, keeps the read and
        write targets distinct.
      */}
      {sun && (
        <EffectComposer
          multisampling={0}
          stencilBuffer={false}
          frameBufferType={THREE.HalfFloatType}
        >
          <GodRays
            sun={sun}
            blendFunction={BlendFunction.SCREEN}
            samples={60}
            density={0.96}
            decay={0.92}
            weight={0.36}
            exposure={0.22}
            clampMax={0.85}
            kernelSize={KernelSize.SMALL}
            blur
          />
          <Bloom
            // Threshold kept high so only the sun and the hottest rim pixels
            // bloom. Lower values smear the whole meadow into haze.
            intensity={0.38}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
            kernelSize={KernelSize.LARGE}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.24} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  )
}

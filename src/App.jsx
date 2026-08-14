import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

import Garden from './scene/Garden'
import Overlay from './ui/Overlay'
import Panel from './ui/Panel'
import Lightbox from './ui/Lightbox'
import ModelPanel from './ui/ModelPanel'
import { useStore } from './state/store'
import { PROFILE } from './data/content'

export default function App() {
  const close = useStore((s) => s.close)

  // The name is no longer drawn over the scene, so the browser tab is where it
  // lives. Driven from content.js so there is still only one place to edit it.
  useEffect(() => {
    document.title = PROFILE.name
  }, [])

  return (
    <div className="app">
      <Canvas
        // Far plane must clear the sun disc, which sits 900 units out.
        camera={{ fov: 42, near: 0.1, far: 2000, position: [16, 5.8, 16] }}
        // Capped: the fragment cost of dense grass scales with pixels, and a
        // 3x retina buffer buys almost nothing visually here.
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        // Clicking empty meadow dismisses whatever is open — but only when the
        // click actually landed on the canvas. Without this guard, clicking a
        // nav button opens the section and then immediately closes it again,
        // because the same click also counts as "missed" by the raycaster.
        onPointerMissed={(event) => {
          if (event.target instanceof HTMLCanvasElement) close()
        }}
      >
        <Suspense fallback={null}>
          <Garden />
        </Suspense>
      </Canvas>

      <Overlay />
      <Panel />
      <ModelPanel />
      <Lightbox />
    </div>
  )
}

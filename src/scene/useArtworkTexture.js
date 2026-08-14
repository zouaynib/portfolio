import { useEffect, useState } from 'react'
import * as THREE from 'three'

import { asset } from '../data/asset'

/**
 * Load an artwork image, falling back to a drawn placeholder.
 *
 * The studio has to be walkable before any real images exist, and a missing
 * file must never blank a frame or throw — so a canvas placeholder carrying the
 * expected filename is generated up front and simply replaced if the real image
 * loads. That also makes it obvious which file to drop in where.
 */

const PLACEHOLDER_W = 620
const PLACEHOLDER_H = 780

const drawPlaceholder = (art) => {
  const canvas = document.createElement('canvas')
  canvas.width = PLACEHOLDER_W
  canvas.height = PLACEHOLDER_H
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, PLACEHOLDER_H)
  grad.addColorStop(0, '#efe7d6')
  grad.addColorStop(1, '#ddd0ba')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, PLACEHOLDER_W, PLACEHOLDER_H)

  ctx.strokeStyle = 'rgba(90, 76, 55, 0.42)'
  ctx.lineWidth = 3
  ctx.setLineDash([12, 10])
  ctx.strokeRect(26, 26, PLACEHOLDER_W - 52, PLACEHOLDER_H - 52)
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(74, 62, 44, 0.75)'
  ctx.textAlign = 'center'

  ctx.font = '500 30px Georgia, serif'
  ctx.fillText('artwork', PLACEHOLDER_W / 2, PLACEHOLDER_H / 2 - 26)

  ctx.font = '400 21px ui-monospace, Menlo, monospace'
  ctx.fillStyle = 'rgba(74, 62, 44, 0.55)'
  const file = art.src.split('/').pop()
  ctx.fillText(file, PLACEHOLDER_W / 2, PLACEHOLDER_H / 2 + 22)

  ctx.font = '400 18px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(74, 62, 44, 0.42)'
  ctx.fillText('drop the file into public/artwork/', PLACEHOLDER_W / 2, PLACEHOLDER_H / 2 + 60)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default function useArtworkTexture(art) {
  const [state, setState] = useState(() => {
    const texture = drawPlaceholder(art)
    return { texture, aspect: PLACEHOLDER_W / PLACEHOLDER_H, loaded: false }
  })

  useEffect(() => {
    let cancelled = false

    new THREE.TextureLoader().load(
      asset(art.src),
      (texture) => {
        if (cancelled) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 4
        const { width, height } = texture.image
        setState((prev) => {
          prev.texture.dispose()
          return { texture, aspect: width / height, loaded: true }
        })
      },
      undefined,
      // Missing file is the expected case before any art is added; keep the
      // placeholder and stay silent rather than filling the console.
      () => {},
    )

    return () => {
      cancelled = true
    }
  }, [art.src])

  return state
}

import { useEffect, useState } from 'react'

import { MODELS } from '../data/models'
import { asset } from '../data/asset'
import { useStore } from '../state/store'

/**
 * The panel that opens when you click a robot.
 *
 * Slides in from the same edge as the section panel so the interaction feels
 * like one system, but leads with the robot's name and character line — you
 * clicked a small creature, and it should answer as itself before it turns
 * into a project write-up.
 */
export default function ModelPanel() {
  const openedModel = useStore((s) => s.openedModel)
  const closeModel = useStore((s) => s.closeModel)
  const [imageFailed, setImageFailed] = useState(false)

  const model = MODELS.find((m) => m.id === openedModel)

  useEffect(() => {
    setImageFailed(false)
  }, [openedModel])

  useEffect(() => {
    if (!model) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeModel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [model, closeModel])

  return (
    <div className={`panel ${model ? 'panel--open' : ''}`} aria-hidden={!model}>
      {model && (
        <>
          <button className="panel__close" onClick={closeModel} aria-label="Close">
            ×
          </button>

          <span className="model__name">{model.name}</span>
          <p className="model__character">{model.character}</p>

          <h2 className="panel__heading">{model.title}</h2>
          {model.meta && <span className="panel__item-meta">{model.meta}</span>}

          <p className="panel__body">{model.description}</p>

          {model.image && !imageFailed && (
            <figure className="model__figure">
              <img
                className="model__image"
                src={asset(model.image)}
                alt={model.imageCaption ?? model.title}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
              {model.imageCaption && (
                <figcaption className="model__caption">{model.imageCaption}</figcaption>
              )}
            </figure>
          )}

          {model.link && (
            <a className="model__link" href={model.link} target="_blank" rel="noreferrer">
              View on GitHub →
            </a>
          )}
        </>
      )}
    </div>
  )
}

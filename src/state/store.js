import { create } from 'zustand'

/**
 * Scene + UI state.
 *
 * `active` is the open section id, or the literal 'gallery' when the camera is
 * inside the studio, or null for free roam. `hovered` drives the marker lift;
 * `hoveredArt` / `openArt` are separate because a painting and a stone can be
 * hovered under quite different circumstances and should not fight.
 *
 * Keeping all of it here means the camera rig, the markers, the house and the
 * HTML overlays react to one source without prop drilling through the canvas.
 */
export const useStore = create((set) => ({
  active: null,
  hovered: null,
  hoveredArt: null,
  openedArt: null,
  hoveredModel: null,
  openedModel: null,
  entered: false,

  setHovered: (id) => set({ hovered: id }),
  setHoveredArt: (id) => set({ hoveredArt: id }),
  setHoveredModel: (id) => set({ hoveredModel: id }),

  open: (id) => set({ active: id, hovered: null }),
  // Leaving a room closes whatever was open inside it too, so re-entering
  // never lands you in a stale panel.
  close: () => set({ active: null, openedArt: null, openedModel: null }),

  openArt: (id) => set({ openedArt: id }),
  closeArt: () => set({ openedArt: null }),

  openModel: (id) => set({ openedModel: id }),
  closeModel: () => set({ openedModel: null }),

  enter: () => set({ entered: true }),
}))

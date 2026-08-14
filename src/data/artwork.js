/**
 * Artwork hung inside the studio.
 *
 * These entries were written from the photos you sent, so the titles and wall
 * placement are already set up. What is still missing is the image files
 * themselves — they arrived as chat attachments, which cannot be written to
 * disk, and Instagram is behind a login wall so they could not be fetched
 * either.
 *
 * TO FINISH THE GALLERY
 * ---------------------
 * Save each painting into `public/artwork/` using the exact filename in `src`
 * below. Crop to just the canvas where the photo shows an easel or a table —
 * the frame in the studio is the frame, so background clutter reads as part of
 * the painting. JPG, roughly 1200px on the long edge.
 *
 * Frames size themselves to each image's aspect ratio, so portrait, landscape
 * and square all hang correctly without any further changes.
 *
 * Until a file exists, its frame shows a labelled placeholder naming the file
 * it wants — so you can add them one at a time and watch the room fill up.
 *
 * `wall` is 'back', 'left' or 'right'. Pieces are spaced evenly along whichever
 * wall they are on, in the order they appear in this list.
 *
 * The `description` lines are mine, written from your photos — reword anything
 * that does not sound like you.
 */

export const ARTWORKS = [
  {
    id: 'teapot',
    src: '/artwork/moroccan-teapot.jpg',
    title: 'Lmeqraj and zellige',
    meta: 'Acrylic · 2023',
    description:
      'A brass traditional kettle on a stone step, set against a wall of blue and white zellige with the old studded door just in frame.',
    wall: 'back',
  },
  {
    id: 'blue-door',
    src: '/artwork/blue-door.jpg',
    title: 'Blue door, bougainvillea',
    meta: 'Acrylic · 2023',
    description:
      'A cobalt door in Oudaya sunlit ochre wall, bougainvillea spilling over the top and small white flowers gathering at the step.',
    wall: 'back',
  },
  {
    id: 'lemons',
    src: '/artwork/lemons.jpg',
    title: 'Lemons in blossom',
    meta: 'Acrylic · 2023',
    description:
      'Lemons and orange blossom tangled corner to corner across a turquoise ground.',
    wall: 'back',
  },
  {
    id: 'sunflowers',
    src: '/artwork/sunflowers.jpg',
    title: 'Sunflowers, after Van Gogh',
    meta: 'Acrylic · 2017',
    description:
      "A study after Van Gogh's sunflowers, worked in his palette of yellows and ochres against pale blue.",
    wall: 'left',
  },
  {
    id: 'lilac-jug',
    src: '/artwork/blossoms-lilac-jug.jpg',
    title: 'Blossoms in a lilac jug',
    meta: 'Acrylic · 2016',
    description:
      'Pink blossoms in a pale lilac jug against a warm dark ground. The earliest piece in the room.',
    wall: 'left',
  },
  {
    id: 'seascape',
    src: '/artwork/seascape.jpg',
    title: 'Evening sea',
    meta: 'Acrylic · 2024',
    description:
      'A still horizon at dusk. Deep blue water below, the sky fading from turquoise through to peach.',
    wall: 'left',
  },
  {
    id: 'pink-rose',
    src: '/artwork/pink-rose.jpg',
    title: 'Rose',
    meta: 'Acrylic · 2021',
    description:
      'A single rose held in soft focus, its background dissolved into green and coral.',
    wall: 'right',
  },
  {
    id: 'rose-open',
    src: '/artwork/rose-open.jpg',
    title: 'Rose, opening',
    meta: 'Acrylic · 2021',
    description:
      'A rose caught mid-bloom, white and magenta petals turning outward from a deep green ground.',
    wall: 'right',
  },
]

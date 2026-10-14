/*
  WHERE THE STICKERS GO. Edit freely.

  Each sticker:
    id    : file name in public/media/stickers (without .webp)
    w     : width in pixels on a computer (make it bigger to make it a BIG one)
    wm    : width on a phone (optional, default 96)
    rot   : tilt in degrees
    pos   : where it sits inside its section, as CSS (left/right/top/bottom). Percent or rem both work.
    card  : true = white-bordered photo-style sticker (for the video-like GIFs); false/omitted = cut-out with no frame
    hideOnPhone : true = hidden on small screens (keeps phones uncluttered)

  Every sticker can be dragged, and tapping it makes hearts burst.
  The "parades" are the dancing rows between sections: each is a list of sticker ids that scroll sideways.
*/

export interface Sticker {
  id: string;
  w: number;
  wm?: number;
  rot: number;
  pos: string;
  card?: boolean;
  hideOnPhone?: boolean;
}

// ids that are white-bordered "cards" (opaque videos); everything else is a transparent cut-out
export const CARD_IDS = new Set([
  'aidog', 'aikitten2', 'aikitten3', 'aipoodle', 'bdaycard', 'beachpair', 'corgi', 'dogmirror', 'sinkcats', 'watercat',
  'cat-orange', 'cat-stare', 'cat-silly', 'cat-dance',
]);

const s = (id: string, w: number, rot: number, pos: string, extra: Partial<Sticker> = {}): Sticker => ({
  id, w, rot, pos, card: CARD_IDS.has(id), ...extra,
});

export const stickers: Record<'hello' | 'board' | 'video' | 'quote' | 'cake', Sticker[]> = {
  // next to the round photo and the message
  hello: [
    s('bdaycard', 250, 5, 'right: 1%; top: 1rem;', { wm: 150 }),
    s('aikitten3', 230, -5, 'left: 1%; bottom: 0.5rem;', { wm: 140 }),
    s('orangecartoon', 130, 6, 'left: 41%; top: 1.4rem;', { wm: 80, hideOnPhone: true }),
    s('kittydance', 120, -4, 'right: 5%; bottom: 1.5rem;', { wm: 84 }),
    s('nubcat', 120, -8, 'left: 1%; top: 2rem;', { wm: 76 }),
    s('saxcat', 130, 4, 'right: 42%; bottom: 0.5rem;', { wm: 80, hideOnPhone: true }),
  ],
  // around the polaroids
  board: [
    s('threekit_t', 230, -3, 'right: 1%; top: 0.5rem;', { wm: 130 }),
    s('corgi', 190, 4, 'left: 1%; bottom: 1.5rem;', { wm: 110 }),
    s('floss', 130, 5, 'right: 40%; bottom: 0.5rem;', { wm: 84, hideOnPhone: true }),
    s('maxwell1', 150, -6, 'left: 39%; top: 0.5rem;', { wm: 90, hideOnPhone: true }),
    s('tofuinu', 170, 3, 'right: 1%; bottom: 2rem;', { wm: 104 }),
    s('frugit1', 140, -4, 'left: 24%; bottom: 0.5rem;', { wm: 84 }),
  ],
  // either side of the phone with her video
  video: [
    s('beachpair', 230, -5, 'left: 3%; top: 22%;', { wm: 130 }),
    s('aikitten2', 180, 5, 'right: 3%; top: 20%;', { wm: 104 }),
    s('toothless', 130, -4, 'left: 13%; bottom: 7rem;', { wm: 80 }),
    s('gogalien', 140, 6, 'right: 11%; bottom: 6rem;', { wm: 84 }),
    s('whitecat', 110, -3, 'left: 30%; top: 1rem;', { wm: 70, hideOnPhone: true }),
    s('pochacco2', 110, 4, 'right: 27%; top: 1.5rem;', { wm: 70, hideOnPhone: true }),
  ],
  // around the big quote
  quote: [
    s('dogmirror', 180, -4, 'left: 5%; top: 14%;', { hideOnPhone: true }),
    s('sinkcats', 150, 5, 'right: 5%; top: 12%;', { hideOnPhone: true }),
    s('frugit3', 150, -3, 'left: 18%; bottom: 1rem;', { wm: 84 }),
    s('flycat', 120, 6, 'right: 20%; bottom: 2rem;', { wm: 76 }),
    s('cat-orange', 180, -7, 'left: 44%; top: 0.5rem;', { wm: 100, hideOnPhone: true }),
    // small corner dancers that stay on phones (the tall cards above are desktop-only here)
    s('orangeback', 120, -6, 'left: 3%; top: 0.4rem;', { wm: 80 }),
    s('tofuinu', 110, 5, 'right: 3%; top: 0.2rem;', { wm: 74 }),
  ],
  // around the cake
  cake: [
    s('watercat', 200, -5, 'left: 3%; top: 26%;', { wm: 112 }),
    s('aipoodle', 150, 5, 'right: 3%; top: 24%;', { wm: 92 }),
    s('threegreen', 230, -3, 'left: 6%; bottom: 2.5rem;', { wm: 130 }),
    s('aidog', 140, 4, 'right: 8%; bottom: 2.5rem;', { wm: 88 }),
    s('cat-dance', 190, 6, 'right: 22%; top: 0.5rem;', { wm: 104, hideOnPhone: true }),
    s('cat-stare', 120, -6, 'left: 26%; top: 1rem;', { wm: 76, hideOnPhone: true }),
  ],
};

/* The dancing rows between sections. Edit the lists to change who dances where. */
export const parades: string[][] = [
  ['kittydance', 'tofuinu', 'floss', 'orangecartoon', 'nubcat', 'whitecat', 'flycat'], // after the message
  ['saxcat', 'pochacco2', 'toothless', 'maxwell1', 'gogalien', 'orangeback', 'frugit1'], // after the photos
  ['threekit_t', 'whitecat', 'kittydance', 'tofuinu', 'flycat', 'orangecartoon', 'nubcat'], // after the video
  ['floss', 'gogalien', 'saxcat', 'frugit3', 'orangeback', 'toothless', 'pochacco2'], // after the quote
];

/*
  ALL THE WORDS ON THE SITE LIVE HERE. Edit freely, save, and the page updates.

  - Keep each piece of text inside its quotes. If you want an apostrophe inside single quotes, write \'  (or switch that
    string to double quotes).
  - Add or remove paragraphs and lines by adding or removing items in a [ ... ] list.
  - Everything below is a DRAFT written as a placeholder. Replace any of it.
*/

export const site = {
  title: 'a little spring, for you', // browser tab title
  description: 'A small, soft birthday page.', // only seen if the link is previewed somewhere
};

/*
  THE SCROLL FILM (the first part of the page).
  Each line fades in over the film at a point in the scroll and fades out again.
    from / to : where the line shows, as a number from 0 (top) to 1 (end of the film).
    big       : true = a larger line for the key moments.
  The film runs: road (0 to .37), buds (.33 to .66), pink flower (.62 to .91), then it melts into the paper at .9.
  Keep each line to a short sentence. Lines should not overlap in from/to.
*/
export const filmLines: { text: string; from: number; to: number; big?: boolean }[] = [
  { text: 'somewhere, a road begins to bloom.', from: 0.03, to: 0.15 },
  { text: 'the whole spring leans in close.', from: 0.17, to: 0.31 },
  { text: 'every bud opens in its own time.', from: 0.39, to: 0.55 },
  { text: 'and today, it was your turn.', from: 0.68, to: 0.83, big: true },
  { text: 'happy birthday.', from: 0.845, to: 0.915, big: true },
];

/*
  THE MAIN MESSAGE (sits to the right of her round photo, right after the film).
  This is the one to rewrite in your own words. Add as many paragraphs as you like.
*/
export const message = {
  eyebrow: 'for you', // tiny line above the big heading
  headingTop: 'happy', // first word of the big heading
  headingHighlight: 'birthday', // second word, shown with the pink highlight
  paragraphs: [
    'I hope today feels as soft as that road looked, and as bright as the little buds that just opened.',
    "Live light and live heavy. An old man can pile up a whole worrisome world of advice, and the world is changing, and there's too much to catch up on, but all of that gets shoved aside. So sometimes, let's enjoy ridiculous pages, peaceful growth, and the ability to be clumsily human. Be proper, be light, be without regrets, be clumsy. Make wonderful human mistakes and grow into your potential self, from missing exams to popping pimples.",
    "Live light when it's needed, live heavy when it's needed. Float away like petals for freedom, or get yourself biking down a long, strenuous, strong road with cherry blossoms on the side. We live and bloom for much longer than flowers do. Remember that.",
  ],
  signoff: 'with love', // small line under the message
};

/* THE PHOTO BOARD */
export const board = {
  eyebrow: 'little frames',
  title: 'a few of the good ones',
  // captions under the four polaroids
  captions: {
    p1: 'certified cutie',
    p5: 'that look',
    p4: 'main character, shopping edition',
    p2: 'stars on stars',
  },
};

/* THE VIDEO */
export const video = {
  eyebrow: 'a tiny moment',
  title: 'press play',
  playLabel: 'tap for sound',
};

/* THE BIG QUOTE */
export const quote = {
  small: 'a small announcement:', // the little line above
  big: 'pretty girls were born today.', // the big line
};

/* THE CAKE */
export const cake = {
  eyebrow: 'make a wish',
  title: 'blow out the candles',
  instructions: 'blow with your voice, or tap the flames.', // shown before she starts
  allOut: 'all out. now make a wish.', // shown when every candle is out
  wish: 'may this year be gentle with you, and sweet, and a little bit ridiculous.', // the wish that appears at the end
  privacy: 'The microphone is only listened to on your device while you blow. Nothing is recorded or sent anywhere.',
};

/* THE FOOTER. Left empty on purpose; add lines here if you ever want small print at the bottom.
   (Credits for the clips, fonts and stickers live in ATTRIBUTIONS.md in the repo.) */
export const footer: string[] = [];

/* The little pill that appears for a few seconds right after the page opens. */
export const hints = {
  desktop: 'psst: double-click anywhere',
  phone: 'psst: double-tap anywhere',
};

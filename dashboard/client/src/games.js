// The Parlor lineup. Each tile draws its name, tagline, accent and logo from
// here — edit this list to add or re-theme a game. `accent` tints the tile's
// glow and border; the tile shows the game's real logo from
// client/public/logos/<slug>.png.
export const GAMES = [
  {
    slug: 'coup',
    name: 'Coup',
    tagline: 'Bluff, challenge, and outwit your rivals.',
    accent: '#c0392f',          // velvet oxblood + gilt
    motif: 'coup',
    players: '2–6',
    url: 'http://localhost:3001',
    basedOn: 'Coup',
  },
  {
    slug: 'nightfall',
    name: 'Nightfall',
    tagline: 'One night, one vote, trust no one by morning.',
    accent: '#8a93e8',          // indigo & silver moonlight
    motif: 'nightfall',
    players: '3–8',
    url: 'http://localhost:3002',
    basedOn: 'One Night Ultimate Werewolf',
  },
  {
    slug: 'cipher',
    name: 'Cipher',
    tagline: 'Two spymasters, one word, find your agents first.',
    accent: '#e0564f',          // ink black, red/blue teams, brass
    motif: 'cipher',
    players: '4–8',
    url: 'http://localhost:3003',
    basedOn: 'Codenames',
  },
  {
    slug: 'council',
    name: 'The Council',
    tagline: 'Loyalists and saboteurs vie for control.',
    accent: '#5fae7e',          // forest green + brass + wax seals
    motif: 'council',
    players: '5–10',
    url: 'http://localhost:3004',
    basedOn: 'Secret Hitler',
  },
  {
    slug: 'undercover',
    name: 'Undercover',
    tagline: 'Everyone knows the place. Except one.',
    accent: '#e8e8ec',          // film-noir B/W + neon
    motif: 'undercover',
    players: '3–8',
    url: 'http://localhost:3005',
    basedOn: 'Spyfall',
  },
  {
    slug: 'sealed',
    name: 'Sealed',
    tagline: 'Win the court’s heart with a single card.',
    accent: '#e7a6bf',          // blush + rose-gold rococo
    motif: 'sealed',
    players: '2–6',
    url: 'http://localhost:3006',
    basedOn: 'Love Letter',
  },
  {
    slug: 'quest',
    name: 'Quest',
    tagline: 'Five quests, hidden traitors, one seer.',
    accent: '#6f9fd8',          // steel blue + crimson + gold
    motif: 'quest',
    players: '5–10',
    url: 'http://localhost:3007',
    basedOn: 'Avalon / The Resistance',
  },
  {
    slug: 'intercept',
    name: 'Intercept',
    tagline: 'Transmit the code. Don’t get intercepted.',
    accent: '#4fe08a',          // terminal green on black + amber
    motif: 'intercept',
    players: '4–8',
    url: 'http://localhost:3008',
    basedOn: 'Decrypto',
  },
];

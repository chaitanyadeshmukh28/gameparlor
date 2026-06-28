// UI-facing metadata. The server is authoritative for rules; this is just
// labels, colors, and copy for the interface.

export const CHARACTERS = {
  duke:       { name: 'Duke',       color: '#8a5cc4', tag: 'duke',       ability: 'Tax — take 3 coins.',            counter: 'Blocks Foreign Aid.' },
  assassin:   { name: 'Assassin',   color: '#cf3b4b', tag: 'assassin',   ability: 'Pay 3 to assassinate.',          counter: '—' },
  captain:    { name: 'Captain',    color: '#2f95a8', tag: 'captain',    ability: 'Steal 2 coins.',                 counter: 'Blocks stealing.' },
  ambassador: { name: 'Ambassador', color: '#4f9a5a', tag: 'ambassador', ability: 'Exchange cards with the deck.',  counter: 'Blocks stealing.' },
  contessa:   { name: 'Contessa',   color: '#e08236', tag: 'contessa',   ability: '—',                              counter: 'Blocks assassination.' },
};

export const ACTIONS = {
  income:      { label: 'Income',      hint: 'Take 1 coin.',                     claim: null,         danger: false },
  foreign_aid: { label: 'Foreign Aid', hint: 'Take 2 coins. Duke can block.',    claim: null,         danger: false },
  tax:         { label: 'Tax',         hint: 'Take 3 coins.',                    claim: 'duke',       danger: false },
  exchange:    { label: 'Exchange',    hint: 'Swap cards with the court deck.',  claim: 'ambassador', danger: false },
  steal:       { label: 'Steal',       hint: 'Take 2 coins from a rival.',       claim: 'captain',    danger: false, needsTarget: true },
  assassinate: { label: 'Assassinate', hint: 'Pay 3 to strike down a card.',     claim: 'assassin',   danger: true,  needsTarget: true, cost: 3 },
  coup:        { label: 'Coup',        hint: 'Pay 7. Unstoppable.',              claim: null,         danger: true,  needsTarget: true, cost: 7 },
};

export const charColor = (c) => (CHARACTERS[c]?.color ?? '#c9a227');
export const charName = (c) => (CHARACTERS[c]?.name ?? c);
export const actionLabel = (a) => (ACTIONS[a]?.label ?? a);

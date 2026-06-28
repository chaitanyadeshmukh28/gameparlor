// Shared client-side metadata: team identities and tile palette.

export const TEAMS = {
  red:  { name: 'Red', label: 'Red Command',  hex: '#c4453f', bright: '#e2615a', deep: '#7e2420' },
  blue: { name: 'Blue', label: 'Blue Command', hex: '#3f7bc4', bright: '#5b9bdf', deep: '#234d80' },
};

// Visual treatment per revealed tile identity.
export const TILE = {
  red:      { hex: '#c4453f', ink: '#1c0f0e', label: 'Red agent' },
  blue:     { hex: '#3f7bc4', ink: '#0d1320', label: 'Blue agent' },
  neutral:  { hex: '#b9a888', ink: '#181408', label: 'Bystander' },
  assassin: { hex: '#0c0c0f', ink: '#f0dada', label: 'Assassin' },
};

export const other = (t) => (t === 'red' ? 'blue' : 'red');

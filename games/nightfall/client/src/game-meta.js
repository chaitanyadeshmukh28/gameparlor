// UI-facing role metadata. The server is authoritative for rules; this is just
// labels, colors, and flavor copy. The PRIMARY name is the standard One Night
// Ultimate Werewolf role; `flavor` is an optional nocturnal nickname.
export const ROLES = {
  werewolf: {
    name: 'Werewolf', flavor: 'Nightclaw', team: 'werewolf', color: '#d65668', order: 1,
    blurb: 'A beast in human skin. Win if the village spares every wolf.',
    night: 'Wake with the other Werewolves and learn each other. A lone wolf may glimpse one center card.',
  },
  seer: {
    name: 'Seer', flavor: 'Stargazer', team: 'village', color: '#8ea2ff', order: 2,
    blurb: 'Reads the truth in the stars.',
    night: "Look at one player's card, or two of the three center cards.",
  },
  robber: {
    name: 'Robber', flavor: 'Prowler', team: 'village', color: '#54c2b0', order: 3,
    blurb: 'Steals a life from under your nose.',
    night: "Swap your card with another player's, then look at your new role.",
  },
  troublemaker: {
    name: 'Troublemaker', flavor: 'Meddler', team: 'village', color: '#e8a24e', order: 4,
    blurb: 'Delights in swapping fates.',
    night: "Swap two other players' cards — without looking at either.",
  },
  insomniac: {
    name: 'Insomniac', flavor: 'Sleepless', team: 'village', color: '#b89bf0', order: 5,
    blurb: 'Lies awake and checks on herself.',
    night: 'At the very end of the night, look at your own (possibly changed) card.',
  },
  villager: {
    name: 'Villager', flavor: 'Hearthkeeper', team: 'village', color: '#9fb0d8', order: 6,
    blurb: 'No powers — only your wits and your voice.',
    night: 'Sleep soundly. You take no night action.',
  },
  tanner: {
    name: 'Tanner', flavor: 'Outcast', team: 'outcast', color: '#9aa95e', order: 7,
    blurb: 'Despised by all. Wins only by being voted out.',
    night: 'Sleep. You take no night action.',
  },
};

export const TEAMS = {
  village: { label: 'the Village', color: '#8ea2ff' },
  werewolf: { label: 'the Werewolves', color: '#d65668' },
  outcast: { label: 'the Tanner', color: '#9aa95e' },
  none: { label: 'no one', color: '#9fb0d8' },
};

export const roleName = (k) => ROLES[k]?.name ?? k;
export const roleFlavor = (k) => ROLES[k]?.flavor ?? '';
export const roleColor = (k) => ROLES[k]?.color ?? '#9fb0d8';
export const roleTeam = (k) => ROLES[k]?.team ?? 'village';

// Render a private night-knowledge entry into a readable line.
export function infoLine(entry) {
  switch (entry.k) {
    case 'wolves':
      return entry.names.length
        ? `Your fellow Werewolves: ${entry.names.join(', ')}.`
        : (entry.lone ? 'You hunt alone — no other Werewolf woke.' : 'No fellow Werewolves stirred.');
    case 'wolf-peek':
      return `You glimpsed a center card: the ${roleName(entry.role)}.`;
    case 'seer-player':
      return `${entry.name} holds the ${roleName(entry.role)}.`;
    case 'seer-center':
      return `Center cards seen: ${entry.roles.map(roleName).join(' & ')}.`;
    case 'robber':
      return `You robbed ${entry.name}; you now hold the ${roleName(entry.role)}.`;
    case 'troublemaker':
      return `You swapped ${entry.a} and ${entry.b}.`;
    case 'insomniac':
      return `You wake holding the ${roleName(entry.role)}.`;
    case 'skip':
      return 'You chose not to act.';
    default:
      return '';
  }
}

// Third-person recap of a night action, shown to everyone at the result.
export function recapLine(e) {
  switch (e.k) {
    case 'wolves':
      return e.names.length > 1
        ? `${e.names.join(' & ')} woke as Werewolves and recognized each other.`
        : `${e.names[0]} woke as the lone Werewolf.`;
    case 'wolf-peek':
      return `${e.actor}, hunting alone, peeked a center card: the ${roleName(e.role)}.`;
    case 'seer-player':
      return `${e.actor} (Seer) studied ${e.name}'s card — the ${roleName(e.role)}.`;
    case 'seer-center':
      return `${e.actor} (Seer) studied two center cards — ${e.roles.map(roleName).join(' & ')}.`;
    case 'robber':
      return `${e.actor} (Robber) robbed ${e.name} and became the ${roleName(e.role)}.`;
    case 'troublemaker':
      return `${e.actor} (Troublemaker) swapped ${e.a} and ${e.b}'s cards.`;
    case 'insomniac':
      return `${e.actor} (Insomniac) woke to find they now held the ${roleName(e.role)}.`;
    case 'skip':
      return `${e.actor} (${roleName(e.role)}) chose not to act.`;
    default:
      return '';
  }
}

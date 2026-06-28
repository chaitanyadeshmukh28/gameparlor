// Quest — authoritative game engine (mechanics based on The Resistance: Avalon).
// Pure logic, no networking. The server drives it; clients only ever receive a
// per-player redacted view (see gameView). Original theme: Arthurian heraldry.
import { BaseGame } from './base-game.js';

// ---- composition tables (by player count 5–10) ---------------------------
export const EVIL_COUNT = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };

// Required team size for each of the five quests.
export const TEAM_SIZES = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

// The 4th quest (index 3) needs TWO fails to fail when 7+ players are seated.
export const failsNeeded = (questIndex, n) => (questIndex === 3 && n >= 7 ? 2 : 1);

// ---- role metadata (canonical Avalon names; classic powers) ----------------
export const ROLES = {
  merlin:   { team: 'good', name: 'Merlin',                  subtitle: 'The Seer',          blurb: 'You behold the Minions of Mordred. Guide the realm — but stay hidden, for the Assassin hunts you.' },
  percival: { team: 'good', name: 'Percival',               subtitle: 'Guardian of Merlin', blurb: 'You have glimpsed Merlin and Morgana — one true, one false. Trust the right one.' },
  loyal:    { team: 'good', name: 'Loyal Servant of Arthur', subtitle: 'Knight of the Realm', blurb: 'A true servant of Arthur. You know no secrets — judge by deeds alone.' },
  assassin: { team: 'evil', name: 'Assassin',                subtitle: 'Mordred’s Blade',    blurb: 'You serve Mordred. If the realm prevails, you may still strike down Merlin and seize the day.' },
  morgana:  { team: 'evil', name: 'Morgana',                 subtitle: 'The False Merlin',   blurb: 'You serve Mordred, cloaked in Merlin’s false aura to deceive Percival.' },
  minion:   { team: 'evil', name: 'Minion of Mordred',       subtitle: 'Agent of the Shadow', blurb: 'You serve Mordred. Sabotage the quests without being unmasked.' },
};

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 5;
    this.maxPlayers = 10;
    this.resetState();
  }

  resetState() {
    this.leaderIndex = 0;
    this.questIndex = 0;       // 0..4
    this.rejectCount = 0;      // consecutive rejected proposals this quest
    this.results = [];         // 'success' | 'fail' per completed quest
    this.proposal = null;      // [playerId,...] current proposed team
    this.votes = {};           // playerId -> true(approve)/false(reject)
    this.lastVote = null;      // { votes, approved, leader }
    this.questCards = {};       // teamMemberId -> true(success)/false(fail)
    this.lastQuest = null;     // { failCount, passed, needed, size }
    this.assassinTarget = null;
    this.winner = null;        // 'good' | 'evil'
    this.reason = null;        // flavor sentence
    this.winPath = null;       // machine code: 'assassin_miss' | 'assassin_hit' | 'three_fails' | 'five_rejects'
  }

  // ---- setup ---------------------------------------------------------------
  setup() {
    const n = this.players.length;
    const evilN = EVIL_COUNT[n];
    const goodN = n - evilN;

    const evilRoles = ['assassin', 'morgana', ...Array(Math.max(0, evilN - 2)).fill('minion')];
    const goodRoles = ['merlin', 'percival', ...Array(Math.max(0, goodN - 2)).fill('loyal')];
    const roles = shuffle([...evilRoles, ...goodRoles]);

    this.players.forEach((p, i) => {
      p.role = roles[i];
      p.team = ROLES[roles[i]].team;
      p.ready = false;
    });

    this.resetState();
    this.leaderIndex = Math.floor(Math.random() * n);
    this.phase = 'reveal';
    this.note('The roles are dealt. Study what you know.');
    return {};
  }

  cleanup() {
    for (const p of this.players) { delete p.role; delete p.team; delete p.ready; }
    this.resetState();
  }

  // ---- helpers -------------------------------------------------------------
  get n() { return this.players.length; }
  leader() { return this.players[this.leaderIndex]; }
  teamSize() { return TEAM_SIZES[this.n]?.[this.questIndex] ?? 0; }
  needed() { return failsNeeded(this.questIndex, this.n); }
  successes() { return this.results.filter((r) => r === 'success').length; }
  fails() { return this.results.filter((r) => r === 'fail').length; }
  evilPlayers() { return this.players.filter((p) => p.team === 'evil'); }

  nextLeader() {
    let i = this.leaderIndex;
    for (let k = 0; k < this.n; k++) {
      i = (i + 1) % this.n;
      if (this.players[i].connected) break;
    }
    this.leaderIndex = i;
  }

  endGame(winner, reason, winPath) {
    this.winner = winner;
    this.reason = reason;
    this.winPath = winPath;
    this.phase = 'over';
    this.proposal = null;
    this.note(reason);
  }

  // What a given player knows at night (computed; never stored raw on others).
  knowledgeFor(p) {
    if (p.role === 'merlin') {
      const ids = this.evilPlayers().map((e) => e.id);
      return { title: 'The Minions of Mordred', ids, hint: 'These souls serve Mordred.' };
    }
    if (p.role === 'percival') {
      const ids = this.players.filter((x) => x.role === 'merlin' || x.role === 'morgana').map((x) => x.id);
      return { title: 'Merlin or Morgana', ids: shuffle([...ids]), hint: 'One is the true Merlin; one is Morgana in disguise.' };
    }
    if (p.team === 'evil') {
      const ids = this.evilPlayers().filter((e) => e.id !== p.id).map((e) => e.id);
      return { title: 'Your fellow Minions of Mordred', ids, hint: 'Together you serve Mordred.' };
    }
    return { title: 'You walk in the dark', ids: [], hint: 'You know no secrets. Judge by deeds.' };
  }

  // ---- message handling ----------------------------------------------------
  handleMessage(playerId, msg) {
    const me = this.byId(playerId);
    if (!me) return { error: 'Unknown player.' };

    switch (msg.t) {
      case 'ready':       return this.onReady(me);
      case 'propose':     return this.onPropose(me, msg.team);
      case 'vote':        return this.onVote(me, !!msg.approve);
      case 'play':        return this.onPlay(me, !!msg.success);
      case 'assassinate': return this.onAssassinate(me, msg.target);
      case 'proceed':     return this.onProceed(me);
      default:            return { error: 'Unknown action.' };
    }
  }

  onReady(me) {
    if (this.phase !== 'reveal') return { error: 'Nothing to acknowledge right now.' };
    me.ready = true;
    const pending = this.players.filter((p) => p.connected && !p.ready);
    if (pending.length === 0) {
      this.phase = 'propose';
      this.proposal = null;
      this.note(`${this.leader().name} leads the first quest.`);
    }
    return {};
  }

  onPropose(me, team) {
    if (this.phase !== 'propose') return { error: 'It is not time to propose a team.' };
    if (me.id !== this.leader().id) return { error: 'Only the Leader may propose the team.' };
    if (!Array.isArray(team)) return { error: 'Choose a team.' };
    const size = this.teamSize();
    const uniq = [...new Set(team)];
    if (uniq.length !== size) return { error: `This quest needs exactly ${size} on the team.` };
    if (!uniq.every((id) => this.byId(id))) return { error: 'That player is not at the table.' };
    this.proposal = uniq;
    this.votes = {};
    this.phase = 'vote';
    this.note(`${me.name} proposes a team of ${size}.`);
    return {};
  }

  onVote(me, approve) {
    if (this.phase !== 'vote') return { error: 'There is no team to vote on.' };
    this.votes[me.id] = approve;
    // Everyone votes (Avalon majority is over the whole table). Resolve once all in.
    const voters = this.players.filter((p) => p.connected);
    if (voters.every((p) => this.votes[p.id] !== undefined)) this.resolveVote();
    return {};
  }

  resolveVote() {
    const approves = Object.values(this.votes).filter(Boolean).length;
    const approved = approves * 2 > this.n; // strict majority; ties reject
    this.lastVote = { votes: { ...this.votes }, approved, leader: this.leader().id };
    this.phase = 'voteReveal';
    this.note(approved ? 'The team is approved.' : 'The team is rejected.');
  }

  onPlay(me, success) {
    if (this.phase !== 'quest') return { error: 'No quest is underway.' };
    if (!this.proposal.includes(me.id)) return { error: 'You are not on this quest.' };
    // The loyal cannot betray their own quest.
    const card = me.team === 'good' ? true : success;
    this.questCards[me.id] = card;
    if (this.proposal.every((id) => this.questCards[id] !== undefined)) this.resolveQuest();
    return {};
  }

  resolveQuest() {
    const cards = this.proposal.map((id) => this.questCards[id]);
    const failCount = cards.filter((c) => c === false).length;
    const needed = this.needed();
    const passed = failCount < needed;
    this.lastQuest = { failCount, passed, needed, size: this.proposal.length };
    this.phase = 'questReveal';
    this.note(passed ? 'The quest succeeds!' : `The quest fails (${failCount} betrayal${failCount === 1 ? '' : 's'}).`);
  }

  onProceed(me) {
    if (this.phase === 'voteReveal') return this.afterVoteReveal();
    if (this.phase === 'questReveal') return this.afterQuestReveal();
    return {}; // harmless no-op (avoids error spam if several tap continue)
  }

  afterVoteReveal() {
    const approved = this.lastVote.approved;
    this.lastVote = null;
    if (approved) {
      this.rejectCount = 0;
      this.questCards = {};
      this.phase = 'quest';
      return {};
    }
    this.rejectCount += 1;
    if (this.rejectCount >= 5) {
      this.endGame('evil', 'Five teams rejected in a row — the realm collapses into discord. The shadow wins.', 'five_rejects');
      return {};
    }
    this.nextLeader();
    this.proposal = null;
    this.phase = 'propose';
    this.note(`Leadership passes to ${this.leader().name}.`);
    return {};
  }

  afterQuestReveal() {
    this.results.push(this.lastQuest.passed ? 'success' : 'fail');
    this.lastQuest = null;
    this.rejectCount = 0;
    this.proposal = null;
    this.questCards = {};

    if (this.fails() >= 3) {
      this.endGame('evil', 'Three quests have fallen to betrayal. The shadow wins.', 'three_fails');
      return {};
    }
    if (this.successes() >= 3) {
      this.phase = 'assassin';
      this.note('The realm has triumphed — but the Assassin rises for one final strike.');
      return {};
    }
    this.questIndex += 1;
    this.nextLeader();
    this.phase = 'propose';
    this.note(`Quest ${this.questIndex + 1} begins. ${this.leader().name} leads.`);
    return {};
  }

  onAssassinate(me, targetId) {
    if (this.phase !== 'assassin') return { error: 'The Assassin cannot strike now.' };
    if (me.role !== 'assassin') return { error: 'Only the Assassin may strike.' };
    const target = this.byId(targetId);
    if (!target || target.team !== 'good') return { error: 'Choose a member of the realm to strike.' };
    this.assassinTarget = target.id;
    if (target.role === 'merlin') {
      this.endGame('evil', `The Assassin struck true — ${target.name} was Merlin. Mordred snatches victory.`, 'assassin_hit');
    } else {
      this.endGame('good', `The Assassin struck ${target.name}, but missed Merlin. The realm is saved!`, 'assassin_miss');
    }
    return {};
  }

  // ---- per-player redacted view -------------------------------------------
  gameView(id) {
    const me = this.byId(id);
    const over = this.phase === 'over';
    const n = this.n;

    const players = this.players.map((p) => {
      const showRole = over || p.id === id;
      return {
        id: p.id,
        name: p.name,
        connected: p.connected,
        isLeader: this.phase !== 'lobby' && p.id === this.leader()?.id,
        onTeam: this.proposal ? this.proposal.includes(p.id) : false,
        hasVoted: this.phase === 'vote' ? this.votes[p.id] !== undefined : false,
        playedQuest: this.phase === 'quest' && this.proposal ? this.questCards[p.id] !== undefined : false,
        // Identity is redacted unless it's you, or the game is over.
        role: showRole ? p.role : null,
        team: showRole ? p.team : null,
      };
    });

    return {
      you: id,
      n,
      // your private dossier
      yourRole: me?.role ? { ...ROLES[me.role], key: me.role } : null,
      yourTeam: me?.team ?? null,
      knowledge: me && this.phase !== 'lobby' ? this.knowledgeFor(me) : null,
      ready: !!me?.ready,
      allReady: this.players.filter((p) => p.connected).every((p) => p.ready),

      // public board
      players,
      leader: this.leader()?.id ?? null,
      questIndex: this.questIndex,
      teamSize: this.teamSize(),
      needed: this.needed(),
      rejectCount: this.rejectCount,
      results: this.results.slice(),
      teamSizes: TEAM_SIZES[n] || [],
      successes: this.successes(),
      fails: this.fails(),

      // current proposal / votes (votes hidden until the reveal)
      proposal: this.proposal ? this.proposal.slice() : null,
      voteProgress: this.phase === 'vote'
        ? this.players.filter((p) => p.connected && this.votes[p.id] !== undefined).length : 0,
      yourVote: this.phase === 'vote' && this.votes[id] !== undefined ? this.votes[id] : null,
      lastVote: this.lastVote ? { approved: this.lastVote.approved, votes: { ...this.lastVote.votes }, leader: this.lastVote.leader } : null,

      // quest (individual cards NEVER revealed; only the tally)
      onQuest: this.proposal ? this.proposal.includes(id) : false,
      yourCard: this.phase === 'quest' && this.questCards[id] !== undefined ? this.questCards[id] : null,
      questProgress: this.phase === 'quest' && this.proposal
        ? this.proposal.filter((pid) => this.questCards[pid] !== undefined).length : 0,
      lastQuest: this.lastQuest ? { ...this.lastQuest } : null,

      // assassin / endgame
      assassin: (this.phase === 'assassin' || over) ? this.players.find((p) => p.role === 'assassin')?.id ?? null : null,
      assassinTarget: this.assassinTarget,
      merlin: over ? this.players.find((p) => p.role === 'merlin')?.id ?? null : null,
      winner: this.winner,
      reason: this.reason,
      winPath: this.winPath,
    };
  }
}

// Undercover — original location & role set (NOT copied from any published list).
// Each location carries exactly 7 role names so a full 8-player table (7 non-spies)
// gets distinct cover roles. Roles are flavor only; the real "spy" is dealt
// separately by the engine. Tone: 1940s film-noir.

export const LOCATIONS = [
  { name: 'Midnight Jazz Club',     roles: ['Bandleader', 'Torch Singer', 'Bartender', 'Bouncer', 'Cigarette Girl', 'Late Regular', 'House Pianist'] },
  { name: 'Overnight Express',      roles: ['Conductor', 'Sleeping-Car Porter', 'Dining Steward', 'Stowaway', 'First-Class Passenger', 'Engineer', 'Telegraph Boy'] },
  { name: 'Rain-Soaked Docks',      roles: ['Harbormaster', 'Dock Foreman', 'Smuggler', 'Net Mender', 'Customs Officer', 'Deckhand', 'Lamplighter'] },
  { name: 'The Grand Hotel',        roles: ['Concierge', 'Bellhop', 'Night Manager', 'Housekeeper', 'Lounge Pianist', 'Valet', 'House Detective'] },
  { name: 'Newspaper Office',       roles: ['Editor-in-Chief', 'Crime Reporter', 'Typesetter', 'Copy Boy', 'Staff Photographer', 'Gossip Columnist', 'Press Operator'] },
  { name: 'Police Precinct',        roles: ['Desk Sergeant', 'Detective', 'Beat Cop', 'Forensics Tech', 'Booking Clerk', 'Precinct Captain', 'Paid Informant'] },
  { name: 'Boxing Gym',             roles: ['Trainer', 'Heavyweight', 'Cutman', 'Promoter', 'Back-Room Bookie', 'Sparring Partner', 'Ring Announcer'] },
  { name: 'Casino Floor',           roles: ['Pit Boss', 'Croupier', 'High Roller', 'Card Counter', 'Cocktail Server', 'Security Chief', 'Cashier'] },
  { name: 'Studio Backlot',         roles: ['Director', 'Leading Lady', 'Stunt Double', 'Boom Operator', 'Set Carpenter', 'Script Girl', 'Gaffer'] },
  { name: 'The Speakeasy',          roles: ['Barkeep', 'Doorman', 'Flapper', 'Mob Accountant', 'Trumpet Player', 'Street Lookout', 'Bathtub Distiller'] },
  { name: 'Hilltop Observatory',    roles: ['Astronomer', 'Night Custodian', 'Graduate Student', 'Scope Operator', 'Visiting Lecturer', 'Plate Archivist', 'Groundskeeper'] },
  { name: 'Subway Platform',        roles: ['Token Clerk', 'Busker', 'Transit Cop', 'Rush Commuter', 'Track Worker', 'Pickpocket', 'Motorman'] },
  { name: 'Museum After Hours',     roles: ['Curator', 'Night Guard', 'Forger', 'Restorer', 'Late Patron', 'Docent', 'Alarm Technician'] },
  { name: 'Cargo Freighter',        roles: ['Captain', 'First Mate', 'Stoker', 'Galley Cook', 'Radio Operator', 'Stowaway', 'Cargo Inspector'] },
  { name: 'Mountain Sanatorium',    roles: ['Head Physician', 'Convalescent', 'Night Nurse', 'Visiting Relative', 'Orderly', 'Pharmacist', 'Groundskeeper'] },
  { name: 'Radio Station',          roles: ['On-Air Announcer', 'Foley Artist', 'Station Manager', "Sponsor's Rep", 'Sound Engineer', 'Scriptwriter', 'Switchboard Girl'] },
  { name: 'The Racetrack',          roles: ['Jockey', 'Tout', 'Stable Hand', 'Bookmaker', 'Race Steward', 'Groom', 'Concession Vendor'] },
  { name: 'Department Store',       roles: ['Floorwalker', 'Perfume Girl', 'Stockroom Clerk', 'Window Dresser', 'Store Detective', 'Elevator Operator', 'House Tailor'] },
  { name: 'The Train Yard',         roles: ['Switchman', 'Drifter', 'Yardmaster', 'Brakeman', 'Rail Inspector', 'Coal Loader', 'Signal Operator'] },
  { name: 'Cabaret Theater',        roles: ['Emcee', 'Chorus Dancer', 'Stagehand', 'Ticket Taker', 'Spotlight Operator', 'Costume Mistress', 'Front-Row Heckler'] },
  { name: 'Fishing Trawler',        roles: ['Skipper', 'Deckhand', 'Net Boss', 'Gutter', 'Radio Man', 'Greenhorn', 'Ship Cook'] },
  { name: 'The Embassy Ball',       roles: ['Ambassador', 'Attaché', 'Translator', 'Banquet Waiter', 'Security Detail', 'Visiting Socialite', 'Coat-Check Girl'] },
  { name: 'Smoky Pool Hall',        roles: ['Hustler', 'Rack Boy', 'House Pro', 'Floating Bookie', 'Bartender', 'Regular', 'Cue-Maker'] },
  { name: 'Telephone Exchange',     roles: ['Switchboard Operator', 'Floor Supervisor', 'Line Repairman', 'Night Clerk', 'New Trainee', 'Wiretap Man', 'Maintenance'] },
  { name: 'The Bank Vault',         roles: ['Branch Manager', 'Head Teller', 'Armored-Car Guard', 'Safecracker', 'Outside Auditor', 'Loan Officer', 'Night Janitor'] },
  { name: 'Foggy Lighthouse',       roles: ['Keeper', 'Assistant Keeper', 'Supply Boatman', 'Radio Operator', 'Coastal Inspector', 'Castaway', 'Gull-Watcher'] },
  { name: 'Tattoo Parlor',          roles: ['Lead Artist', 'Apprentice', 'Shore-Leave Sailor', 'Walk-In', 'Shop Owner', 'Piercer', 'Inked Regular'] },
  { name: 'The Funeral Parlor',     roles: ['Undertaker', 'Grieving Mourner', 'Organist', 'Florist', 'Hearse Driver', 'Embalmer', 'Estate Lawyer'] },
  { name: 'Rooftop Garden Party',   roles: ['Hostess', 'Trio Leader', 'Caterer', 'Gatecrasher', 'Bartender', 'Society Photographer', 'Building Super'] },
  { name: 'All-Night Diner',        roles: ['Short-Order Cook', 'Waitress', 'Long-Haul Trucker', 'Beat Cop', 'Dishwasher', 'Booth Regular', 'Cashier'] },
];

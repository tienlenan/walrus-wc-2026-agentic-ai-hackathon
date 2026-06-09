export type PlayerRoastConfidence = "researched" | "safe_meme" | "user_seeded";

export interface PlayerRoastTrait {
  id: string;
  playerName: string;
  aliases: string[];
  teamCode: string;
  teamName: string;
  sourceSummary: string;
  evidence: string[];
  roastAngles: string[];
  safeLines: string[];
  avoid: string[];
  confidence: PlayerRoastConfidence;
  sources: Array<{
    label: string;
    url: string;
  }>;
}

export const PLAYER_ROAST_TRAITS: PlayerRoastTrait[] = [
  {
    id: "swe-viktor-gyokeres",
    playerName: "Viktor Gyokeres",
    aliases: ["Viktor Gyökeres", "Gyokeres", "Gyökeres"],
    teamCode: "SWE",
    teamName: "Sweden",
    sourceSummary: "Power striker with the viral mask celebration; local roast angle adds the hair-check superstition gag.",
    evidence: [
      "His mask celebration is a well-known public football celebration and has been explained by mainstream football coverage.",
      "Sweden are in the FIFA World Cup 2026 field, so Sweden player context is relevant for WC roasts.",
    ],
    roastAngles: [
      "Treat the mask celebration like a superhero entrance that still needs a shot map.",
      "Use the user-seeded hair-flick gag as a playful stadium superstition: he checks the hair so often the scoreboard needs a comb counter.",
      "Contrast monster striker aura with overly theatrical pre-shot rituals.",
    ],
    safeLines: [
      "Gyokeres does not just press defenders; he presses the imaginary mask button before the ball has consented.",
      "If hair touches counted as xG, Sweden would already be in the final.",
    ],
    avoid: ["Do not claim real match hair-touch counts unless tracked.", "Do not copy official celebration trademarks or club branding."],
    confidence: "user_seeded",
    sources: [
      {
        label: "Sports Illustrated: Gyokeres mask celebration explained",
        url: "https://www.si.com/soccer/viktor-gyokeres-celebration-explained",
      },
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "por-cristiano-ronaldo",
    playerName: "Cristiano Ronaldo",
    aliases: ["Cristiano", "CR7", "Ronaldo"],
    teamCode: "POR",
    teamName: "Portugal",
    sourceSummary: "All-time icon, still a Portugal headline act; recent tournament free-kick jokes are public football discourse.",
    evidence: [
      "ESPN noted Ronaldo had 29 direct free-kick attempts at European Championships without scoring by Euro 2024.",
      "Portugal are qualified for FIFA World Cup 2026.",
    ],
    roastAngles: [
      "Free-kick runway ritual followed by a ball that applies for airspace clearance.",
      "Still has statue aura, but the set-piece GPS sometimes thinks the goal is in row Z.",
      "Use respect-first roast: legend status is the setup, sky-shot free kicks are the punchline.",
    ],
    safeLines: [
      "CR7 lines up a free kick like NASA requested a launch window.",
      "The wall is scared, the keeper is ready, and one bird above the stadium has hired legal counsel.",
    ],
    avoid: ["Do not insult age, family, nationality, or private life.", "Do not say he is finished; roast the specific free-kick habit."],
    confidence: "researched",
    sources: [
      {
        label: "ESPN Euro 2024 stats",
        url: "https://www.espn.com/soccer/story/40382789/",
      },
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "arg-lionel-messi",
    playerName: "Lionel Messi",
    aliases: ["Messi", "Leo Messi", "Lionel"],
    teamCode: "ARG",
    teamName: "Argentina",
    sourceSummary: "Selective low-intensity movement is documented; roast it as walking, scanning, beard-stroking chess.",
    evidence: [
      "FIFA Training Centre described Messi's low-intensity activity as substantially higher than average because he walks more during match play.",
      "Argentina are qualified for FIFA World Cup 2026.",
    ],
    roastAngles: [
      "Walking around like the pitch is a museum, then turning one pass into a crime scene.",
      "Beard-stroke chess-master pause before everyone else discovers they were already checkmated.",
      "Make the joke admiring, not dismissive: the walk is surveillance, not laziness.",
    ],
    safeLines: [
      "Messi walks like he is browsing a supermarket aisle, then finds the discount space behind your defence.",
      "He strokes the beard, takes three slow steps, and suddenly your back line has become a historical document.",
    ],
    avoid: ["Do not frame walking as lack of effort when context says selective movement is tactical.", "Do not attack body, age, or family."],
    confidence: "researched",
    sources: [
      {
        label: "FIFA Training Centre player case studies",
        url: "https://www.fifatrainingcentre.com/en/fwc2022/physical-analysis/using-case-studies-to-reveal-the-reasons-why-various-tactical-roles-exert-themselves-physically-during-world-cup-matches.php",
      },
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "nor-martin-odegaard",
    playerName: "Martin Odegaard",
    aliases: ["Martin Ødegaard", "Odegaard", "Ødegaard", "Oodegaard"],
    teamCode: "NOR",
    teamName: "Norway",
    sourceSummary: "Scanning and tempo control are public analysis themes; roast angle is the extra pre-pass hesitation/touch.",
    evidence: [
      "Recent analysis highlights Odegaard's scanning mastery and decision-making before receiving the ball.",
      "Norway are qualified for FIFA World Cup 2026.",
    ],
    roastAngles: [
      "He scans so much the ball should ask whether it is in a security checkpoint.",
      "Use the user-seeded nhap-nhu gag: tiny hesitations and bait touches before releasing the pass.",
      "Make the delay funny: the pass is loading, the defence has already subscribed to premium anxiety.",
    ],
    safeLines: [
      "Odegaard does not receive the ball; he interviews it, checks references, then lets it pass.",
      "That little bounce-touch is not hesitation, it is Norway buffering in 4K.",
    ],
    avoid: ["Do not claim laziness or cowardice.", "Do not mock injuries or physical traits."],
    confidence: "safe_meme",
    sources: [
      {
        label: "Be Your Best: Odegaard scanning mastery",
        url: "https://www.beyourbest.com/insight/how-to-improve-football-iq-3-lessons-from-martin-odegaards-scanning-mastery",
      },
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "nor-erling-haaland",
    playerName: "Erling Haaland",
    aliases: ["Haaland", "Erling"],
    teamCode: "NOR",
    teamName: "Norway",
    sourceSummary: "High-volume striker aura; safe roast angle is robot-mode finishing and quiet-game screenshot hunting.",
    evidence: ["Norway are qualified for FIFA World Cup 2026, making Norway star-player roast context relevant."],
    roastAngles: [
      "Treat him like a goal robot whose software update only has two buttons: sprint and finish.",
      "If Norway cannot feed him, he becomes the world's tallest loading spinner.",
    ],
    safeLines: [
      "Haaland's first touch sometimes looks like the ball signed an NDA with his second touch.",
      "Give him service and he is a vending machine for goals; starve him and he becomes Scandinavian furniture.",
    ],
    avoid: ["Do not attack appearance or family.", "Keep it tactical and cartoonish."],
    confidence: "safe_meme",
    sources: [
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "fra-kylian-mbappe",
    playerName: "Kylian Mbappe",
    aliases: ["Kylian Mbappé", "Mbappe", "Mbappé"],
    teamCode: "FRA",
    teamName: "France",
    sourceSummary: "Elite pace and star gravity; safe roast angle is turbo mode with occasional main-character oversteer.",
    evidence: ["France are qualified for FIFA World Cup 2026, making France star-player roast context relevant."],
    roastAngles: [
      "Speed is the feature; the joke is that the rest of the attack receives the ball after the credits.",
      "Main-character sprint so fast the tactics board asks for motion sickness tablets.",
    ],
    safeLines: [
      "Mbappe accelerates like he saw the group chat leak.",
      "When he runs, defenders do not mark him; they file incident reports.",
    ],
    avoid: ["Do not reference private disputes or contract drama as fact in roasts.", "No attacks on nationality or identity."],
    confidence: "safe_meme",
    sources: [
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "bra-vinicius-junior",
    playerName: "Vinicius Junior",
    aliases: ["Vinicius Jr", "Vini Jr", "Vini"],
    teamCode: "BRA",
    teamName: "Brazil",
    sourceSummary: "Explosive winger; safe roast angle is turbo dribble plus referee-courtroom energy.",
    evidence: ["Brazil are qualified for FIFA World Cup 2026, making Brazil star-player roast context relevant."],
    roastAngles: [
      "Every dribble starts like a trial where the full-back is already guilty.",
      "Roast the chaos: three stepovers, two complaints, one defender asking for a map.",
    ],
    safeLines: [
      "Vini attacks a full-back like the sideline owes him money.",
      "The dribble is electric; the appeal to the referee sometimes arrives before the cross.",
    ],
    avoid: ["No hate, race, abuse, or crowd-abuse references.", "Keep it purely on-field and tactical."],
    confidence: "safe_meme",
    sources: [
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
  {
    id: "eng-harry-kane",
    playerName: "Harry Kane",
    aliases: ["Kane", "Harry"],
    teamCode: "ENG",
    teamName: "England",
    sourceSummary: "Elite striker and penalty reference point; safe roast angle is penalty-desk paperwork and deep-drop quarterback mode.",
    evidence: ["England are qualified for FIFA World Cup 2026, making England star-player roast context relevant."],
    roastAngles: [
      "Penalty box accountant: calm, precise, and somehow carrying a clipboard.",
      "Drops so deep to link play that the striker heatmap needs a passport.",
    ],
    safeLines: [
      "Kane drops into midfield like he is checking whether England paid rent on possession.",
      "Give him a penalty and the ball signs the paperwork before the whistle finishes.",
    ],
    avoid: ["Do not mock speech, body, or family.", "Do not use abusive national stereotypes."],
    confidence: "safe_meme",
    sources: [
      {
        label: "FIFA qualified teams list",
        url: "https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified",
      },
    ],
  },
];

export function findPlayerRoastTraits(query: string, teamCode?: string | null): PlayerRoastTrait[] {
  const clean = query.toLocaleLowerCase();
  const team = teamCode?.toLocaleUpperCase();
  return PLAYER_ROAST_TRAITS.filter((trait) => {
    if (team && trait.teamCode !== team) return false;
    return [trait.playerName, ...trait.aliases].some((alias) => clean.includes(alias.toLocaleLowerCase()));
  });
}

export function buildPlayerRoastMemoryDocuments(): string[] {
  return PLAYER_ROAST_TRAITS.map((trait) =>
    [
      `Daily Walrus player roast trait: ${trait.playerName} (${trait.teamName}/${trait.teamCode}).`,
      `Source summary: ${trait.sourceSummary}`,
      `Evidence: ${trait.evidence.join(" ")}`,
      `Roast angles: ${trait.roastAngles.join(" ")}`,
      `Safe one-liners: ${trait.safeLines.join(" ")}`,
      `Avoid: ${trait.avoid.join(" ")}`,
      `Confidence: ${trait.confidence}.`,
    ].join(" "),
  );
}

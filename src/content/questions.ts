// Journal questions: objectives are inferred from evidence, not handed out. A question opens
// when the player notices something, collects observations as they find them, and offers an
// optional three-step hint ladder (vague -> specific). Hints are stored as flags so a
// revealed hint stays revealed. IDs are persistent save keys.
import type { Condition } from './types.ts';
import { F, OBS, REGIONS, seenFlag } from './ids.ts';
import { all, any, flag, hasCap } from './cond.ts';

export interface QuestionDef {
  id: string;
  title: string;
  opens: Condition;
  resolves: Condition;
  /** first matching line is shown once resolved */
  answers: Array<{ when?: Condition; text: string }>;
  evidence: Array<{ when: Condition; text: string }>;
  hints: [string, string, string];
}

export const hintFlag = (questionId: string, tier: number): string => `hint_${questionId}_${tier}`;

export const QUESTIONS: QuestionDef[] = [
  {
    id: 'q_relay',
    title: 'Which relay went quiet?',
    opens: flag(F.intercomAnswered),
    resolves: flag(F.relayReconnected),
    answers: [{ text: 'The Pumping Gallery relay, by its east wall. It is live again.' }],
    evidence: [
      { when: flag(F.intercomAnswered), text: 'Mara hears a gap in the hum, somewhere toward the gallery end of the Service Veins.' },
      { when: flag(F.intercomAnswered), text: 'Edda always kept a way down “close to home”.' },
      { when: flag(F.noteRead), text: 'Edda’s note: her old toolbox is with Ivo, in the yard behind the laundrette.' },
      { when: flag(F.laundryClueRead), text: 'A card in the laundrette back room: the hatch sticks again, and the amber paint “to the pumps” has gone faint.' },
      { when: flag(F.laundryHatchOpen), text: 'A ladder drops from the laundrette back room into the Service Veins.' },
      { when: flag(OBS.amberCable), text: 'Amber paint follows a cable through the veins, east.' },
      { when: flag(OBS.relayDark), text: 'A dark relay cabinet stands by the Pumping Gallery’s east wall.' },
    ],
    hints: [
      'Mara says Edda kept a way down close to home. What did Edda leave for you?',
      'Edda’s note points to Ivo’s yard behind the laundrette, and the laundrette has a back room.',
      'Open the laundrette’s back hatch, follow the amber-painted cable east into the Pumping Gallery, and reconnect the relay by its east wall.',
    ],
  },
  {
    id: 'q_wall',
    title: 'Why does the gallery wall breathe?',
    opens: any(flag(F.clueMovingLint), flag(F.clueAirflowDiagram)),
    resolves: flag(F.maintenancePanelOpen),
    answers: [{ text: 'A fan was holding a sealed panel shut. Behind it: a gap into the wall.' }],
    evidence: [
      { when: flag(F.clueMovingLint), text: 'Lint drifts toward a seam in the gallery’s north wall.' },
      { when: flag(F.clueAirflowDiagram), text: 'Airflow diagram: Fan F-2 feeds a sealed maintenance gallery; its panel releases when loop pressure is equalised.' },
      { when: flag(F.galleryFanPowered), text: 'With the fan running, the panel rattles in its frame.' },
    ],
    hints: [
      'Something is pulling air through that wall. What moves air in the gallery?',
      'The diagram names Fan F-2. Its valve is beside the diagram.',
      'Open the Fan F-2 valve, then pull the maintenance panel next to the fan.',
    ],
  },
  {
    id: 'q_junction',
    title: 'How do you get past a live junction?',
    opens: flag('obs_live_junction'),
    resolves: hasCap('insulated_gloves'),
    answers: [{ text: 'Insulated gloves. Live junctions can be pulled loose now.' }],
    evidence: [
      { when: flag('obs_live_junction'), text: 'A live junction crackles across a doorway. Bare hands would be a mistake.' },
      { when: flag(OBS.liveRail), text: 'The station’s third rail is live too.' },
    ],
    hints: [
      'What would a lineman wear?',
      'Tools turn up in the uncharted tunnels below the street and the veins.',
      'Insulated gloves lie somewhere in the first uncharted district you enter (the storm drain, the Cistern Hall’s south passage, or the gallery’s far exits).',
    ],
  },
  {
    id: 'q_station',
    title: 'Where does the boarded station lead?',
    opens: any(flag(OBS.boarded), flag(OBS.staffDoor), flag(OBS.drainGrate)),
    resolves: flag(seenFlag(REGIONS.station)),
    answers: [{ text: 'Last Platform, Bracken Underground. Sealed for forty years, not empty.' }],
    evidence: [
      { when: flag(OBS.boarded), text: 'Bracken Underground’s entrance is boarded up, and the bar holding the boards is on the inside.' },
      { when: flag(OBS.staffDoor), text: 'A STAFF ONLY door in the Service Veins, with a dead maglock lamp.' },
      { when: all(flag(OBS.staffDoor), flag(F.relayReconnected)), text: 'Since the relay woke, that maglock lamp burns green.' },
      { when: flag(OBS.drainGrate), text: 'In the storm drains, water runs toward a grate. Beneath it: rails.' },
    ],
    hints: [
      'If the bar is on the inside, someone left from below. The old line must have other doors.',
      'Station staff once came and went through the Service Veins, and storm water drains toward the tracks.',
      'The STAFF ONLY door in the Service Veins opens once the gallery relay powers its lock; the storm drain off the street also reaches a grate onto the tracks.',
    ],
  },
  {
    id: 'q_zero',
    title: 'Why won’t the Platform Zero lift run?',
    opens: any(flag(OBS.zeroAnnounce), flag(OBS.zeroPanel), flag(F.metOrin)),
    resolves: any(flag(F.section9Live), flag(seenFlag(REGIONS.tidal))),
    answers: [
      { when: flag(F.section9Live), text: 'Orin lifted the Section 9 isolation. Platform Zero runs again.' },
      { text: 'I climbed down the lift shaft. The lift itself is still dead; Orin still holds the isolation.' },
    ],
    evidence: [
      { when: flag(OBS.zeroAnnounce), text: 'Announcement: Platform Zero services are suspended, Section 9 is isolated, apply to the signal cabin.' },
      { when: flag(OBS.zeroPanel), text: 'The lift’s call panel: SECTION 9 ISOLATED.' },
      { when: flag(OBS.orinRefuses), text: 'Orin Vale won’t lift the isolation for a stranger. Only for someone on his rota, or if the gallery ever called again.' },
      { when: flag(OBS.orinRota), text: 'Orin’s duty rota: E. VALE on the night shift, every night for a year.' },
      { when: flag(OBS.orinRadio), text: 'Orin’s radio is tuned to VEIN-4, the gallery relay’s call sign. Static.' },
      { when: flag(OBS.liveRail), text: 'At the far end of the track, a live third rail guards a hatch into the lift shaft.' },
      { when: all(flag(OBS.liveRail), hasCap('insulated_gloves')), text: 'Insulated gloves would deal with that rail.' },
    ],
    hints: [
      'Orin needs a reason to trust you. Who could vouch for you, and how would they reach him?',
      'His radio listens for the gallery relay, and his rota lists Edda. Or go around him: the shaft past the live rail also goes down.',
      'Reconnect the gallery relay so Mara can reach his radio, or bring him Edda’s signed rota (the Cistern Hall storeroom, behind a live junction). Or disconnect the third rail with insulated gloves and climb down the lift shaft.',
    ],
  },
  {
    id: 'q_door',
    title: 'How do you reach the door in the cliff?',
    opens: any(flag(OBS.greatDoor), flag(OBS.crabs), flag(OBS.tideGauge)),
    resolves: flag(seenFlag(REGIONS.cellar)),
    answers: [{ text: 'On the deepest ebb, the causeway drains. The hatch opened onto a cellar. Edda’s.' }],
    evidence: [
      { when: flag(OBS.greatDoor), text: 'A door in the cliff too tall to see the top of. Someone cut a person-sized hatch into its foot.' },
      { when: flag(OBS.tideGauge), text: 'The tide gauge has three painted bands: HIGH, LOW, and a green band at its foot marked THIRD EBB.' },
      { when: flag(OBS.tideBell), text: 'The bell plaque: rung by the tide. When it rings, walk ashore.' },
      { when: flag(OBS.crabs), text: 'Lantern crabs sit in a line under the water, from the shingle toward the door.' },
      { when: flag(OBS.nemiTide), text: 'Nemi: every third ebb the sea goes out far enough to walk to the door.' },
    ],
    hints: [
      'The water isn’t always this high. Watch the shoals for a while.',
      'Each low tide uncovers part of the way, and the crabs mark the rest. The gauge counts the ebbs.',
      'Wait on the shingle for the spring ebb (every third low tide, when the gauge shows the green band), then follow the crabs to the hatch. The bell warns you before the water returns.',
    ],
  },
  {
    id: 'q_stacks',
    title: 'What are the lights across the water?',
    opens: flag(OBS.stacks),
    resolves: flag('stacks_reached'),
    answers: [{ text: 'The Shoreward Stacks.' }],
    evidence: [
      { when: flag(OBS.stacks), text: 'Across the sea: a town stacked on itself, lit window over window. One light moves between them.' },
      { when: flag(OBS.ferry), text: 'The buoys past the pier: END OF SURVEYED WATER.' },
      { when: flag(F.metNemi), text: 'Nemi calls them the Shoreward Stacks. The ferry hasn’t run since Section 9 was isolated; its engine went under with the line.' },
      { when: flag('edda_letter_read'), text: 'Edda’s letter: she crossed once, and came back.' },
    ],
    hints: [
      'Nemi works the pier. Ask about the crossing.',
      'The ferry is not running. Nemi and Edda’s letter both say why.',
      'There is no way across yet. The crossing to the Shoreward Stacks is not in this build of the game.',
    ],
  },
];

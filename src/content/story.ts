// Authored text. Short, skippable, journalled where useful (docs/design/docs/03).
export interface Line { speaker?: string; text: string }

export const DIALOGUE: Record<string, Line[]> = {
  intercom_first: [
    { speaker: 'Intercom', text: '…hello? Is this line live? This is Mara Venn. Relay keeper, Service Veins.' },
    { speaker: 'Mara', text: 'This intercom is wired to a circuit that died before you were born. If you can hear me, the old emergency loop came back on its own.' },
    { speaker: 'Mara', text: "You're Edda Vale's grandchild, aren't you? She built half of this network." },
    { speaker: 'Mara', text: 'One relay is cut, under the laundrette across the street. Follow the amber cable markings and reconnect it, please.' },
    { speaker: 'Mara', text: "And bring something to defend yourself. The pipes aren't empty." },
  ],
  intercom_waiting: [{ speaker: 'Mara', text: 'Under the laundrette. Follow the amber paint and the green cable. I will hear it when the relay takes.' }],
  intercom_final: [
    { speaker: 'Mara', text: "You made it back up. The relay's holding — I can hear the gallery breathing." },
    { speaker: 'Mara', text: 'When it woke, half the old lines lit at once. Transit. The gardens. The drowned ward. Places I only know as names on a map.' },
    { speaker: 'Mara', text: 'My maps stop at the Foundation. Something below even that answered the relay tonight.' },
    { speaker: 'Mara', text: 'Rest. When you are ready, the lift is waiting.' },
  ],
  intercom_after: [{ speaker: 'Mara', text: 'The line is quiet but alive. Rest when you need to; the lift will take you down.' }],
  home_note: [
    { speaker: "Edda's note", text: 'If the intercom ever speaks again, answer it. I am sorry I never explained.' },
    { speaker: "Edda's note", text: 'Ivo keeps my old toolbox in the yard behind the laundrette. You will want what is inside it.' },
  ],
  pistol: [{ speaker: 'Toolbox', text: "Edda's service pistol, oiled and wrapped in a rag. Something is scratching inside the street drain." }],
  laundry_card: [{ speaker: 'Card', text: 'BACK HATCH — sticks. Lift from the LEFT corner. Follow the amber paint down. Do not linger by the pumps. — R.' }],
  hatch: [{ speaker: '', text: 'The hatch groans open. A ladder drops into warm, wet dark.' }],
  booth_lamp: [{ speaker: '', text: 'The lamp catches. Someone kept this booth: a cot, a kettle, a spare radio tuned to nothing.' }, { speaker: '', text: 'Rest here to recover, restock basic supplies and save.' }],
  diagram: [{ speaker: 'Airflow diagram', text: 'GALLERY LOOP 3. Fan F-2 feeds the MAINTENANCE GALLERY (sealed). Access panel releases when loop pressure is equalised.' }],
  lint: [{ speaker: '', text: 'Lint drifts toward a seam in the north wall, as if the wall itself is breathing in.' }],
  fan_on: [{ speaker: '', text: 'Fan F-2 shudders to life. The north wall begins to hum.' }],
  panel_open: [{ speaker: '', text: 'With the pressure equalised, the panel swings loose. A narrow gap leads into the wall.' }],
  relay: [
    { speaker: '', text: 'Three tones ring down the gallery. Lamps wake one by one.' },
    { speaker: 'Mara (radio)', text: 'There! I hear it! You did it. The lift by the east wall runs to the street now — go home, rest. I will call.' },
  ],
  lift_dead: [{ speaker: '', text: 'The service lift is dead. A placard reads: PUMPING GALLERY — MAINTENANCE ONLY.' }],
  shotgun: [{ speaker: 'Locker', text: 'A pump shotgun, tagged R. — short range, wide flash, scarce shells.' }],
  keeper_intro: [{ speaker: '', text: 'Something vast unfolds from the pipes. Its headlamp finds you.' }],
  keeper_defeat: [{ speaker: '', text: "The Pipekeeper's lamp gutters out. Its lens rolls free across the floor." }],
  lens: [{ speaker: 'Torch Lens', text: 'Ground glass from the Pipekeeper’s headlamp. Your torch reaches further and wider.' }],
  pressure_note: [{ speaker: 'Maintenance log', text: 'Pressure route: the pipeworks bypass rejoins the gallery behind Pump 2. Valves seized. Someone should look again.' }],
  wheel: [{ speaker: '', text: 'The wheel shrieks round. Floor vents choke and fall silent.' }],
  street_barrier: [{ speaker: 'Notice', text: 'ROAD CLOSED — FLOODING BELOW. By order of the Bracken Water Board. (The water board closed in 1987.)' }],
  panel_locked: [{ speaker: '', text: 'The panel is sucked flat against the wall, as if something behind it is breathing in. It will not budge.' }],
  dark_tip: [{ speaker: '', text: 'Too dark to see the far walls. Your torch helps; a gunshot’s flash lights the whole chamber for an instant.' }],
  slice_end: [{ speaker: '', text: 'End of the first playable slice. The world below continues in future milestones — you can keep exploring.' }],
};

export interface JournalEntry { id: string; kind: 'lead' | 'clue' | 'resolved'; title: string; text: string }

export const JOURNAL: Record<string, JournalEntry> = {
  lead_relay: { id: 'lead_relay', kind: 'lead', title: 'The cut relay', text: 'Mara Venn asked me to reconnect a relay beneath the laundrette. Follow the amber cable markings.' },
  lead_toolbox: { id: 'lead_toolbox', kind: 'lead', title: "Edda's toolbox", text: "Grandmother's note: her old toolbox is in Ivo's yard behind the laundrette." },
  clue_hatch: { id: 'clue_hatch', kind: 'clue', title: 'The back hatch', text: 'A card in the laundrette backroom: the hatch sticks, lift from the left corner.' },
  clue_moving_lint: { id: 'clue_moving_lint', kind: 'clue', title: 'A breathing wall', text: 'Lint drifts toward a seam in the gallery’s north wall.' },
  clue_airflow_diagram: { id: 'clue_airflow_diagram', kind: 'clue', title: 'Airflow diagram', text: 'Fan F-2 feeds a sealed maintenance gallery. Its panel releases when loop pressure is equalised.' },
  resolved_relay: { id: 'resolved_relay', kind: 'resolved', title: 'Relay reconnected', text: 'The gallery relay is live. The service lift now links the gallery to the street.' },
  lead_return_home: { id: 'lead_return_home', kind: 'lead', title: 'Return home', text: 'Mara will call on the intercom once the line settles.' },
  resolved_humming_wall: { id: 'resolved_humming_wall', kind: 'resolved', title: 'The humming wall', text: 'Behind the panel: the Pipekeeper’s workshop. I took the lens from its lamp.' },
  journal_pressure_route: { id: 'journal_pressure_route', kind: 'clue', title: 'Pressure route', text: 'A maintenance log mentions a bypass rejoining the gallery behind Pump 2. Valves seized.' },
  resolved_slice: { id: 'resolved_slice', kind: 'resolved', title: 'The line is alive', text: 'Mara says the relay woke lines to transit, the gardens and the drowned ward.' },
};

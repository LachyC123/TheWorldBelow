// Finds that reward exploration. Each curio and upgrade is unique per world: the generator
// reserves it when a district is committed, so it can never appear twice or be lost.
// IDs are persistent save keys.

export interface CurioDef {
  id: string;
  title: string;
  text: string;
  /** biomes where it fits (empty = anywhere) */
  biomes: string[];
}

export const CURIOS: CurioDef[] = [
  { id: 'curio_rota_card', title: 'Signed rota', text: 'A maintenance rota with your grandmother’s initials beside every night shift for a year. The last line is unsigned.', biomes: [] },
  { id: 'curio_tram_ticket', title: 'Tram ticket', text: 'Single fare, BRACKEN → LAST PLATFORM. Punched twice. There has been no tram line in Bracken for forty years.', biomes: [] },
  { id: 'curio_plant_label', title: 'Plant label', text: '“Lux persistens — do not let the lamps go out.” The handwriting has invented the Latin.', biomes: [] },
  { id: 'curio_radio_log', title: 'Radio log', text: 'Call sign VEIN-4 logged at 03:10 every night for six weeks. Then: “no reply, still calling”.', biomes: ['service_veins'] },
  { id: 'curio_child_drawing', title: 'Child’s drawing', text: 'Crayon houses stacked on top of each other, all the way down the page and onto the back.', biomes: [] },
  { id: 'curio_key_tag', title: 'Brass key tag', text: 'Stamped FOUNDATION — OBSERVATION. The key is missing. The tag is warm.', biomes: [] },
  { id: 'curio_water_board', title: 'Water board notice', text: '“Residents are reminded that the reservoir is NOT a lake.” Someone has drawn a fish on it anyway.', biomes: ['storm_drains'] },
  { id: 'curio_photo_crew', title: 'Crew photograph', text: 'Eleven workers in front of a pump the size of a house. One face has been carefully scratched out.', biomes: [] },
  { id: 'curio_lunchbox', title: 'Dented lunchbox', text: 'Still latched. Inside: a thermos, a folded map of a station that is not on any map, and a single mint.', biomes: [] },
  { id: 'curio_valve_tag', title: 'Valve tag 77', text: '“OPEN ONLY IF THE GARDENS GO DARK.” The tag has been turned to face the wall.', biomes: ['pump_works'] },
  { id: 'curio_hymn_sheet', title: 'Hymn sheet', text: 'A hymn about water rising, with the verses numbered downward.', biomes: [] },
  { id: 'curio_survey_peg', title: 'Survey peg', text: 'A brass peg stamped with a depth that makes no sense: −1,904 m. Someone has added “and counting”.', biomes: [] },
  { id: 'curio_postcard', title: 'Unsent postcard', text: '“The view from the shore is beautiful. Tell Mara I found the lights.” No stamp. No shore you know of.', biomes: [] },
  { id: 'curio_shift_whistle', title: 'Shift whistle', text: 'You blow it softly. Somewhere far below, something answers with three short notes.', biomes: [] },
  { id: 'curio_canary_cage', title: 'Empty canary cage', text: 'The door is open. A name tag reads “HOPE (2)”. There is birdseed, recently.', biomes: [] },
  { id: 'curio_relay_fuse', title: 'Blown relay fuse', text: 'Scorched, labelled ISOLATION GRID — SECTION 9. Whoever pulled it did so on purpose.', biomes: ['service_veins', 'pump_works'] },
  { id: 'curio_rain_gauge', title: 'Rain gauge', text: 'Full to the brim, though it has been underground for decades. The water is warm and tastes of nothing.', biomes: ['storm_drains'] },
  { id: 'curio_chalk_tally', title: 'Chalk tally', text: 'Hundreds of tally marks, grouped in fives, ending mid-group. Beside them: a careful drawing of a door.', biomes: [] },
  { id: 'curio_umbrella', title: 'Bracken umbrella', text: 'A municipal umbrella, still wet. It has been opened recently, down here, where it never rains.', biomes: [] },
  { id: 'curio_badge', title: 'Pipekeeper badge', text: '“AUTHORISED KEEPER — PRESSURE DIVISION.” The photo shows a smiling man. The badge is very old.', biomes: ['service_veins', 'pump_works'] },
  { id: 'curio_seed_packet', title: 'Seed packet', text: '“Bellglass — sow in darkness, harvest by ear.” The seeds inside ring faintly when shaken.', biomes: [] },
  { id: 'curio_logbook', title: 'Lift logbook', text: 'Floors listed 1 to 9, then a ruled line, then floors that were never given numbers.', biomes: [] },
  { id: 'curio_compass', title: 'Stubborn compass', text: 'The needle ignores north. It points, steadily, down.', biomes: [] },
  { id: 'curio_wedding_ring', title: 'Wedding ring', text: 'Engraved inside: “E. & J. — forever, and further”.', biomes: [] },
];

export interface UpgradeDef {
  id: string;
  title: string;
  text: string;
  kind: 'tonic' | 'mod';
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'tonic_1', title: 'Steadying tonic', text: 'Bitter and warm. Maximum health +15.', kind: 'tonic' },
  { id: 'tonic_2', title: 'Steadying tonic', text: 'Bitter and warm. Maximum health +15.', kind: 'tonic' },
  { id: 'tonic_3', title: 'Steadying tonic', text: 'Bitter and warm. Maximum health +15.', kind: 'tonic' },
  { id: 'tonic_4', title: 'Steadying tonic', text: 'Bitter and warm. Maximum health +15.', kind: 'tonic' },
  { id: 'extended_mag', title: 'Extended magazine', text: 'A longer pistol magazine: 12 rounds instead of 8.', kind: 'mod' },
  { id: 'tight_choke', title: 'Tight choke', text: 'Shotgun pellets spread less and carry further.', kind: 'mod' },
  { id: 'quick_hands', title: 'Speed loader', text: 'Reload about 30% faster with every weapon.', kind: 'mod' },
];

export const TONIC_HP = 15;
/** Unique finds placed by hand in authored regions; the generator never places these. */
export const AUTHORED_UNIQUES = ['tonic_4', 'curio_rota_card', 'curio_badge'];
export const CAP_GLOVES = 'insulated_gloves';

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const CURIO_BY_ID: Record<string, CurioDef> = Object.fromEntries(CURIOS.map((c) => [c.id, c]));

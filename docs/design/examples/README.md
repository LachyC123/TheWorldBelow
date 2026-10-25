# Example contracts

These files illustrate implementation-ready design intent, not a working runtime. Adapt them into typed validated registries during M3. Unknown asset IDs intentionally describe required future assets; they are not supplied image/audio files. Do not wire these into a build without creating and checking the referenced assets.

- contracts.ts: proposed domain interfaces and explicit event ownership.
- slice_world.json: stable IDs, region graph and clue-bearing content allocation.
- secret_chain.json: observable stages, prerequisites and recovery policy.
- weapons.json: trial balance values and asset references.
- generation_policy.json: bounds, novelty and validation rules.
- save_envelope.json: illustrative persistence shape, not a valid production save.

Production validation must check referential integrity across the entire shipped content set, not just JSON syntax. Compile contracts under the selected strict TypeScript toolchain and build runtime schemas alongside them.

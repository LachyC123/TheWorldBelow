# 12 · Technical sources and verification notes

Checked 25 October 2026. These primary references support technical choices, not the original fictional design. Exact package versions and platform capabilities must be checked again when implementation begins. No game build or physical iPhone test occurred while producing this planning pack.

- Phaser overview: https://docs.phaser.io/ — browser-oriented 2D framework with JavaScript/TypeScript support. Basis for the proposed engine choice.
- Phaser project templates: https://docs.phaser.io/phaser/getting-started/project-templates — official templates include Vite and TypeScript options. Use a compatible template rather than mixing unrelated tutorials.
- Phaser installation: https://docs.phaser.io/phaser/getting-started/installation — package/install guidance and bundled type definitions. Pin selected versions during scaffold.
- MDN storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria — browser storage can be best-effort and evicted; persistence requests do not eliminate user deletion. This motivates IndexedDB error handling, export/import and honest backup language.

Implementation reference checkpoints (consult current official pages before using APIs): Vite deployment/base configuration at https://vite.dev/guide/static-deploy ; MDN IndexedDB at https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API ; Pointer Events at https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events ; Web Audio at https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API ; Page Visibility at https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API ; WebKit feature notes at https://webkit.org/blog/ . These checkpoint links are guidance for the implementer, not a claim that every linked page was reviewed for this archive.

All render budgets, combat timings, content counts and view sizes in the pack are proposed starting targets. Benchmark and adjust rather than treating them as verified hardware limits. PWA installation, orientation locking, fullscreen, vibration, persistent-storage grants and offline behaviour require feature detection and real-device checks; none is assumed universally available.

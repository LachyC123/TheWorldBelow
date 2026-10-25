import Phaser from 'phaser';
import '@fontsource/pixelify-sans/400.css';
import './ui/styles.css';
import { BootScene } from './render/BootScene.ts';
import { WorldScene } from './render/WorldScene.ts';
import { GameApp } from './app/game.ts';
import { loadSettings } from './app/settings.ts';
import { AudioEngine } from './audio/audio.ts';

const settings = loadSettings();
const audio = new AudioEngine();
const world = new WorldScene();
world.settings = settings;
world.audio = audio;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: Math.max(1, Math.round(window.innerWidth * Math.min(3, window.devicePixelRatio || 1))),
  height: Math.max(1, Math.round(window.innerHeight * Math.min(3, window.devicePixelRatio || 1))),
  backgroundColor: '#07080c',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.NONE },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  audio: { noAudio: true },
  banner: false,
  scene: [new BootScene(), world],
});

const app = new GameApp(game, world, settings, audio);
world.onReady = () => void app.start();
// Test hook for automated browser smoke tests (tools/smoke.mjs); only with ?smoke or in dev.
if (import.meta.env.DEV || new URLSearchParams(location.search).has('smoke')) (window as unknown as { __twb?: unknown }).__twb = { app, game, world };

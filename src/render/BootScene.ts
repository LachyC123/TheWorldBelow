// Loads processed atlases (public/assets) with progress and a retry on failure.
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  preload(): void {
    const fill = document.querySelector<HTMLElement>('#loading .fill');
    const status = document.querySelector<HTMLElement>('#loading .status');
    this.load.on('progress', (p: number) => {
      if (fill) fill.style.width = `${Math.round(p * 100)}%`;
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (status) {
        status.textContent = `Could not load ${file.key}. Check your connection.`;
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = 'Retry';
        b.onclick = () => location.reload();
        status.after(b);
      }
    });
    this.load.image('tiles', 'assets/tiles.png');
    this.load.atlas('chars', 'assets/chars.png', 'assets/chars.json');
    this.load.atlas('props', 'assets/props.png', 'assets/props.json');
    this.load.atlas('fx', 'assets/fx.png', 'assets/fx.json');
  }

  create(): void {
    this.scene.start('world');
  }
}

function main() {
  gameLoop();

  const app = new PIXI.Application(600, 400, { antialias: true });
  document.body.appendChild(app.view);

  const graphics = new PIXI.Graphics();

  graphics.beginFill(0xFF700B, 1);
  graphics.drawRect(50, 250, 120, 120);
  app.stage.addChild(graphics);
}

function gameLoop(): void {
  requestAnimationFrame(() => gameLoop());

  /*
  stage.children.sort((a, b) => {
    return ((a as any).z || 0) - ((b as any).z || 0);
  });
  */
}

PIXI.loader.load(main);

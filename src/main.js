"use strict";
function main() {
    gameLoop();
    var app = new PIXI.Application(600, 400, { antialias: true });
    document.body.appendChild(app.view);
    var graphics = new PIXI.Graphics();
    graphics.beginFill(0xFF700B, 1);
    graphics.drawRect(50, 250, 120, 120);
    app.stage.addChild(graphics);
}
function gameLoop() {
    requestAnimationFrame(function () { return gameLoop(); });
    /*
    stage.children.sort((a, b) => {
      return ((a as any).z || 0) - ((b as any).z || 0);
    });
    */
}
PIXI.loader.load(main);
//# sourceMappingURL=main.js.map
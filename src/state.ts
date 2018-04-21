type Mode = "Macro" | "Micro";

class State {
  app       : PIXI.Application;
  keyboard  : Keyboard;
  microworld: MicroWorld;

  mode: Mode;

  updaters: Updatable[];

  map   : GameMap;
  hud   : HUD;

  wood : number;
  meat : number;

  playersWorldX: number;
  playersWorldY: number;

  tick = 0;

  constructor() {
    this.mode = "Macro";
    this.updaters = [];
    this.keyboard = new Keyboard(this);

    this.wood = 20;
    this.meat = 5;

    const app = new PIXI.Application(600, 600, { 
      antialias: true,
      view: document.getElementById("main")! as HTMLCanvasElement,
    });

    this.app = app;

    this.app.stage.addChild(this.map = new GameMap(this));
    this.app.stage.addChild(this.hud = new HUD(this));

    this.app.stage.addChild(this.microworld = new MicroWorld(this));

    const startCell = this.map.world.getStartCell();

    this.playersWorldX = startCell.xIndex;
    this.playersWorldY = startCell.yIndex;

    this.gameLoop();
  }

  add(u: Updatable) {
    this.updaters.push(u);
  }

  subscriptions: ((state: State) => void)[] = [];

  subscribe(ev: (state: State) => void): void {
    this.subscriptions.push(ev);
  }

  update(): void {
    if (this.keyboard.justDown.Z) {
      if (this.mode === "Macro") {
        this.mode = "Micro";
      } else {
        this.mode = "Macro";
      }
    }
  }

  gameLoop(): void {
    this.tick++;

    requestAnimationFrame(() => this.gameLoop());

    for (const u of this.updaters) {
      u.update(this);
    }

    for (const c of this.subscriptions) {
      c(this);
    }

    this.update();
  }
}
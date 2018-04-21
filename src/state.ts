type Mode = "Macro" | "Micro" | "All";

class State {
  app       : PIXI.Application;
  keyboard  : Keyboard;
  microworld: MicroWorld;

  mode: Mode;

  updaters: Updatable[];

  map   : GameMap;

  wood : number;
  meat : number;

  playersWorldX: number;
  playersWorldY: number;
  playersMapX  : number;
  playersMapY  : number;

  tick = 0;

  constructor() {
    this.mode = "Macro";
    this.updaters = [];
    this.keyboard = new Keyboard(this);

    this.wood = 20;
    this.meat = 5;

    const app = new PIXI.Application(
      Constants.MAP_WIDTH, 
      Constants.MAP_HEIGHT, { 
        antialias: true,
        view: document.getElementById("main")! as HTMLCanvasElement,
      }
    );

    this.app = app;

    this.app.stage.addChild(this.map = new GameMap(this));

    this.app.stage.addChild(this.microworld = new MicroWorld(this));

    const startCell = this.map.world.getStartCell();

    this.playersWorldX = startCell.xIndex;
    this.playersWorldY = startCell.yIndex;

    this.playersMapX   = 200;
    this.playersMapY   = 200;

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

        this.microworld.loadNewMapRegion(this);
      } else {
        this.mode = "Macro";
      }
    }
  }

  gameLoop(): void {
    this.tick++;

    requestAnimationFrame(() => this.gameLoop());

    this.keyboard.update(this);

    for (const u of this.updaters) {
      if (u.activeMode === "All" || u.activeMode == this.mode) {
        u.update(this);

        u.visible = true;
      } else {
        u.visible = false;
      }
    }

    for (const c of this.subscriptions) {
      c(this);
    }

    this.update();
  }
}
type Mode = "Macro" | "Micro" | "All";

interface Notification {
  type: "error" | "warning";
  msg: string;
}

class State {
  app       : PIXI.Application;
  keyboard  : Keyboard;
  microworld: MicroWorld;

  mode: Mode;

  updaters: Updatable[];

  map   : GameMap;

  mouse !: MouseGraphic;

  macroCamera: Camera;
  microCamera: Camera;

  wood : number;
  meat : number;

  playersWorldX: number;
  playersWorldY: number;
  playersMapX  : number;
  playersMapY  : number;

  notifications: Notification[];

  tick = 0;

  constructor() {
    this.mode = "Macro";
    this.updaters = [];
    this.keyboard = new Keyboard(this);
    this.macroCamera = new Camera();
    this.microCamera = new Camera();

    this.wood = 20;
    this.meat = 5;

    this.notifications = [];

    const app = new PIXI.Application(
      Constants.SCREEN_SIZE, 
      Constants.SCREEN_SIZE, { 
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

    this.macroCamera.centerX = this.playersWorldX * Constants.MACRO.TILE_WIDTH;
    this.macroCamera.centerY = this.playersWorldY * Constants.MACRO.TILE_HEIGHT;

    this.gameLoop();
  }

  addNotification(notification: Notification): void {
    this.notifications.push(notification);
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

    if (this.mode === "Macro") {
      this.app.stage.x = this.macroCamera.desiredStageX;
      this.app.stage.y = this.macroCamera.desiredStageY;
    } else if (this.mode === "Micro") {
      this.app.stage.x = this.microCamera.desiredStageX;
      this.app.stage.y = this.microCamera.desiredStageY;
    }
  }
}
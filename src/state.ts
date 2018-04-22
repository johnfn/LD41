type Mode = "Macro" | "Micro" | "All";

interface Notification {
  type: "error" | "warning";
  msg: string;
}

interface HarvestState {
  progress: number;
  required: number;
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
  ore  : number;
  pop  : number;

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
    this.ore  = 0;
    this.pop  = Constants.DEBUG.POP_BOOST ? 5 : 0;

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
    this.checkSwitchStates();
    this.checkHarvest();
  }

  checkSwitchStates(): void {
    if (this.keyboard.justDown.Z) {
      if (this.mode === "Macro") {
        this.mode = "Micro";

        this.microworld.loadNewMapRegion(this);
      } else {
        this.mode = "Macro";
      }
    }
  }

  checkHarvest(): void {
    if (this.mode === "Micro") { return; }

    const allCells = this.map.world.getCells();

    for (const currentCell of allCells) {
      if (!currentCell.building) { continue; }

      if (!currentCell.building.building.harvester) { continue; }

      if (currentCell.building.extra.resourcesLeft !== undefined &&
          currentCell.building.extra.resourcesLeft <= 0) {
        // out of resources, die

        currentCell.building.extra.harvestState = undefined;

        continue;
      }

      if (currentCell.building.extra.harvestState === undefined) {
        // we just started harvesting

        currentCell.building.extra.harvestState = {
          progress: 0,
          required: Constants.HARVEST_TIME[currentCell.terrain],
        };
      }

      let unitsOn = currentCell.building!.extra.populationOn || 0;

      // is the player on the cell

      if (this.playersWorldX === currentCell.xIndex &&
          this.playersWorldY === currentCell.yIndex) {
        unitsOn++;
      }

      // no one around to harvest : (
      if (unitsOn === 0) {
        continue;
      }

      if (Constants.DEBUG.FAST_RESOURCES || 
          this.tick % Math.floor(20 / unitsOn) === 0) {

        currentCell.building.extra.harvestState.progress++;
      }

      if (currentCell.building.extra.harvestState.progress > currentCell.building.extra.harvestState.required) {
        currentCell.building.extra.harvestState.progress = 0;

        if (currentCell.building && currentCell.building.building.name === "Farm") {
          this.meat++;

          currentCell.building.extra.resourcesLeft! -= 1;
        } else {
          if (currentCell.terrain === "grass") {
            this.wood++;
          } else if (currentCell.terrain === "snow") {
            this.ore++;
          } else if (currentCell.terrain === "water") {
            this.meat++;
          }
        }
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
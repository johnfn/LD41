const Constants = {
  TILE_WIDTH : 32,
  TILE_HEIGHT: 32,
}

interface Updatable {
  update(state: State): void;
}

class State {
  app     : PIXI.Application;
  keyboard: Keyboard;

  updaters: Updatable[];

  map   : GameMap;
  hud   : HUD;

  wood : number;
  meat : number;

  tick = 0;

  constructor() {
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

    this.gameLoop();
  }

  add(u: Updatable) {
    this.updaters.push(u);
  }

  subscriptions: ((state: State) => void)[] = [];

  subscribe(ev: (state: State) => void): void {
    this.subscriptions.push(ev);
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
  }
}

class Player extends PIXI.Graphics {

}

class Util {
  public static RandElem<T>(x: T[]): T {
    return x[Math.floor(Math.random() * x.length)];
  }

  public static SortByKey<T>(array: T[], key: (t: T) => number): T[] {
    return array.sort((a, b) => {
      const x = key(a);
      const y = key(b);

      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
  }

  public static ManhattanDistance(c1: { xIndex: number, yIndex: number }, c2: { xIndex: number, yIndex: number }): number {
    return (
      Math.abs(c1.xIndex - c2.xIndex) + 
      Math.abs(c1.yIndex - c2.yIndex)
    );
  }
}

class MapSelection extends PIXI.Graphics implements Updatable {
  relX     : number;
  relY     : number;
  selState : "up" | "down";

  constructor(state: State) {
    super();

    state.add(this);

    this.relX = 0;
    this.relY = 0;
    this.selState = "down";

    this.beginFill(0xffffff, 1);
    this.drawRect(
      this.x, 
      this.y, 
      Constants.TILE_WIDTH, 
      Constants.TILE_HEIGHT
    );
  }

  lastMove = 0;

  updatePosition(state: State): void {
    let wantsToMove = (
      state.keyboard.down.W ||
      state.keyboard.down.A ||
      state.keyboard.down.S ||
      state.keyboard.down.D
    );

    let justPressed = (
      state.keyboard.justDown.W ||
      state.keyboard.justDown.A ||
      state.keyboard.justDown.S ||
      state.keyboard.justDown.D
    );

    if (wantsToMove) {
      this.lastMove++;

      let willMove = justPressed || this.lastMove > 5;

      if (willMove && state.keyboard.down.A) { this.relX -= 1; }
      if (willMove && state.keyboard.down.D) { this.relX += 1; }

      if (willMove && state.keyboard.down.W) { this.relY -= 1; }
      if (willMove && state.keyboard.down.S) { this.relY += 1; }

      if (this.relX < 0) this.relX = 0;
      if (this.relY < 0) this.relY = 0;
      if (this.relX >= World.Size) this.relX = World.Size - 1;
      if (this.relY >= World.Size) this.relY = World.Size - 1;

      if (willMove) {
        this.lastMove = 0;
      }
    }
  }

  update(state: State): void {
    const speed = 0.02;
    const startingState = this.selState;

    this.updatePosition(state);

    const [x, y] = state.map.world.relToAbs(this.relX, this.relY)

    this.x = x;
    this.y = y;

    if (startingState === "up") {
      this.alpha += speed;

      if (this.alpha >= 1.00) {
        this.selState = "down";
      }
    }

    if (startingState === "down") {
      this.alpha -= speed;

      if (this.alpha <= 0.40) {
        this.selState = "up";
      }
    }
  }
}

class GameMap extends PIXI.Graphics implements Updatable {
  world    : World;
  selection: MapSelection;
  player   : PlayerInWorld;

  constructor(state: State) {
    super();

    state.add(this);

    this.addChild(this.world     = new World(state.app));
    this.addChild(this.selection = new MapSelection(state));

    const start = this.world.getStartCell();

    this.addChild(this.player    = new PlayerInWorld(state, {
      x: start.xIndex,
      y: start.yIndex,
    }));

    this.x = 0;
    this.y = 40;
  }

  update(_state: State): void {
  }
}

class PlayerInWorld extends PIXI.Graphics implements Updatable {
  xIndex: number;
  yIndex: number;

  constructor(state: State, props: { x: number, y: number }) {
    super();

    this.xIndex = props.x;
    this.yIndex = props.y;

    state.add(this);

    this.beginFill(0x00ffff, 1);
    this.drawRect(
      0, 
      0, 
      Constants.TILE_WIDTH, 
      Constants.TILE_HEIGHT
    );
  }

  update(state: State): void {
    const [x, y] = state.map.world.relToAbs(this.xIndex, this.yIndex);

    this.x = x;
    this.y = y;
  }
}

(window as any).state = new State();

// PIXI.loader.load(main);

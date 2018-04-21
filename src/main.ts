const Constants = {
  TILE_WIDTH : 32,
  TILE_HEIGHT: 32,
}

interface Updatable {
  update(state: State): void;
}

class State {
  app  : PIXI.Application;
  keyboard: Keyboard;

  updaters: Updatable[];

  map   : Map;
  hud   : HUD;
  player: PlayerInWorld;

  wood : number;
  meat : number;

  tick = 0;

  constructor() {
    this.updaters = [];
    this.keyboard = new Keyboard(this);

    this.wood = 100;
    this.meat = 25;

    const app = new PIXI.Application(600, 600, { antialias: true });
    document.body.appendChild(app.view);

    this.app = app;

    this.app.stage.addChild(this.map = new Map(this));
    this.app.stage.addChild(this.hud = new HUD(this));

    this.gameLoop();
  }

  add(u: Updatable) {
    this.updaters.push(u);
  }

  gameLoop(): void {
    this.tick++;

    requestAnimationFrame(() => this.gameLoop());

    for (const u of this.updaters) {
      u.update(this);
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

  public static ManhattanDistance(c1: WorldCell, c2: WorldCell): number {
    return (
      Math.abs(c1.xIndex - c2.xIndex) + 
      Math.abs(c1.yIndex - c2.yIndex)
    );
  }
}

type WorldCell = {
  height: number;

  special: "none" | "ice" | "water" | "start" | "end";

  xIndex: number;
  yIndex: number;

  xMap: number;
  yMap: number;
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

      let willMove = justPressed || this.lastMove > 10;

      if (willMove && state.keyboard.down.A) { this.relX -= 1; }
      if (willMove && state.keyboard.down.D) { this.relX += 1; }

      if (willMove && state.keyboard.down.W) { this.relY -= 1; }
      if (willMove && state.keyboard.down.S) { this.relY += 1; }

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

class Map extends PIXI.Graphics implements Updatable {
  world: World;
  selection: MapSelection;

  constructor(state: State) {
    super();

    state.add(this);

    this.world = new World(state.app);
    this.selection = new MapSelection(state);

    this.addChild(this.world);
    this.addChild(this.selection);

    this.x = 0;
    this.y = 40;
  }

  update(_state: State): void {
  }
}

class PlayerInWorld implements Updatable {
  graphics: PIXI.Graphics;
  xMap = 5;
  yMap = 5;

  constructor(state: State) {
    state.add(this);

    this.graphics = new PIXI.Graphics();

    this.graphics.beginFill(0xffffff, 1);
    this.graphics.drawRect(
      this.xMap, 
      this.yMap, 
      Constants.TILE_WIDTH, 
      Constants.TILE_HEIGHT
    );
  }

  update(state: State): void {
    const [x, y] = state.map.world.relToAbs(this.xMap, this.yMap);

    this.graphics.x = x;
    this.graphics.y = y;
  }
}

class World extends PIXI.Graphics {
  static Size = 17;

  app: PIXI.Application;
  map: WorldCell[][];

  constructor(app: PIXI.Application) {
    super();

    this.map = [];
    this.app = app;

    for (let i = 0; i < World.Size; i++) {
      this.map[i] = [];
    }

    this.buildWorld();
    this.renderWorld();
  }

  relToAbs(x: number, y: number): [number, number] {
    return [
      x * Constants.TILE_WIDTH ,
      y * Constants.TILE_HEIGHT,
    ];
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < World.Size && y < World.Size;
  }

  getCells(): WorldCell[] {
    let cells: WorldCell[] = [];

    for (let i = 0; i < World.Size; i++) {
      cells = cells.concat(this.map[i]);
    }

    return cells;
  }

  buildWorld(): void {
    while (true) {
      this.buildTerrain();

      const cells      = this.getCells();

      const iceCells   = cells.filter(c => c.height >= 0.9);
      const waterCells = cells.filter(c => c.height <= 0.4);

      if (
        iceCells.length   > 8  && 
        waterCells.length > 14 &&
        iceCells.length   < 20 && 
        waterCells.length < 20
      ) { break; }
    }

    this.normalizeTerrain();
    this.buildSpecialLocations();
  }

  buildTerrain(): void {
    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        this.map[i][j] = {
          height : 0,
          special: "none",
          xIndex : i,
          yIndex : j,
          xMap   : i * Constants.TILE_WIDTH,
          yMap   : j * Constants.TILE_HEIGHT,
        };
      }
    }

    this.map[0             ][0             ].height = Math.random();
    this.map[0             ][World.Size - 1].height = Math.random();
    this.map[World.Size - 1][0             ].height = Math.random();
    this.map[World.Size - 1][World.Size - 1].height = Math.random();

    let stepSize = World.Size - 1;

    let randomness = 0.4;

    const nudge = (val: number) => {
      const res = val + (randomness * Math.random() - randomness / 2);

      if (res > 1) return 1;
      if (res < 0) return 0;

      return res;
    }

    while (stepSize > 1) {
      // Do diamond step

      for (let x = 0; x < World.Size - 1; x += stepSize) {
        for (let y = 0; y < World.Size - 1; y += stepSize) {

          this.map[x + stepSize / 2][y + stepSize / 2].height = nudge((
            this.map[x           ][y           ].height +
            this.map[x + stepSize][y           ].height +
            this.map[x           ][y + stepSize].height +
            this.map[x + stepSize][y + stepSize].height
          ) / 4);
        }
      }

      // Do square step

      const halfStepSize = stepSize / 2;

      for (let x = 0; x < World.Size; x += halfStepSize) {
        for (let y = 0; y < World.Size; y += halfStepSize) {
          const xi = x / (stepSize / 2);
          const yi = y / (stepSize / 2);

          if ((xi + yi) % 2 === 0) continue;

          const coordinates: number[] = ([
            [x               , y + halfStepSize],
            [x               , y - halfStepSize],
            [x + halfStepSize, y               ],
            [x - halfStepSize, y               ],
          ] as [number, number][])
            .filter(([x, y]) => this.inBounds(x, y))
            .map(([x, y]) => this.map[x][y].height);

          this.map[x][y].height = nudge((coordinates
            .reduce((x, y) => x + y, 0) / coordinates.length
          ));
        }
      }

      stepSize /= 2;
    }
  }

  normalizeTerrain(): void {
    // normalize out map

    let low  = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        const height = this.map[i][j].height;

        if (height < low) low = height;
        if (height > high) high = height;
      }
    }

    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        const height = this.map[i][j].height;

        this.map[i][j].height = (height - low) / (high - low);
      }
    }
  }

  buildSpecialLocations(): void {
    // find special locations

    const cells = this.getCells();

    const iceCells   = cells.filter(c => c.height >= 0.9);
    const waterCells = cells.filter(c => c.height <= 0.4);

    // try to find locations far apart

    let candidatePairs: [WorldCell, WorldCell, WorldCell, WorldCell][] = [];

    for (let i = 0; i < 20; i++) {
      candidatePairs.push([
        Util.RandElem(iceCells),
        Util.RandElem(waterCells),
        Util.RandElem(cells),
        Util.RandElem(cells),
      ]);
    }

    candidatePairs = Util.SortByKey(candidatePairs, ([c1, c2, c3, c4]) => {
      return -(
        Util.ManhattanDistance(c1, c2) +

        Util.ManhattanDistance(c1, c3) +
        Util.ManhattanDistance(c2, c3) +

        Util.ManhattanDistance(c1, c4) +
        Util.ManhattanDistance(c2, c4) +
        Util.ManhattanDistance(c3, c4)
      );
    });

    candidatePairs[0][0].special = "ice";
    candidatePairs[0][1].special = "water";
    candidatePairs[0][2].special = "end";
    candidatePairs[0][3].special = "start";
  }

  renderWorld(): void {
    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        const cell = this.map[i][j];

        if (cell.height < 0.4) {
          this.beginFill(0x0000ff, 1);
        } else if (cell.height < 0.9) {
          this.beginFill(0x00ff00, cell.height);
        } else {
          this.beginFill(0xffffff, 1);
        }

        if (cell.special === "ice") {
          this.beginFill(0xffff00, 1);
        }

        if (cell.special === "water") {
          this.beginFill(0xff0000, 1);
        }

        if (cell.special === "end") {
          this.beginFill(0x000000, 1);
        }

        if (cell.special === "start") {
          this.beginFill(0x000000, 1);
        }

        this.drawRect(
          cell.xMap, 
          cell.yMap, 
          Constants.TILE_WIDTH, 
          Constants.TILE_HEIGHT
        );
      }
    }
  }
}

function main() {
  new State();
}

PIXI.loader.load(main);

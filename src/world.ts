type BuildingName = "Road"
                  | "Village"
                  | "Town"
                  | "City"
                  | "Factory"
                  | "Dock"

type TerrainName = "snow" | "grass" | "water";
type SpecialName = "none" | "ice" | "water" | "start" | "end";

type Building = {
  name       : BuildingName;
  description: string;
  vision     : number;
  cost       : { wood?: number; meat?: number }
  requirement: {
    on    ?: TerrainName[];
    near  ?: TerrainName[];
    higher?: number;
    lower ?: number;
  }
};

const CanAfford = (b: Building, state: { wood: number, meat: number }): boolean => {
  return (
    (b.cost.wood ? b.cost.wood < state.wood : true) &&
    (b.cost.meat ? b.cost.meat < state.meat : true)
  );
}

const Buildings: Building[] = [
  {
    name       : "Road",
    vision     : 2,
    description: "Allows you to travel and build more.",
    cost       : { wood: 3 },
    requirement: {
      on: ["snow", "grass"],
    },
  },
  {
    name       : "Village",
    vision     : 4,
    description: "Sells basic adventuring supplies. Has an Inn to rest at.",
    cost       : { wood: 5, meat: 3 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Town",
    vision     : 5,
    description: "Sells stronger weapons and armor.",
    cost       : { wood: 8, meat: 6 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "City",
    vision     : 7,
    description: "Sells even better weapons and armor.",
    cost       : { wood: 15, meat: 10 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Factory",
    vision     : 3,
    description: "Makes something idk.",
    cost       : { wood: 15, meat: 10 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Dock",
    vision     : 3,
    description: "Builds ships to sail the seas.",
    cost       : { wood: 15, meat: 10 },
    requirement: {
      on: ["grass"],
      near: ["water"],
    },
  },
]

type WorldCell = {
  height: number;

  terrain: TerrainName;
  special: "none" | "ice" | "water" | "start" | "end";
  building?: {
    building: Building;
    graphics: PIXI.Graphics;
  };

  xIndex: number;
  yIndex: number;

  xAbs: number;
  yAbs: number;

  fogStatus: "unknown" | "seen" | "walked";
}

class MouseGraphic extends PIXI.Graphics implements Updatable {
  z = 100;
  activeMode: Mode = "Macro";

  absX = 0;
  absY = 0;
  relX = 0;
  relY = 0;

  constructor(state: State) {
    super();

    this.lineStyle(2, 0xffffff);

    this.moveTo(0, 0)
    this.lineTo(0                   , Constants.TILE_WIDTH);
    this.lineTo(Constants.TILE_WIDTH, Constants.TILE_WIDTH);
    this.lineTo(Constants.TILE_WIDTH, 0);
    this.lineTo(0, 0);

    state.mouse = this;
  }

  move(ev: any, world: World): void {
    const pt: PIXI.Point = ev.data.getLocalPosition(world);

    this.relX = Math.floor(pt.x / Constants.TILE_WIDTH);
    this.relY = Math.floor(pt.y / Constants.TILE_WIDTH);

    if (this.relX < 0) this.relX = 0;
    if (this.relY < 0) this.relY = 0;
    if (this.relX >= Constants.MAP_TILE_WIDTH)  this.relX = Constants.MAP_TILE_WIDTH - 1;
    if (this.relY >= Constants.MAP_TILE_HEIGHT) this.relY = Constants.MAP_TILE_HEIGHT - 1;

    this.x = this.relX * Constants.TILE_WIDTH;
    this.y = this.relY * Constants.TILE_WIDTH;

    this.absX = pt.x;
    this.absY = pt.y;
  }

  update(_state: State) {

  }
}

class World extends PIXI.Graphics implements Updatable {
  static Size = 33;
  z = 0;

  activeMode: Mode = "Macro";

  app: PIXI.Application;
  map: WorldCell[][];
  mouseGraphic: MouseGraphic;

  constructor(state: State) {
    super();

    state.add(this)

    this.map = [];
    this.app = state.app;

    for (let i = 0; i < World.Size; i++) {
      this.map[i] = [];
    }

    this.buildWorld();
    this.recalculateFogOfWar();
    this.renderWorld();

    this.interactive = true;
    this.buttonMode  = false;

    this.addChild(this.mouseGraphic = new MouseGraphic(state));

    this.on('pointerdown', (ev: any) => this.click(ev));
    this.on('mousemove', (ev: any) => this.mousemove(ev));
  }

  click(ev: any): void {
    const pt: PIXI.Point = ev.data.getLocalPosition(this);
  }

  mousemove(ev: any): void {
    this.mouseGraphic.move(ev, this);
  }

  static InBounds(x: number, y: number): boolean {
    return (
      x >= 0         &&
      y >= 0         &&
      x < World.Size &&
      y < World.Size
    );
  }

  update(_state: State) {

  }

  recalculateFogOfWar(): void {
    const start       = this.getStartCell();
    const iceTemple   = this.getIceSpecial();
    const waterTemple = this.getWaterSpecial();
    const endTemple   = this.getEndCell();

    const buildings = [
      ...this.getCells()
        .filter(c => !!c.building)
        .map(c => ({
          x: c.xIndex,
          y: c.yIndex,
          vision: c.building!.building.vision
        })),

      {
        x     : start.xIndex,
        y     : start.yIndex,
        vision: 5,
      },

      ...[
        iceTemple,
        waterTemple,
        endTemple,
      ].map(c => ({
        x     : c.xIndex,
        y     : c.yIndex,
        vision: 2,
      }))
    ];

    for (const b of buildings) {
      for (let i = 0; i < World.Size; i++) {
        for (let j = 0; j < World.Size; j++) {
          if (
            this.map[i][j].fogStatus === "walked" ||
            this.map[i][j].fogStatus === "seen"
          ) { continue; }

          if (Util.ManhattanDistance(
              { xIndex: b.x, yIndex: b.y },
              { xIndex: i  , yIndex: j }
            ) <= b.vision) {
            
            this.map[i][j].fogStatus = "seen";
          }
        }
      }
    }
  }

  addBuilding(props: {
    building: Building;
    x       : number;
    y       : number;
    state   : State;
  }): void {
    const { building, x, y, state } = props;
    const graphics = new BuildingGraphic(state);

    this.map[x][y].building = {
      building,
      graphics,
    };

    const [absX, absY] = this.relToAbs(x, y);

    graphics.x = absX;
    graphics.y = absY;

    this.recalculateFogOfWar();
    this.renderWorld();

    this.addChild(graphics)

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0)
  }

  getCellAt(x: number, y: number) {
    return this.map[x][y];
  }

  getStartCell(): WorldCell {
    return this.getCells().filter(x => x.special === "start")[0];
  }

  getEndCell(): WorldCell {
    return this.getCells().filter(x => x.special === "end")[0];
  }

  getIceSpecial(): WorldCell {
    return this.getCells().filter(x => x.special === "ice")[0];
  }

  getWaterSpecial(): WorldCell {
    return this.getCells().filter(x => x.special === "water")[0];
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
        iceCells.length   > 50  && 
        waterCells.length > 200 &&
        iceCells.length   < 400 && 
        waterCells.length < 400
      ) { break; }
    }

    this.normalizeTerrain();
    this.buildSpecialLocations();
    this.nameTerrain();
  }

  buildTerrain(): void {
    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        this.map[i][j] = {
          height    : 0,
          special   : "none",
          terrain   : "grass",
          xIndex    : i,
          yIndex    : j,
          xAbs      : i * Constants.TILE_WIDTH,
          yAbs      : j * Constants.TILE_HEIGHT,
          fogStatus : "unknown",
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

  nameTerrain(): void {
    // give names for all terrain

    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        const cell = this.map[i][j];
        let name: "snow" | "grass" | "water";

        if (cell.height <= 0.4) {
          name = "water";
        } else if (cell.height <= 0.8) {
          name = "grass";
        } else {
          name = "snow";
        }
        
        this.map[i][j].terrain = name;
      }
    }
  }

  buildSpecialLocations(): void {
    // find special locations

    const cells = this.getCells();

    const iceCells    = cells.filter(c => c.height >= 0.9);
    const waterCells  = cells.filter(c => c.height <= 0.4);
    const normalCells = cells.filter(c => c.height < 0.9 && c.height > 0.4);

    // try to find locations far apart

    let candidatePairs: [WorldCell, WorldCell, WorldCell, WorldCell][] = [];

    for (let i = 0; i < 20; i++) {
      candidatePairs.push([
        Util.RandElem(iceCells), // ice
        Util.RandElem(waterCells), // water
        Util.RandElem(cells), // end
        Util.RandElem(normalCells), // start
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

  walkTo(x: number, y: number) {
    this.map[x][y].fogStatus = "walked";

    this.renderWorld();
  }

  renderWorld(): void {
    this.clear();

    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        const cell = this.map[i][j];

        const alpha = ({
          "unknown": 0  ,
          "seen"   : 0.2,
          "walked" : 1.0,
        })[cell.fogStatus];

        if (cell.height < 0.4) {
          this.beginFill(0x0000ff, alpha);
        } else if (cell.height < 0.8) {
          this.beginFill(0x00ff00, cell.height * alpha);
        } else {
          this.beginFill(0xffffff, alpha);
        }

        if (cell.special === "ice") {
          this.beginFill(0xffff00, alpha);
        }

        if (cell.special === "water") {
          this.beginFill(0xff0000, alpha);
        }

        if (cell.special === "end") {
          this.beginFill(0x000000, alpha);
        }

        if (cell.special === "start") {
          this.beginFill(0x000000, alpha);
        }

        this.drawRect(
          cell.xAbs, 
          cell.yAbs, 
          Constants.TILE_WIDTH, 
          Constants.TILE_HEIGHT
        );
      }
    }
  }
}

class BuildingGraphic extends PIXI.Graphics implements Updatable {
  activeMode: Mode = "Macro";
  z = 20;

  constructor(state: State) {
    super();

    state.add(this);

    this.beginFill(0x666666, 1);
    this.drawRect(
      this.x, 
      this.y, 
      Constants.TILE_WIDTH, 
      Constants.TILE_HEIGHT
    );
  }

  update(_state: State): void {

  }
}
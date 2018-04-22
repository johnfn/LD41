type BuildingName = "Road"
                  | "Farm"
                  | "Village"
                  | "Town"
                  | "City"
                  | "Factory"
                  | "Lumber Yard"
                  | "Dock"
                  | "+1 Population"

type TerrainName = "snow" | "grass" | "water";
type SpecialName = "none" | "ice" | "water" | "start" | "end";

type Building = {
  name         : BuildingName;
  description  : string;
  hotkey       : string;
  vision       : number;
  justAUnit ?  : boolean;
  resourceName?: string;

  harvester    : boolean;
  cost         : { wood?: number; meat?: number; ore?: number; }
  requirement  : {
    on        ?: TerrainName[];
    inBuilding?: BuildingName;
    near      ?: TerrainName[];
    higher    ?: number;
    lower     ?: number;
    resources ?: boolean;
  }
};

type BuildingExtra = {
  resourcesLeft ?: number;
  harvestState  ?: HarvestState | undefined;
  populationOn  ?: number;
}

const CanAfford = (b: { cost: { wood?: number, meat?: number, ore?: number } }, state: { wood: number, meat: number, ore: number }): boolean => {
  return (
    (b.cost.wood ? b.cost.wood <= state.wood : true) &&
    (b.cost.meat ? b.cost.meat <= state.meat : true) &&
    (b.cost.ore  ? b.cost.ore  <= state.ore  : true)
  );
}

const Buildings: Building[] = [
  {
    name       : "+1 Population",
    hotkey     : "X",
    vision     : 0,
    justAUnit  : true,
    harvester  : false,
    description: "A guy who will happily harvest resources for you.",
    cost       : { meat: 5 },
    requirement: {
      inBuilding: "Town",
    },
  },

  {
    name       : "Road",
    hotkey     : "A",
    vision     : 2,
    description: "All buildings must be connected by roads.",
    harvester  : false,
    cost       : { wood: 1 },
    requirement: {
      on: ["snow", "grass"],
    },
  },
  {
    name       : "Farm",
    hotkey     : "S",
    vision     : 2,
    description: "Harvests food, slowly. Can harvest more when closer to water.",
    harvester  : true,
    resourceName: "meat",
    cost       : { wood: 5 },
    requirement: {
      on: ["snow", "grass"],
    },
  },
  {
    name       : "Village",
    hotkey     : "D",
    vision     : 4,
    harvester  : false,
    description: "Sells basic adventuring supplies. Has an Inn to rest at.",
    cost       : { wood: 5, meat: 3 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name        : "Lumber Yard",
    hotkey      : "F",
    vision      : 3,
    harvester   : true,
    description : "Harvests wood.",
    resourceName: "wood",
    cost        : { wood: 10 },
    requirement : {
      on        : ["grass"],
      resources : true
    },
  },
  {
    name       : "Dock",
    hotkey     : "G",
    vision     : 3,
    harvester  : true,
    resourceName: "meat",
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
  hasResources: boolean;
  variant: string;
  building?: {
    building: Building;
    extra   : BuildingExtra;
    graphics: BuildingGraphic;
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

  screenMotion = { x: 0, y: 0 };
  state: State;
  screenScrollSpeed = 5;

  constructor(state: State) {
    super();

    this.state = state;

    this.lineStyle(1, 0xffffff);

    this.moveTo(0, 0)
    this.lineTo(0                         , Constants.MACRO.TILE_WIDTH);
    this.lineTo(Constants.MACRO.TILE_WIDTH, Constants.MACRO.TILE_WIDTH);
    this.lineTo(Constants.MACRO.TILE_WIDTH, 0);
    this.lineTo(0, 0);

    this.lineStyle(1, 0x000000);

    this.moveTo(-1, -1)
    this.lineTo(-1                            , Constants.MACRO.TILE_WIDTH + 1);
    this.lineTo(Constants.MACRO.TILE_WIDTH + 1, Constants.MACRO.TILE_WIDTH + 1);
    this.lineTo(Constants.MACRO.TILE_WIDTH + 1, -1);
    this.lineTo(-1                            , -1);

    state.mouse = this;

    state.add(this);
  }

  mouseout(_ev: any): any {
  }

  // on mousemove
  mousemove(ev: any, world: World): void {
    const pt: PIXI.Point = ev.data.getLocalPosition(world);

    this.relX = Math.floor(pt.x / Constants.MACRO.TILE_WIDTH);
    this.relY = Math.floor(pt.y / Constants.MACRO.TILE_WIDTH);

    if (this.relX < 0) this.relX = 0;
    if (this.relY < 0) this.relY = 0;
    if (this.relX >= Constants.MACRO.MAP_WIDTH_IN_TILES)  this.relX = Constants.MACRO.MAP_WIDTH_IN_TILES - 1;
    if (this.relY >= Constants.MACRO.MAP_HEIGHT_IN_TILES) this.relY = Constants.MACRO.MAP_HEIGHT_IN_TILES - 1;

    this.x = this.relX * Constants.MACRO.TILE_WIDTH;
    this.y = this.relY * Constants.MACRO.TILE_WIDTH;

    this.absX = pt.x;
    this.absY = pt.y;

    // should we move camera too?

    const screenPt: PIXI.Point = ev.data.getLocalPosition(this.state.app.stage);

    screenPt.x += this.state.app.stage.x;
    screenPt.y += this.state.app.stage.y;

    this.screenMotion = { x: 0, y: 0 };

    if (screenPt.x < 0 || screenPt.y < 0 || screenPt.x > Constants.SCREEN_SIZE || screenPt.y > Constants.SCREEN_SIZE) {
      return;
    }

    if (screenPt.x <= Constants.MACRO.TILE_WIDTH) {
      this.screenMotion.x = -1;
    }

    if (screenPt.y <= Constants.MACRO.TILE_WIDTH) {
      this.screenMotion.y = -1;
    }

    if (screenPt.x > Constants.SCREEN_SIZE - Constants.MACRO.TILE_WIDTH) {
      this.screenMotion.x = +1;
    }

    if (screenPt.y > Constants.SCREEN_SIZE - Constants.MACRO.TILE_WIDTH) {
      this.screenMotion.y = +1;
    }
  }

  update(_state: State) {
    this.state.macroCamera.setX(this.state.macroCamera.x + this.screenMotion.x * this.screenScrollSpeed);
    this.state.macroCamera.setY(this.state.macroCamera.y + this.screenMotion.y * this.screenScrollSpeed);
  }
}

class World extends PIXI.Graphics implements Updatable {
  static Size = 33;
  z = 0;

  activeMode: Mode = "Macro";

  app: PIXI.Application;
  map: WorldCell[][];
  tilemap: PIXI.Sprite;
  state: State;

  constructor(state: State) {
    super();

    this.state = state;

    state.add(this)

    this.map = [];
    this.app = state.app;
    this.addChild(this.tilemap = new PIXI.Sprite());

    for (let i = 0; i < World.Size; i++) {
      this.map[i] = [];
    }

    this.buildWorld();
    this.recalculateFogOfWar();
    this.renderWorld();
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
    extra   : BuildingExtra;
    x       : number;
    y       : number;
    state   : State;
  }): void {
    const { building, x, y, state, extra } = props;
    const graphics = new BuildingGraphic(state, building);

    this.map[x][y].building = {
      building,
      extra,
      graphics,
    };

    const [absX, absY] = this.relToAbs(x, y);

    graphics.x = absX;
    graphics.y = absY;

    this.recalculateFogOfWar();
    this.renderWorld();

    this.addChild(graphics);

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
      x * Constants.MACRO.TILE_WIDTH ,
      y * Constants.MACRO.TILE_HEIGHT,
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
    this.addResources();
    this.chooseVariants();
  }

  addResources(): void {
    const grass = this.getCells().filter(x => x.terrain === "grass");
    const snow  = this.getCells().filter(x => x.terrain === "snow");
    const water = this.getCells().filter(x => x.terrain === "water");

    for (let i = 0; i < Constants.WOOD_RESOURCE_COUNT; i++) {
      const next = Util.RandElem(grass);
      grass.splice(grass.indexOf(next), 1);

      next.hasResources = true;
    }

    for (let i = 0; i < Constants.ORE_RESOURCE_COUNT; i++) {
      const next = Util.RandElem(snow);
      snow.splice(snow.indexOf(next), 1);

      next.hasResources = true;
    }

    for (let i = 0; i < Constants.FISH_RESOURCE_COUNT; i++) {
      const next = Util.RandElem(water);
      water.splice(water.indexOf(next), 1);

      next.hasResources = true;
    }
  }

  buildTerrain(): void {
    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        this.map[i][j] = {
          height      : 0,
          special     : "none",
          terrain     : "grass",
          hasResources: false,
          xIndex      : i,
          yIndex      : j,
          xAbs        : i * Constants.MACRO.TILE_WIDTH,
          yAbs        : j * Constants.MACRO.TILE_HEIGHT,
          fogStatus   : "unknown",
          variant     : "",
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

  chooseVariants(): void {
    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        const cell = this.map[i][j];

        if (cell.special === "ice") {
          console.log('TODO no variant');
        } else if (cell.special === "water") {
          console.log('TODO no variant');
        } else if (cell.special === "start") {
          cell.variant = Util.RandElem(Constants.MAPS.town);
        } else if (cell.special === "end") {
          console.log('TODO no variant');
        } else {
          if (cell.terrain === "grass") {
            if (cell.hasResources) {
              cell.variant = Util.RandElem(Constants.MAPS.forest);
            } else {
              cell.variant = Util.RandElem(Constants.MAPS.grass);
            }
          } else if (cell.terrain === "snow") {
            cell.variant = Util.RandElem(Constants.MAPS.snow);
          } else if (cell.terrain === "water") {
            cell.variant = Util.RandElem(Constants.MAPS.water);
          }
        }
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
    const renderer = PIXI.RenderTexture.create(
      Constants.MACRO.MAP_WIDTH,
      Constants.MACRO.MAP_HEIGHT,
    );

    this.clear();

    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        let tex: PIXI.Sprite | undefined = undefined;

        const cell = this.map[i][j];

        let alpha = ({
          "unknown": 0  ,
          "seen"   : 0.6,
          "walked" : 1.0,
        })[cell.fogStatus];

        if (!Constants.DEBUG.FOG_OF_WAR) {
          alpha = 1.0;
        }

        if (cell.special !== "none") {
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
            tex = TextureCache.GetCachedSpritesheetTexture("macro", 5, 0);
          }
        } else {
          if (cell.height < 0.4) {
            // Water

            tex = TextureCache.GetCachedSpritesheetTexture("macro", 3, 0);
          } else if (cell.height < 0.8) {
            // Grass

            if (cell.hasResources) {
              tex = TextureCache.GetCachedSpritesheetTexture("macro", 1, 0);
            } else {
              if (cell.height >= 0.6) {
                tex = TextureCache.GetCachedSpritesheetTexture("macro", 0, 1);
              } else {
                tex = TextureCache.GetCachedSpritesheetTexture("macro", 0, 0);
              }
            }
          } else {
            // Ore

            tex = TextureCache.GetCachedSpritesheetTexture("macro", 2, 0);
          }
        }

        if (tex) {
          tex.x = i * Constants.MACRO.TILE_WIDTH;
          tex.y = j * Constants.MACRO.TILE_HEIGHT;
          tex.alpha = alpha;

          this.state.app.renderer.render(
            tex, 
            renderer,
            false,
          );

          tex.alpha = 1;
        } else {
          this.drawRect(
            cell.xAbs, 
            cell.yAbs, 
            Constants.MACRO.TILE_WIDTH, 
            Constants.MACRO.TILE_HEIGHT
          );
        }
      }
    }

    this.tilemap.texture = renderer;
  }
}

class BuildingGraphic extends PIXI.Sprite {
  activeMode: Mode = "Macro";
  building: Building;
  z = 20;
  state: State;

  constructor(state: State, building: Building) {
    super();

    this.building = building;

    if (building.name === "Road") {
      this.texture = TextureCache.GetCachedSpritesheetTexture("macro", 4, 0).texture;
    } else if (building.name === "Lumber Yard") {
      this.texture = TextureCache.GetCachedSpritesheetTexture("macro", 4, 1).texture;
    } else if (building.name === "Farm") {
      this.texture = TextureCache.GetCachedSpritesheetTexture("macro", 4, 2).texture;
    }

    this.state = state;
  }

  update(_state: State): void {

  }
}
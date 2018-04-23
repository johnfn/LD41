type BuildingName = "Road"
                  | "Farm"
                  | "Wall"
                  | "Village"
                  | "Town"
                  | "City"
                  | "Factory"
                  | "Lumber Yard"
                  | "Guard Tower"
                  | "Dock"
                  | "+1 Population"
                  | "+3 Health"

type TerrainName = "snow" | "grass" | "water";
type SpecialName = "none" | "ice" | "water" | "start" | "end";

type Building = {
  name         : BuildingName;
  description  : string;
  hotkey      ?: string;
  health       : number;
  maxHealth    : number;
  vision       : number;
  hideWhenCantBuy   
              ?: boolean;
  resourceName?: string;
  spritesheet ?: [number, number];

  harvester    : boolean;
  cost         : { wood?: number; meat?: number; gold?: number; }
  requirement  : {
    on        ?: TerrainName[];
    inBuilding?: BuildingName[];
    near      ?: TerrainName[];
    higher    ?: number;
    lower     ?: number;
    resources ?: boolean;
  }
};

type BuildingExtra = {
  resourcesLeft ?: number;
  health         : number;
  harvestState  ?: HarvestState | undefined;
  populationOn  ?: number;
}

const CanAfford = (b: { cost: { wood?: number, meat?: number, gold?: number } }, state: { wood: number, meat: number, gold: number }): boolean => {
  return (
    (b.cost.wood ? b.cost.wood <= state.wood : true) &&
    (b.cost.meat ? b.cost.meat <= state.meat : true) &&
    (b.cost.gold ? b.cost.gold <= state.gold : true)
  );
}

const Buildings: Building[] = [
  {
    name       : "+1 Population",
    vision     : 0,
    health     : 0,
    maxHealth  : 0,
    hideWhenCantBuy  
               : true,
    harvester  : false,
    description: "A guy who will happily harvest resources for you.",
    cost       : { meat: 5 },
    requirement: {
      inBuilding: ["Town", "Village"],
    },
  },

  {
    name       : "+3 Health",
    vision     : 0,
    health     : 0,
    maxHealth  : 0,
    hideWhenCantBuy  
               : true,
    harvester  : false,
    description: "The town's priest will heal you, for a small fee.",
    cost       : { meat: 5, gold: 1 },
    requirement: {
      inBuilding: ["Town", "Village"],
    },
  },


  {
    name       : "Road",
    hotkey     : "X",
    vision     : 2,
    health     : 5,
    maxHealth  : 5,
    spritesheet: [4, 0],
    description: "All buildings must be connected by roads.",
    harvester  : false,
    cost       : { wood: 1 },
    requirement: {
      on: ["snow", "grass"],
    },
  },
  {
    name       : "Farm",
    hotkey     : "C",
    vision     : 2,
    health     : 10,
    maxHealth  : 10,
    spritesheet: [4, 2],
    description: "Harvests food, slowly. Can harvest more when closer to water.",
    harvester  : true,
    resourceName: "meat",
    cost       : { wood: 5 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Village",
    hotkey     : "V",
    vision     : 4,
    health     : 10,
    maxHealth  : 10,
    spritesheet: [5, 0],
    harvester  : false,
    description: "Sells basic adventuring supplies. Has an Inn to rest at.",
    cost       : { wood: 5, meat: 3 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name        : "Lumber Yard",
    hotkey      : "B",
    vision      : 3,
    health     : 10,
    maxHealth  : 10,
    spritesheet: [4, 1],
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
    hotkey     : "N",
    vision     : 3,
    health     : 20,
    maxHealth  : 20,
    harvester  : true,
    resourceName: "meat",
    description: "Builds ships to sail the seas.",
    cost       : { wood: 15, meat: 10 },
    requirement: {
      on: ["grass"],
      near: ["water"],
    },
  },

  {
    name       : "Guard Tower",
    hotkey     : "M",
    vision     : 12,
    health     : 10,
    maxHealth  : 10,
    harvester  : false,
    spritesheet: [4, 3],
    description: "Allows you to see a far distance.",
    cost       : { wood: 10 },
    requirement: {
      on: ["grass"],
    },
  },

  {
    name       : "Wall",
    hotkey     : "1",
    vision     : 2,
    health     : 5,
    maxHealth  : 5,
    harvester  : false,
    spritesheet: [4, 4],
    description: "Blocks enemies, but you can still walk on them.",
    cost       : { wood: 1 },
    requirement: {
      on: ["grass", "snow"],
    },
  },
];

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

class MacroPlayer extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Macro";
  z = 100;

  constructor(state: State) {
    super();

    state.add(this);

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "macro", 7, 0).texture;
  }

  update(state: State): void {
    this.x = state.playersWorldX * Constants.MACRO.TILE_WIDTH;
    this.y = state.playersWorldY * Constants.MACRO.TILE_HEIGHT;
  }
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

  app          : PIXI.Application;
  map          : WorldCell[][];
  tilemap      : PIXI.Sprite;
  state        : State;
  playergraphic: MacroPlayer;

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

    this.addChild(this.playergraphic = new MacroPlayer(this.state));
  }

  static InBoundsRel(x: number, y: number): boolean {
    return (
      x >= 0         &&
      y >= 0         &&
      x < World.Size &&
      y < World.Size
    );
  }

  static InBoundsAbs(x: number, y: number): boolean {
    return (
      x >= 0         &&
      y >= 0         &&
      x < Constants.MICRO.MAP_WIDTH &&
      y < Constants.MICRO.MAP_HEIGHT
    );
  }

  macroEnemies(): MacroEnemy[] {
    return this.state.updaters.filter(x => x instanceof MacroEnemy) as MacroEnemy[];
  }

  enemyAt(pos: { x: number, y: number }): MacroEnemy | undefined {
    const enemList = this.macroEnemies()
      .filter(e => {
        return (
          e.worldX === pos.x &&
          e.worldY === pos.y
        );
      });

    return enemList.length > 0 ? enemList[0] : undefined;
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

    const graphics = new BuildingGraphic(state, this.map[x][y]);

    this.map[x][y].building = {
      building,
      extra,
      graphics,
    };

    graphics.init();

    const [absX, absY] = this.relToAbs(x, y);

    this.map[x][y].building!.graphics.x = absX;
    this.map[x][y].building!.graphics.y = absY;

    this.recalculateFogOfWar();
    this.renderWorld();

    this.addChild(this.map[x][y].building!.graphics);

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0)

    if (building.name === "Road") {
      this.rerouteRoadsAt(this.map[x][y]);
    }
  }

  removeBuilding(cell: WorldCell): void {
    if (!cell.building) { return; }

    cell.building.graphics.parent.removeChild(cell.building.graphics);

    this.recalculateFogOfWar();
    this.renderWorld();

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0)

    if (cell.building.building.name === "Road") {
      this.rerouteRoadsAt(cell);
    }

    cell.building = undefined;
  }

  rerouteRoadsAt(cell: WorldCell): void {
    const x = cell.xIndex;
    const y = cell.yIndex;

    this.calculateRoadVariantAt(x, y);

    for (const [dx, dy] of [
      [ 0, -1],
      [ 1,  0],
      [ 0,  1],
      [-1,  0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;

      if (World.InBoundsRel(nx, ny) && 
          this.map[nx][ny].building && 
          this.map[nx][ny].building!.building.name === "Road"
        ) {
        this.calculateRoadVariantAt(nx, ny);
      }
    }
  }

  calculateRoadVariantAt(x: number, y: number): void {
    let roadVariant = "road";

    // clockwise NESW
    for (const [dx, dy] of [
      [ 0, -1],
      [ 1,  0],
      [ 0,  1],
      [-1,  0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;

      if (!World.InBoundsRel(nx, ny)) {
        roadVariant += "0"

        continue;
      }

      const neighbor = this.map[nx][ny];

      if (neighbor.building && neighbor.building.building.name === "Road") {
        roadVariant += "1";
      } else {
        roadVariant += "0";
      }
    }

    this.map[x][y].variant = roadVariant;
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
    this.addEnemies(Constants.DEBUG.JUST_ONE_ENEMY ? 1 : Constants.NUM_START_ENEMIES);
  }

  addEnemies(num: number): void {
    const start = this.getStartCell();

    for (let i = 0; i < num; i++) {
      let wx = 0, wy = 0;
      let valid = true;

      do {
        valid = true;

        wx = Math.floor(Math.random() * World.Size);
        wy = Math.floor(Math.random() * World.Size);

        const cell = this.map[wx][wy];

        if (cell.terrain === "water") { valid = false; continue; }
        if (cell.fogStatus === "seen" || 
            cell.fogStatus === "walked") { valid = false; continue; }

        const distToStart = Util.ManhattanDistance(
          { xIndex: wx, yIndex: wy },
          start
        );

        if (
          Constants.DEBUG.JUST_ONE_ENEMY
            ? distToStart > 5
            : distToStart < 15
        ) { valid = false; continue; }

      } while (!valid);

      const newEnemy = new MacroEnemy(
        this.state,
        wx,
        wy,
        Math.floor(
          Constants.ENEMY_GROUP_SIZE_LOW +
            Math.random() * (Constants.ENEMY_GROUP_SIZE_HIGH - Constants.ENEMY_GROUP_SIZE_LOW)
        ),
      );

      this.addChild(newEnemy);
    }
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

    for (let i = 0; i < Constants.GOLD_RESOURCE_COUNT; i++) {
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
            // Snow

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

class BuildingGraphic extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Macro";
  cell      : WorldCell;
  state     : State;
  z         = 20;
  showPop   = false;
  pop      ?: PIXI.Text;
  pop2     ?: PIXI.Text;
  bar      ?: HealthBar;

  constructor(state: State, cell: WorldCell) {
    super();

    this.state = state;
    this.cell  = cell;
  }

  init() {
    this.state.add(this);

    const building = this.cell.building!.building;

    if (building.name === "Road") {
    } else if (building.name === "Lumber Yard") {
      this.showPop = true;
    } else if (building.name === "Farm") {
      this.showPop = true;
    }

    if (building.spritesheet) {
      this.texture = TextureCache.GetCachedSpritesheetTexture(
        "macro", 
        building.spritesheet[0],
        building.spritesheet[1]
      ).texture;
    }

    if (this.showPop) {
      this.addChild(this.pop2 = new PIXI.Text("0", {
        fontFamily: 'FreePixel', 
        fontSize  : 24, 
        fill      : 0x000000, 
        align     : 'left'
      }));

      this.addChild(this.pop = new PIXI.Text("0", {
        fontFamily: 'FreePixel', 
        fontSize  : 24, 
        fill      : 0xffffff, 
        align     : 'left'
      }));

      this.pop.x = 2;
      this.pop.y = 2;

      this.pop2.x = 4;
      this.pop2.y = 4;
    }

    this.bar = new HealthBarMacro(this.state);
    this.addChild(this.bar);

    this.bar.y = this.y - 8;
    this.bar.x = this.x;

    this.bar.visible = false;
  }

  update(_state: State): void {
    const player = (
      this.state.playersWorldX === this.cell.xIndex && 
      this.state.playersWorldY === this.cell.yIndex
    ) ? 1 : 0;

    if (this.showPop) {
      this.pop !.text = String(player + (this.cell.building!.extra.populationOn || 0));
      this.pop2!.text = String(player + (this.cell.building!.extra.populationOn || 0));
    }
  }

  damage(amount: number): void {
    this.cell.building!.extra.health -= amount;

    const txtgfx = new FloatUpText(this.state, "-1");

    this.state.microworld.addChild(txtgfx)

    txtgfx.x = this.x;
    txtgfx.y = this.y;

    if (this.cell.building!.extra.health > 0) {
      this.state.addMessage({
        type: "error",
        msg: `A monster attacks your ${ this.cell.building!.building.name }, dealing ${ amount } damage! It has ${ this.cell.building!.extra.health } health left.`
      });

      this.bar!.setPercentage(this.cell.building!.extra.health / this.cell.building!.building.maxHealth);

      this.bar!.visible = true;
    } else {
      this.state.addMessage({
        type: "error",
        msg: `A monster destroys your ${ this.cell.building!.building.name }!`,
      });

      this.state.map.world.removeBuilding(this.cell);
    }
  }
}
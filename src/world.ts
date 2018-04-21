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
    description: "Allows you to travel and build more.",
    cost       : { wood: 3 },
    requirement: {
      on: ["snow", "grass"],
    },
  },
  {
    name       : "Village",
    description: "Sells basic adventuring supplies. Has an Inn to rest at.",
    cost       : { wood: 5, meat: 3 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Town",
    description: "Sells stronger weapons and armor.",
    cost       : { wood: 8, meat: 6 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "City",
    description: "Sells even better weapons and armor.",
    cost       : { wood: 15, meat: 10 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Factory",
    description: "Makes something idk.",
    cost       : { wood: 15, meat: 10 },
    requirement: {
      on: ["grass"],
    },
  },
  {
    name       : "Dock",
    description: "Builds ships to sail the water.",
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

  xIndex: number;
  yIndex: number;

  xAbs: number;
  yAbs: number;
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

  static InBounds(x: number, y: number): boolean {
    return (
      x >= 0         &&
      y >= 0         &&
      x < World.Size &&
      y < World.Size
    );
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
        iceCells.length   > 8  && 
        waterCells.length > 14 &&
        iceCells.length   < 20 && 
        waterCells.length < 20
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
          height : 0,
          special: "none",
          terrain: "grass",
          xIndex : i,
          yIndex : j,
          xAbs   : i * Constants.TILE_WIDTH,
          yAbs   : j * Constants.TILE_HEIGHT,
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

  renderWorld(): void {
    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        const cell = this.map[i][j];

        if (cell.height < 0.4) {
          this.beginFill(0x0000ff, 1);
        } else if (cell.height < 0.8) {
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
          cell.xAbs, 
          cell.yAbs, 
          Constants.TILE_WIDTH, 
          Constants.TILE_HEIGHT
        );
      }
    }
  }
}
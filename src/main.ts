const Constants = {
  TILE_WIDTH : 20,
  TILE_HEIGHT: 20,
}

class State {
  world: World;
  app  : PIXI.Application;

  constructor() {
    const app = new PIXI.Application(800, 800, { antialias: true });
    document.body.appendChild(app.view);

    this.app = app;
    this.world = new World(this.app);
  }
}

type WorldCell = {
  height: number;

  xIndex: number;
  yIndex: number;

  xMap: number;
  yMap: number;
}

class World {
  static Size  = 33;

  app: PIXI.Application;
  map: WorldCell[][];
  graphics: PIXI.Graphics;

  constructor(app: PIXI.Application) {
    this.map = [];
    this.app = app;

    for (let i = 0; i < World.Size; i++) {
      this.map[i] = [];
    }

    this.buildWorld();
    this.graphics = this.renderWorld();

    this.app.stage.addChild(this.graphics);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < World.Size && y < World.Size;
  }

  buildWorld(): void {
    for (let i = 0; i < World.Size; i++) {
      for (let j = 0; j < World.Size; j++) {
        this.map[i][j] = {
          height: 0,
          xIndex: i,
          yIndex: j,
          xMap  : i * Constants.TILE_WIDTH,
          yMap  : j * Constants.TILE_HEIGHT,
        };
      }
    }

    this.map[0             ][0             ].height = Math.random();
    this.map[0             ][World.Size - 1].height = Math.random();
    this.map[World.Size - 1][0             ].height = Math.random();
    this.map[World.Size - 1][World.Size - 1].height = Math.random();

    let stepSize = World.Size - 1;

    let randomness = 0.6;

    const nudge = () => (randomness * Math.random() - randomness / 2);

    while (stepSize > 1) {
      // Do diamond step

      for (let x = 0; x < World.Size - 1; x += stepSize) {
        for (let y = 0; y < World.Size - 1; y += stepSize) {

          this.map[x + stepSize / 2][y + stepSize / 2].height = (
            this.map[x           ][y           ].height +
            this.map[x + stepSize][y           ].height +
            this.map[x           ][y + stepSize].height +
            this.map[x + stepSize][y + stepSize].height
          ) / 4 + nudge();
        }
      }

      // Do square step

      const halfStepSize = stepSize / 2;

      for (let x = 0; x < World.Size - 1; x += halfStepSize) {
        for (let y = 0; y < World.Size - 1; y += halfStepSize) {
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

          this.map[x][y].height = (coordinates
            .reduce((x, y) => x + y, 0) / coordinates.length
          ) + nudge();
        }
      }

      stepSize /= 2;
    }

    console.log(this.map);
  }

  renderWorld(): PIXI.Graphics {
    const graphics = new PIXI.Graphics();

    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        const cell = this.map[i][j];

        graphics.beginFill(
          0x00ff00, 
          cell.height
        );
        graphics.drawRect(
          cell.xMap, 
          cell.yMap, 
          Constants.TILE_WIDTH, 
          Constants.TILE_HEIGHT
        );
      }
    }

    return graphics;
  }
}

function main() {
  gameLoop();

  new State();
}

function gameLoop(): void {
  requestAnimationFrame(() => gameLoop());

  /*
  stage.children.sort((a, b) => {
    return ((a as any).z || 0) - ((b as any).z || 0);
  });
  */
}

PIXI.loader.load(main);

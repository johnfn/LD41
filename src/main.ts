const Constants = {
  TILE_WIDTH : 16,
  TILE_HEIGHT: 16,
}

interface Updatable extends PIXI.Graphics {
  activeMode: Mode;
  update(state: State): void;
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
  relX       : number;
  relY       : number;
  selState   : "up" | "down";
  activeMode : Mode = "Macro";

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
  world      : World;
  selection  : MapSelection;
  player     : PlayerInWorld;
  activeMode : Mode = "Macro";

  constructor(state: State) {
    super();

    state.add(this);

    this.addChild(this.world     = new World(state));
    this.addChild(this.selection = new MapSelection(state));

    const start = this.world.getStartCell();

    this.addChild(this.player    = new PlayerInWorld(state, {
      x: start.xIndex,
      y: start.yIndex,
    }));

    this.selection.relX = start.xIndex;
    this.selection.relY = start.yIndex;

    this.x = 0;
    this.y = 40;
  }

  update(state: State): void {
    if (state.mode === "Micro") {
      this.visible = false;

      return;
    }

    this.visible = true;
  }
}

class PlayerInWorld extends PIXI.Graphics implements Updatable {
  xIndex: number;
  yIndex: number;
  activeMode: Mode = "Macro";

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
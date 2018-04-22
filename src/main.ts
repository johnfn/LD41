interface Updatable extends PIXI.Graphics {
  activeMode: Mode;
  update(state: State): void;
  z: number;
}

class Player extends PIXI.Graphics {

}

class MapSelection extends PIXI.Graphics implements Updatable {
  relX       : number;
  relY       : number;
  selState   : "up" | "down";
  activeMode : Mode = "Macro";
  z = 0;

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

  update(state: State): void {
    const speed = 0.02;
    const startingState = this.selState;

    const [x, y] = state.map.world.relToAbs(
      state.playersWorldX,
      state.playersWorldY,
    );

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
  z = 0;

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
  z = 0;

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
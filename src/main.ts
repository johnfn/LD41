interface Updatable extends PIXI.DisplayObject {
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
      Constants.MACRO.TILE_WIDTH, 
      Constants.MACRO.TILE_HEIGHT
    );

    this.alpha = 0.7;
  }

  update(state: State): void {
    const speed = 0.01;
    const startingState = this.selState;

    const [x, y] = state.map.world.relToAbs(
      state.playersWorldX,
      state.playersWorldY,
    );

    this.x = x;
    this.y = y;

    if (startingState === "up") {
      this.alpha += speed;

      if (this.alpha >= 0.70) {
        this.selState = "down";
      }
    }

    if (startingState === "down") {
      this.alpha -= speed;

      if (this.alpha <= 0.20) {
        this.selState = "up";
      }
    }
  }
}
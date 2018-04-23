class MacroEnemy extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Macro";
  z = 20;

  worldX: number;
  worldY: number;

  type  : "normal";
  state : State;

  constructor(state: State, worldX: number, worldY: number) {
    super();

    this.state = state;

    this.state.add(this);

    this.worldX = worldX;
    this.worldY = worldY;

    this.type = "normal";

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "macro", 6, 0).texture;
  }

  update(state: State): void {
    if (state.tick % 100 === 0) {
      const validNextPos = ([
        [this.worldX +  0, this.worldY +  1],
        [this.worldX +  0, this.worldY + -1],
        [this.worldX +  1, this.worldY +  0],
        [this.worldX + -1, this.worldY +  0]
      ] as [number, number][]).filter(([x, y]) => {
        if (!World.InBounds(x, y)) {
          return false;
        }

        const cell = state.map.world.map[x][y];

        if (cell.terrain === "water") {
          return false;
        }

        return true;
      });

      if (validNextPos.length > 0) {
        const movement = Util.RandElem(validNextPos);

        this.worldX = movement[0];
        this.worldY = movement[1];
      }
    }

    this.x = this.worldX * Constants.MACRO.TILE_WIDTH;
    this.y = this.worldY * Constants.MACRO.TILE_HEIGHT;
  }
}

class MicroEnemy extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Macro";
  z = 20;

  worldX: number;
  worldY: number;

  type  : "normal";

  constructor(state: State, worldX: number, worldY: number) {
    super();

    state.add(this);

    this.worldX = worldX;
    this.worldY = worldY;

    this.type = "normal";

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "macro", 6, 0).texture;
  }

  update(_state: State): void {
    this.x = this.worldX * Constants.MACRO.TILE_WIDTH;
    this.y = this.worldY * Constants.MACRO.TILE_HEIGHT;
  }
}
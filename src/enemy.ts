class MacroEnemy extends PIXI.Sprite implements Updatable {
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

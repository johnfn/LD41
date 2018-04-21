class MicroWorld extends PIXI.Graphics implements Updatable {
  world : World;
  tiled : TiledTilemap;
  player: MicroPlayer;
  activeMode: Mode = "Micro";

  constructor(state: State) {
    super();

    state.add(this);
    this.tiled = new TiledTilemap(PIXI.loader.resources["town"].data, state);
    this.world = state.map.world;

    const mapregion = this.tiled.loadRegion(new Rect({
      x: 0,
      y: 0,
      w: 32 * 20,
      h: 32 * 20,
    }));

    this.addChild(mapregion);

    this.addChild(this.player = new MicroPlayer(state));
  }

  update(_state: State): void {
  }
}

class MicroPlayer extends PIXI.Graphics implements Updatable {
  speed = 5;
  activeMode: Mode = "Micro";

  constructor(state: State) {
    super();

    state.add(this);

    this.beginFill(0x0000ff, 1);
    this.drawRect(0, 0, Constants.TILE_WIDTH, Constants.TILE_HEIGHT);
  }

  update(state: State): void {
    if (state.keyboard.down.A) state.playersMapX -= this.speed;
    if (state.keyboard.down.D) state.playersMapX += this.speed;
    if (state.keyboard.down.W) state.playersMapY -= this.speed;
    if (state.keyboard.down.S) state.playersMapY += this.speed;

    this.x = state.playersMapX;
    this.y = state.playersMapY;
  }
}
class MicroWorld extends PIXI.Graphics implements Updatable {
  world: World;
  tiled: TiledTilemap;

  constructor(state: State) {
    super();

    state.add(this);
    this.tiled = new TiledTilemap(PIXI.loader.resources["town"].data, state);
    this.world = state.map.world;

    debugger;

    const mapregion = this.tiled.loadRegion(new Rect({
      x: 0,
      y: 0,
      w: 32 * 20,
      h: 32 * 20,
    }));

    this.addChild(mapregion);
  }

  update(state: State) {
    this.visible = state.mode === "Micro";
    
    if (!this.visible) { return; }

    console.log(this.world.map[state.playersWorldX][state.playersWorldY].terrain);
  }
}
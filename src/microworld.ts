class DarkAreas extends PIXI.Graphics implements Updatable {
  activeMode: Mode = "Micro";
  z = 10;

  update(_state: State) {

  }
}

class MicroWorld extends PIXI.Graphics implements Updatable {
  world     : World;
  tiled     : TiledTilemap;
  player    : MicroPlayer;
  activeMode: Mode = "Micro";
  z         = 0;
  darkAreas : PIXI.Graphics;

  constructor(state: State) {
    super();

    state.add(this);

    this.tiled = new TiledTilemap(PIXI.loader.resources["town"].data, state);
    this.world = state.map.world;

    this.addChild(this.player = new MicroPlayer(state));
    this.addChild(this.darkAreas = new DarkAreas());
  }

  getDarkAreaRects(state: State): Rect[] {
    const mapx = state.playersWorldX;
    const mapy = state.playersWorldY;

    const dxdyBlockedAreas: [number, number][] = ([
      [ 1,  0],
      [-1,  0],
      [ 0,  1],
      [ 0, -1],
    ] as [number, number][]).filter(([dx, dy]) => {
      const nx = mapx + dx;
      const ny = mapy + dy;

      if (!World.InBounds(nx, ny)) {
        return true;
      }

      const neighbor = this.world.map[nx][ny];

      if (neighbor.isFogged) {
        return true;
      }

      return false;
    });

    let result: Rect[] = [];

    for (const [x, y] of dxdyBlockedAreas) {

      if (x === 1) {
        result.push(new Rect({
          x: (Constants.MAP_TILE_WIDTH - 3) * Constants.TILE_WIDTH,
          y: 0,
          w: 3 * Constants.TILE_WIDTH,
          h: Constants.MAP_HEIGHT,
        }));
      }

      if (x === -1) {
        result.push(new Rect({
          x: 0,
          y: 0,
          w: 3 * Constants.TILE_WIDTH,
          h: Constants.MAP_HEIGHT,
        }))
      }

      if (y === 1) {
        result.push(new Rect({
          x: 0,
          y: (Constants.MAP_TILE_WIDTH - 3) * Constants.TILE_WIDTH,
          w: Constants.MAP_WIDTH,
          h: 3 * Constants.TILE_WIDTH,
        }));
      }

      if (y === -1) {
        result.push(new Rect({
          x: 0,
          y: 0,
          w: Constants.MAP_WIDTH,
          h: 3 * Constants.TILE_WIDTH,
        }));
      }
    }

    return result;
  }

  loadRegion(state: State): void {
    const mapregion = this.tiled.loadRegion(new Rect({
      x: 0,
      y: 0,
      w: Constants.MAP_WIDTH,
      h: Constants.MAP_HEIGHT,
    }));

    this.addChild(mapregion);

    this.darkAreas.clear();
    this.darkAreas.beginFill(0x000000, 1);

    for (const rect of this.getDarkAreaRects(state)) {
      this.darkAreas.drawRect(rect.x, rect.y, rect.w, rect.h);
    }

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0);
  }

  update(_state: State): void {
  }
}

class MicroPlayer extends PIXI.Graphics implements Updatable {
  speed = 5;
  activeMode: Mode = "Micro";
  z = 5;

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
class DarkAreas extends PIXI.Graphics implements Updatable {
  activeMode: Mode = "Micro";
  z = 10;

  update(_state: State) {

  }
}

class MicroWorld extends PIXI.Graphics implements Updatable {
  world           : World;
  tiled           : TiledTilemap;
  player          : MicroPlayer;
  activeMode      : Mode = "Micro";
  z               = 0;
  darkAreas       : PIXI.Graphics;
  currentMapRegion: PIXI.Sprite | undefined;

  constructor(state: State) {
    super();

    state.add(this);

    this.tiled = new TiledTilemap(PIXI.loader.resources["town"].data, state);
    this.world = state.map.world;

    this.addChild(this.player = new MicroPlayer(state, this));
    this.addChild(this.darkAreas = new DarkAreas());
  }

  isCollision(state: State, x: number, y: number): boolean {
    const darkAreas = this.getDarkAreaRects(state);

    for (const da of darkAreas) {
      if (da.contains({ x, y })) {
        return true;
      }
    }

    return false;
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

  loadNewMapRegion(state: State): void {
    if (this.currentMapRegion) {
      this.currentMapRegion.parent.removeChild(this.currentMapRegion);
    }

    this.currentMapRegion = this.tiled.loadRegion(new Rect({
      x: 0,
      y: 0,
      w: Constants.MAP_WIDTH,
      h: Constants.MAP_HEIGHT,
    }));

    this.addChild(this.currentMapRegion);

    this.darkAreas.clear();
    this.darkAreas.beginFill(0x000000, 1);

    for (const rect of this.getDarkAreaRects(state)) {
      this.darkAreas.drawRect(rect.x, rect.y, rect.w, rect.h);
    }

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0);
  }

  update(state: State): void {
    if (
      this.currentMapRegion &&
      !World.InBounds(state.playersMapX, state.playersMapY)
    ) {
      const dx = Math.floor(state.playersMapX / Constants.MAP_WIDTH );
      const dy = Math.floor(state.playersMapY / Constants.MAP_HEIGHT);

      state.playersWorldX += dx;
      state.playersWorldY += dy;

      state.playersMapX += - dx * (Constants.MAP_TILE_WIDTH  - 1) * Constants.TILE_WIDTH;
      state.playersMapY += - dy * (Constants.MAP_TILE_HEIGHT - 1) * Constants.TILE_HEIGHT;

      this.loadNewMapRegion(state);
    }
  }
}

class MicroPlayer extends PIXI.Graphics implements Updatable {
  speed            = 5;
  microworld: MicroWorld;
  activeMode: Mode = "Micro";
  z                = 5;

  constructor(state: State, mw: MicroWorld) {
    super();

    state.add(this);

    this.microworld = mw;

    this.beginFill(0x0000ff, 1);
    this.drawRect(0, 0, Constants.TILE_WIDTH, Constants.TILE_HEIGHT);
  }

  update(state: State): void {
    let newx = state.playersMapX;
    let newy = state.playersMapY;

    if (state.keyboard.down.A) newx -= this.speed;
    if (state.keyboard.down.D) newx += this.speed;
    if (state.keyboard.down.W) newy -= this.speed;
    if (state.keyboard.down.S) newy += this.speed;

    if (!this.microworld.isCollision(state, newx, state.playersMapY)) {
      state.playersMapX = newx;
    }

    if (!this.microworld.isCollision(state, state.playersMapX, newy)) {
      state.playersMapY = newy;
    }

    this.x = state.playersMapX;
    this.y = state.playersMapY;
  }
}
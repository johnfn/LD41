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

    for (const { rect, type } of darkAreas) {
      if ((type === "unknown" || type === "water") && 
          rect.contains({ x, y })) {

        return true;
      }
    }

    return false;
  }

  getDarkAreaRects(state: State): { 
    rect: Rect; 
    type: "unknown" | "water" | "snow" | "grass"
  }[] {
    const mapx = state.playersWorldX;
    const mapy = state.playersWorldY;

    const dxdyBlockedAreas: (undefined | {
      type: "unknown" | "water" | "snow" | "grass";
      x   : number;
      y   : number;
    })[] = ([
      [ 1,  0],
      [-1,  0],
      [ 0,  1],
      [ 0, -1],
    ] as [number, number][]).map(([dx, dy]) => {
      const nx = mapx + dx;
      const ny = mapy + dy;

      if (!World.InBounds(nx, ny)) {
        return {
          type: "unknown" as "unknown",
          x: dx,
          y: dy,
        };
      }

      const neighbor = this.world.map[nx][ny];
      const me       = this.world.map[mapx][mapy];

      if (neighbor.fogStatus === "unknown") {
        return {
          type: "unknown" as "unknown",
          x: dx,
          y: dy,
        };
      }

      if (neighbor.terrain === "water" && 
          me.terrain       !== "water") {

        return {
          type: "water" as "water",
          x: dx,
          y: dy,
        };
      }

      if (neighbor.terrain === "snow" && 
          me.terrain       !== "snow") {
        return {
          type: "snow" as "snow",
          x: dx,
          y: dy,
        };
      }

      if (neighbor.terrain === "grass" && 
          me.terrain       !== "grass") {
        return {
          type: "grass" as "grass",
          x: dx,
          y: dy,
        };
      }


      return undefined;
    });

    let result: {
      rect: Rect;
      type: "unknown" | "water" | "snow" | "grass"
    }[] = [];

    for (const obj of dxdyBlockedAreas) {
      if (obj === undefined) { continue; }

      const { x, y, type } = obj;

      if (x === 1) {
        result.push({
          rect: new Rect({
            x: (Constants.MAP_WIDTH_IN_TILES - 3) * Constants.TILE_WIDTH,
            y: 0,
            w: 3 * Constants.TILE_WIDTH,
            h: Constants.MAP_HEIGHT,
          }),
          type,
        });
      }

      if (x === -1) {
        result.push({
          rect: new Rect({
            x: 0,
            y: 0,
            w: 3 * Constants.TILE_WIDTH,
            h: Constants.MAP_HEIGHT,
          }),
          type,
        });
      }

      if (y === 1) {
        result.push({
          rect: new Rect({
            x: 0,
            y: (Constants.MAP_WIDTH_IN_TILES - 3) * Constants.TILE_WIDTH,
            w: Constants.MAP_WIDTH,
            h: 3 * Constants.TILE_WIDTH,
          }),
          type,
        });
      }

      if (y === -1) {
        result.push({
          rect: new Rect({
            x: 0,
            y: 0,
            w: Constants.MAP_WIDTH,
            h: 3 * Constants.TILE_WIDTH,
          }),
          type,
        });
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

    for (const { rect, type } of this.getDarkAreaRects(state)) {
      if (type === "unknown") {
        this.darkAreas.beginFill(Constants.UNKNOWN_COLOR, 1);
      } else if (type === "water") {
        this.darkAreas.beginFill(Constants.WATER_COLOR, 1);
      } else if (type === "snow") {
        this.darkAreas.beginFill(Constants.SNOW_COLOR, 1);
      } else if (type === "grass") {
        this.darkAreas.beginFill(Constants.SNOW_COLOR, 1);
      }

      this.darkAreas.drawRect(rect.x, rect.y, rect.w, rect.h);
    }

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0);
  }

  update(state: State): void {
    if (
      this.currentMapRegion &&
      !World.InBounds(state.playersMapX, state.playersMapY)
    ) {
      // Just walked to a new region.

      const dx = Math.floor(state.playersMapX / Constants.MAP_WIDTH );
      const dy = Math.floor(state.playersMapY / Constants.MAP_HEIGHT);

      state.playersWorldX += dx;
      state.playersWorldY += dy;

      state.playersMapX += - dx * (Constants.MAP_WIDTH_IN_TILES  - 1) * Constants.TILE_WIDTH;
      state.playersMapY += - dy * (Constants.MAP_HEIGHT_IN_TILES - 1) * Constants.TILE_HEIGHT;

      this.loadNewMapRegion(state);
      state.map.world.walkTo(state.playersWorldX, state.playersWorldY);
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
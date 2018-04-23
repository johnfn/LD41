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

    this.darkAreas.alpha = 1.0;
  }

  isCollisionHelper(state: State, x: number, y: number, p?: { ignoreEnemy?: MicroEnemy }): {
    hit: boolean;
    isDarkArea?: boolean;
    isTile?: boolean;
    enemy?: MicroEnemy;
  } {
    const darkAreas = this.getDarkAreaRects(state);

    for (const { rect, type } of darkAreas) {
      if ((type === "unknown" || type === "water") && 
          rect.contains({ x, y })) {

        return { hit: true, isDarkArea: true };
      }
    }

    // get tile

    const tile = this.tiled.getTileAt(x, y);

    if (tile) {
      const { tile: { spritesheetx: sx } } = tile;

      if (sx === 1) {
        return { hit: true, isTile: true };
      }
    }

    const enemies = state.updaters.filter(x => x instanceof MicroEnemy) as MicroEnemy[];

    for (const me of enemies) {
      if (p && p.ignoreEnemy === me) {
        continue;
      }

      const r = new Rect({ x: me.x, y: me.y, w: 32, h: 32 });

      if (r.contains({ x, y })) {
        return { hit: true, enemy: me };
      }
    }

    return { hit: false };
  }

  isCollision(state: State, x: number, y: number, size: number, p?: { ignoreEnemy?: MicroEnemy }): {
    hit: boolean;
    isDarkArea?: boolean;
    isTile?: boolean;
    enemy?: MicroEnemy;
  } {
    const res0 = this.isCollisionHelper(state, x       , y       , p);
    if (res0.hit) { return res0; }

    const res1 = this.isCollisionHelper(state, x + size, y       , p);
    if (res1.hit) { return res1; }

    const res2 = this.isCollisionHelper(state, x       , y + size, p);
    if (res2.hit) { return res2; }

    const res3 = this.isCollisionHelper(state, x + size, y + size, p);
    if (res3.hit) { return res3; }

    return { hit: false };
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

      if (!World.InBoundsRel(nx, ny)) {
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

    const bw = Constants.BORDER_REGION_WIDTH;

    for (const obj of dxdyBlockedAreas) {
      if (obj === undefined) { continue; }

      const { x, y, type } = obj;

      if (x === 1) {
        result.push({
          rect: new Rect({
            x: (Constants.MICRO.MAP_WIDTH_IN_TILES - bw) * Constants.MICRO.TILE_WIDTH,
            y: 0,
            w: bw * Constants.MICRO.TILE_WIDTH,
            h: Constants.MICRO.MAP_HEIGHT,
          }),
          type,
        });
      }

      if (x === -1) {
        result.push({
          rect: new Rect({
            x: 0,
            y: 0,
            w: bw * Constants.MICRO.TILE_WIDTH,
            h: Constants.MICRO.MAP_HEIGHT,
          }),
          type,
        });
      }

      if (y === 1) {
        result.push({
          rect: new Rect({
            x: 0,
            y: (Constants.MICRO.MAP_WIDTH_IN_TILES - bw) * Constants.MICRO.TILE_WIDTH,
            w: Constants.MICRO.MAP_WIDTH,
            h: bw * Constants.MICRO.TILE_WIDTH,
          }),
          type,
        });
      }

      if (y === -1) {
        result.push({
          rect: new Rect({
            x: 0,
            y: 0,
            w: Constants.MICRO.MAP_WIDTH,
            h: bw * Constants.MICRO.TILE_WIDTH,
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

    // Load new tilemap

    const newlyLoadedCell = this.world.getCellAt(state.playersWorldX, state.playersWorldY);
    const variant = newlyLoadedCell.variant;

    this.tiled = new TiledTilemap(PIXI.loader.resources[variant].data, state);
    this.currentMapRegion = this.tiled.loadRegion(new Rect({
      x: 0,
      y: 0,
      w: Constants.MICRO.MAP_WIDTH,
      h: Constants.MICRO.MAP_HEIGHT,
    }));

    this.addChild(this.currentMapRegion);

    // add border regions

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

    this.clearOldEnemies(state);
    this.checkShouldAddEnemies(state);
    this.removeBullets(state);

    this.children = Util.SortByKey(this.children, x => (x as Updatable).z || 0);
  }

  removeBullets(state: State): void {
    const allBullets: Bullet[] = state.updaters.filter(x => x instanceof Bullet) as Bullet[];

    for (const b of allBullets) {
      b.remove(state);
    }
  }

  chooseRandomValidMapPos(state: State): { x: number, y: number } {
    let valid = true;
    let x = 0;
    let y = 0;

    do {
      valid = true;

      x = Math.floor(Math.random() * Constants.MICRO.MAP_WIDTH);
      y = Math.floor(Math.random() * Constants.MICRO.MAP_HEIGHT);

      if (Util.ManhattanDistance(
        { xIndex: x                 , yIndex: y },
        { xIndex: state.playersMapX , yIndex: state.playersMapY }
      ) < 100) { valid = false; continue; }

      if (this.isCollision(state, x, y, 32).hit) {
        valid = false; continue;
      }

    } while (!valid);

    return { x, y };
  }

  clearOldEnemies(state: State): void {
    const enemies = state.updaters.filter(x => x instanceof MicroEnemy) as MicroEnemy[];

    for (const e of enemies) {
      state.remove(e);
      e.parent.removeChild(e);
    }
  }

  checkShouldAddEnemies(state: State): void {
    const enemy = this.world.macroEnemies().filter(e => 
      e.worldX === state.playersWorldX &&
      e.worldY === state.playersWorldY
    )[0];

    if (!enemy) {
      return;
    }

    for (let i = 0; i < enemy.size; i++) {
      const e = new MicroEnemy(state, enemy);
      const { x, y } = this.chooseRandomValidMapPos(state);

      e.x = x;
      e.y = y;

      this.addChild(e);
    }
  }

  update(state: State): void {
    if (
      this.currentMapRegion &&
      !World.InBoundsAbs(state.playersMapX, state.playersMapY)
    ) {
      // Just walked to a new region.

      const dx = Math.floor(state.playersMapX / Constants.MICRO.MAP_WIDTH );
      const dy = Math.floor(state.playersMapY / Constants.MICRO.MAP_HEIGHT);

      state.playersWorldX += dx;
      state.playersWorldY += dy;

      state.playersMapX += - dx * (Constants.MICRO.MAP_WIDTH_IN_TILES  - 1) * Constants.MICRO.TILE_WIDTH;
      state.playersMapY += - dy * (Constants.MICRO.MAP_HEIGHT_IN_TILES - 1) * Constants.MICRO.TILE_HEIGHT;

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
  size             = 32;
  facing: [number, number] = [1, 0];
  cooldown         = 60;

  constructor(state: State, mw: MicroWorld) {
    super();

    state.add(this);

    this.microworld = mw;

    this.beginFill(0x0000ff, 1);
    this.drawRect(0, 0, this.size, this.size);
  }

  update(state: State): void {
    let newx = state.playersMapX;
    let newy = state.playersMapY;

    let newFacing: [number, number] = [0, 0];

    if (state.keyboard.down.A) { newx -= this.speed; newFacing[0] = -1; }
    if (state.keyboard.down.D) { newx += this.speed; newFacing[0] =  1; }
    if (state.keyboard.down.W) { newy -= this.speed; newFacing[1] = -1; }
    if (state.keyboard.down.S) { newy += this.speed; newFacing[1] =  1; }

    if (newFacing[0] !== 0 || newFacing[1] !== 0) {
      this.facing = newFacing;
    }

    if (!this.microworld.isCollision(state, newx, state.playersMapY, this.size - 5).hit) {
      state.playersMapX = newx;
    }

    if (!this.microworld.isCollision(state, state.playersMapX, newy, this.size - 5).hit) {
      state.playersMapY = newy;
    }

    this.x = state.playersMapX;
    this.y = state.playersMapY;

    if (state.keyboard.justDown.Spacebar || (
          state.keyboard.down.Spacebar && 
          state.tick % this.cooldown === 0
        )
      ) {
      const bullet = new Bullet(state, this.facing);

      state.microworld.addChild(bullet);

      bullet.x = (this.x + 16) + this.facing[0] * 16;
      bullet.y = (this.y + 16) + this.facing[1] * 16;
    }
  }
}

class Bullet extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Micro";
  z     = 100;
  speed = 5;
  dir: [number, number];

  constructor(state: State, dir: [number, number]) {
    super();

    this.dir = dir;

    state.add(this);

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "macro", 7, 1).texture;
  }

  update(state: State): void {
    this.x += this.dir[0] * this.speed;
    this.y += this.dir[1] * this.speed;

    if (!World.InBoundsAbs(this.x, this.y)) {
      this.remove(state);
    }

    const coll = state.microworld.isCollision(state, this.x, this.y, 4);

    if (coll.hit) {
      this.remove(state);

      if (coll.enemy) {
        coll.enemy.damage(1);
      }
    }
  }

  remove(state: State): void {
    state.remove(this);
    this.parent.removeChild(this);
  }
}
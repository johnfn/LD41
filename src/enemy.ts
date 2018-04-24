class MacroEnemy extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Macro";
  z = 50;

  worldX: number;
  worldY: number;

  type  : "normal";
  state : State;

  size: number;

  health  : PIXI.Text;
  health2 : PIXI.Text;

  constructor(state: State, worldX: number, worldY: number, size: number) {
    super();

    this.state = state;

    this.state.add(this);

    this.worldX = worldX;
    this.worldY = worldY;

    this.type = "normal";

    this.size = size;

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "macro", 6, 0).texture;

    this.addChild(this.health2 = new PIXI.Text(String(this.size), {
      fontFamily: 'FreePixel', 
      fontSize  : 24, 
      fill      : 0x000000, 
      align     : 'left'
    }));

    this.addChild(this.health = new PIXI.Text(String(this.size), {
      fontFamily: 'FreePixel', 
      fontSize  : 24, 
      fill      : 0xffffff, 
      align     : 'left'
    }));

    this.health.x  = 2;
    this.health.y  = 2;

    this.health2.x = 4;
    this.health2.y = 4;

    this.x = this.worldX * Constants.MACRO.TILE_WIDTH;
    this.y = this.worldY * Constants.MACRO.TILE_HEIGHT;
  }

  subtractEnemy(): any {
    this.size -= 1;

    if (this.size <= 0) {
      this.state.remove(this);
      this.parent.removeChild(this);
    }

    this.health2.text = String(this.size);
    this.health.text = String(this.size);
  }

  buildingTarget(): WorldCell | undefined {
    let buildingTargets = this.state.map.world.getCells()
      .filter(cell => cell.building && cell.building.building.name !== "Wall")
      .filter(cell => Util.ManhattanDistance(
        cell,
        { xIndex: this.worldX, yIndex: this.worldY }
      ) < Constants.ENEMY_BUILDING_SIGHT)
    ;

    buildingTargets = Util.SortByKey(buildingTargets, k => (
      ((k.building!.building.cost.gold || 0) * 3) + 
      ( k.building!.building.cost.wood || 0)      + 
      ( k.building!.building.cost.meat || 0)
    )).reverse();

    return buildingTargets[0];
  }

  move(state: State): void {
    // try to find building to destroy

    let nextPosChoices: [number, number][] 

    const fourDirections: [number, number][] = [
      [this.worldX +  0, this.worldY +  1],
      [this.worldX +  0, this.worldY + -1],
      [this.worldX +  1, this.worldY +  0],
      [this.worldX + -1, this.worldY +  0]
    ];

    const buildingTarget = this.buildingTarget();

    if (buildingTarget) {
      if (
        this.worldX === buildingTarget.xIndex &&
        this.worldY === buildingTarget.yIndex
      ) {
        return;
      }

      const path = state.map.pathfind(
        { x: this.worldX, y: this.worldY },
        { x: buildingTarget.xIndex, y: buildingTarget.yIndex }, {
          water  : true ,
          wall   : true,
          unknown: false, // enemies op
          unseen : false,
        }
      );

      if (path) {
        nextPosChoices = [
          [path[0].x, path[0].y],
        ];
      } else {
        nextPosChoices = fourDirections;
      }
    } else {
      nextPosChoices = fourDirections;
    }

    const validNextPos = nextPosChoices.filter(([x, y]) => {
      if (!World.InBoundsRel(x, y)) {
        return false;
      }

      const cell = state.map.world.map[x][y];

      if (cell.terrain === "water") {
        return false;
      }

      if (cell.building && cell.building.building.name === "Wall") {
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

  buildingOnTopOf(): WorldCell | undefined {
    const buildingTarget = this.buildingTarget();

    if (buildingTarget) {
      if (
        this.worldX === buildingTarget.xIndex &&
        this.worldY === buildingTarget.yIndex
      ) {
        return buildingTarget;
      }
    }

    return undefined;
  }

  attack(): void {
    const target = this.buildingOnTopOf();

    if (!target) {
      return;
    }

    target.building!.graphics.damage(1);
  }

  update(state: State): void {
    if ((state.tick % Constants.ENEMY_SPEED === 0) || (
        Constants.DEBUG.FAST_ENEMY &&
        state.tick % 100 === 0
      )
    ) {
      this.attack();

      this.move(state);
    }

    this.x = this.worldX * Constants.MACRO.TILE_WIDTH;
    this.y = this.worldY * Constants.MACRO.TILE_HEIGHT;
  }
}

class MicroEnemy extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Micro";
  z     = 100;
  speed = 1;
  bar: HealthBar;
  state: State;
  group: MacroEnemy;

  health    = 3;
  maxHealth = 3;

  dest: { x: number, y: number } | undefined;

  constructor(state: State, group: MacroEnemy) {
    super();

    state.add(this);

    this.state = state;
    this.group = group;

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "micro", 3, 0).texture;

    this.bar = new HealthBar(state);
    this.addChild(this.bar);

    this.bar.y = -8;
  }

  damage(amount: number): void {
    this.health -= amount;

    if (this.health <= 0) {
      this.remove();
    } else {
      this.bar.setPercentage(this.health / this.maxHealth);
    }
  }

  chooseNewDest(): void {
    this.dest = Util.RandElem([
      { x: this.x + 50, y: this.y },
      { x: this.x     , y: this.y + 50 },
      { x: this.x - 50, y: this.y },
      { x: this.x     , y: this.y - 50 },
    ].filter(({ x, y }) => World.InBoundsAbs(x, y)));
  }

  considerShootingBullet(state: State): void {
    const xdiff = state.playersMapX - this.x;
    const ydiff = state.playersMapY - this.y;

    const wantToShoot = (
      Math.abs(xdiff) < 50 ||
      Math.abs(ydiff) < 50
    ) && (state.tick % 50 === 0);

    if (!wantToShoot) { return; }

    let dir: [number, number] = [0, 0];

    dir[0] = Math.abs(xdiff) > Math.abs(ydiff) ? Util.Sign(xdiff) : 0;
    dir[1] = Math.abs(xdiff) > Math.abs(ydiff) ? 0                : Util.Sign(ydiff);

    const bullet = new Bullet(state, dir);

    bullet.x = (this.x + 16) + dir[0] * 32;
    bullet.y = (this.y + 16) + dir[1] * 32;

    this.parent.addChild(bullet);
  }

  update(state: State): void {
    if (this.dest === undefined && state.tick % 50 === 0) {
      this.chooseNewDest();
    }

    if (this.dest === undefined) { return; }

    const nx = this.x + Util.Sign(this.dest.x - this.x) * this.speed;
    const ny = this.y + Util.Sign(this.dest.y - this.y) * this.speed;

    const coll = state.microworld.isCollision(state, nx, ny, 32, { ignoreEnemy: this });

    if (coll.hit) {
      this.dest = undefined;

      return;
    } else {
      this.x = nx;
      this.y = ny;
    }

    if (Util.ManhattanDistance(
      { xIndex: this.x     , yIndex: this.y },
      { xIndex: this.dest.x, yIndex: this.dest.y }
    ) < 5) {
      this.dest = undefined;
    }

    this.considerShootingBullet(state);
  }

  remove(): void {
    if (
      Math.random() < Constants.GOLD_DROP_RATE ||
      this.state.gold < 3
    ) {
      const c = new Coin(this.state);

      c.x = this.x;
      c.y = this.y;

      this.parent.addChild(c);
    }

    this.state.remove(this);
    this.state.remove(this.bar);
    this.parent.removeChild(this);

    this.group.subtractEnemy();
  }
}

class HealthBar extends PIXI.Graphics implements Updatable {
  activeMode: Mode = "Micro";
  z     = 100;
  state: State;
  perc  = 1;

  constructor(state: State) {
    super();

    this.state = state;
    this.state.add(this);

    this.render();
  }

  setPercentage(perc: number) {
    this.perc = perc;

    this.render();
  }

  render(): void {
    this.beginFill(0xffffff);
    this.drawRect(0, 0, 32, 6);

    this.beginFill(0x00ff00);
    this.drawRect(2, 2, 28 * this.perc, 4);
  }

  update(_state: State): void {

  }
}

class HealthBarMacro extends HealthBar {
  activeMode: Mode = "Macro";
}

class Coin extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Micro";
  z     = 100;
  speed = 5;
  state: State;

  constructor(state: State) {
    super();

    this.state = state;

    state.add(this);

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "micro", 3, 1).texture;
  }

  update(state: State): void {
    const coin = new Rect({ x: this.x, y: this.y, w: 32, h: 32 });
    const player = new Rect({ x: this.state.playersMapX, y: this.state.playersMapY, w: 32, h: 32 });

    if (coin.intersects(player)) {
      this.state.gold += 1;

      this.remove(state);

      const txtgfx = new FloatUpText(state, "+1 Gold");

      this.state.microworld.addChild(txtgfx)

      txtgfx.x = this.x;
      txtgfx.y = this.y;

      state.addMessage({
        type: "warning",
        msg: `You get 1 gold.`,
      });
    }
  }

  remove(state: State): void {
    state.remove(this);
    this.parent.removeChild(this);
  }
}

class SnowGem extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Micro";
  z     = 1000;
  speed = 5;
  state: State;

  constructor(state: State) {
    super();

    this.state = state;

    state.add(this);

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "micro", 3, 3).texture;
  }

  update(state: State): void {
    const coin = new Rect({ x: this.x, y: this.y, w: 32, h: 32 });
    const player = new Rect({ x: this.state.playersMapX, y: this.state.playersMapY, w: 32, h: 32 });

    if (coin.intersects(player)) {
      this.state.hasSnowKey = true;

      this.remove();

      state.addMessage({
        type: "warning",
        msg: `You pick up the snow gem. Hope it doesn't melt!`,
      });
    }
  }

  remove(): void {
    this.state.remove(this);
    this.parent.removeChild(this);
  }
}

class WaterGem extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Micro";
  z     = 1000;
  speed = 5;
  state: State;

  constructor(state: State) {
    super();

    this.state = state;

    state.add(this);

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "micro", 3, 3).texture;
  }

  update(state: State): void {
    const coin = new Rect({ x: this.x, y: this.y, w: 32, h: 32 });
    const player = new Rect({ x: this.state.playersMapX, y: this.state.playersMapY, w: 32, h: 32 });

    if (coin.intersects(player)) {
      this.state.hasWaterKey = true;

      this.remove();

      state.addMessage({
        type: "warning",
        msg: `You pick up the water gem. How is a gem made of water, anyways?`,
      });
    }
  }

  remove(): void {
    this.state.remove(this);
    this.parent.removeChild(this);
  }
}
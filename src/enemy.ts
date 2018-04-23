class MacroEnemy extends PIXI.Sprite implements Updatable {
  activeMode: Mode = "Macro";
  z = 20;

  worldX: number;
  worldY: number;

  type  : "normal";
  state : State;

  size: number;

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
  }

  subtractEnemy(): any {
    this.size -= 1;

    if (this.size <= 0) {
      this.state.remove(this);
      this.parent.removeChild(this);
    }
  }

  update(state: State): void {
    if (state.tick % Constants.ENEMY_SPEED === 0) {
      const validNextPos = ([
        [this.worldX +  0, this.worldY +  1],
        [this.worldX +  0, this.worldY + -1],
        [this.worldX +  1, this.worldY +  0],
        [this.worldX + -1, this.worldY +  0]
      ] as [number, number][]).filter(([x, y]) => {
        if (!World.InBoundsRel(x, y)) {
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

  update(state: State): void {
    if (this.dest === undefined && state.tick % 50 === 0) {
      this.chooseNewDest();
    }

    if (this.dest === undefined) { return; }

    const nx = this.x + Util.Sign(this.dest.x - this.x) * this.speed;
    const ny = this.y + Util.Sign(this.dest.y - this.y) * this.speed;

    if (state.microworld.isCollision(state, nx, ny, 32, { ignoreEnemy: this }).hit) {
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
  }

  remove(): void {
    const c = new Coin(this.state);

    c.x = this.x;
    c.y = this.y;

    this.parent.addChild(c);

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
    }
  }

  remove(state: State): void {
    state.remove(this);
    this.parent.removeChild(this);
  }
}
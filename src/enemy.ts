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

  dest: { x: number, y: number } | undefined;

  constructor(state: State) {
    super();

    state.add(this);

    this.texture = TextureCache.GetCachedSpritesheetTexture(
      "micro", 3, 0).texture;

    this.bar = new HealthBar(state);
    this.addChild(this.bar);

    this.bar.y = -8;
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

    if (state.microworld.isCollision(state, nx, ny, 32, { ignoreEnemy: this })) {
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
}

class HealthBar extends PIXI.Graphics implements Updatable {
  activeMode: Mode = "Micro";
  z     = 100;
  state: State;
  perc  = 0.5;

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
class GameMap extends PIXI.Graphics implements Updatable {
  world       : World;
  selection   : MapSelection;
  player      : PlayerInWorld;
  activeMode  : Mode = "Macro";
  state       : State;
  mouseGraphic: MouseGraphic;
  path        : { x: number, y: number }[] | undefined;

  z = 0;

  constructor(state: State) {
    super();

    this.state = state;
    state.add(this);

    this.addChild(this.world     = new World(state));
    this.addChild(this.selection = new MapSelection(state));

    const start = this.world.getStartCell();

    this.addChild(this.player    = new PlayerInWorld(state, {
      x: start.xIndex,
      y: start.yIndex,
    }));

    this.selection.relX = start.xIndex;
    this.selection.relY = start.yIndex;

    this.addChild(this.mouseGraphic = new MouseGraphic(state));

    this.interactive = true;
    this.buttonMode  = false;

    this.on('pointerdown', (ev: any) => this.click(ev));
    this.on('mousemove', (ev: any) => this.mousemove(ev));
  }

  update(state: State): void {
    if (state.mode === "Micro") {
      this.visible = false;

      return;
    }

    this.visible = true;
  }

  click(ev: any): void {
    const pt: PIXI.Point = ev.data.getLocalPosition(this);

    this.path = this.pathfind(
      { 
        x: this.state.playersWorldX, 
        y: this.state.playersWorldY, 
      },
      { 
        x: Math.floor(pt.x / Constants.TILE_WIDTH ), 
        y: Math.floor(pt.y / Constants.TILE_HEIGHT ), 
      },
    );

    console.log(this.path);
  }

  pathfind(
    start: { x: number, y: number }, 
    end  : { x: number, y: number }
  ): { x: number, y: number }[] | undefined {
    const hash = (props: { x: number, y: number }) => `${ props.x },${ props.y }`;
    const parent: {
      [key: string]: { x: number, y: number } | 1
    } = { };

    parent[hash(start)] = 1;
    const queue = [ start ];
    let found = false;

    outer: while (queue.length > 0) {
      const current = queue.shift()!;

      if (hash(current) === hash(end)) { break; }

      const dxdy: [number, number][] = [
        [ 1,  0],
        [-1,  0],
        [ 0,  1],
        [ 0, -1],
      ];

      for (const [dx, dy] of dxdy) {
        const next = { 
          x: dx + current.x,
          y: dy + current.y,
        };

        if (!World.InBounds(next.x, next.y)) { continue; }
        if (parent[hash(next)]) { continue; }
        if (this.world.map[next.x][next.y].terrain === "water") { continue; }

        queue.push(next);
        parent[hash(next)] = current;

        if (hash(next) === hash(end)) { found = true; break outer; }
      }
    }

    if (!found) {
      return undefined;
    }

    const path: { x: number, y: number }[] = [];
    let current = end;

    while (hash(current) !== hash(start)) {
      path.push(current);

      const next = parent[hash(current)];

      if (next === 1) { break; }

      current = next;
    }

    return path;
  }

  mousemove(ev: any): void {
    this.mouseGraphic.move(ev, this.world);
  }
}

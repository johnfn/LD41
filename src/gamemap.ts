class GameMap extends PIXI.Graphics implements Updatable {
  world       : World;
  selection   : MapSelection;
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

    this.selection.relX = start.xIndex;
    this.selection.relY = start.yIndex;

    this.addChild(this.mouseGraphic = new MouseGraphic(state));

    this.interactive = true;
    this.buttonMode  = false;

    this.on('pointerdown', (ev: any) => this.click(ev));
    this.on('mousemove', (ev: any) => this.mousemove(ev));
    this.on('mouseout', (ev: any) => this.mouseGraphic.mouseout(ev));
  }

  update(state: State): void {
    let d = { x: 0, y: 0 };

    if (state.keyboard.justDown.A) d.x = -1;
    if (state.keyboard.justDown.D) d.x =  1;
    if (state.keyboard.justDown.W) d.y = -1;
    if (state.keyboard.justDown.S) d.y =  1;

    if (d.x !== 0 || d.y !== 0) {
      const start = {
        x: this.state.playersWorldX, 
        y: this.state.playersWorldY, 
      };

      const end = { 
        x: this.state.playersWorldX + d.x, 
        y: this.state.playersWorldY + d.y, 
      };

      this.path = this.pathfind(start, end, {
        water  : true,
        unknown: true,
        unseen : true
      });

      if (!this.path) {
        this.showHelpfulPathfindMessage(start, end);
      }
    }

    if (this.path && this.path.length > 0) {
      if (state.tick % 10 === 0) {
        this.state.playersWorldX = this.path[0].x;
        this.state.playersWorldY = this.path[0].y;

        this.path.shift();
      }
    }
  }

  showHelpfulPathfindMessage(start: { x: number, y: number }, end: { x: number, y: number }) {
    if (start.x === end.x && start.y === end.y) {
      return;
    }

    const p = this.pathfind(start, end, { 
      water  : true,
      unknown: true,
      unseen : false
    });

    if (p) {
      this.state.addMessage({
        type: "warning",
        msg: "You need to navigate there in the Zoomed-In World (press Z) before you can fast travel.",
      });

      return;
    }
  }

  click(ev: any): void {
    if (ev.type === "click") { return; } // wtf i didnt ask for u go away

    const pt: PIXI.Point = ev.data.getLocalPosition(this);

    const start = { 
      x: this.state.playersWorldX, 
      y: this.state.playersWorldY, 
    };

    const end = { 
      x: Math.floor(pt.x / Constants.MACRO.TILE_WIDTH ), 
      y: Math.floor(pt.y / Constants.MACRO.TILE_HEIGHT), 
    };

    this.path = this.pathfind(start, end, {
      water  : true,
      unknown: true,
      unseen : true,
    });

    if (!this.path) {
      this.showHelpfulPathfindMessage(start, end);
    }
  }

  pathfind(
    start: { x: number, y: number }, 
    end  : { x: number, y: number },
    blockers: {
      water  : boolean;
      unknown: boolean;
      unseen : boolean;
      wall   : boolean;
    }
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

        if (!World.InBoundsRel(next.x, next.y)) { continue; }
        if (parent[hash(next)]) { continue; }

        const nextCell = this.world.map[next.x][next.y]

        if (blockers.water   && nextCell.terrain   === "water") { continue; }
        if (blockers.unknown && nextCell.fogStatus === "unknown") { continue; }
        if (blockers.wall    && nextCell.building && 
            nextCell.building.building.name === "Wall") { continue; }
        if (blockers.unseen  && 
          !Constants.DEBUG.ALWAYS_FAST_TRAVEL &&
          nextCell.fogStatus === "seen"
        ) { continue; }

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

    return path.reverse();
  }

  mousemove(ev: any): void {
    this.mouseGraphic.mousemove(ev, this.world);
  }
}

interface ToolbarState {
  selX: number;
  selY: number;

  wood: number;
  meat: number;

  hover: BuildingAndCanAfford | undefined;
}

type BuildingAndCanAfford = {
  building: Building;
  canBuild: boolean;
  whyNot  : string;
}

class Toolbar extends React.Component<{}, ToolbarState> {
  gameState: State;

  constructor(props: {}) {
    super(props);

    this.state = {
      selX : 0,
      selY : 0,

      wood : 0,
      meat : 0,

      hover: undefined,
    };

    this.gameState = (window as any).state;
    this.gameState.subscribe(gameState => this.onTick(gameState));
  }

  onTick(gameState: State): void {
    this.setState({
      selX: gameState.map.selection.relX,
      selY: gameState.map.selection.relY,

      wood: gameState.wood,
      meat: gameState.meat,
    });

    this.gameState = gameState;
  }

  availableBuildings(): BuildingAndCanAfford[] {
    const selection = this.gameState.map.world.getCellAt(this.state.selX, this.state.selY);
    const dxdy: [number, number][] = [
      [ 0,  1],
      [ 0, -1],
      [ 1,  0],
      [-1,  0],
    ];

    const neighborCells: WorldCell[] = [];

    for (const [x, y] of dxdy) {
      const nx = this.state.selX + x;
      const ny = this.state.selY + y;

      if (!World.InBounds(nx, ny)) continue;

      neighborCells.push(
        this.gameState.map.world.getCellAt(nx, ny)
      );
    }

    const result: BuildingAndCanAfford[] = [];
    
    for (const b of Buildings) {
      let obj = {
        building: b,
        canBuild: true,
        whyNot  : "",
      };

      result.push(obj);

      if (selection.building) {
        obj.canBuild = false;
        obj.whyNot   = "There is already something there!"

        continue;
      }

      if (!CanAfford(b, this.state)) {
        obj.canBuild = false;
        obj.whyNot   = "Too expensive!"

        continue;
      }

      if (selection.fogStatus === "unknown") {
        obj.canBuild = false;
        obj.whyNot   = "I can't see anything there!"

        continue;
      }

      if (b.requirement.on && b.requirement.on.indexOf(selection.terrain) === -1) {
        obj.canBuild = false;
        obj.whyNot = `Needs to be on ${ b.requirement.on.join(" or ") }.`

        continue;
      }

      if (b.requirement.near) {
        for (const req of b.requirement.near) {
          if (neighborCells.filter(c => c.terrain === req).length === 0) {
            obj.canBuild = false;
            obj.whyNot = `Needs to be near ${ b.requirement.near }.`

            continue;
          }
        }
      }
    }

    return result;
  }

  build(b: BuildingAndCanAfford): void {
    if (!b.canBuild) {
      alert(b.whyNot);

      return;
    }

    if (b.building.cost.wood) {
      this.gameState.wood -= b.building.cost.wood;
    }

    if (b.building.cost.meat) {
      this.gameState.meat -= b.building.cost.meat;
    }

    this.gameState.map.world.addBuilding({
      building: b.building,
      x       : this.state.selX,
      y       : this.state.selY,
      state   : this.gameState,
    });
  }

  getDescription(cell: WorldCell): string {
    if (cell.fogStatus === "unknown") {
      return "I can't see anything there";
    }

    if (cell.building) {
      return `A ${ cell.building.building.name.toLowerCase() }.`;
    } 

    if (cell.special !== "none") {
      if (cell.special === "ice") {
        return "A mysterious-looking ice temple.";
      } else if (cell.special === "water") {
        return "It seems like there's something under the water.";
      } else if (cell.special === "end") {
        return "A mysterious obelisk.";
      } else if (cell.special === "start") {
        return "My hometown.";
      }
    }

    if (cell.terrain === "snow") {
      return "Snowy mountains.";
    } else if (cell.terrain === "water") {
      return "A body of water.";
    } else if (cell.terrain === "grass") {
      return "A grassy field.";
    }

    return "";
  }

  render(): JSX.Element {
    const selection = this.gameState.map.world.getCellAt(this.state.selX, this.state.selY);

    const description = this.getDescription(selection);
    let height = "";

    if (selection.height < 0.20) {
      height = "Deep";
    } else if (selection.height < 0.4) {
      height = "Shallow";
    } else if (selection.height < 0.5) {
      height = "Low";
    } else if (selection.height < 0.7) {
      height = "Moderate";
    } else if (selection.height < 0.8) {
      height = "High";
    } else {
      height = "Treacherous";
    }

    const availableBuildings = this.availableBuildings();

    return (
      <div style={{ color: "white" }}>
        <div>
          Meat: { this.state.meat } | Wood: { this.state.wood }
        </div>

        <div>
          { description }
        </div>

        <div>
          Elevation: { height }
        </div>

        <div style={{ paddingTop: "20px" }}>
          Build:
        </div>

        {
          availableBuildings.map(b => {
            return (
              <div
                onMouseOver={ () => this.setState({ hover: b }) }
                onMouseOut ={ () => this.setState({ hover: undefined }) }
              >
                <a 
                  style={{ 
                    color: b.canBuild ? "white" : "gray"
                  }} 
                  onClick={ () => this.build(b) }
                  href="javascript:;">
                  { b.building.name }
                </a>
              </div>
            );
          })
        }

        <div style={{ paddingTop: "20px" }}>
          {
            this.state.hover &&
              <div style={{
                  color: this.state.hover.canBuild ? "white" : "gray"
              }}>
                <div>
                  { this.state.hover.building.description }
                </div>

                <div>
                  {
                    this.state.hover.building.cost.wood ? `${ this.state.hover.building.cost.wood } wood` : " "
                  } {
                    this.state.hover.building.cost.meat ? `${ this.state.hover.building.cost.meat } food` : " "
                  }
                </div>

                {
                  !this.state.hover.canBuild &&
                    <div style={{ color: "white" }}>
                      { this.state.hover.whyNot }
                    </div>
                }
              </div>
          }
        </div>
      </div>
    )
  }
}

PIXI.loader.add("map" , `./assets/map.png`);
PIXI.loader.add("town", `./assets/town.json`);
PIXI.loader.load(() => {
  (window as any).state = new State();

  ReactDOM.render(
    <Toolbar />
    , document.getElementById("toolbar")
  );
});
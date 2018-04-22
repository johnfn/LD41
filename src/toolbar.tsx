interface ToolbarState {
  selX: number;
  selY: number;

  wood: number;
  meat: number;
  ore : number;
  pop : number;

  playerWorldX: number;
  playerWorldY: number;

  hover: BuildingAndCanAfford | undefined;
}

type BuildingAndCanAfford = {
  building: Building;
  canBuild: boolean;
  whyNot  : string;
}

type Buyable = {
  name: string;
  cost: { 
    meat?: number;
    wood?: number;
    ore ?: number;
  };
}

class Toolbar extends React.Component<{}, ToolbarState> {
  gameState: State;

  constructor(props: {}) {
    super(props);

    this.state = {
      selX : 0,
      selY : 0,

      playerWorldX: 0,
      playerWorldY: 0,

      wood : 0,
      meat : 0,
      ore  : 0,
      pop  : 0,

      hover: undefined,
    };

    this.gameState = (window as any).state;
    this.gameState.subscribe(gameState => this.onTick(gameState));

    addEventListener("keydown", e => this.keyDown(e), false);
  }

  private keyDown(e: KeyboardEvent) {
    if (this.gameState.mode === "Micro") {
      return;
    }

    const buildings = this.availableBuildings().filter(b => {
      return b.building.hotkey.toLowerCase() === e.key.toLowerCase();
    });

    if (buildings.length === 0) {
      return;
    }

    this.build(buildings[0]);
  }

  onTick(gameState: State): void {
    this.setState({
      selX: gameState.map.selection.relX,
      selY: gameState.map.selection.relY,

      wood: gameState.wood,
      meat: gameState.meat,
      pop : gameState.pop,

      playerWorldX: gameState.playersWorldX,
      playerWorldY: gameState.playersWorldY,
    });

    this.gameState = gameState;
  }

  availableBuildings(): BuildingAndCanAfford[] {
    const selection = this.gameState.map.world.getCellAt(
      this.state.playerWorldX, 
      this.state.playerWorldY
    );
    const dxdy: [number, number][] = [
      [ 0,  1],
      [ 0, -1],
      [ 1,  0],
      [-1,  0],
    ];

    const neighborCells: WorldCell[] = [];

    for (const [x, y] of dxdy) {
      const nx = this.state.playerWorldX + x;
      const ny = this.state.playerWorldY + y;

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

      if (!CanAfford(b, this.state)) {
        obj.canBuild = false;
        obj.whyNot   = "Too expensive!"

        continue;
      }

      // if you're on a building, cant build anything, except units.

      if (selection.building || selection.special === "start") {
        if (b.justAUnit) {
          if (selection.special === "start") {
            if (b.requirement.inBuilding !== "Town") {
              obj.canBuild = false;
              obj.whyNot   = `You need to be in a ${ b.requirement.inBuilding } to make one of those.`;

              continue;
            } else {
              continue;
            }
          } else {
            if (selection.building!.building.name !== b.requirement.inBuilding) {
              obj.canBuild = false;
              obj.whyNot   = `You need to be in a ${ b.requirement.inBuilding } to make one of those.`;

              continue;
            } else {
              continue;
            }
          }
        } else {
          obj.canBuild = false;
          obj.whyNot   = "There is already something there!"

          continue;
        }
      }

      if (b.requirement.inBuilding) {
        obj.canBuild = false;
        obj.whyNot = `You need to be in a ${ b.requirement.inBuilding } to make one of those.`

        continue;
      }

      let hasRoadNeighbor = false;
      let hasAnyNeighbor  = false;

      for (const n of neighborCells) {
        if ((n.building && n.building.building.name === "Road") ||
            n.special === "start") {
          hasRoadNeighbor = true;
        }

        if (n.building ||
            n.special === "start") {
          hasAnyNeighbor = true;
        }
      }

      if (b.name !== "Road" && !hasRoadNeighbor) {
        obj.canBuild = false;
        obj.whyNot   = "I need to build next to another road, or my hometown."

        continue;
      }

      if (b.name === "Road" && !hasAnyNeighbor) {
        obj.canBuild = false;
        obj.whyNot   = "I need to build next to another building, or my hometown."

        continue;
      }

      if (selection.fogStatus === "unknown") {
        obj.canBuild = false;
        obj.whyNot   = "I can't see anything there!"

        continue;
      }

      if (b.requirement.on && b.requirement.on.indexOf(selection.terrain) === -1) {
        obj.canBuild = false;
        obj.whyNot = `You need to be on ${ b.requirement.on.join(" or ") }.`

        continue;
      }

      if (selection.hasResources && !b.requirement.resources) {
        let name: string = "";

        if (selection.terrain === "grass") {
          name = "forest";
        } else if (selection.terrain === "snow") {
          name = "mine";
        } else if (selection.terrain === "water") {
          name = "school of fish";
        }

        obj.canBuild = false;
        obj.whyNot = `Can only build harvesting buildings on top of a ${ name }.`

        continue;
      }

      if (b.requirement.resources && !selection.hasResources) {
        let name: string = "";

        if (selection.terrain === "grass") {
          name = "forest";
        } else if (selection.terrain === "snow") {
          name = "mine";
        } else if (selection.terrain === "water") {
          name = "school of fish";
        }

        obj.canBuild = false;
        obj.whyNot = `You need to be on a ${ name }.`

        continue;
      }

      if (b.requirement.near) {
        for (const req of b.requirement.near) {
          if (neighborCells.filter(c => c.terrain === req).length === 0) {
            obj.canBuild = false;
            obj.whyNot = `You need to be near ${ b.requirement.near }.`

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

    const be: BuildingExtra = {};

    if (b.building.name === "Farm") {
      be.resourcesLeft = 10 + (Constants.DEBUG.FAST_RESOURCES ? 10000 : 0);
      be.populationOn = 0;
    }

    if (b.building.name === "Lumber Yard") {
      be.resourcesLeft = 100 + (Constants.DEBUG.FAST_RESOURCES ? 10000 : 0);
      be.populationOn = 0;
    }

    if (b.building.justAUnit) {
      if (b.building.name === "+1 Population") {
        this.gameState.pop += 1;
      }
    } else {
      this.gameState.map.world.addBuilding({
        building: b.building,
        extra   : be,
        x       : this.state.playerWorldX,
        y       : this.state.playerWorldY,
        state   : this.gameState,
      });
    }
  }

  getDescription(cell: WorldCell): React.ReactNode {
    if (cell.fogStatus === "unknown") {
      return "I can't see anything there";
    }

    if (cell.building) {
      const name  = cell.building.building.name.toLowerCase();
      const extra = cell.building.extra;

      if (name === "farm") {
        return (
          <div>
            <div>A { name }</div>
            <div>
              { extra.resourcesLeft } meat left.
            </div>
          </div>
        );
      } else {
        return `A ${ name }.`;
      }
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
      if (cell.hasResources) {
        return "A forest.";
      } else {
        return "A grassy field.";
      }
    }

    return "";
  }

  buyPop(): void {

  }

  renderBuyAndHarvest(cell: WorldCell): JSX.Element {
    if (!cell.building) {
      return <></>;
    }

    if (
      cell.building.building.name === "Lumber Yard" ||
      cell.building.building.name === "Farm"
    ) {
      if (cell.building.extra.resourcesLeft !== undefined && 
          cell.building.extra.resourcesLeft <= 0) {
        return (
          <div>
            Out of resources to harvest!
          </div>
        )
      }

      if (!cell.building.extra.harvestState) {
        return (
          <div>
            Not harvesting.
          </div>
        );
      }

      const { progress, required } = cell.building.extra.harvestState;

      const canAddPop = this.gameState.pop > 0;
      const canSubPop = (cell.building.extra.populationOn || 0) > 0;

      return (
        <div>
          <div>
            { cell.building.extra.populationOn! + 1 } workers harvesting.
          </div>

          <ProgressBar
            height={ 20 }
            percentage={ progress / required }
            text={ "Harvesting..." }
          />

          <div>
            {
              canAddPop &&
                <a
                  onClick={ () => {
                    this.gameState.pop -= 1;
                    cell.building!.extra.populationOn! += 1;
                  } }
                  style={{ color: canAddPop ? "white" : "gray" }}
                  href="javascript:;"
                >+1 Worker</a>
            } 
          </div>

          <div>
            {
              canSubPop &&
                <a
                  onClick={ () => {
                    this.gameState.pop += 1;
                    cell.building!.extra.populationOn! -= 1;
                  } }
                  style={{ color: canSubPop ? "white" : "gray" }}
                  href="javascript:;"
                >-1 Worker</a>
            }
          </div>

        </div>
      );
    }

    return (
      <></>
    );
  }

  renderBuildSomething(): JSX.Element {
    if (this.gameState.mode === "Micro") {
      return (
        <div>
          Return to world view (Z) to build something here.
        </div>
      );
    }

    const availableBuildings = this.availableBuildings();

    return (
      <>
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
                </a> (hotkey: { b.building.hotkey })
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
                  } {
                    this.state.hover.building.cost.ore  ? `${ this.state.hover.building.cost.ore } ore`   : " "
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
      </>
    );
  }

  render(): JSX.Element {
    let selection: WorldCell;

    selection = this.gameState.map.world.getCellAt(this.state.playerWorldX, this.state.playerWorldY);

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

    return (
      <div style={{ 
        color: "white",
        paddingLeft: "20px",
      }}>
        <div>
          Meat: { this.state.meat } | Wood: { this.state.wood } | Ore: { this.state.ore } | Pop: { this.state.pop }
        </div>

        <div>
          { this.getDescription(selection) }
        </div>

        <div>
          Elevation: { height }
        </div>

        {
          !selection.building &&
            this.renderBuildSomething()
        }

        {
          this.renderBuyAndHarvest(selection)
        }
      </div>
    )
  }
}

let biome: "grass" | "snow" | "water" | "town";

for (biome of ["grass", "snow", "water", "town"] as (typeof biome)[]) {
  for (const mapname of Constants.MAPS[biome]) {
    PIXI.loader.add(mapname, `./assets/${ mapname }.json`);
  }
}

PIXI.loader.add("map"   , `./assets/map.png`    );
PIXI.loader.add("macro" , `./assets/macro.png`  );
PIXI.loader.add("micro" , `./assets/micro.png`  );

PIXI.loader.load(() => {
  (window as any).state = new State();

  ReactDOM.render(
    <Toolbar />
    , document.getElementById("toolbar")
  );
});
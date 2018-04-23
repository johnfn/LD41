interface ToolbarState {
  selX: number;
  selY: number;

  wood: number;
  meat: number;
  gold: number;
  pop : number;

  health   : number;
  maxHealth: number;

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
    gold?: number;
  };
}

class Toolbar extends React.Component<{}, ToolbarState> {
  gameState: State;

  constructor(props: {}) {
    super(props);

    this.state = {
      selX : 0,
      selY : 0,

      health   : 0,
      maxHealth: 0,

      playerWorldX: 0,
      playerWorldY: 0,

      wood : 0,
      meat : 0,
      gold : 0,
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
      gold: gameState.gold,
      pop : gameState.pop,

      health   : gameState.health,
      maxHealth: gameState.maxHealth,

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

      if (!World.InBoundsRel(nx, ny)) continue;

      neighborCells.push(
        this.gameState.map.world.getCellAt(nx, ny)
      );
    }

    let result: BuildingAndCanAfford[] = [];
    
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
        if (b.hideWhenCantBuy) {
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

    result = result.filter(r => {
      if (r.building.hideWhenCantBuy && !r.canBuild) {
        if (r.whyNot === "Too expensive!") {
          return true;
        }

        return false;
      } else {
        return true;
      }
    });

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
      be.resourcesLeft = 10 + (Constants.DEBUG.MANY_RESOURCES ? 10000 : 0);
      be.populationOn = 0;
    }

    if (b.building.name === "Lumber Yard") {
      be.resourcesLeft = 100 + (Constants.DEBUG.MANY_RESOURCES ? 10000 : 0);
      be.populationOn = 0;
    }

    if (b.building.hideWhenCantBuy) {
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

  getDescription(cell: WorldCell, enemies: MacroEnemy | undefined): React.ReactNode {
    if (cell.fogStatus === "unknown") {
      return "I can't see anything there";
    }

    if (cell.building) {
      const name  = cell.building.building.name.toLowerCase();
      const extra = cell.building.extra;

      if (cell.building.building.harvester) {
        return (
          <div>
            <div>A { name }.</div>
            <div>
              { extra.resourcesLeft } { cell.building.building.resourceName } left.
            </div>
            <div>
              { extra.populationOn || 0 } people harvesting.
            </div>
          </div>
        );
      } else {
        return `A ${ name }.`;
      }
    } 

    let desc = "";

    if (cell.special !== "none") {
      if (cell.special === "ice") {
        desc = "A mysterious-looking ice temple";
      } else if (cell.special === "water") {
        desc = "A mysterious underwater temple";
      } else if (cell.special === "end") {
        desc = "A mysterious obelisk";
      } else if (cell.special === "start") {
        desc = "My hometown";
      }
    }

    if (cell.terrain === "snow") {
      desc = "Snowy mountains";
    } else if (cell.terrain === "water") {
      desc = "A body of water";
    } else if (cell.terrain === "grass") {
      if (cell.hasResources) {
        desc = "A forest";
      } else {
        desc = "A grassy field";
      }
    }

    if (enemies) {
      return (
        <span>
          { desc }<span style={{ color: "red" }}>, with enemies!</span>
        </span>
      )
    } else {
      return `${ desc }.`;
    }
  }

  buyPop(): void {

  }

  renderBuyAndHarvest(cell: WorldCell): JSX.Element {
    if (!cell.building) {
      return <></>;
    }

    if (
      cell.building.building.harvester
    ) {
      let harvestState: "no-resources" | "not" | "yes" = "yes";

      if (cell.building.extra.resourcesLeft !== undefined && 
          cell.building.extra.resourcesLeft <= 0) {
        harvestState = "no-resources";
      }

      if (!cell.building.extra.harvestState) {
        harvestState = "not";
      }

      const canAddPop = this.gameState.pop > 0 && (cell.building.extra.resourcesLeft || 0) > 0;
      const canSubPop = (cell.building.extra.populationOn || 0) > 0;

      return (
        <div>
          {
            harvestState === "yes" && cell.building.extra.harvestState &&
              <div>
                <div>
                  { cell.building.extra.populationOn! + 1 } workers harvesting.
                </div>

                <ProgressBar
                  height={ 20 }
                  percentage={ cell.building.extra.harvestState.progress / cell.building.extra.harvestState.required }
                  text={ "Harvesting..." }
                />
              </div>
          }

          {
            harvestState === "not" && 
              <div>
                Not harvesting
              </div>
          }

          {
            harvestState === "no-resources" && 
              <div>
                No resources left!
              </div>
          }

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

  renderBuildSomething(enemies: MacroEnemy | undefined): JSX.Element {
    if (this.gameState.mode === "Micro") {
      return (
        <div>
          Return to world view (Z) to build something here.
        </div>
      );
    }

    if (enemies) {
      return (
        <div>
          You can't build anything while enemies are here!
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
                    this.state.hover.building.cost.gold ? `${ this.state.hover.building.cost.gold } gold`  : " "
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
    let onTopOf = this.gameState.map.world.getCellAt(
      this.state.playerWorldX, 
      this.state.playerWorldY
    );

    let selection: WorldCell;

    if (this.gameState.mode === "Macro") {
      selection = this.gameState.map.world.getCellAt(
        this.gameState.mouse.relX,
        this.gameState.mouse.relY,
      );
    } else {
      selection = onTopOf;
    }

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
          Meat: { this.state.meat } | Wood: { this.state.wood } | Gold: { this.state.gold } | Pop: { this.state.pop }
        </div>

        <div>
          Health: { this.state.health } / { this.state.maxHealth }
        </div>

        <div>
          { this.getDescription(selection, this.gameState.map.world.enemyAt({ x: selection.xIndex, y: selection.yIndex })) }
        </div>

        <div>
          Elevation: { height }
        </div>

        {
          !onTopOf.building &&
            this.renderBuildSomething(this.gameState.map.world.enemyAt({ x: onTopOf.xIndex, y: onTopOf.yIndex }))
        }

        {
          this.renderBuyAndHarvest(onTopOf)
        }
      </div>
    )
  }
}

for (const key in Constants.MAPS) {
  for (const mapname of (Constants.MAPS as any)[key]) {
    PIXI.loader.add(mapname, `./assets/${ mapname }.json`);
  }
}

PIXI.loader.add("map"   , `./assets/map.png`    );
PIXI.loader.add("macro" , `./assets/macro.png`  );
PIXI.loader.add("micro" , `./assets/micro.png`  );

// PIXI.settings.RESOLUTION = 2;

PIXI.loader.load(() => {
  (window as any).state = new State();

  ReactDOM.render(
    <Toolbar />
    , document.getElementById("toolbar")
  );
});
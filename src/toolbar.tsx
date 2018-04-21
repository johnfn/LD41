interface ToolbarState {
  x: number;
  y: number;
}

class Toolbar extends React.Component<{}, ToolbarState> {
  gameState: State;

  constructor(props: {}) {
    super(props);

    this.state = {
      x: 0,
      y: 0,
    };

    this.gameState = (window as any).state;

    this.gameState.subscribe(gameState => this.onTick(gameState));
  }

  onTick(gameState: State): void {
    this.setState({
      x: gameState.map.selection.relX,
      y: gameState.map.selection.relY,
    })
  }

  render(): JSX.Element {
    return (
      <div style={{ color: "white" }}>
        Woo! { this.state.x } { this.state.y }
      </div>
    )
  }
}

ReactDOM.render(
  <Toolbar />
  , document.getElementById("toolbar")
);

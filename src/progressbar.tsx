interface ProgressBarProps {
  height    : number;
  percentage: number;
  text      : string;
}

interface ProgressBarState {

}

const ProgressBar = class extends React.Component<ProgressBarProps, ProgressBarState> {
  render() {
    return (
      <div style={{ 
          backgroundColor: "#333", 
          overflow: "hidden",
          height: `${ this.props.height }px`,
        }}
      >
        <div style={{
            height: this.props.height,
            width: `${ 100 * this.props.percentage }%`,
            backgroundColor: "black",
            color: "white",
          }}
        >
          { this.props.text }
        </div>
      </div>
    );
  }
};

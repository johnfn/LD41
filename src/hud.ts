class HUD extends PIXI.Graphics implements Updatable {
  woodText: PIXI.Text;
  meatText: PIXI.Text;
  activeMode: Mode = "All";

  constructor(state: State) {
    super();

    state.add(this);

    this.woodText = new PIXI.Text(
      `Wood: ${ state.wood }`, {
        fontFamily: 'FreePixel', 
        fontSize  : 32, 
        fill      : 0xffffff, 
        align     : 'left'
      }
    );

    this.addChild(this.woodText);

    this.meatText = new PIXI.Text(
      `Meat: ${ state.meat }`, {
        fontFamily: 'FreePixel', 
        fontSize  : 32, 
        fill      : 0xffffff, 
        align     : 'left'
      }
    );

    this.addChild(this.meatText);

    this.meatText.x = 200;
  }

  update(state: State): void {
    this.woodText.text = `Wood: ${ state.wood }`;
    this.meatText.text = `Meat: ${ state.meat }`;
  }
}
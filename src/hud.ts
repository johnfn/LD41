class HUD implements Updatable {
  woodText: PIXI.Text;
  meatText: PIXI.Text;

  constructor(state: State) {
    state.add(this);

    this.woodText = new PIXI.Text(
      `Wood: ${ state.wood }`, {
        fontFamily: 'FreePixel', 
        fontSize  : 32, 
        fill      : 0xffffff, 
        align     : 'left'
      }
    );

    state.app.stage.addChild(this.woodText);

    this.meatText = new PIXI.Text(
      `Meat: ${ state.meat }`, {
        fontFamily: 'FreePixel', 
        fontSize  : 32, 
        fill      : 0xffffff, 
        align     : 'left'
      }
    );

    state.app.stage.addChild(this.meatText);

    this.meatText.x = 200;
  }

  update(state: State): void {
    this.woodText.text = `Wood: ${ state.wood }`;
    this.meatText.text = `Meat: ${ state.meat }`;
  }
}
class FloatUpText extends PIXI.Graphics implements Updatable {
  activeMode : Mode = "All";
  lifespan   = 100;
  z          = 100;

  constructor(state: State, text: string) {
    super();

    state.add(this);

    this.addChild(new PIXI.Text(text, {
      fontFamily: 'FreePixel', 
      fontSize  : 24, 
      fill      : 0xffffff, 
      align     : 'left'
    }));
  }

  update(state: State): void {
    this.lifespan--;

    if (this.lifespan < 0) {
      this.parent.removeChild(this);
      state.remove(this);
    }

    this.y--;
  }
}
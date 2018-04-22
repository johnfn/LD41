class Camera {
  width: number;
  height: number;

  desiredStageX = 0;
  desiredStageY = 0;

  bounds: Rect;

  get x(): number {
    return this.centerX - this.width / 2;
  }

  get right(): number {
    return this.centerX + this.width / 2;
  }

  get y(): number {
    return this.centerY - this.height / 2;
  }

  get bottom(): number {
    return this.centerY + this.height / 2;
  }

  setX(value: number) {
    if (value < this.bounds.x) { value = this.bounds.x; }
    if (value >= this.bounds.right - this.width) { value = this.bounds.right - this.width; }

    this.desiredStageX = -value;
  }

  setY(value: number) {
    if (value < this.bounds.y) { value = this.bounds.y; }
    if (value >= this.bounds.bottom - this.height) { value = this.bounds.bottom - this.height; }

    this.desiredStageY = -value;
  }

  set centerX(value: number) {
    this.setX(value - this.width / 2);
  }

  get centerX(): number {
    return -this.desiredStageX + this.width / 2;
  }

  set centerY(value: number) {
    this.setY(value - this.height / 2);
  }

  get centerY(): number {
    return -this.desiredStageY + this.height / 2;
  }

  constructor() {
    this.width  = Constants.SCREEN_SIZE;
    this.height = Constants.SCREEN_SIZE;

    this.bounds = new Rect({ 
      x: 0, 
      y: 0, 
      w: Constants.MACRO.MAP_WIDTH,
      h: Constants.MACRO.MAP_HEIGHT,
    });
  }

  update(_state: State) {

  }
}
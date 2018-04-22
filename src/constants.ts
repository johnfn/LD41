const Constants = {
  SCREEN_SIZE: 32 * 16,

  MACRO: {
    TILE_WIDTH : 32,
    TILE_HEIGHT: 32,

    MAP_WIDTH_IN_TILES: 33,
    MAP_HEIGHT_IN_TILES: 33,

    MAP_WIDTH  : 32 * 33,
    MAP_HEIGHT : 32 * 33,
  },

  MICRO: {
    TILE_WIDTH : 32,
    TILE_HEIGHT: 32,

    MAP_WIDTH_IN_TILES: 16,
    MAP_HEIGHT_IN_TILES: 16,

    MAP_WIDTH  : 32 * 16,
    MAP_HEIGHT : 32 * 16,
  },

  UNKNOWN_COLOR: 0x000000,
  WATER_COLOR  : 0x0000ff,
  SNOW_COLOR   : 0xffffff,
  GRASS_COLOR  : 0x00ff00,

  MAPS: {
    grass: [ 
      "grass1",
      "grass2",
      "grass3",
    ],
    snow: [
      "grass1"
    ],
    water: [
      "grass1"
    ],
    town: [
      "town",
    ]
  }
};
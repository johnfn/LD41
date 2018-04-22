const Constants = {
  DEBUG: {
    FOG_OF_WAR: true,
    FAST_RESOURCES: true,
    MANY_RESOURCES: false,
    POP_BOOST: false,
  },

  SCREEN_SIZE: 32 * 16,
  BORDER_REGION_WIDTH: 1,

  HARVEST_TIME: {
    "grass": 15,
    "water": 30,
    "snow" : 45,
  },

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

  WOOD_RESOURCE_COUNT: 50,
  ORE_RESOURCE_COUNT : 10,
  FISH_RESOURCE_COUNT: 20,

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
      "snow1",
      "snow2",
    ],
    water: [
      "water1"
    ],
    town: [
      "town",
    ]
  }
};
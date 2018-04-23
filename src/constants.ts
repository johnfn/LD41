const Constants = {
  DEBUG: {
    FOG_OF_WAR       : true,
    TRAVEL_ON_UNKNOWN: true,
    FAST_RESOURCES   : false,
    MANY_RESOURCES   : true,
    POP_BOOST        : false,
    JUST_ONE_ENEMY   : true,
  },

  GOLD_DROP_RATE: 0.4,

  ENEMY_GROUP_SIZE_LOW : 3,
  ENEMY_GROUP_SIZE_HIGH: 7,
  NUM_START_ENEMIES: 20,
  ENEMY_SPEED: 500,

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
  GOLD_RESOURCE_COUNT: 10,
  FISH_RESOURCE_COUNT: 20,

  UNKNOWN_COLOR: 0x000000,
  WATER_COLOR  : 0x82f6ff,
  SNOW_COLOR   : 0xffffff,
  GRASS_COLOR  : 0x00ff00,

  MAPS: {
    grass: [ 
      "grass1",
      "grass2",
      "grass3",
    ],
    forest: [
      "forest",
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
    ],
    roads: [ 
      "road0000",
      "road0001",
      "road0010",
      "road0011",
      "road0100",
      "road0101",
      "road0110",
      "road0111",
      "road1000",
      "road1001",
      "road1010",
      "road1011",
      "road1100",
      "road1101",
      "road1110",
      "road1111",
    ]
  }
};
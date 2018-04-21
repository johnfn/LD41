class Util {
  public static RandElem<T>(x: T[]): T {
    return x[Math.floor(Math.random() * x.length)];
  }

  public static SortByKey<T>(array: T[], key: (t: T) => number): T[] {
    return array.sort((a, b) => {
      const x = key(a);
      const y = key(b);

      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
  }

  public static ManhattanDistance(c1: { xIndex: number, yIndex: number }, c2: { xIndex: number, yIndex: number }): number {
    return (
      Math.abs(c1.xIndex - c2.xIndex) + 
      Math.abs(c1.yIndex - c2.yIndex)
    );
  }
}

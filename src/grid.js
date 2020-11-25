import { initBoundsCheck } from "./bounds.js";
import * as d3 from 'd3-tile';
import { getTileMetric } from "./metric.js";

export function initTileGrid({ key, source, tileCache }) {
  const { tileSize = 512, maxzoom = 30 } = source;
  const outOfBounds = initBoundsCheck(source);

  var numTiles = 0;

  // Set up the tile layout
  const layout = d3.tile()
    .tileSize(tileSize * Math.sqrt(2)) // Don't let d3-tile squeeze the tiles
    .maxZoom(maxzoom)
    .clampX(false); // Allow panning across the antimeridian

  function getTiles(viewport, transform, pixRatio = 1) {
    // Get the grid of tiles needed for the current viewport
    layout.size(viewport);
    const tiles = layout(transform);

    // Update tile priorities based on the new grid
    const metric = getTileMetric(layout, tiles);
    tileCache.process(tile => { tile.priority = metric(tile); });
    numTiles = tileCache.drop(tile => metric(tile) > 0.75);
    const stopCondition = ([z, x, y]) => metric({ z, x, y }) > 0.75;

    // Retrieve a tile box for every tile in the grid
    var tilesDone = 0;
    const grid = tiles.map(([x, y, z]) => {
      let [xw, yw, zw] = d3.tileWrap([x, y, z]);

      if (outOfBounds(zw, xw, yw)) {
        tilesDone += 1; // Count it as complete
        return;
      }

      let box = tileCache.retrieve([zw, xw, yw], stopCondition);
      if (!box) return;

      tilesDone += (box.sw / tileSize) ** 2;
      return Object.assign(box, { x, y, z });
    }).filter(t => t !== undefined);

    grid.loaded = tilesDone / tiles.length;
    grid.scale = tiles.scale;
    grid.translate = tiles.translate.slice();

    return grid;
  }

  return { key, getTiles, numTiles: () => numTiles };
}
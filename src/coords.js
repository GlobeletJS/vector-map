import * as projection from "./proj-mercator.js";

export function initCoords({ size, center, zoom }) {
  const degrees = 180 / Math.PI;
  const minTileSize = 256;
  const logTileSize = Math.log2(minTileSize);

  const transform = { k: 1, x: 0, y: 0 };
  const camPos = new Float64Array([0.5, 0.5]);
  const scale = new Float64Array([1.0, 1.0]);

  setCenterZoom(center, zoom);

  return {
    setTransform,
    setCenterZoom,

    getViewport,
    getTransform: () => Object.assign({}, transform),
    getCamPos: () => camPos.slice(),
    getScale: () => scale.slice(),
  };

  function getViewport(pixRatio = 1) {
    return [size.width / pixRatio, size.height / pixRatio];
  }

  function setTransform(rawTransform) {
    // Round raw values to ensure alignment with screen pixels
    const { k, x, y } = rawTransform;

    // Find the exact and integer zoom levels
    let z = Math.log2(k) - logTileSize;
    let z0 = Math.floor(z);

    // Tile scale for display is determined by the fractional part of the zoom.
    // Round this scale to the nearest integer number of pixels
    let tileScale = Math.round(2 ** (z - z0) * minTileSize);

    // The rounded k value: the pixel size of the whole map
    transform.k = 2 ** z0 * tileScale;

    // Adjust the translation values for the change in the scale
    let kScale = transform.k / k;
    let sx = x * kScale;
    let sy = y * kScale;
    // Round these values to the nearest pixel
    transform.x = Math.round(sx);
    transform.y = Math.round(sy);

    // Make sure camera is still pointing at the original location: shift from 
    // the center [0.5, 0.5] by the change in the translation due to rounding
    camPos[0] = 0.5 + (transform.x - sx) / size.width;
    camPos[1] = 0.5 + (transform.y - sy) / size.height;

    // Store the scale of the current map relative to the entire world
    scale[0] = transform.k / size.width;
    scale[1] = transform.k / size.height;
  }

  function setCenterZoom(c, z) {
    let k = 512 * 2 ** z;
    let [xr, yr] = projection.lonLatToXY([], c.map(x => x / degrees));
    
    let x = (0.5 - xr) * k + size.width / 2;
    let y = (0.5 - yr) * k + size.height / 2;

    return setTransform({ k, x, y });
  }
}
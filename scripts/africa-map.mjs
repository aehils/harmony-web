// Builds assets/africa.svg: the continent filled with flowing wave lines,
// echoing the hero's harmonised waves. Coastline is hand-plotted [lat, lon]
// at known capes, ports and river mouths, then smoothed.
import { writeFileSync } from 'node:fs';

const coast = [
  [35.8,-5.9],[35.9,-5.3],[35.25,-3.9],[35.7,-0.6],[36.8,3.0],[36.75,5.1],[36.9,7.75],[37.3,9.85],
  [37.05,11.05],[35.8,10.65],[34.7,10.8],[33.9,10.1],[33.6,11.1],[32.9,13.2],[32.4,15.1],[31.2,16.6],
  [30.3,19.0],[31.0,20.0],[32.1,20.1],[32.85,22.0],[32.75,22.7],[32.1,24.0],[31.55,25.15],[31.0,28.5],
  [31.2,29.9],[31.55,31.0],[31.25,32.3],[29.95,32.55],[27.2,33.85],[23.9,35.75],[22.0,36.85],
  [19.6,37.25],[17.0,38.6],[15.6,39.45],[13.0,42.7],[11.6,43.15],[10.4,45.0],[11.3,49.2],[11.85,51.25],
  [10.4,51.4],[8.0,49.85],[5.35,48.5],[2.0,45.35],[-0.4,42.55],[-2.3,40.9],[-4.05,39.67],[-6.8,39.3],
  [-8.9,39.5],[-10.3,40.2],[-10.7,40.55],[-13.0,40.55],[-15.0,40.75],[-16.2,39.9],[-17.9,36.9],
  [-19.8,34.85],[-21.0,35.1],[-22.1,35.5],[-23.85,35.45],[-25.1,33.6],[-25.95,32.6],[-26.8,32.9],
  [-28.8,32.1],[-29.85,31.05],[-31.6,29.5],[-33.0,27.9],[-33.95,25.6],[-34.05,23.4],[-34.4,21.4],
  [-34.83,20.0],[-34.35,18.5],[-33.9,18.4],[-33.0,17.9],[-31.5,18.2],[-28.6,16.45],[-26.65,15.15],
  [-22.95,14.5],[-21.8,13.95],[-17.25,11.75],[-15.2,12.15],[-12.6,13.4],[-11.0,13.8],[-8.8,13.2],
  [-6.0,12.3],[-4.8,11.85],[-2.4,9.8],[-0.6,8.7],[0.4,9.45],[1.85,9.75],[3.0,9.9],[4.0,9.5],
  [4.6,8.6],[4.5,7.3],[4.3,6.05],[5.6,5.0],[6.45,3.4],[6.35,2.4],[5.55,-0.2],[4.75,-2.1],
  [5.2,-3.5],[5.3,-4.0],[4.95,-6.0],[4.35,-7.7],[5.0,-9.0],[6.3,-10.8],[7.5,-12.5],[8.5,-13.25],
  [9.5,-13.7],[10.6,-14.8],[11.85,-15.6],[12.6,-16.75],[14.7,-17.5],[16.0,-16.5],[18.1,-16.05],
  [19.5,-16.45],[20.8,-17.05],[22.5,-16.4],[23.7,-15.95],[26.1,-14.5],[27.9,-12.9],[28.8,-11.1],
  [29.4,-10.2],[30.4,-9.6],[30.65,-9.9],[31.5,-9.8],[32.3,-9.25],[33.25,-8.5],[33.6,-7.6],[34.0,-6.85],
  [35.2,-6.15],
];
const madagascar = [
  [-11.95,49.25],[-13.35,50.0],[-15.25,50.5],[-16.9,49.9],[-18.15,49.4],[-21.2,48.35],[-22.8,47.85],
  [-25.05,47.0],[-25.6,45.15],[-24.6,43.7],[-23.35,43.65],[-21.75,43.35],[-20.3,44.3],[-18.05,44.0],
  [-16.2,44.45],[-15.7,46.3],[-14.6,47.5],[-13.4,48.3],[-12.6,49.0],
];

// Equirectangular: Africa straddles the equator, so it barely distorts.
const W0 = -18.5, N0 = 38.5, S = 10;
const P = ([lat, lon]) => [(lon - W0) * S, (N0 - lat) * S];
const f = (n) => +n.toFixed(1);

// Closed Catmull-Rom → cubic Bézier, for an organic coastline.
function smooth(pts) {
  const p = pts.map(P), n = p.length, t = 0.5 / 3;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
    d += `C${f(b[0] + (c[0] - a[0]) * t)} ${f(b[1] + (c[1] - a[1]) * t)} ${f(c[0] - (e[0] - b[0]) * t)} ${f(c[1] - (e[1] - b[1]) * t)} ${f(c[0])} ${f(c[1])}`;
  }
  return d + 'Z';
}
const land = smooth(coast) + smooth(madagascar);

const xs = [...coast, ...madagascar].map((q) => P(q)[0]);
const ys = [...coast, ...madagascar].map((q) => P(q)[1]);
const minX = Math.floor(Math.min(...xs)) - 6, maxX = Math.ceil(Math.max(...xs)) + 6;
const minY = Math.floor(Math.min(...ys)) - 6, maxY = Math.ceil(Math.max(...ys)) + 6;

// The waves: one gentle line every `gap`, each a little out of phase with the
// one above, so together they drift diagonally like a braid coming loose.
const gap = 15, lambda = 120;
let waves = '';
for (let y = minY, i = 0; y <= maxY; y += gap, i++) {
  const A = 4 + 3 * Math.sin(i * 0.42);
  const x0 = minX - lambda - ((i * lambda * 0.11) % lambda);
  waves += `M${f(x0)} ${f(y)}Q${f(x0 + lambda / 4)} ${f(y - 2 * A)} ${f(x0 + lambda / 2)} ${f(y)}`;
  for (let x = x0 + lambda / 2; x < maxX; x += lambda / 2) waves += `T${f(x + lambda / 2)} ${f(y)}`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}">
<defs>
<clipPath id="a"><path d="${land}"/></clipPath>
<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${minX}" y1="${minY}" x2="${maxX}" y2="${maxY}">
<stop offset="0" stop-color="#FF0062"/><stop offset=".55" stop-color="#B43A80"/><stop offset="1" stop-color="#FF8038"/>
</linearGradient>
</defs>
<g clip-path="url(#a)" fill="none" stroke="url(#g)" stroke-width="2.4" stroke-linecap="round"><path d="${waves}"/></g>
<path d="${land}" fill="none" stroke="url(#g)" stroke-width="1.6" stroke-linejoin="round"/>
</svg>
`;
writeFileSync(process.argv[2], svg);
console.log(svg.length, 'bytes', { w: maxX - minX, h: maxY - minY });

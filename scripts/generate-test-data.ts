import { createWriteStream } from "node:fs";
import { contours } from "d3-contour";

// --- Color range (same as ExtendedContourLayer) ---
const DEFAULT_COLOR_RANGE: number[][] = [
	[8, 29, 88],
	[16, 56, 126],
	[23, 82, 156],
	[32, 112, 180],
	[43, 140, 190],
	[65, 182, 196],
	[99, 198, 189],
	[127, 205, 187],
	[161, 218, 180],
	[199, 233, 180],
	[217, 240, 179],
	[237, 248, 177],
	[255, 255, 204],
	[255, 245, 178],
	[255, 237, 160],
	[254, 227, 140],
	[254, 217, 118],
	[254, 198, 96],
	[254, 178, 76],
	[253, 159, 68],
	[253, 141, 60],
	[252, 112, 51],
	[252, 78, 42],
	[240, 52, 35],
	[227, 26, 28],
	[208, 13, 33],
	[189, 0, 38],
	[165, 0, 38],
	[128, 0, 38],
	[89, 0, 28],
];

// --- Config ---
const BOUNDS: [number, number, number, number] = [-2.9691437069012636, 53.276823185185435, -1.6440644345684063, 53.695462187191424];
const GRID_SPACING_M = 20; // 20m grid
const NUM_BANDS = 30;
const OPACITY = 0.7;
const OUTPUT_FILE = "test-data.geojson";

// Approximate degrees per meter at this latitude
const LAT_MID = (BOUNDS[1] + BOUNDS[3]) / 2;
const DEG_PER_M_LAT = 1 / 111_320;
const DEG_PER_M_LNG = 1 / (111_320 * Math.cos((LAT_MID * Math.PI) / 180));

const stepLng = GRID_SPACING_M * DEG_PER_M_LNG;
const stepLat = GRID_SPACING_M * DEG_PER_M_LAT;

const [minLng, minLat, maxLng, maxLat] = BOUNDS;
const cols = Math.ceil((maxLng - minLng) / stepLng);
const rows = Math.ceil((maxLat - minLat) / stepLat);

console.log(`Grid: ${cols} x ${rows} = ${(cols * rows).toLocaleString()} cells (${GRID_SPACING_M}m spacing)`);

// --- Generate flat value array on a regular grid ---
// Broad overlapping peaks
const peaks = [
	{ lng: minLng + (maxLng - minLng) * 0.3, lat: minLat + (maxLat - minLat) * 0.7, height: 500, sigma: 5 },
	{ lng: minLng + (maxLng - minLng) * 0.7, lat: minLat + (maxLat - minLat) * 0.4, height: 600, sigma: 4 },
	{ lng: minLng + (maxLng - minLng) * 0.5, lat: minLat + (maxLat - minLat) * 0.2, height: 400, sigma: 6 },
	{ lng: minLng + (maxLng - minLng) * 0.15, lat: minLat + (maxLat - minLat) * 0.5, height: 350, sigma: 7 },
	{ lng: minLng + (maxLng - minLng) * 0.85, lat: minLat + (maxLat - minLat) * 0.8, height: 450, sigma: 5 },
];

console.log("Generating grid values...");
const values = new Float64Array(cols * rows);
let minValue = Infinity;
let maxValue = -Infinity;

for (let j = 0; j < rows; j++) {
	const lat = minLat + j * stepLat;
	for (let i = 0; i < cols; i++) {
		const lng = minLng + i * stepLng;

		let elevation = 50;
		for (const peak of peaks) {
			const dist = Math.sqrt((lng - peak.lng) ** 2 + (lat - peak.lat) ** 2);
			elevation += peak.height * Math.exp(-dist * peak.sigma);
		}
		elevation += (Math.random() - 0.5) * 20;
		elevation = Math.max(0, elevation);

		// d3-contour uses values[i + j * cols]
		values[i + j * cols] = elevation;

		if (elevation < minValue) minValue = elevation;
		if (elevation > maxValue) maxValue = elevation;
	}
	if (j % 500 === 0) {
		console.log(`  row ${j}/${rows} (${((j / rows) * 100).toFixed(0)}%)`);
	}
}

console.log(`Value range: ${minValue.toFixed(1)} - ${maxValue.toFixed(1)}`);

// --- Generate contour bands using d3-contour (marching squares on flat array) ---
console.log("Generating contour bands...");
const bandStep = (maxValue - minValue) / NUM_BANDS;
const thresholds = Array.from({ length: NUM_BANDS + 1 }, (_, i) => minValue + i * bandStep);

const contourGenerator = contours().size([cols, rows]).thresholds(thresholds);
const contourData = contourGenerator(values);

console.log(`Generated ${contourData.length} contour levels`);

// --- Convert grid coordinates to lng/lat and build GeoJSON isobands ---
// d3-contour returns contours where coordinates are in grid space (i, j).
// We need to convert to lng/lat. Each contour is >= threshold, so we
// build isobands by pairing consecutive contour levels.

function gridToLngLat(coords: number[][][]): number[][][] {
	return coords.map((ring) =>
		ring.map(([i, j]) => [minLng + i * stepLng, minLat + j * stepLat]),
	);
}

function gridToLngLatMulti(coords: number[][][][]): number[][][][] {
	return coords.map((polygon) => gridToLngLat(polygon));
}

function getColorHex(value: number): string {
	if (maxValue === minValue) {
		const c = DEFAULT_COLOR_RANGE[0];
		return `#${c[0].toString(16).padStart(2, "0")}${c[1].toString(16).padStart(2, "0")}${c[2].toString(16).padStart(2, "0")}`;
	}
	const t = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
	const idx = Math.min(Math.floor(t * (DEFAULT_COLOR_RANGE.length - 1)), DEFAULT_COLOR_RANGE.length - 2);
	const frac = t * (DEFAULT_COLOR_RANGE.length - 1) - idx;
	const c1 = DEFAULT_COLOR_RANGE[idx];
	const c2 = DEFAULT_COLOR_RANGE[idx + 1];
	const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
	const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
	const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// --- Stream features to file one at a time to avoid string size limit ---
console.log("Streaming GeoJSON features to file...");
const out = createWriteStream(OUTPUT_FILE);
out.write('{"type":"FeatureCollection","features":[\n');

let featureCount = 0;
let bytesWritten = 0;

for (let idx = 0; idx < contourData.length; idx++) {
	const contour = contourData[idx];
	if (contour.coordinates.length === 0) continue;

	const midValue = contour.value + bandStep / 2;
	const feature = {
		type: "Feature",
		geometry: {
			type: "MultiPolygon",
			coordinates: gridToLngLatMulti(contour.coordinates),
		},
		properties: {
			value: contour.value,
			fill: getColorHex(Math.min(midValue, maxValue)),
			"fill-opacity": OPACITY,
			stroke: getColorHex(Math.min(midValue, maxValue)),
			"stroke-width": 0,
			"stroke-opacity": 0,
		},
	};

	const json = JSON.stringify(feature);
	const prefix = featureCount > 0 ? ",\n" : "";
	out.write(prefix + json);
	bytesWritten += json.length + prefix.length;
	featureCount++;

	console.log(`  feature ${featureCount} (threshold ${contour.value.toFixed(1)}): ${(json.length / 1024 / 1024).toFixed(1)} MB`);
}

out.write("\n]}\n");
out.end();

await new Promise<void>((resolve, reject) => {
	out.on("finish", resolve);
	out.on("error", reject);
});

const sizeMB = (bytesWritten / 1024 / 1024).toFixed(1);
console.log(`\nWritten ${featureCount} features to ${OUTPUT_FILE} (~${sizeMB} MB)`);

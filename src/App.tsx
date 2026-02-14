import type { LayersList, PickingInfo } from "@deck.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Map as MapLibreMap, useControl } from "@vis.gl/react-maplibre";
import type maplibregl from "maplibre-gl";
import { useEffect, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { InterpolatedHeatmapLayer } from "./layers/ExtendedContourLayer";
// import ExtendedIconLayer from "./layers/ExtendedIconLayer";
// import ExtendedPathLayer from "./layers/ExtendedPathLayer";
import { injectTooltipStyles, renderWaypointTooltip, type TooltipData, type TooltipReturn } from "./utils/tooltipRenderer";

// --- CONFIGURE ---
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN; // required for Mapbox tiles
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
	version: 8,
	sources: {
		"satellite-tiles": {
			type: "raster",
			tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`],
			tileSize: 256,
		},
	},
	layers: [
		{
			id: "satellite-layer",
			type: "raster",
			source: "satellite-tiles",
			minzoom: 0,
			maxzoom: 22,
		},
	],
};

const MAP_STYLES = {
	satellite: SATELLITE_STYLE,
	liberty: "./liberty.json",
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

interface DeckGLOverlayProps {
	layers: LayersList;
	getTooltip?: (info: PickingInfo) => TooltipReturn;
}

function DeckGLOverlay({ layers, getTooltip }: DeckGLOverlayProps) {
	const overlay = useControl(() => new MapboxOverlay({ interleaved: true }));
	overlay.setProps({ layers, getTooltip });
	return null;
}

// type BartLine = {
// 	name: string;
// 	color: string;
// 	path: [number, number][];
// };

function generateRandomTerrain(count: number, bounds: [number, number, number, number]) {
	const [minLng, minLat, maxLng, maxLat] = bounds;
	const points = [];

	// Create a few "peaks"
	const peaks = [
		{ lng: minLng + (maxLng - minLng) * 0.3, lat: minLat + (maxLat - minLat) * 0.7, height: 500 },
		{ lng: minLng + (maxLng - minLng) * 0.7, lat: minLat + (maxLat - minLat) * 0.4, height: 600 },
		{ lng: minLng + (maxLng - minLng) * 0.5, lat: minLat + (maxLat - minLat) * 0.2, height: 400 },
	];

	for (let i = 0; i < count; i++) {
		const lng = minLng + Math.random() * (maxLng - minLng);
		const lat = minLat + Math.random() * (maxLat - minLat);

		// Calculate elevation based on distance to peaks
		let elevation = 50; // base elevation
		for (const peak of peaks) {
			const dist = Math.sqrt((lng - peak.lng) ** 2 + (lat - peak.lat) ** 2);
			elevation += peak.height * Math.exp(-dist * 50); // Gaussian falloff
		}

		// Add some noise
		elevation += (Math.random() - 0.5) * 50;

		points.push({ lng, lat, elevation: Math.max(0, elevation) });
	}

	return points;
}

// Generate 5000 points around Derby
const terrainData = generateRandomTerrain(1000, [-2.9691437069012636, 53.695462187191424, -1.6440644345684063, 53.276823185185435]);

export default function App() {
	const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");

	// Inject CSS styles for tooltips
	useEffect(() => {
		injectTooltipStyles();
	}, []);

	const getTooltip = (info: PickingInfo) => {
		if (!info.object) return null;
		return renderWaypointTooltip(info.object as TooltipData);
	};

	console.log(terrainData);

	const layers = [
		// new ExtendedPathLayer<BartLine>({
		// 	id: "PathLayer",
		// 	data: [
		// 		{
		// 			name: "Richmond - Millbrae",
		// 			color: "#ff0000",
		// 			path: [
		// 				[-122.3535851, 37.9360513],
		// 				[-122.3179784, 37.9249513],
		// 				[-122.300284, 37.902646],
		// 				[-122.2843653, 37.8735039],
		// 				[-122.269058, 37.8694562],
		// 				[-122.2709185, 37.85301],
		// 				[-122.2689342, 37.8283973],
		// 				[-122.2707195, 37.8080566],
		// 				[-122.2718706, 37.704996],
		// 			],
		// 		},
		// 	],
		// 	getColor: (d: BartLine): [number, number, number, number] => {
		// 		const hex = d.color;
		// 		// convert to RGB
		// 		const rgb = hex.match(/[0-9a-f]{2}/g)?.map((x) => parseInt(x, 16)) || [0, 0, 0];
		// 		return [rgb[0], rgb[1], rgb[2], 255];
		// 	},
		// 	getPath: (d: BartLine) => d.path,
		// 	getWidth: 15, // Total width (line + arrow overflow)
		// 	pickable: true,

		// 	// Arrow configuration
		// 	arrowSize: 0.9, // Chevrons extend to 90% of total width
		// 	arrowColor: [255, 0, 0, 255], // Red for visibility
		// 	lineWidthRatio: 0.15, // Visible line is 25% of total width

		// 	// Waypoint configuration
		// 	showWaypoints: true,
		// 	waypointRadius: 8, // Size in meters (will scale with zoom)
		// 	waypointColor: [255, 255, 255, 200], // White with some transparency
		// 	waypointStrokeColor: [255, 0, 0, 255], // Red border to match line color
		// 	waypointStrokeWidth: 2, // Border width in meters
		// }),
		// new ExtendedIconLayer({
		// 	id: "IconLayer",
		// 	data: [{ position: [0, 0], name: "Daly City Station" }],
		// 	getPosition: (d) => d.position as [number, number],
		// 	getSize: 20,
		// 	pickable: true,
		// 	// Circle background properties
		// 	circleRadius: 20,
		// 	circleColor: [16, 6, 159, 255], // Dark blue background
		// 	circleStrokeColor: [0, 0, 0, 255], // Black border
		// 	circleStrokeWidth: 0,
		// 	iconAtlas: "/rr_engine_stand_000000.webp",
		// 	iconMapping: {
		// 		marker: { x: 0, y: 0, width: 48, height: 48, mask: true },
		// 	},
		// 	getIcon: () => "marker",
		// 	getColor: [255, 255, 255, 255],
		// }),
		new InterpolatedHeatmapLayer({
			id: "elevation-heatmap",
			data: terrainData,
			getPosition: (d) => [d.lng, d.lat],
			getValue: (d) => d.elevation,
			cellSize: 0.2, // km
			weight: 2, // IDW exponent
			opacity: 0.7,

			// Optional: use filled contour bands instead of grid cells
			useContours: true,
			numBands: 8,
		}),
	];

	return (
		<div style={{ position: "relative", width: "100%", height: "100vh" }}>
			<MapLibreMap
				initialViewState={{
					longitude: -1.6440644345684063,
					latitude: 53.276823185185435,
					zoom: 15,
				}}
				style={{ width: "100%", height: "100%" }}
				mapStyle={MAP_STYLES[mapStyle]}
			>
				<DeckGLOverlay layers={layers} getTooltip={getTooltip} />
			</MapLibreMap>
			<div
				style={{
					position: "absolute",
					top: 10,
					right: 10,
					background: "white",
					borderRadius: 4,
					boxShadow: "0 0 4px rgba(0,0,0,0.3)",
					display: "flex",
					overflow: "hidden",
				}}
			>
				{(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
					<button
						key={key}
						type="button"
						onClick={() => setMapStyle(key)}
						style={{
							padding: "6px 12px",
							border: "none",
							background: mapStyle === key ? "#0078ff" : "white",
							color: mapStyle === key ? "white" : "#333",
							cursor: "pointer",
							fontSize: 13,
							textTransform: "capitalize",
						}}
					>
						{key}
					</button>
				))}
			</div>
		</div>
	);
}

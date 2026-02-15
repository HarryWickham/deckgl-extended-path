import type { Accessor, Color, CompositeLayerProps, DefaultProps } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { interpolate, isobands } from "@turf/turf";

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

export type InterpolatedHeatmapLayerProps<DataT = unknown> = CompositeLayerProps & {
	getPosition?: Accessor<DataT, number[]>;
	getValue?: Accessor<DataT, number>;
	cellSize?: number;
	cellSizeUnits?: string;
	weight?: number;
	useContours?: boolean;
	contourBands?: number[] | null;
	numBands?: number;
	colorRange?: number[][];
	opacity?: number;
	stroked?: boolean;
	lineWidth?: number;
};

// biome-ignore lint/suspicious/noExplicitAny: deck.gl accessor defaults require any
const defaultProps: DefaultProps<InterpolatedHeatmapLayerProps<any>> = {
	getPosition: { type: "accessor", value: (d) => d.position },
	getValue: { type: "accessor", value: (d) => d.value },
	cellSize: { type: "number", value: 0.5 },
	cellSizeUnits: "kilometers",
	weight: { type: "number", value: 2 },
	useContours: { type: "boolean", value: false },
	contourBands: { type: "array", value: null },
	numBands: { type: "number", value: 30 },
	colorRange: { type: "array", value: DEFAULT_COLOR_RANGE },
	opacity: { type: "number", value: 0.8 },
	stroked: false,
	lineWidth: { type: "number", value: 1 },
};

export class InterpolatedHeatmapLayer<DataT = unknown> extends CompositeLayer<InterpolatedHeatmapLayerProps<DataT>> {
	static layerName = "InterpolatedHeatmapLayer";
	static defaultProps = defaultProps;

	updateState({ changeFlags }: { changeFlags: { dataChanged: unknown; propsChanged: unknown } }) {
		if (changeFlags.dataChanged || changeFlags.propsChanged) {
			this._computeGrid();
		}
	}

	_computeGrid() {
		const { data, getPosition, getValue, cellSize, cellSizeUnits, weight, useContours, contourBands, numBands } = this
			.props as InterpolatedHeatmapLayerProps<DataT> & { data: DataT[] };

		if (!data || data.length === 0) {
			this.setState({ gridData: null, minValue: 0, maxValue: 0 });
			return;
		}

		try {
			// Build point features with validation
			const features = [];

			for (let i = 0; i < data.length; i++) {
				const d = data[i];
				const pos = typeof getPosition === "function" ? getPosition(d, { index: i, data: data as DataT[], target: [] }) : null;
				const val = typeof getValue === "function" ? getValue(d, { index: i, data: data as DataT[], target: [] }) : null;

				// Validate coordinates
				if (!Array.isArray(pos) || pos.length < 2) continue;
				if (typeof pos[0] !== "number" || typeof pos[1] !== "number") continue;
				if (Number.isNaN(pos[0]) || Number.isNaN(pos[1])) continue;
				if (typeof val !== "number" || Number.isNaN(val)) continue;

				features.push({
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [pos[0], pos[1]],
					},
					properties: { value: val },
				});
			}

			if (features.length < 3) {
				console.warn("InterpolatedHeatmapLayer: Need at least 3 valid points");
				this.setState({ gridData: null, minValue: 0, maxValue: 0 });
				return;
			}

			const points = { type: "FeatureCollection", features };

			// Calculate min/max
			const values = features.map((f) => f.properties.value);
			const minValue = Math.min(...values);
			const maxValue = Math.max(...values);

			// Run interpolation
			const grid = interpolate(points, cellSize ?? 0.5, {
				gridType: useContours ? "point" : "square",
				property: "value",
				units: cellSizeUnits,
				weight,
			});

			let gridData: GeoJSON.FeatureCollection;

			if (useContours) {
				const bands = contourBands || this._generateBands(minValue, maxValue, numBands ?? 10);
				gridData = isobands(grid as GeoJSON.FeatureCollection<GeoJSON.Point>, bands, { zProperty: "value" });
			} else {
				gridData = grid;
			}

			// Embed fill color and opacity into each feature's properties
			const colorRange = this.props.colorRange ?? DEFAULT_COLOR_RANGE;
			for (const feature of gridData.features) {
				const raw = feature.properties?.value;
				let value: number;
				if (typeof raw === "string") {
					const parts = raw.split("-");
					const min = Number.parseFloat(parts[0]);
					const max = Number.parseFloat(parts[parts.length - 1]);
					value = (min + max) / 2;
				} else {
					value = raw as number;
				}
				const color = this._getColorHex(value, minValue, maxValue, colorRange);
				feature.properties = {
					...feature.properties,
					fill: color,
					"fill-opacity": this.props.opacity ?? 0.8,
				};
			}

			console.log("InterpolatedHeatmapLayer grid data:", gridData);

			this.setState({ gridData, minValue, maxValue });
		} catch (err) {
			console.error("InterpolatedHeatmapLayer error:", err);
			this.setState({ gridData: null, minValue: 0, maxValue: 0 });
		}
	}

	_generateBands(min: number, max: number, count: number) {
		const step = (max - min) / count;
		return Array.from({ length: count + 1 }, (_, i) => min + i * step);
	}

	_getColorHex(value: number, minValue: number, maxValue: number, colorRange: number[][]): string {
		if (maxValue === minValue) {
			const c = colorRange[0];
			return `#${c[0].toString(16).padStart(2, "0")}${c[1].toString(16).padStart(2, "0")}${c[2].toString(16).padStart(2, "0")}`;
		}

		const t = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
		const idx = Math.min(Math.floor(t * (colorRange.length - 1)), colorRange.length - 2);
		const frac = t * (colorRange.length - 1) - idx;

		const c1 = colorRange[idx];
		const c2 = colorRange[idx + 1];
		const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
		const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
		const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
		return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
	}

	_hexToRgba(hex: string, opacity: number): Color {
		const r = Number.parseInt(hex.slice(1, 3), 16);
		const g = Number.parseInt(hex.slice(3, 5), 16);
		const b = Number.parseInt(hex.slice(5, 7), 16);
		return [r, g, b, Math.round(opacity * 255)] as Color;
	}

	renderLayers() {
		const { gridData } = (this.state || {}) as { gridData?: GeoJSON.FeatureCollection };
		const { opacity, stroked, lineWidth } = this.props;

		if (!gridData) return null;

		return new GeoJsonLayer({
			id: `${this.props.id}-geojson`,
			data: gridData,
			getFillColor: (d) => {
				const fill = d.properties?.fill as string;
				const fillOpacity = (d.properties?.["fill-opacity"] as number) ?? 0.8;
				return this._hexToRgba(fill, fillOpacity);
			},
			opacity: 1,
			stroked,
			getLineColor: [50, 50, 50],
			getLineWidth: lineWidth,
			lineWidthUnits: "pixels",
			pickable: this.props.pickable,
			updateTriggers: {
				getFillColor: [this.props.colorRange, this.state?.minValue, this.state?.maxValue, opacity],
			},
		});
	}
}

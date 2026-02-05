import type { CompositeLayerProps, DefaultProps, GetPickingInfoParams, Layer, PickingInfo } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { PathLayerProps } from "@deck.gl/layers";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";

// Props for the composite layer
export type ExtendedPathLayerProps<DataT = unknown> = CompositeLayerProps &
	PathLayerProps<DataT> & {
		arrowSize?: number;
		arrowColor?: [number, number, number, number];
		lineWidthRatio?: number;
		// Waypoint props
		showWaypoints?: boolean;
		waypointRadius?: number;
		waypointColor?: [number, number, number, number];
		waypointStrokeColor?: [number, number, number, number];
		waypointStrokeWidth?: number;
		getPath: (d: DataT) => [number, number][];
	};

const defaultProps: DefaultProps<ExtendedPathLayerProps<unknown>> = {
	arrowSize: { type: "number", value: 0.9 },
	arrowColor: { type: "color", value: [255, 255, 255, 255] },
	lineWidthRatio: { type: "number", value: 0.4 },
	// Waypoint defaults
	showWaypoints: { type: "boolean", value: true },
	waypointRadius: { type: "number", value: 25 },
	waypointColor: { type: "color", value: [255, 255, 255, 200] },
	waypointStrokeColor: { type: "color", value: [0, 0, 0, 255] },
	waypointStrokeWidth: { type: "number", value: 5 },
};

// Internal PathLayer with arrow shaders
class ArrowPathLayer<DataT = unknown> extends PathLayer<DataT> {
	static layerName = "ArrowPathLayer";

	getShaders() {
		const shaders = super.getShaders();
		const parentLayer = this.parent as ExtendedPathLayer<DataT>;
		const { arrowSize = 0.9, arrowColor = [255, 255, 255, 255], lineWidthRatio = 0.4 } = parentLayer?.props || {};

		const [r, g, b] = arrowColor;

		return {
			...shaders,
			defines: {
				...shaders.defines,
				ARROW_SIZE: arrowSize.toFixed(4),
				ARROW_COLOR_R: (r / 255).toFixed(4),
				ARROW_COLOR_G: (g / 255).toFixed(4),
				ARROW_COLOR_B: (b / 255).toFixed(4),
				LINE_WIDTH_RATIO: lineWidthRatio.toFixed(4),
			},
			inject: {
				...shaders.inject,
				"fs:#main-end": `
					const float arrowHalf  = 1.125;
					const float invLen     = 0.4;   // 1.0 / (2.0 * arrowHalf)
					const float minPathLen = 8.0;
					const float edgeSoft   = 0.03;
					const vec3  arrowColor = vec3(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B);

					float distFromCenter = (vPathLength - vPathPosition.y) - (vPathLength * 0.5);
					float lateral = abs(vPathPosition.x);

					float hasArrow = step(minPathLen, vPathLength);
					float inArrowBox = step(abs(distFromCenter), arrowHalf);

					// Solid filled triangle with anti-aliased edge
					float progress = clamp((distFromCenter + arrowHalf) * invLen, 0.0, 1.0);
					float target = (1.0 - progress) * ARROW_SIZE;
					float triangle = (1.0 - smoothstep(target - edgeSoft, target + edgeSoft, lateral))
					               * inArrowBox * hasArrow;

					// Line hidden in arrow box
					float line = (1.0 - smoothstep(LINE_WIDTH_RATIO - edgeSoft, LINE_WIDTH_RATIO + edgeSoft, lateral))
					           * (1.0 - (inArrowBox * hasArrow));

					fragColor.a *= max(line, triangle);
					fragColor.rgb = mix(fragColor.rgb, arrowColor, triangle);
				`,
			},
		};
	}
}

// Waypoint data type
type WaypointData = {
	position: [number, number];
	index: number;
	pathIndex: number;
	pathData: unknown;
};

export default class ExtendedPathLayer<DataT = unknown> extends CompositeLayer<ExtendedPathLayerProps<DataT>> {
	static layerName = "ExtendedPathLayer";
	static defaultProps = defaultProps;

	getPickingInfo(params: GetPickingInfoParams): PickingInfo {
		const info = params.info;
		if (info.sourceLayer?.id.includes("waypoints")) {
			const waypoint = info.object as WaypointData;
			return {
				...info,
				object: {
					type: "waypoint",
					index: waypoint?.index,
					pathIndex: waypoint?.pathIndex,
					position: waypoint?.position,
					pathData: waypoint?.pathData,
				},
			};
		}
		return info;
	}

	renderLayers() {
		const { data, getPath, getColor, getWidth, showWaypoints, waypointRadius, waypointColor, waypointStrokeColor, waypointStrokeWidth } =
			this.props;

		// Extract waypoints from all paths
		const waypoints: WaypointData[] = [];
		const dataArray = Array.isArray(data) ? data : [];
		dataArray.forEach((d, pathIndex) => {
			const path = getPath(d);
			path.forEach((position, index) => {
				waypoints.push({ position, index, pathIndex, pathData: d });
			});
		});

		const layers: Layer[] = [
			new ArrowPathLayer(this.getSubLayerProps({ id: "path" }), {
				data,
				getPath,
				getColor,
				getWidth,
				pickable: false, // Disable hover on the path line
				widthUnits: "pixels",
			}),
		];

		if (showWaypoints) {
			layers.push(
				new ScatterplotLayer<WaypointData>(this.getSubLayerProps({ id: "waypoints" }), {
					data: waypoints,
					getPosition: (d) => d.position,
					getRadius: waypointRadius,
					getFillColor: waypointColor,
					getLineColor: waypointStrokeColor,
					getLineWidth: waypointStrokeWidth,
					stroked: true,
					filled: true,
					pickable: true,
					radiusUnits: "pixels",
					lineWidthUnits: "pixels",
				}),
			);
		}

		return layers;
	}
}

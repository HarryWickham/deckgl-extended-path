import type {
  CompositeLayerProps,
  DefaultProps,
  GetPickingInfoParams,
  Layer,
  PickingInfo,
} from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { PathLayerProps } from "@deck.gl/layers";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";

// Props for the composite layer
export type ExtendedPathLayerProps<DataT = unknown> = CompositeLayerProps &
  PathLayerProps<DataT> & {
    arrowSize?: number;
    arrowLength?: number;
    arrowSpacing?: number;
    arrowColor?: [number, number, number, number];
    arrowThickness?: number;
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
  arrowLength: { type: "number", value: 0.08 },
  arrowSpacing: { type: "number", value: 40 },
  arrowColor: { type: "color", value: [0, 255, 0, 255] },
  arrowThickness: { type: "number", value: 0.12 },
  lineWidthRatio: { type: "number", value: 0.4 },
  // Waypoint defaults (updated for meter units)
  showWaypoints: { type: "boolean", value: true },
  waypointRadius: { type: "number", value: 25 }, // Meters instead of pixels
  waypointColor: { type: "color", value: [255, 255, 255, 200] },
  waypointStrokeColor: { type: "color", value: [0, 0, 0, 255] },
  waypointStrokeWidth: { type: "number", value: 5 }, // Meters instead of pixels
};

// Internal PathLayer with arrow shaders
class ArrowPathLayer<DataT = unknown> extends PathLayer<DataT> {
  static layerName = "ArrowPathLayer";

  getShaders() {
    const shaders = super.getShaders();
    const parentLayer = this.parent as ExtendedPathLayer<DataT>;
    const {
      arrowSize = 0.9,
      arrowLength = 0.08,
      arrowSpacing = 40,
      arrowColor = [0, 255, 0, 255],
      arrowThickness = 0.12,
      lineWidthRatio = 0.4,
    } = parentLayer?.props || {};

    const [r, g, b] = arrowColor;

    return {
      ...shaders,
      defines: {
        ...shaders.defines,
        ARROW_SIZE: arrowSize.toFixed(4),
        ARROW_LENGTH: arrowLength.toFixed(4),
        ARROW_SPACING: arrowSpacing.toFixed(4),
        ARROW_COLOR_R: (r / 255).toFixed(4),
        ARROW_COLOR_G: (g / 255).toFixed(4),
        ARROW_COLOR_B: (b / 255).toFixed(4),
        ARROW_THICKNESS: arrowThickness.toFixed(4),
        LINE_WIDTH_RATIO: lineWidthRatio.toFixed(4),
      },
      inject: {
        ...shaders.inject,
        "fs:#main-end": `
					// --- Constants ---
					const float arrowHalf  = 2.0;         // Half-length of arrow
					const float arrowLen   = 4.0;         // Full length (2.5 * 2.0)
					const float invLen     = 0.2;         // 1.0 / 5.0
					
					// Strict length check: Segment must be at least 8.0m long to show an arrow
					// (Arrow is 5.0m, so this adds a 3.0m safety buffer)
					const float minPathLen = 8.0;         
					
					const vec3  arrowColor = vec3(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B);

					// --- Calculations ---
					float distFromCenter = (vPathLength - vPathPosition.y) - (vPathLength * 0.5);
					float lateral = abs(vPathPosition.x);

					// 1. Size Check: Is the path long enough?
					float hasArrow = step(minPathLen, vPathLength);

					// 2. Box Logic (defines where the arrow sits)
					float inArrowBox = step(abs(distFromCenter), arrowHalf);

					// 3. Arrow Shape
					float arrowProgress = (distFromCenter + arrowHalf) * invLen;
					float inTriangle = step(lateral, (1.0 - arrowProgress) * ARROW_SIZE);

					// 4. Line Visibility
					// Show line IF: (NOT in Arrow Box OR path is too small for arrow)
					// The line now cuts off exactly at the arrow edge (no gap)
					float showLine = step(lateral, LINE_WIDTH_RATIO) * (1.0 - (inArrowBox * hasArrow));

					// 5. Arrow Visibility
					float showArrow = inTriangle * inArrowBox * hasArrow;

					// --- Output ---
					fragColor.a *= max(showLine, showArrow);
					fragColor.rgb = mix(fragColor.rgb, arrowColor, showArrow);
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

export default class ExtendedPathLayer<DataT = unknown> extends CompositeLayer<
  ExtendedPathLayerProps<DataT>
> {
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
    const {
      data,
      getPath,
      getColor,
      getWidth,
      showWaypoints,
      waypointRadius,
      waypointColor,
      waypointStrokeColor,
      waypointStrokeWidth,
    } = this.props;

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
        new ScatterplotLayer<WaypointData>(
          this.getSubLayerProps({ id: "waypoints" }),
          {
            data: waypoints,
            getPosition: (d) => d.position,
            getRadius: waypointRadius,
            getFillColor: waypointColor,
            getLineColor: waypointStrokeColor,
            getLineWidth: waypointStrokeWidth,
            stroked: true,
            filled: true,
            pickable: true,
            radiusUnits: "pixels", // Changed from pixels to meters for zoom scaling
            lineWidthUnits: "pixels", // Changed from pixels to meters for zoom scaling
          },
        ),
      );
    }

    return layers;
  }
}

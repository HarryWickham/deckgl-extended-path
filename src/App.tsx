import type { LayersList, PickingInfo } from "@deck.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Map as MapLibreMap, useControl } from "@vis.gl/react-maplibre";
import { useEffect } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import ExtendedPathLayer from "./layers/ExtendedPathLayer";
import {
  injectTooltipStyles,
  renderWaypointTooltip,
  type TooltipData,
} from "./utils/tooltipRenderer";
import ExtendedIconLayer from "./layers/ExtendedIconLayer";

interface DeckGLOverlayProps {
  layers: LayersList;
  getTooltip?: (info: PickingInfo) => any;
}

function DeckGLOverlay({ layers, getTooltip }: DeckGLOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true }));
  overlay.setProps({ layers, getTooltip });
  return null;
}

type BartLine = {
  name: string;
  color: string;
  path: [number, number][];
};

export default function App() {
  // Inject CSS styles for tooltips
  useEffect(() => {
    injectTooltipStyles();
  }, []);

  const getTooltip = (info: PickingInfo) => {
    if (!info.object) return null;
    return renderWaypointTooltip(info.object as TooltipData);
  };

  const layers = [
    new ExtendedPathLayer<BartLine>({
      id: "PathLayer",
      data: [
        {
          name: "Richmond - Millbrae",
          color: "#ff0000",
          path: [
            [-122.3535851, 37.9360513],
            [-122.3179784, 37.9249513],
            [-122.300284, 37.902646],
            [-122.2843653, 37.8735039],
            [-122.269058, 37.8694562],
            [-122.2709185, 37.85301],
            [-122.2689342, 37.8283973],
            [-122.2707195, 37.8080566],
            [-122.2718706, 37.704996],
          ],
        },
      ],
      getColor: (d: BartLine): [number, number, number, number] => {
        const hex = d.color;
        // convert to RGB
        const rgb = hex.match(/[0-9a-f]{2}/g)?.map((x) => parseInt(x, 16)) || [
          0, 0, 0,
        ];
        return [rgb[0], rgb[1], rgb[2], 255];
      },
      getPath: (d: BartLine) => d.path,
      getWidth: 120, // Total width (line + arrow overflow)
      pickable: true,

      // Arrow configuration (hollow chevron ">", poking outside line)
      arrowSize: 0.9, // Chevrons extend to 90% of total width
      arrowLength: 0.08, // Stubby chevrons
      arrowSpacing: 40, // Distance between chevrons
      arrowColor: [255, 0, 0, 255], // Red for visibility
      arrowThickness: 0.35, // Thickness of chevron lines (thicker)
      lineWidthRatio: 0.25, // Visible line is 25% of total width

      // Waypoint configuration
      showWaypoints: true,
      waypointRadius: 30, // Size in meters (will scale with zoom)
      waypointColor: [255, 255, 255, 200], // White with some transparency
      waypointStrokeColor: [255, 0, 0, 255], // Red border to match line color
      waypointStrokeWidth: 8, // Border width in meters
    }),
    new ExtendedIconLayer({
      id: "IconLayer",
      data: [{ position: [0, 0], name: "Daly City Station" }],
      getPosition: (d) => d.position as [number, number],
      getSize: 36,
      pickable: true,
      // Circle background properties
      circleRadius: 35,
      circleColor: [16, 6, 159, 255], // White background
      circleStrokeColor: [0, 0, 0, 255], // Black border
      circleStrokeWidth: 0,
    }),
  ];

  return (
    <MapLibreMap
      initialViewState={{ longitude: 0, latitude: 0, zoom: 15 }}
      style={{ width: "100%", height: "100vh" }}
      mapStyle="./liberty.json"
    >
      <DeckGLOverlay layers={layers} getTooltip={getTooltip} />
    </MapLibreMap>
  );
}

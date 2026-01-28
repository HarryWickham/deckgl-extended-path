import type {
  CompositeLayerProps,
  DefaultProps,
  GetPickingInfoParams,
  Layer,
  PickingInfo,
} from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { IconLayerProps } from "@deck.gl/layers";
import { IconLayer, ScatterplotLayer } from "@deck.gl/layers";

export type ExtendedIconLayerProps<DataT = unknown> = CompositeLayerProps &
  IconLayerProps<DataT> & {
    // Circle background props
    circleRadius?: number;
    circleColor?: [number, number, number, number];
    circleStrokeColor?: [number, number, number, number];
    circleStrokeWidth?: number;
    circleRadiusUnits?: "meters" | "pixels";
  };

const defaultProps: DefaultProps<ExtendedIconLayerProps<unknown>> = {
  // Circle defaults
  circleRadius: { type: "number", value: 30 },
  circleColor: { type: "color", value: [255, 255, 255, 255] },
  circleStrokeColor: { type: "color", value: [0, 0, 0, 255] },
  circleStrokeWidth: { type: "number", value: 3 },
};

export default class ExtendedIconLayer<DataT = unknown> extends CompositeLayer<
  ExtendedIconLayerProps<DataT>
> {
  static layerName = "ExtendedIconLayer";
  static defaultProps = defaultProps;

  getPickingInfo(params: GetPickingInfoParams): PickingInfo {
    return params.info;
  }

  renderLayers(): Layer[] {
    const {
      data,
      getPosition,
      getIcon,
      getSize,
      pickable,
      circleRadius,
      circleColor,
      circleStrokeColor,
      circleStrokeWidth,
      circleRadiusUnits,
      iconAtlas,
      iconMapping,
      getColor,
    } = this.props;

    return [
      // Circle background layer (rendered first, below icon)
      new ScatterplotLayer<DataT>(this.getSubLayerProps({ id: "circle" }), {
        data,
        getPosition,
        getRadius: circleRadius,
        getFillColor: circleColor,
        getLineColor: circleStrokeColor,
        getLineWidth: circleStrokeWidth,
        stroked: true,
        filled: true,
        pickable,
        radiusUnits: circleRadiusUnits,
        lineWidthUnits: circleRadiusUnits,
      }),
      // Icon layer (rendered second, on top)
      new IconLayer<DataT>(this.getSubLayerProps({ id: "icon" }), {
        data,
        getPosition,
        iconAtlas,
        iconMapping,
        getIcon,
        getColor,
        getSize,
        pickable: false, // Let circle handle picking
      }),
    ];
  }
}

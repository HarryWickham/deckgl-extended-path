import type { DefaultProps } from "@deck.gl/core";
import type { PathLayerProps } from "@deck.gl/layers";
import { PathLayer } from "@deck.gl/layers";

export type ExtendedPathLayerProps<DataT = unknown> = PathLayerProps<DataT> & {
	arrowSize?: number;
	arrowLength?: number;
	arrowSpacing?: number;
	arrowColor?: [number, number, number, number];
};

const defaultProps: DefaultProps<ExtendedPathLayerProps> = {
	arrowSize: { type: "number", value: 1.0 },
	arrowLength: { type: "number", value: 0.6 },
	arrowSpacing: { type: "number", value: 80 },
	arrowColor: { type: "color", value: [255, 255, 255, 255] },
};

export default class ExtendedPathLayer<DataT = unknown> extends PathLayer<DataT, ExtendedPathLayerProps<DataT>> {
	static layerName = "ExtendedPathLayer";
	static defaultProps = defaultProps;

	getShaders() {
		const shaders = super.getShaders();

		return {
			...shaders,
			inject: {
				...shaders.inject,
				"fs:#decl": `
					uniform float arrowSize;
					uniform float arrowLength;
					uniform float arrowSpacing;
					uniform vec4 arrowColor;

					float drawArrow(float posAlongPath, float lateral) {
						// posAlongPath: position along path (0 to vPathLength)
						// lateral: -1 to 1 across the path width

						// Find position within arrow spacing cycle
						float cyclePos = mod(posAlongPath, arrowSpacing);
						float normalizedCycle = cyclePos / arrowSpacing;

						// Arrow occupies a portion of the cycle
						float arrowStart = 0.5 - arrowLength / 2.0;
						float arrowEnd = 0.5 + arrowLength / 2.0;

						if (normalizedCycle >= arrowStart && normalizedCycle <= arrowEnd) {
							// Position within arrow (0 at back, 1 at tip)
							float arrowPos = (normalizedCycle - arrowStart) / arrowLength;

							// Arrow shape: triangle pointing forward
							float maxLateral = (1.0 - arrowPos) * arrowSize;

							if (abs(lateral) <= maxLateral) {
								return 1.0;
							}
						}
						return 0.0;
					}
				`,
				"fs:#main-end": `
					float posAlongPath = vPathLength - vPathPosition.y;
					float spacing = 60.0;
					float arrowLen = 0.1;
					float arrowSz = 0.8;

					// Skip near segment boundaries
					float margin = spacing * arrowLen * 0.5 + 5.0;
					if (posAlongPath < margin || posAlongPath > vPathLength - margin) {
						// Near boundary, skip
					} else {
						float cyclePos = mod(posAlongPath, spacing);
						float normalizedCycle = cyclePos / spacing;

						// Arrow in middle portion of cycle
						float arrowStart = 0.5 - arrowLen / 2.0;
						float arrowEnd = 0.5 + arrowLen / 2.0;

						if (normalizedCycle >= arrowStart && normalizedCycle <= arrowEnd) {
							// Position within arrow (0 at back, 1 at tip)
							float arrowPos = (normalizedCycle - arrowStart) / arrowLen;

							// Triangle: width decreases from back to tip
							float maxLateral = (1.0 - arrowPos) * arrowSz;
							float lateral = abs(vPathPosition.x);

							if (lateral <= maxLateral) {
								fragColor = vec4(1.0, 1.0, 1.0, fragColor.a);
							}
						}
					}
				`,
			},
		};
	}

	draw(params: any) {
		const { arrowSize, arrowLength, arrowSpacing, arrowColor } = this.props;

		params.uniforms = {
			...params.uniforms,
			arrowSize,
			arrowLength,
			arrowSpacing,
			arrowColor,
		};

		super.draw(params);
	}
}

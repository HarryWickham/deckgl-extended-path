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
	arrowSize: { type: "number", value: 0.8 },
	arrowLength: { type: "number", value: 0.075 },
	arrowSpacing: { type: "number", value: 60 },
	arrowColor: { type: "color", value: [255, 255, 255, 255] },
};

export default class ExtendedPathLayer<DataT = unknown> extends PathLayer<DataT, ExtendedPathLayerProps<DataT>> {
	static layerName = "ExtendedPathLayer";
	static defaultProps = defaultProps;

	getShaders() {
		const shaders = super.getShaders();
		const { arrowSize = 0.8, arrowLength = 0.075, arrowSpacing = 60, arrowColor = [255, 255, 255, 255] } = this.props;

		// Convert color to normalized values for shader
		const [r, g, b, a] = arrowColor;

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
				ARROW_COLOR_A: (a / 255).toFixed(4),
			},
			inject: {
				...shaders.inject,
				"fs:#main-end": `
					do {
						float posAlongPath = vPathLength - vPathPosition.y;

						// Skip near segment boundaries
						float margin = ARROW_SPACING * ARROW_LENGTH * 0.5 + 5.0;
						if (posAlongPath < margin || posAlongPath > vPathLength - margin) break;

						float cyclePos = mod(posAlongPath, ARROW_SPACING);
						float normalizedCycle = cyclePos / ARROW_SPACING;

						// Arrow in middle portion of cycle
						float arrowStart = 0.5 - ARROW_LENGTH / 2.0;
						float arrowEnd = 0.5 + ARROW_LENGTH / 2.0;
						if (normalizedCycle < arrowStart || normalizedCycle > arrowEnd) break;

						// Position within arrow (0 at back, 1 at tip)
						float arrowPos = (normalizedCycle - arrowStart) / ARROW_LENGTH;

						// Triangle: width decreases from back to tip
						float maxLateral = (1.0 - arrowPos) * ARROW_SIZE;
						float lateral = abs(vPathPosition.x);
						if (lateral > maxLateral) break;

						fragColor = vec4(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B, fragColor.a);
					} while (false);
				`,
			},
		};
	}
}

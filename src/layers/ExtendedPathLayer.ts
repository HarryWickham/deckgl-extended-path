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
					// Constants
					float halfArrowLen = ARROW_LENGTH * 0.5;
					float arrowStart = 0.5 - halfArrowLen;
					float invArrowLen = 1.0 / ARROW_LENGTH;
					float invArrowSpacing = 1.0 / ARROW_SPACING; // Pre-calc inverse
					float margin = ARROW_SPACING * halfArrowLen + 5.0;
					vec3 arrowColor = vec3(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B);

					float posAlongPath = vPathLength - vPathPosition.y;

					// optimization: multiply by inverse
					float nCycle = fract(posAlongPath * invArrowSpacing);

					float arrowPos = (nCycle - arrowStart) * invArrowLen;

					// optimization: single step using abs()
					float inArrowSeg = step(abs(arrowPos - 0.5), 0.5);
					
					// Margin check
					float inMargin = step(margin, posAlongPath) * step(posAlongPath, vPathLength - margin);
					
					float maxLateral = (1.0 - arrowPos) * ARROW_SIZE;
					float inShape = step(abs(vPathPosition.x), maxLateral);

					float finalMask = inArrowSeg * inMargin * inShape;

					fragColor.rgb = mix(fragColor.rgb, arrowColor, finalMask);
				`,
			},
		};
	}
}

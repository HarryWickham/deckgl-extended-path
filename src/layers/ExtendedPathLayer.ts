import type { DefaultProps } from "@deck.gl/core";
import type { PathLayerProps } from "@deck.gl/layers";
import { PathLayer } from "@deck.gl/layers";

export type ExtendedPathLayerProps<DataT = unknown> = PathLayerProps<DataT> & {
	arrowSize?: number;
	arrowLength?: number;
	arrowSpacing?: number;
	arrowColor?: [number, number, number, number];
	lineWidthRatio?: number; // Ratio of visible line to total path width (0-1)
};

const defaultProps: DefaultProps<ExtendedPathLayerProps> = {
	arrowSize: { type: "number", value: 0.8 },
	arrowLength: { type: "number", value: 0.075 },
	arrowSpacing: { type: "number", value: 60 },
	arrowColor: { type: "color", value: [255, 255, 255, 255] },
	lineWidthRatio: { type: "number", value: 0.5 }, // Line is 50% of total width, arrows can extend into the other 50%
};

export default class ExtendedPathLayer<DataT = unknown> extends PathLayer<DataT, ExtendedPathLayerProps<DataT>> {
	static layerName = "ExtendedPathLayer";
	static defaultProps = defaultProps;

	getShaders() {
		const shaders = super.getShaders();
		const {
			arrowSize = 0.8,
			arrowLength = 0.075,
			arrowSpacing = 60,
			arrowColor = [255, 255, 255, 255],
			lineWidthRatio = 0.5,
		} = this.props;

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
				LINE_WIDTH_RATIO: lineWidthRatio.toFixed(4),
			},
			inject: {
				...shaders.inject,
				"fs:#main-end": `
					// Constants
					float halfArrowLen = ARROW_LENGTH * 0.5;
					float arrowStart = 0.5 - halfArrowLen;
					float invArrowLen = 1.0 / ARROW_LENGTH;
					float invArrowSpacing = 1.0 / ARROW_SPACING;
					float margin = ARROW_SPACING * halfArrowLen + 5.0;
					vec3 arrowColorVec = vec3(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B);

					float lateral = abs(vPathPosition.x);
					float posAlongPath = vPathLength - vPathPosition.y;

					// Check if we're in the visible line area (center portion)
					float inLineArea = step(lateral, LINE_WIDTH_RATIO);

					// Cycle position for arrows
					float nCycle = fract(posAlongPath * invArrowSpacing);
					float arrowPos = (nCycle - arrowStart) * invArrowLen;

					// Arrow masks
					float inArrowSeg = step(abs(arrowPos - 0.5), 0.5);
					float inMargin = step(margin, posAlongPath) * step(posAlongPath, vPathLength - margin);

					// Arrow shape - scale lateral position relative to full width for arrows
					float maxLateral = (1.0 - arrowPos) * ARROW_SIZE;
					float inArrowShape = step(lateral, maxLateral);

					float isArrow = inArrowSeg * inMargin * inArrowShape;

					// Final color: show line color in center, arrow color for arrows, transparent elsewhere
					float showPixel = max(inLineArea, isArrow);

					// If outside both line and arrow, make transparent
					fragColor.a *= showPixel;

					// Apply arrow color where we have arrows
					fragColor.rgb = mix(fragColor.rgb, arrowColorVec, isArrow);
				`,
			},
		};
	}
}

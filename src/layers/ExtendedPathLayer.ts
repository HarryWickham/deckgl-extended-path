import type { DefaultProps } from "@deck.gl/core";
import type { PathLayerProps } from "@deck.gl/layers";
import { PathLayer } from "@deck.gl/layers";

export type ExtendedPathLayerProps<DataT = unknown> = PathLayerProps<DataT> & {
	arrowSize?: number;
	arrowLength?: number;
	arrowSpacing?: number;
	arrowColor?: [number, number, number, number];
	arrowThickness?: number; // Thickness of hollow chevron lines
	lineWidthRatio?: number; // Visible line as fraction of total width (arrows extend beyond)
};

const defaultProps: DefaultProps<ExtendedPathLayerProps> = {
	arrowSize: { type: "number", value: 0.9 },
	arrowLength: { type: "number", value: 0.08 },
	arrowSpacing: { type: "number", value: 40 },
	arrowColor: { type: "color", value: [0, 255, 0, 255] },
	arrowThickness: { type: "number", value: 0.12 },
	lineWidthRatio: { type: "number", value: 0.4 },
};

export default class ExtendedPathLayer<DataT = unknown> extends PathLayer<DataT, ExtendedPathLayerProps<DataT>> {
	static layerName = "ExtendedPathLayer";
	static defaultProps = defaultProps;

	getShaders() {
		const shaders = super.getShaders();
		const {
			arrowSize = 0.9,
			arrowLength = 0.08,
			arrowSpacing = 40,
			arrowColor = [0, 255, 0, 255],
			arrowThickness = 0.12,
			lineWidthRatio = 0.4,
		} = this.props;

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
					// Constants
					float halfArrowLen = ARROW_LENGTH * 0.5;
					float arrowStart = 0.5 - halfArrowLen;
					float invArrowLen = 1.0 / ARROW_LENGTH;
					float invArrowSpacing = 1.0 / ARROW_SPACING;
					float margin = ARROW_SPACING * halfArrowLen + 5.0;
					vec3 arrowColorVec = vec3(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B);

					float lateral = abs(vPathPosition.x);
					float posAlongPath = vPathLength - vPathPosition.y;

					// Check if in visible line area (center portion)
					float inLineArea = step(lateral, LINE_WIDTH_RATIO);

					// Cycle position for arrows
					float nCycle = fract(posAlongPath * invArrowSpacing);
					float arrowPos = (nCycle - arrowStart) * invArrowLen;

					// Arrow segment and margin checks
					float inArrowSeg = step(abs(arrowPos - 0.5), 0.5);
					float inMargin = step(margin, posAlongPath) * step(posAlongPath, vPathLength - margin);

					// Hollow chevron with mitre join at tip
					// Outer triangle: lateral <= (1 - arrowPos) * ARROW_SIZE
					// Inner triangle: lateral <= (1 - arrowPos) * (ARROW_SIZE - ARROW_THICKNESS)
					// Chevron = inside outer AND outside inner

					float outerMaxLateral = (1.0 - arrowPos) * ARROW_SIZE;
					float innerMaxLateral = (1.0 - arrowPos) * max(ARROW_SIZE - ARROW_THICKNESS * 2.0, 0.0);

					float inOuter = step(lateral, outerMaxLateral);
					float inInner = step(lateral, innerMaxLateral);

					// Hollow: inside outer but outside inner
					float onChevron = inOuter * (1.0 - inInner);

					float isArrow = inArrowSeg * inMargin * onChevron;

					// Show pixel if in line area OR on arrow
					float showPixel = max(inLineArea, isArrow);
					fragColor.a *= showPixel;

					// Apply arrow color where we have arrows
					fragColor.rgb = mix(fragColor.rgb, arrowColorVec, isArrow);
				`,
			},
		};
	}
}

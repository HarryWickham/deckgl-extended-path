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
					// Pre-calculated values (defines are compile-time constants)
					float halfArrowLen = ARROW_LENGTH * 0.5;
					float arrowStart = 0.5 - halfArrowLen;
					float invArrowLen = 1.0 / ARROW_LENGTH;
					float margin = ARROW_SPACING * halfArrowLen + 5.0;
					vec3 arrowColor = vec3(ARROW_COLOR_R, ARROW_COLOR_G, ARROW_COLOR_B);

					float posAlongPath = vPathLength - vPathPosition.y;

					// Use fract() instead of mod()/div for 0..1 cycle position
					float nCycle = fract(posAlongPath / ARROW_SPACING);

					// Arrow progress: 0.0 at base, 1.0 at tip
					float arrowPos = (nCycle - arrowStart) * invArrowLen;

					// Branchless masks using step()
					float inArrowSeg = step(0.0, arrowPos) * step(arrowPos, 1.0);
					float inMargin = step(margin, posAlongPath) * step(posAlongPath, vPathLength - margin);
					float maxLateral = (1.0 - arrowPos) * ARROW_SIZE;
					float inShape = step(abs(vPathPosition.x), maxLateral);

					// Combine masks (logical AND)
					float finalMask = inArrowSeg * inMargin * inShape;

					// Apply arrow color where mask is 1.0
					fragColor.rgb = mix(fragColor.rgb, arrowColor, finalMask);
				`,
			},
		};
	}
}

import type React from "react";
import { renderToString } from "react-dom/server";

export type TooltipReturn =
	| null
	| string
	| {
			text?: string;
			html?: string;
			className?: string;
			style?: Partial<CSSStyleDeclaration>;
	  };

export interface TooltipData {
	type: string;
	index?: number;
	pathIndex?: number;
	position?: [number, number];
	pathData?: {
		name: string;
		color: string;
		path: [number, number][];
	};
	name?: string;
}

const WaypointTooltipComponent: React.FC<{ data: TooltipData }> = ({ data }) => {
	if (data.type === "waypoint") {
		const pathData = data.pathData;
		const waypointNumber = (data.index ?? 0) + 1;
		const totalWaypoints = pathData?.path?.length ?? 0;
		const [lng, lat] = data.position ?? [0, 0];

		return (
			<div className="wt-card">
				<div className="wt-accent" style={{ backgroundColor: pathData?.color || "#fff" }} />
				<div className="wt-content">
					<div className="wt-route">{pathData?.name || "Unknown Route"}</div>
					<div className="wt-meta">
						<span className="wt-badge">
							{waypointNumber}
							<span className="wt-of">/{totalWaypoints}</span>
						</span>
						<span className="wt-label">Waypoint</span>
					</div>
					<div className="wt-coords">
						<span>{lng.toFixed(5)}</span>
						<span className="wt-sep">,</span>
						<span>{lat.toFixed(5)}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="wt-card wt-simple">
			<div className="wt-content">
				<div className="wt-route">{data.name || "Path"}</div>
			</div>
		</div>
	);
};

export function renderWaypointTooltip(data: TooltipData): TooltipReturn {
	const html = renderToString(<WaypointTooltipComponent data={data} />);

	const style: Partial<CSSStyleDeclaration> = {
		backgroundColor: "transparent",
		padding: "0",
		border: "none",
		borderRadius: "0",
		color: "inherit",
		fontSize: "inherit",
	};

	return { html, style };
}

export function injectTooltipStyles() {
	if (document.getElementById("waypoint-tooltip-styles")) return;

	if (!document.getElementById("wt-fonts")) {
		const link = document.createElement("link");
		link.id = "wt-fonts";
		link.rel = "stylesheet";
		link.href = "https://fonts.googleapis.com/css2?family=DM+Mono&family=DM+Sans:wght@400;500;600&family=DM+Serif+Text&display=swap";
		document.head.appendChild(link);
	}

	const style = document.createElement("style");
	style.id = "waypoint-tooltip-styles";
	style.textContent = `
		.wt-card {
			display: flex;
			background: rgba(8, 10, 16, 0.94);
			border: 1px solid rgba(255, 255, 255, 0.07);
			border-radius: 10px;
			overflow: hidden;
			box-shadow:
				0 12px 40px rgba(0, 0, 0, 0.55),
				0 0 0 1px rgba(255, 255, 255, 0.03);
			backdrop-filter: blur(24px);
			-webkit-backdrop-filter: blur(24px);
			min-width: 190px;
			font-family: 'DM Sans', system-ui, sans-serif;
		}

		.wt-accent {
			width: 3px;
			flex-shrink: 0;
		}

		.wt-content {
			padding: 12px 14px;
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		.wt-route {
			font-family: 'DM Serif Text', Georgia, serif;
			font-size: 14px;
			color: #F0EDE6;
			letter-spacing: 0.01em;
			line-height: 1.2;
		}

		.wt-meta {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.wt-badge {
			font-size: 12px;
			font-weight: 600;
			color: #F0EDE6;
			background: rgba(255, 255, 255, 0.07);
			padding: 1px 7px 2px;
			border-radius: 4px;
			line-height: 1.4;
		}

		.wt-of {
			font-weight: 400;
			color: #4A4640;
			font-size: 11px;
		}

		.wt-label {
			font-size: 9px;
			text-transform: uppercase;
			letter-spacing: 1.5px;
			color: #5A5650;
			font-weight: 500;
		}

		.wt-coords {
			font-family: 'DM Mono', monospace;
			font-size: 10px;
			color: #5A5650;
			display: flex;
			align-items: center;
			gap: 3px;
			letter-spacing: -0.02em;
		}

		.wt-sep {
			color: #3A3630;
		}

		.wt-simple .wt-content {
			padding: 10px 14px;
		}
	`;
	document.head.appendChild(style);
}

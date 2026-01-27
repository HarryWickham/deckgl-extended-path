import type React from "react";
import { renderToString } from "react-dom/server";

type TooltipReturn =
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
			<div className="waypoint-tooltip">
				<div className="tooltip-header">
					<div className="color-indicator" style={{ backgroundColor: pathData?.color || "#000" }} />
					<h3>{pathData?.name || "Unknown Route"}</h3>
				</div>

				<div className="waypoint-info">
					<div className="waypoint-badge">
						<span className="waypoint-number">{waypointNumber}</span>
						<span className="waypoint-total">/{totalWaypoints}</span>
					</div>
					<div className="waypoint-label">Waypoint</div>
				</div>

				<div className="coordinates">
					<div className="coordinate">
						<span className="label">Lng:</span>
						<span className="value">{lng.toFixed(6)}</span>
					</div>
					<div className="coordinate">
						<span className="label">Lat:</span>
						<span className="value">{lat.toFixed(6)}</span>
					</div>
				</div>
			</div>
		);
	}

	// Fallback for non-waypoint items
	return (
		<div
			style={{
				background: "rgba(0,0,0,0.8)",
				color: "white",
				padding: "8px 12px",
				borderRadius: "4px",
			}}
		>
			{data.name || "Path"}
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

// Inject the CSS styles into the document head
export function injectTooltipStyles() {
	if (document.getElementById("waypoint-tooltip-styles")) return;

	const style = document.createElement("style");
	style.id = "waypoint-tooltip-styles";
	style.textContent = `
		.waypoint-tooltip {
			background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
			border: 1px solid #404040;
			border-radius: 12px;
			padding: 16px;
			color: white;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
			backdrop-filter: blur(10px);
			min-width: 220px;
			max-width: 280px;
		}

		.tooltip-header {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 12px;
			padding-bottom: 8px;
			border-bottom: 1px solid #404040;
		}

		.color-indicator {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			flex-shrink: 0;
			box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
		}

		.tooltip-header h3 {
			margin: 0;
			font-size: 14px;
			font-weight: 600;
			color: #ffffff;
			line-height: 1.3;
		}

		.waypoint-info {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 12px;
		}

		.waypoint-badge {
			display: flex;
			align-items: baseline;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 6px;
			padding: 4px 8px;
		}

		.waypoint-number {
			font-size: 16px;
			font-weight: 700;
			color: #00bcd4;
		}

		.waypoint-total {
			font-size: 12px;
			color: #888;
			margin-left: 1px;
		}

		.waypoint-label {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: #aaa;
			font-weight: 500;
		}

		.coordinates {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.coordinate {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 11px;
			background: rgba(255, 255, 255, 0.05);
			border-radius: 4px;
			padding: 4px 6px;
		}

		.coordinate .label {
			color: #888;
			font-weight: 500;
		}

		.coordinate .value {
			color: #fff;
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 10px;
		}
	`;
	document.head.appendChild(style);
}

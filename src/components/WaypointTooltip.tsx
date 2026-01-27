import type React from "react";

interface WaypointTooltipProps {
	data: {
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
	};
}

export const WaypointTooltip: React.FC<WaypointTooltipProps> = ({ data }) => {
	const isWaypoint = data.type === "waypoint";

	const waypointTooltipStyles: React.CSSProperties = {
		background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
		border: "1px solid #404040",
		borderRadius: "12px",
		padding: "16px",
		color: "white",
		fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
		backdropFilter: "blur(10px)",
		minWidth: "220px",
		maxWidth: "280px",
	};

	const tooltipHeaderStyles: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: "10px",
		marginBottom: "12px",
		paddingBottom: "8px",
		borderBottom: "1px solid #404040",
	};

	const colorIndicatorStyles: React.CSSProperties = {
		width: "8px",
		height: "8px",
		borderRadius: "50%",
		flexShrink: 0,
		boxShadow: "0 0 8px rgba(255, 255, 255, 0.3)",
	};

	const headerTitleStyles: React.CSSProperties = {
		margin: "0",
		fontSize: "14px",
		fontWeight: "600",
		color: "#ffffff",
		lineHeight: "1.3",
	};

	const waypointInfoStyles: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: "12px",
		marginBottom: "12px",
	};

	const waypointBadgeStyles: React.CSSProperties = {
		display: "flex",
		alignItems: "baseline",
		background: "rgba(255, 255, 255, 0.1)",
		borderRadius: "6px",
		padding: "4px 8px",
	};

	const waypointNumberStyles: React.CSSProperties = {
		fontSize: "16px",
		fontWeight: "700",
		color: "#00bcd4",
	};

	const waypointTotalStyles: React.CSSProperties = {
		fontSize: "12px",
		color: "#888",
		marginLeft: "1px",
	};

	const waypointLabelStyles: React.CSSProperties = {
		fontSize: "11px",
		textTransform: "uppercase",
		letterSpacing: "0.5px",
		color: "#aaa",
		fontWeight: "500",
	};

	const coordinatesStyles: React.CSSProperties = {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
	};

	const coordinateStyles: React.CSSProperties = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		fontSize: "11px",
		background: "rgba(255, 255, 255, 0.05)",
		borderRadius: "4px",
		padding: "4px 6px",
	};

	const labelStyles: React.CSSProperties = {
		color: "#888",
		fontWeight: "500",
	};

	const valueStyles: React.CSSProperties = {
		color: "#fff",
		fontFamily: '"SF Mono", Monaco, monospace',
		fontSize: "10px",
	};

	const simpleTooltipStyles: React.CSSProperties = {
		background: "rgba(0, 0, 0, 0.8)",
		color: "white",
		padding: "8px 12px",
		borderRadius: "4px",
		fontSize: "14px",
	};

	if (isWaypoint) {
		const pathData = data.pathData;
		const waypointNumber = (data.index ?? 0) + 1;
		const totalWaypoints = pathData?.path?.length ?? 0;
		const [lng, lat] = data.position ?? [0, 0];

		return (
			<div style={waypointTooltipStyles}>
				<div style={tooltipHeaderStyles}>
					<div style={{ ...colorIndicatorStyles, backgroundColor: pathData?.color || "#000" }} />
					<h3 style={headerTitleStyles}>{pathData?.name || "Unknown Route"}</h3>
				</div>

				<div style={waypointInfoStyles}>
					<div style={waypointBadgeStyles}>
						<span style={waypointNumberStyles}>{waypointNumber}</span>
						<span style={waypointTotalStyles}>/{totalWaypoints}</span>
					</div>
					<div style={waypointLabelStyles}>Waypoint</div>
				</div>

				<div style={coordinatesStyles}>
					<div style={coordinateStyles}>
						<span style={labelStyles}>Lng:</span>
						<span style={valueStyles}>{lng.toFixed(6)}</span>
					</div>
					<div style={coordinateStyles}>
						<span style={labelStyles}>Lat:</span>
						<span style={valueStyles}>{lat.toFixed(6)}</span>
					</div>
				</div>
			</div>
		);
	}

	// Fallback for non-waypoint hovers (if needed)
	return (
		<div style={simpleTooltipStyles}>
			<div>{data.name || "Path"}</div>
		</div>
	);
};

export default WaypointTooltip;

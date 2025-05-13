"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

const NUM_BARS = 50;
const CENTER = 150;
const INNER_RADIUS = 50;
const OUTER_RADIUS = 100;
const SVG_SIZE = 300;

function getBarPosition(index: number, value: number) {
	const angle = (index / NUM_BARS) * 2 * Math.PI;
	const x1 = CENTER + Math.cos(angle) * INNER_RADIUS;
	const y1 = CENTER + Math.sin(angle) * INNER_RADIUS;
	const x2 = CENTER + Math.cos(angle) * (OUTER_RADIUS + value);
	const y2 = CENTER + Math.sin(angle) * (OUTER_RADIUS + value);

	return { x1, y1, x2, y2 };
}

export interface RadialVolumeBarsProps {
	volume: number;
	isActive: boolean;
}

const RadialVolumeBars: React.FC<RadialVolumeBarsProps> = ({
	volume,
	isActive,
}) => {
	const [barHeights, setBarHeights] = useState<number[]>(
		Array(NUM_BARS).fill(0)
	);
	const reqRef = useRef<number | null>(null);

	// Animate bars if isActive, otherwise set to zero.
	useEffect(() => {
		if (isActive) {
			const animate = () => {
				// Generate new random heights based on volume
				setBarHeights(
					Array.from({ length: NUM_BARS }, () => Math.random() * volume * 200)
				);
				reqRef.current = requestAnimationFrame(animate);
			};
			reqRef.current = requestAnimationFrame(animate);
			return () => {
				if (reqRef.current !== null) {
					cancelAnimationFrame(reqRef.current);
				}
			};
		} else {
			setBarHeights(Array(NUM_BARS).fill(0));
		}
	}, [volume, isActive]);

	return (
		<svg
			width="100%"
			height="100%"
			viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
			className="absolute top-0 left-0"
			aria-hidden="true"
		>
			{barHeights.map((height, i) => {
				const { x1, y1, x2, y2 } = getBarPosition(i, height);
				return (
					<motion.line
						key={i}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						className="stroke-current text-black dark:text-white dark:opacity-70 opacity-70"
						strokeWidth={2}
						initial={{ x2: x1, y2: y1 }}
						animate={{ x2, y2 }}
						transition={{ type: "spring", stiffness: 300, damping: 20 }}
					/>
				);
			})}
		</svg>
	);
};

export default RadialVolumeBars;
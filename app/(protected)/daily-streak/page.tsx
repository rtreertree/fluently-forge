"use client";
import { useEffect, useState } from "react";
import {
	getDailyStreak,
	getWeeklyProgress,
} from "@/actions/steak";
import { Flame } from "lucide-react";
import { useSession } from "next-auth/react";
import Loader from "@/components/suspend/loading";
const daysOfWeek = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];
const daysShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DailyStreakPage = () => {
	const [dailyStreak, setDailyStreak] = useState(0);
	const [ispendding, setIsPending] = useState(true);
	const session = useSession();
	const userId = session.data?.user.id || "";
	const [weekProgress, setWeekProgress] = useState<{ [key: string]: boolean }>({
		Sunday: false,
		Monday: false,
		Tuesday: false,
		Wednesday: false,
		Thursday: false,
		Friday: false,
		Saturday: false,
	});

	useEffect(() => {
		const fetchProgress = async () => {
			setDailyStreak(await getDailyStreak(userId));
			setWeekProgress((prev) => ({
				...prev,
				[daysOfWeek[new Date().getDay()]]: true,
			}));
		};
		fetchProgress().then(() => {
			setIsPending(false);
		});
	}, []);

	return !ispendding ? (
		<div className="flex flex-col items-center justify-top min-h-screen bg-white p-6 select-none">
			<h1 className="text-4xl font-bold text-gray-800 mb-6">Daily Streak</h1>

			{/* Streak Counter */}
			<div className="flex flex-col items-center mb-8">
				<div className="text-7xl text-orange-500 mb-2">
					<Flame size={100} />
				</div>
				<h2 className="text-5xl font-bold text-gray-800">{dailyStreak}</h2>
				<p className="text-gray-600 text-lg">day streak!</p>
			</div>

			{/* Weekly Tracker */}
			<div className="flex items-center justify-center gap-4 bg-white shadow-lg rounded-lg p-6 mb-8">
				{daysOfWeek.map((day, index) => (
					<div
						key={index}
						className={`w-16 h-16 flex items-center justify-center rounded-full text-lg font-bold ${weekProgress[day]
								? "bg-green-500 text-white"
								: "bg-gray-300 text-gray-600"
							}`}
					>
						{daysShort[index]}
					</div>
				))}
			</div>
			<button
				className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
				onClick={async () => {
					setWeekProgress((prev) => ({
						...prev,
						[daysOfWeek[new Date().getDay()]]: true,
					}));
				}}
			>
				test
			</button>
		</div>
	) : (
		<Loader text="loading" />
	);
};

export default DailyStreakPage;

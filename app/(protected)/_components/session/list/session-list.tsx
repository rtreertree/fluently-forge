import * as React from "react"
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { startAssessmentPipeline } from "@/actions/assessment"

const mockData = Array.from({ length: 100 }).map((_, i) => ({
	date: "20/9/2016",
	status: i % 2 === 0 ? "processing" : "completed",
	type: "Small talk",
	title: `IELTS Topic ${i + 1}`,
}))

export interface SessionListItem {
	date: string
	status: string
	type: string
	title: string
	ssid: string
	assess: string
}

export interface ListBoxProps {
	data: SessionListItem[]
}

export function ListBox({ data }: ListBoxProps) {
	const [isLoading, setIsLoading] = React.useState(false)
	const [search, setSearch] = React.useState("")
	const [currentPage, setCurrentPage] = React.useState(1)
	const itemsPerPage = 10

	const filteredData = (data ?? []).filter((item) =>
		item.title?.toLowerCase().includes(search.toLowerCase())
	)

	const totalPages = Math.ceil(filteredData.length / itemsPerPage)
	const currentData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	const goToPreviousPage = () =>
		setCurrentPage((prev) => Math.max(prev - 1, 1))
	const goToNextPage = () =>
		setCurrentPage((prev) => Math.min(prev + 1, totalPages))

	React.useEffect(() => {
		setCurrentPage(1)
	}, [search])

	return (
		<div className="w-full max-w-4xl mx-auto p-6 space-y-4">
			<Input
				placeholder="Filter by title..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				className="max-w-sm"
			/>

			{/* Table container with fixed height and scrolling */}
			<div className="border rounded-md overflow-hidden">
				<div className="max-h-[400px] overflow-y-auto">
					<Table>
						<TableHeader className="sticky top-0 bg-white z-10">
							<TableRow>
								<TableHead className="w-[100px]">Date</TableHead>
								<TableHead className="w-[100px]">Status</TableHead>
								<TableHead className="w-[100px]">Type</TableHead>
								<TableHead>Title</TableHead>
								<TableHead className="text-right w-[100px]">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{currentData.map((item, index) => (
								<TableRow key={index}>
									<TableCell className="font-medium">{item.date}</TableCell>
									<TableCell>{item.assess !== "ASSESSED" ? "Processing" : "Completed"}</TableCell>
									<TableCell>{item.type === "scenario_creation" ? "scenario" : item.type}</TableCell>
									<TableCell>{item.title}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											disabled={item.assess !== "ASSESSED"}
											onClick={() => {
												window.location.href = `/session/details?id=${item.ssid}`;
											}}
										>
											view
										</Button>
									</TableCell>
								</TableRow>
							))}
							{currentData.length === 0 && (
								<TableRow>
									<TableCell colSpan={5} className="text-center">
										No results found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{filteredData.length > 0 && (
				<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
					<span className="text-sm text-muted-foreground">
						Page {currentPage} of {totalPages}
					</span>

					{/* Centered pagination group */}
					<div className="flex-1 flex justify-center items-center gap-2 flex-wrap">
						<Button
							variant="outline"
							size="sm"
							onClick={goToPreviousPage}
							disabled={currentPage === 1}
						>
							<ChevronLeft />
						</Button>

						{Array.from({ length: totalPages }, (_, i) => i + 1)
							.filter((page) => {
								if (currentPage <= 3) return page <= 5;
								if (currentPage >= totalPages - 2) return page >= totalPages - 4;
								return Math.abs(page - currentPage) <= 2;
							})
							.map((page) => (
								<Button
									key={page}
									variant={page === currentPage ? "default" : "outline"}
									size="sm"
									onClick={() => setCurrentPage(page)}
								>
									{page}
								</Button>
							))}

						<Button
							variant="outline"
							size="sm"
							onClick={goToNextPage}
							disabled={currentPage === totalPages}
						>
							<ChevronRight />
						</Button>
					</div>

					{/* Right-aligned First/Last */}
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage(1)}
							disabled={currentPage === 1}
						>
							First
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage(totalPages)}
							disabled={currentPage === totalPages}
						>
							Last
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
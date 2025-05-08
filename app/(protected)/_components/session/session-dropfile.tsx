"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface SessionDropFileProps {
    onClose: () => void; // Callback to close the modal
}

const SessionDropFile: React.FC<SessionDropFileProps> = ({ onClose }) => {
    const [droppedFile, setDroppedFile] = useState<File | null>(null);

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            setDroppedFile(event.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setDroppedFile(event.target.files[0]);
        }
    };

    const handleStartSession = () => {
        if (droppedFile) {
            console.log("Starting session with file:", droppedFile.name);
            // Add logic to start the session
        } else {
            alert("Please drop a file or select one before starting the session.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[500px] h-[500px] rounded-lg shadow-lg relative flex flex-col items-center p-4">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                    Drop the file for scenario creation
                </h2>

                <div
                    className="flex flex-col items-center justify-center w-full h-[60%] border-2 border-dashed border-gray-300 rounded-lg"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    {droppedFile ? (
                        <p className="text-center text-gray-700">
                            File: {droppedFile.name}
                        </p>
                    ) : (
                        <p className="text-center text-gray-500">
                            Drag and drop a file here, or click to select one.
                        </p>
                    )}
                    <input
                        type="file"
                        className="hidden"
                        id="fileInput"
                        onChange={handleFileInput}
                    />
                    <label
                        htmlFor="fileInput"
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-sm"
                    >
                        Select File
                    </label>
                </div>

                <Button
                    className="mt-4 bg-green-500 text-white hover:bg-green-600 w-full"
                    onClick={handleStartSession}
                >
                    Start Session
                </Button>

                <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                    onClick={onClose}
                >
                    X
                </button>
            </div>
        </div>
    );
};

export default SessionDropFile;
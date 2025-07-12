"use client";

import { getAssessmentFromDB } from "@/actions/assessment";
import { Button } from "@/components/ui/button";


const testPage = () => {

    const handleClick = () => {
        console.log("Button clicked!");
        getAssessmentFromDB("54b424ff-ac58-434d-96e5-5a3457ea03d2").then((data) => {
            console.log("Assessment Data:", data);
        }).catch((error) => {
            console.error("Error fetching assessment data:", error);
        });
    };

    return (
        <div>
            <h1>Test Page</h1>
            <p>This is a test page to verify the client-side rendering.</p>
            <Button onClick={handleClick}>click me</Button>
        </div>
    );
};

export default testPage;
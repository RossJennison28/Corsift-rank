import { Button } from "../components/ui/button";
import { ButtonGroup } from "../components/ui/button-group";
import { Input } from "../components/ui/input";
import { Field } from "../components/ui/field";
import { useState } from "react";

type ReviewResponse = {
    url: string;
    title: string;
    meta_description: string;
    h1: string[];
    link_count: number;
    sample_links: string[];
};

function UrlReview() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ReviewResponse | null>(null);

    const handleReview = async () => {
        if (!url.trim()) {
            setError("Please enter a URL.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await fetch("/api/review-url", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url })
            });
            if (!response.ok) {
                throw new Error("Failed to review URL");
            }
            const data: ReviewResponse = await response.json();
            setResult(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return <div>
        <h1 className="text-2xl font-bold">URL Review Page</h1>
        <Field orientation="horizontal">
            <ButtonGroup>
            <Input type="search" placeholder="Enter URL to review" value={url} onChange={(e) => setUrl(e.target.value)}/>
            <Button variant="default" type="button" onClick={handleReview} disabled={loading}>
                {loading ? "Reviewing..." : "Review URL"}
            </Button>
            </ButtonGroup>
        </Field>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {result && (
            <div className="mt-4 space-y-2 text-sm">
                <p><strong>Title:</strong> {result.title || "N/A"}</p>
                <p><strong>Meta description:</strong> {result.meta_description || "N/A"}</p>
                <p><strong>H1 count:</strong> {result.h1.length}</p>
                <p><strong>Link count:</strong> {result.link_count}</p>
            </div>
        )}
    </div>
}
export default UrlReview;

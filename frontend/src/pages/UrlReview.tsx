import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../backend/convex/_generated/api";
import type { Id } from "../../../backend/convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Progress, ProgressLabel } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Spinner } from "../components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

type AuditIssue = {
    severity: "low" | "medium" | "high";
    category: "technical" | "content" | "seo";
    title: string;
    description: string;
    pageUrl: string;
};

type ScraperPage = {
    url: string;
    title: string;
    headings: string[];
    images: Array<{ src: string; alt: string }>;
    links: string[];
    meta: {
        description: string;
        robots: string;
        canonical: string;
        og?: {
            title?: string;
            description?: string;
            image?: string;
        };
        twitter?: {
            card?: string;
            title?: string;
            description?: string;
        };
    };
};

type ScraperResponse = {
    start_url: string;
    pages_crawled: number;
    visited_count: number;
    pages: ScraperPage[];
};

const severityWeight: Record<AuditIssue["severity"], number> = {
    low: 1,
    medium: 2,
    high: 3,
};

function formatStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatTime(timestamp?: number) {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
}

function statusVariant(status?: string): "default" | "secondary" | "outline" | "destructive" {
    if (!status) return "outline";
    if (status === "complete") return "default";
    if (status === "failed") return "destructive";
    if (status === "crawling" || status === "analysing") return "secondary";
    return "outline";
}

function severityVariant(severity: AuditIssue["severity"]): "outline" | "secondary" | "destructive" {
    if (severity === "high") return "destructive";
    if (severity === "medium") return "secondary";
    return "outline";
}

function normalizeUrlInput(rawInput: string) {
    const trimmed = rawInput.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return trimmed;
}

function calculateScore(issues: AuditIssue[], pagesScanned: number) {
    if (issues.length === 0) {
        return {
            health: 100,
            technical: 100,
            content: 100,
            seo: 100,
        };
    }

    const safePages = Math.max(1, pagesScanned);
    const weightedTotal = issues.reduce((sum, issue) => sum + severityWeight[issue.severity], 0);
    const categoryWeight = {
        technical: 0,
        content: 0,
        seo: 0,
    };

    for (const issue of issues) {
        categoryWeight[issue.category] += severityWeight[issue.severity];
    }

    const toScore = (weight: number, multiplier: number) =>
        Math.max(0, Math.min(100, Math.round(100 - (weight / safePages) * multiplier)));

    return {
        health: toScore(weightedTotal, 18),
        technical: toScore(categoryWeight.technical, 24),
        content: toScore(categoryWeight.content, 24),
        seo: toScore(categoryWeight.seo, 24),
    };
}

function UrlReview() {
    const [url, setUrl] = useState("");
    const [auditId, setAuditId] = useState<Id<"audits"> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scrapeData, setScrapeData] = useState<ScraperResponse | null>(null);
    const { signOut } = useAuthActions();
    const startUrlReviewWithDetails = useAction(api.myFunctions.startUrlReviewWithDetails);
    const auditData = useQuery(
        api.myFunctions.getAudit,
        auditId ? { auditId } : "skip"
    );

    const handleReview = async () => {
        if (!url.trim()) {
            setError("Please enter a URL.");
            return;
        }

        const normalizedUrl = normalizeUrlInput(url);
        setLoading(true);
        setError(null);
        setScrapeData(null);
        setAuditId(null);

        try {
            const result = await startUrlReviewWithDetails({ url: normalizedUrl });
            setAuditId(result.auditId);
            setScrapeData(result.crawl);
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

    const audit = auditData?.audit;
    const site = auditData?.site;
    const issues = (audit?.issues ?? []) as AuditIssue[];
    const isReviewing =
        audit?.status === "pending" ||
        audit?.status === "crawling" ||
        audit?.status === "analysing";
    const auditLoading = Boolean(auditId && auditData === undefined);
    const pagesScanned = scrapeData?.pages_crawled ?? audit?.pagesScanned ?? 0;
    const scores = calculateScore(issues, pagesScanned);
    const severityCounts = {
        high: issues.filter((issue) => issue.severity === "high").length,
        medium: issues.filter((issue) => issue.severity === "medium").length,
        low: issues.filter((issue) => issue.severity === "low").length,
    };

    const metaCoverage = {
        missingTitle: scrapeData?.pages.filter((page) => !page.title?.trim()).length ?? 0,
        missingDescription:
            scrapeData?.pages.filter((page) => !page.meta?.description?.trim()).length ?? 0,
        missingCanonical:
            scrapeData?.pages.filter((page) => !page.meta?.canonical?.trim()).length ?? 0,
        missingOgTitle:
            scrapeData?.pages.filter((page) => !page.meta?.og?.title?.trim()).length ?? 0,
        missingTwitterCard:
            scrapeData?.pages.filter((page) => !page.meta?.twitter?.card?.trim()).length ?? 0,
    };

    const sortedIssues = [...issues].sort(
        (a, b) => severityWeight[b.severity] - severityWeight[a.severity]
    );

    const scrapeLoading = loading && !scrapeData;
    const hasResults = Boolean(auditId || audit || scrapeData || loading);

    return (
        <main className="relative min-h-screen overflow-hidden text-left">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(740px_320px_at_8%_0%,hsl(var(--primary)/0.24),transparent_72%),radial-gradient(700px_300px_at_96%_4%,hsl(var(--accent)/0.18),transparent_74%)]" />
            <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
                <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight">Website Review Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            Run a crawl, monitor audit status, and review issues with page-level metadata.
                        </p>
                    </div>
                    <Button variant="outline" type="button" onClick={() => void signOut()}>
                        Sign out
                    </Button>
                </header>

                <Card className="border-border/60 bg-card/85 shadow-xl shadow-primary/10 backdrop-blur-xl">
                    <CardHeader className="border-b">
                        <CardTitle>Start New Review</CardTitle>
                        <CardDescription>
                            Enter a URL to run both the audit workflow and scraper analysis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="flex flex-col gap-3 lg:flex-row">
                            <Input
                                type="search"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                            />
                            <Button
                                type="button"
                                onClick={handleReview}
                                disabled={loading || isReviewing || auditLoading}
                                className="lg:min-w-36"
                            >
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Spinner className="size-4" />
                                        Reviewing...
                                    </span>
                                ) : (
                                    "Review URL"
                                )}
                            </Button>
                        </div>
                        {auditId && (
                            <p className="text-xs text-muted-foreground">
                                Audit ID: <span className="font-mono">{auditId}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Audit request failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {hasResults && (
                    <>
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Card size="sm">
                                <CardHeader>
                                    <CardTitle>Status</CardTitle>
                                    <CardDescription>Current audit lifecycle state.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Badge variant={statusVariant(audit?.status)}>
                                        {formatStatus(audit?.status ?? "pending")}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                        Updated: {formatTime(audit?.updatedAt)}
                                    </p>
                                    {auditLoading && (
                                        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                            <Spinner className="size-3" />
                                            Loading review status...
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card size="sm">
                                <CardHeader>
                                    <CardTitle>Health Score</CardTitle>
                                    <CardDescription>Weighted by issue severity and page count.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-3xl font-semibold">{scores.health}%</p>
                                    <Progress value={scores.health}>
                                        <div className="flex w-full items-center justify-between">
                                            <ProgressLabel>Overall</ProgressLabel>
                                            <span className="text-muted-foreground text-sm tabular-nums">
                                                {scores.health}%
                                            </span>
                                        </div>
                                    </Progress>
                                </CardContent>
                            </Card>

                            <Card size="sm">
                                <CardHeader>
                                    <CardTitle>Pages Scanned</CardTitle>
                                    <CardDescription>Crawled pages from scraper output.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-semibold">{pagesScanned}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Visited: {scrapeData?.visited_count ?? "N/A"}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card size="sm">
                                <CardHeader>
                                    <CardTitle>Issues Found</CardTitle>
                                    <CardDescription>Total detected issues in this audit.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-3xl font-semibold">{issues.length}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="destructive">High: {severityCounts.high}</Badge>
                                        <Badge variant="secondary">Medium: {severityCounts.medium}</Badge>
                                        <Badge variant="outline">Low: {severityCounts.low}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <Card>
                            <CardHeader>
                                <CardTitle>Category Scores</CardTitle>
                                <CardDescription>
                                    Technical, content, and SEO quality based on detected issues.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Progress value={scores.technical}>
                                    <div className="flex w-full items-center justify-between">
                                        <ProgressLabel>Technical</ProgressLabel>
                                        <span className="text-muted-foreground text-sm tabular-nums">
                                            {scores.technical}%
                                        </span>
                                    </div>
                                </Progress>
                                <Progress value={scores.content}>
                                    <div className="flex w-full items-center justify-between">
                                        <ProgressLabel>Content</ProgressLabel>
                                        <span className="text-muted-foreground text-sm tabular-nums">
                                            {scores.content}%
                                        </span>
                                    </div>
                                </Progress>
                                <Progress value={scores.seo}>
                                    <div className="flex w-full items-center justify-between">
                                        <ProgressLabel>SEO</ProgressLabel>
                                        <span className="text-muted-foreground text-sm tabular-nums">
                                            {scores.seo}%
                                        </span>
                                    </div>
                                </Progress>
                            </CardContent>
                        </Card>

                        <Separator />

                        <Tabs defaultValue="issues" className="w-full">
                            <TabsList>
                                <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
                                <TabsTrigger value="pages">
                                    Scraper Pages ({scrapeData?.pages.length ?? 0})
                                </TabsTrigger>
                                <TabsTrigger value="metadata">Metadata Coverage</TabsTrigger>
                            </TabsList>

                            <TabsContent value="issues">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Audit Issues</CardTitle>
                                        <CardDescription>
                                            Structured issue list generated from crawl analysis.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(isReviewing || auditLoading) && (
                                            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                <Spinner />
                                                {auditLoading ? "Loading review status..." : "Review in progress..."}
                                            </div>
                                        )}
                                        {!isReviewing && !auditLoading && sortedIssues.length === 0 && (
                                            <Alert>
                                                <AlertTitle>No issues detected</AlertTitle>
                                                <AlertDescription>
                                                    This review completed without reporting content, technical, or SEO
                                                    issues.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        {sortedIssues.length > 0 && (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Severity</TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead>Issue</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Page URL</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortedIssues.map((issue, index) => (
                                                        <TableRow key={`${issue.title}-${issue.pageUrl}-${index}`}>
                                                            <TableCell>
                                                                <Badge variant={severityVariant(issue.severity)}>
                                                                    {formatStatus(issue.severity)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="capitalize">
                                                                {issue.category}
                                                            </TableCell>
                                                            <TableCell className="font-medium whitespace-normal">
                                                                {issue.title}
                                                            </TableCell>
                                                            <TableCell className="whitespace-normal">
                                                                {issue.description}
                                                            </TableCell>
                                                            <TableCell className="whitespace-normal">
                                                                <a
                                                                    href={issue.pageUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-primary underline-offset-3 hover:underline break-all"
                                                                >
                                                                    {issue.pageUrl}
                                                                </a>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="pages">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Scraper Page Data</CardTitle>
                                        <CardDescription>
                                            Raw crawl output across titles, headings, links, images, and metadata.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {scrapeLoading && (
                                            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                <Spinner />
                                                Fetching scraper page details...
                                            </div>
                                        )}
                                        {scrapeData && (
                                            <>
                                                <div className="grid gap-3 md:grid-cols-3">
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Start URL</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-xs break-all text-muted-foreground">
                                                            {scrapeData.start_url}
                                                        </CardContent>
                                                    </Card>
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Pages Crawled</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {scrapeData.pages_crawled}
                                                        </CardContent>
                                                    </Card>
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Visited URLs</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {scrapeData.visited_count}
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Page</TableHead>
                                                            <TableHead>Title</TableHead>
                                                            <TableHead>Headings</TableHead>
                                                            <TableHead>Images</TableHead>
                                                            <TableHead>Missing Alt</TableHead>
                                                            <TableHead>Links</TableHead>
                                                            <TableHead>Meta Tags</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {scrapeData.pages.map((page) => {
                                                            const missingAlt = page.images.filter(
                                                                (image) => !image.alt?.trim()
                                                            ).length;
                                                            const metaTagCount = [
                                                                page.meta.description,
                                                                page.meta.canonical,
                                                                page.meta.og?.title,
                                                                page.meta.twitter?.card,
                                                            ].filter(Boolean).length;

                                                            return (
                                                                <TableRow key={page.url}>
                                                                    <TableCell className="whitespace-normal">
                                                                        <a
                                                                            href={page.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-primary underline-offset-3 hover:underline break-all"
                                                                        >
                                                                            {page.url}
                                                                        </a>
                                                                    </TableCell>
                                                                    <TableCell className="whitespace-normal">
                                                                        {page.title || "Missing"}
                                                                    </TableCell>
                                                                    <TableCell>{page.headings.length}</TableCell>
                                                                    <TableCell>{page.images.length}</TableCell>
                                                                    <TableCell>{missingAlt}</TableCell>
                                                                    <TableCell>{page.links.length}</TableCell>
                                                                    <TableCell>{metaTagCount}/4</TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </>
                                        )}
                                        {!scrapeLoading && !scrapeData && (
                                            <p className="text-sm text-muted-foreground">
                                                Run a review to load scraper page-level details.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="metadata">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Metadata Coverage</CardTitle>
                                        <CardDescription>
                                            Visibility of critical metadata fields in crawler output.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {!scrapeData && (
                                            <p className="text-sm text-muted-foreground">
                                                Metadata coverage appears once scraper results are available.
                                            </p>
                                        )}
                                        {scrapeData && (
                                            <>
                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Missing Title</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {metaCoverage.missingTitle}
                                                        </CardContent>
                                                    </Card>
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">
                                                                Missing Description
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {metaCoverage.missingDescription}
                                                        </CardContent>
                                                    </Card>
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Missing Canonical</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {metaCoverage.missingCanonical}
                                                        </CardContent>
                                                    </Card>
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Missing OG Title</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {metaCoverage.missingOgTitle}
                                                        </CardContent>
                                                    </Card>
                                                    <Card size="sm">
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">
                                                                Missing Twitter Card
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="text-2xl font-semibold">
                                                            {metaCoverage.missingTwitterCard}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Site URL: {site?.url ?? scrapeData.start_url}
                                                </p>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>
        </main>
    );
}
export default UrlReview;

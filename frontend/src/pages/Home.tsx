import { useAuth } from "@workos-inc/authkit-react";
import { useConvexAuth } from "convex/react";
import { ArrowRight, Gauge, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

function Home() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <p className="text-sm text-muted-foreground">Loading experience...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(650px_280px_at_12%_8%,hsl(var(--primary)/0.24),transparent_70%),radial-gradient(560px_260px_at_88%_2%,hsl(var(--accent)/0.24),transparent_70%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="border-border/60 bg-card/75 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit">SEO Intelligence</Badge>
            <CardTitle className="text-3xl tracking-tight md:text-5xl">
              Grow rankings with an audit dashboard that actually highlights what matters.
            </CardTitle>
            <CardDescription className="max-w-3xl text-base text-muted-foreground md:text-lg">
              Crawl your site, surface high-impact issues, and turn technical SEO findings into a clear action list.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {!isAuthenticated && (
              <>
                <Button onClick={() => navigate("/register")} size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate("/login")}>
                  Log In
                </Button>
              </>
            )}
            {isAuthenticated && (
              <>
                <Button onClick={() => navigate("/review")} size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                  Open Review Dashboard
                  <Gauge className="size-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Sparkles className="size-5 text-accent" />
                Rich Crawl Insights
              </CardTitle>
              <CardDescription>
                Title coverage, meta quality, image accessibility, and page-by-page diagnostics.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Gauge className="size-5 text-primary" />
                Visual Scoring
              </CardTitle>
              <CardDescription>
                Weighted health scoring with category breakdowns for content, technical SEO, and metadata.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default Home;

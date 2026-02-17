import { Button } from "../components/ui/button";

function Home() {
    return<div>
        <h1 className="text-2xl font-bold">Welcome to Corsift Rank!</h1>
        <h1 className="text-lg mt-2">Use our AI to look through your website content and help improve your SEO rankings.</h1>
        <Button variant="outline" onClick={() => window.location.href = "/login"}>
            Login
        </Button>
        <Button variant="outline" onClick={() => window.location.href = "/register"}>
            Register
        </Button>
        <Button variant="outline" onClick={() => window.location.href = "/review"}>
            Try it out
        </Button>
    </div>
       
}

export default Home;
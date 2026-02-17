import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Field } from "../components/ui/field";

function UrlReview() {
    return <div>
        <h1 className="text-2xl font-bold">URL Review Page</h1>

        <Field orientation="horizontal">
            <Input type="search" placeholder="Enter URL to review" />
        </Field>
        <Button variant="default" type="button">Review URL</Button>
    </div>
}
export default UrlReview;
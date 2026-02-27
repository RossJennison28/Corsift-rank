import { WorkOS } from "@workos-inc/node";

function getWorkosClient() {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
        throw new Error("WORKOS_API_KEY environment variable is required");
    }
    return new WorkOS(apiKey);
}

type CmsProvider = "wordpress" | "shopify";

const vaultName = (siteId: string, provider: "wordpress" | "shopify") =>
    `cms:${siteId}:${provider}`;

function isStatus(error: unknown, statusCode: number) {
    return (
        typeof error === "object" && error != null && "status" in error && (error as { status?: number }).status === statusCode
    )
};
export async function setCmsCredentials(siteId: string, provider: "wordpress" | "shopify", creds: object) {
    const workos = getWorkosClient();
    const object = await workos.vault.createObject({
        name: vaultName(siteId, provider),
        value: JSON.stringify(creds),
        context: { organizationId: "userId"},
    });
    return object.id;
}

export async function getCmsCredentials(vaultObjectId: string) {
    const workos = getWorkosClient();
    const object = await workos.vault.readObject({ id: vaultObjectId });
    if (!object.value) {
        throw new Error("Vault object value is empty");
    }
    return JSON.parse(object.value);
}

export async function rotateCmsCredentials(vaultObjectId: string, newCreds: object, versionId?: string) {
    const workos = getWorkosClient();
    await workos.vault.updateObject({
        id: vaultObjectId,
        value: JSON.stringify(newCreds),
        versionCheck: versionId,
    });
}

export async function connectOrUpdateCmsCredentials(args: {
    siteId: string;
    provider: CmsProvider;
    organisationId: string;
    credentials: Record<string, unknown>;
}){
    const workos = getWorkosClient();
    const { siteId, provider, organisationId, credentials } = args;
    if(!organisationId) throw new Error("Organisation ID is required");

    const name = vaultName(siteId, provider);
    const value = JSON.stringify(credentials);

    try {
        const existing = await workos.vault.readObjectByName(name);
        const updated = await workos.vault.updateObject({
            id: existing.id,
            value,
    });
    return { vaultObjectId: updated.id, created: false};
    } catch (error) {
        if(isStatus(error, 404)) throw error;
    
    const created = await workos.vault.createObject({
        name,
        value,
        context: { organisationId, siteId, provider},
    });
    return { vaultObjectId: created.id, created: true};
    }
}


export async function deleteCmsCredentials(vaultObjectId: string) {
    const workos = getWorkosClient();
    await workos.vault.deleteObject({ id: vaultObjectId });
}

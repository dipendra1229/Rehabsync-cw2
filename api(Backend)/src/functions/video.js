const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

app.http('videos', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'videos',
    handler: async (request, context) => {
        try {
            const patientId = request.query.get("patientId");

            if (!patientId) {
                return { status: 400, jsonBody: { error: "patientId required" } };
            }

            const client = new CosmosClient({
                endpoint: process.env.COSMOS_ENDPOINT,
                key: process.env.COSMOS_KEY
            });

            const container = client
                .database(process.env.COSMOS_DATABASE_NAME)
                .container(process.env.COSMOS_CONTAINER_NAME);

            const querySpec = {
                query: "SELECT * FROM c WHERE c.patientId = @patientId AND c.type = 'video' ORDER BY c.createdAt DESC",
                parameters: [{ name: "@patientId", value: patientId }]
            };

            const { resources } = await container.items.query(querySpec).fetchAll();

            return { status: 200, jsonBody: resources };

        } catch (error) {
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});
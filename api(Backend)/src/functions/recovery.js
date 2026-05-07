const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require("uuid");

function getContainer() {
    const client = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    });

    return client
        .database(process.env.COSMOS_DATABASE_NAME)
        .container(process.env.COSMOS_CONTAINER_NAME);
}

/* =========================
   CREATE + GET
========================= */
app.http('recovery', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'recovery',
    handler: async (request, context) => {

        const container = getContainer();

        /* ===== GET ===== */
        if (request.method === 'GET') {
            try {
                const patientId = request.query.get("patientId");

                if (!patientId) {
                    return {
                        status: 400,
                        jsonBody: { error: "patientId required" }
                    };
                }

                const querySpec = {
                    query: "SELECT * FROM c WHERE c.patientId = @patientId AND c.type = 'recovery' ORDER BY c.createdAt DESC",
                    parameters: [{ name: "@patientId", value: patientId }]
                };

                const { resources } = await container.items.query(querySpec).fetchAll();

                return {
                    status: 200,
                    jsonBody: resources
                };

            } catch (error) {
                return {
                    status: 500,
                    jsonBody: { error: error.message }
                };
            }
        }

        /* ===== POST ===== */
        if (request.method === 'POST') {
            try {
                const body = await request.json();

                const { patientId, date, painLevel, mobilityScore, notes } = body;

                if (!patientId || !date || painLevel == null || mobilityScore == null || !notes) {
                    return {
                        status: 400,
                        jsonBody: { error: "Missing required fields" }
                    };
                }

                const newItem = {
                    id: uuidv4(),
                    type: "recovery",   // 🔥 IMPORTANT
                    patientId,
                    date,
                    painLevel,
                    mobilityScore,
                    notes,
                    createdAt: new Date().toISOString()
                };

                await container.items.create(newItem);

                return {
                    status: 201,
                    jsonBody: newItem
                };

            } catch (error) {
                return {
                    status: 500,
                    jsonBody: { error: error.message }
                };
            }
        }
    }
});

/* =========================
   UPDATE
========================= */
app.http('updateRecovery', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'recovery/{id}',
    handler: async (request, context) => {

        try {
            const container = getContainer();
            const id = request.params.id;
            const body = await request.json();

            const { patientId, date, painLevel, mobilityScore, notes } = body;

            if (!patientId) {
                return {
                    status: 400,
                    jsonBody: { error: "patientId required" }
                };
            }

            const { resource: existingItem } = await container.item(id, patientId).read();

            if (!existingItem) {
                return {
                    status: 404,
                    jsonBody: { error: "Item not found" }
                };
            }

            const updatedItem = {
                ...existingItem,
                date,
                painLevel,
                mobilityScore,
                notes
            };

            await container.items.upsert(updatedItem);

            return {
                status: 200,
                jsonBody: updatedItem
            };

        } catch (error) {
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});

/* =========================
   DELETE
========================= */
app.http('deleteRecovery', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'recovery/{id}',
    handler: async (request, context) => {

        try {
            const container = getContainer();
            const id = request.params.id;
            const patientId = request.query.get("patientId");

            if (!patientId) {
                return {
                    status: 400,
                    jsonBody: { error: "patientId required for delete" }
                };
            }

            await container.item(id, patientId).delete();

            return {
                status: 200,
                jsonBody: { message: "Deleted successfully" }
            };

        } catch (error) {
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});
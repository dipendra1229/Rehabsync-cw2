const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require("uuid");

app.http('uploadVideo', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const blobConnectionString = process.env.BLOB_CONNECTION_STRING;
            const blobContainerName = process.env.BLOB_CONTAINER_NAME;

            if (!blobConnectionString || !blobContainerName) {
                return {
                    status: 500,
                    jsonBody: { error: "Blob Storage not configured." }
                };
            }

            const formData = await request.formData();
            const exerciseTitle = formData.get('exerciseTitle');
            const patientId = formData.get('patientId');
            const file = formData.get('videoFile');

            if (!exerciseTitle || !patientId || !file) {
                return {
                    status: 400,
                    jsonBody: { error: "Missing required fields." }
                };
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const blobServiceClient = BlobServiceClient.fromConnectionString(blobConnectionString);
            const containerClient = blobServiceClient.getContainerClient(blobContainerName);

            await containerClient.createIfNotExists();

            const fileName = `${Date.now()}-${file.name}`;
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);

            await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: {
                    blobContentType: file.type || 'application/octet-stream'
                }
            });

            const videoUrl = blockBlobClient.url;

            const cosmosClient = new CosmosClient({
                endpoint: process.env.COSMOS_ENDPOINT,
                key: process.env.COSMOS_KEY
            });

            const cosmosContainer = cosmosClient
                .database(process.env.COSMOS_DATABASE_NAME)
                .container(process.env.COSMOS_CONTAINER_NAME);

            const videoRecord = {
                id: uuidv4(),
                type: "video",
                patientId,
                exerciseTitle,
                fileName,
                videoUrl,
                createdAt: new Date().toISOString()
            };

            await cosmosContainer.items.create(videoRecord);

            return {
                status: 200,
                jsonBody: {
                    message: "Video uploaded and assigned to patient successfully.",
                    ...videoRecord
                }
            };

        } catch (error) {
            context.log("Upload error:", error);
            return {
                status: 500,
                jsonBody: {
                    error: "Upload failed.",
                    details: error.message
                }
            };
        }
    }
});
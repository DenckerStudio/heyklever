import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || '';
export const qdrantCollection = process.env.QDRANT_COLLECTION_NAME || 'documents';

// Initialize the Qdrant client
export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey || undefined,
});

/**
 * Ensures the Qdrant collection exists with the correct configuration.
 * Should be called when initializing the application or on first index.
 */
export async function ensureQdrantCollection(): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === qdrantCollection);
    
    if (!exists) {
      await qdrantClient.createCollection(qdrantCollection, {
        vectors: {
          size: 3072, // Matches existing Supabase vector(3072) setup
          distance: 'Cosine',
        },
      });
      console.log(`Qdrant collection '${qdrantCollection}' created successfully.`);
      
      // Create payload indexes for efficient filtering
      await qdrantClient.createPayloadIndex(qdrantCollection, {
        field_name: 'team_id',
        field_schema: 'keyword',
      });
      await qdrantClient.createPayloadIndex(qdrantCollection, {
        field_name: 'context',
        field_schema: 'keyword',
      });
      await qdrantClient.createPayloadIndex(qdrantCollection, {
        field_name: 'folder_id',
        field_schema: 'keyword',
      });
    }
  } catch (error) {
    console.error('Error checking/creating Qdrant collection:', error);
    // Don't throw to not crash startup, but log it
  }
}

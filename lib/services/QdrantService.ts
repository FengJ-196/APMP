export class QdrantService {
  /**
   * Generates a 768-dimensional embedding for the input text using OpenRouter.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not defined in environment variables.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-embedding-2',
        input: [text],
        dimensions: 768,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenRouter Embeddings API failed (status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenRouter');
    }

    return embedding;
  }

  /**
   * Queries Qdrant for the top similar issues based on semantic text search.
   */
  static async searchSimilarIssues(text: string, limit: number = 3): Promise<any[]> {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const collectionName = process.env.QDRANT_COLLECTION || 'issues';

    // 1. Generate text embedding
    const queryVector = await this.generateEmbedding(text);

    // 2. Query Qdrant search REST API
    const searchUrl = `${qdrantUrl}/collections/${collectionName}/points/search`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: queryVector,
        limit,
        with_payload: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Qdrant search failed (status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const results = data.result || [];
    
    return results.map((item: any) => ({
      issuekey: item.payload?.issuekey || '',
      idproject: item.payload?.idproject || '',
      title: item.payload?.title || '',
      description: item.payload?.description || '',
      storypoints: Number(item.payload?.storypoints) || 0,
      score: item.score || 0,
    }));
  }
}

/**
 * Report token usage to Stripe for billing
 * Call this whenever tokens are consumed for an addon
 */
export async function reportTokenUsage(
  teamId: string,
  addonSlug: 'rag-ai' | 'content-gen' | 'chatbot' | 'summarization',
  tokens: number
): Promise<void> {
  try {
    // Report usage asynchronously (don't block the main operation)
    fetch('/api/stripe/report-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        addonSlug,
        tokens,
      }),
    }).catch((error) => {
      console.error(`Failed to report usage for ${addonSlug}:`, error);
      // Don't throw - usage reporting failure shouldn't break the app
    });
  } catch (error) {
    console.error(`Error reporting usage for ${addonSlug}:`, error);
  }
}
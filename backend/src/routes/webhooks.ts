import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate';
import { processAnalysisCallback } from '../services/analysisService';
import { ForbiddenError } from '../lib/errors';

const router = Router();

// POST /api/webhooks/n8n/analysis-complete - n8n callback (HMAC authenticated)
router.post(
  '/n8n/analysis-complete',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('[Webhook] Received n8n callback');
    console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Webhook] Body:', JSON.stringify(req.body, null, 2));

    // Get signature from header
    const signature = req.headers['x-webhook-signature'] as string;

    if (!signature) {
      console.log('[Webhook] Missing signature');
      throw new ForbiddenError('Missing webhook signature');
    }

    // Extract the callback payload
    const payload = req.body;

    if (!payload || !payload.analysisJobId) {
      console.log('[Webhook] Invalid payload');
      throw new ForbiddenError('Invalid webhook payload');
    }

    console.log('[Webhook] Processing callback for job:', payload.analysisJobId);

    // Process the callback (includes HMAC verification)
    const result = await processAnalysisCallback(payload, signature);

    console.log('[Webhook] Callback processed successfully');

    res.json(result);
  })
);

// POST /api/webhooks/n8n/mock-complete - Development endpoint to simulate n8n callback
// This allows testing the analysis flow without an actual n8n instance
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/n8n/mock-complete',
    asyncHandler(async (req: Request, res: Response) => {
      const { analysisJobId, projectId, success = true, delay = 5000 } = req.body;

      // Simulate async processing
      setTimeout(async () => {
        const crypto = await import('crypto');
        const { config } = await import('../lib/config');

        const payload = {
          success,
          analysisJobId,
          projectId,
          results: success
            ? {
                totalPhotosProcessed: 10,
                totalItemsIdentified: 25,
                totalRCV: 15230.5,
                totalACV: 11420.25,
                processingTimeMs: delay,
                sheetUrl: 'https://docs.google.com/spreadsheets/d/mock-sheet-id/edit',
              }
            : undefined,
          error: success ? undefined : 'Mock analysis failure',
        };

        // Generate signature
        const secret = config.N8N_CALLBACK_SECRET || 'dev-secret';
        const signature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');

        // Call the actual callback endpoint internally
        try {
          await processAnalysisCallback(payload, signature);
          console.log('[DEV] Mock callback processed successfully');
        } catch (error) {
          console.error('[DEV] Mock callback failed:', error);
        }
      }, delay);

      res.json({
        message: `Mock callback scheduled in ${delay}ms`,
        analysisJobId,
      });
    })
  );
}

export default router;

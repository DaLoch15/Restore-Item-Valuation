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
if (process.env.NODE_ENV === 'development') {
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
                totalPhotosProcessed: 3,
                totalItemsIdentified: 3,
                totalRCV: 2149.97,
                totalACV: 1704.98,
                processingTimeMs: delay,
                sheetUrl: 'https://docs.google.com/spreadsheets/d/mock-sheet-id/edit',
              }
            : undefined,
          items: success
            ? [
                {
                  photoId: 'mock-photo-1',
                  folderId: 'mock-folder-1',
                  room: 'Living Room',
                  description: 'Samsung 65" 4K Smart TV',
                  brand: 'Samsung',
                  model: 'UN65TU7000',
                  age: 2,
                  condition: 'Good',
                  quantity: 1,
                  unitPrice: 549.99,
                  rcv: 549.99,
                  depreciationType: 'Age/Condition',
                  depreciation: 109.99,
                  acv: 440.00,
                  priceSource: 'SerpAPI',
                  bestMatchUrl: 'https://example.com/tv',
                  category: 'ELC',
                  selector: 'TVFL',
                  catselCode: 'ELC/TVFL',
                  confidence: 0.92,
                  thumbnailUrl: null,
                },
                {
                  photoId: 'mock-photo-2',
                  folderId: 'mock-folder-1',
                  room: 'Living Room',
                  description: 'Leather Sectional Sofa',
                  brand: 'Ashley',
                  model: null,
                  age: 3,
                  condition: 'Fair',
                  quantity: 1,
                  unitPrice: 1299.99,
                  rcv: 1299.99,
                  depreciationType: 'Age/Condition',
                  depreciation: 324.99,
                  acv: 975.00,
                  priceSource: 'SerpAPI',
                  bestMatchUrl: null,
                  category: 'FUR',
                  selector: 'SOFA',
                  catselCode: 'FUR/SOFA',
                  confidence: 0.85,
                  thumbnailUrl: null,
                },
                {
                  photoId: 'mock-photo-3',
                  folderId: 'mock-folder-2',
                  room: 'Kitchen',
                  description: 'KitchenAid Stand Mixer',
                  brand: 'KitchenAid',
                  model: 'KSM150PS',
                  age: 1,
                  condition: 'Good',
                  quantity: 1,
                  unitPrice: 299.99,
                  rcv: 299.99,
                  depreciationType: 'Age/Condition',
                  depreciation: 30.00,
                  acv: 269.99,
                  priceSource: 'SerpAPI',
                  bestMatchUrl: 'https://example.com/mixer',
                  category: 'APL',
                  selector: 'MIXR',
                  catselCode: 'APL/MIXR',
                  confidence: 0.95,
                  thumbnailUrl: null,
                },
              ]
            : undefined,
          error: success ? undefined : 'Mock analysis failure',
        };

        // Generate signature
        const secret = config.N8N_CALLBACK_SECRET;
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

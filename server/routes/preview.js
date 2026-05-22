/**
 * Preview Routes – Audio Preview URL Scraping
 *
 * GET /api/preview/:trackId — Returns the scraped audio preview MP3 URL.
 */

import { Router } from 'express';
import { getPreviewUrl } from '../utils/scraper.js';

const router = Router();

// GET /api/preview/:trackId
router.get('/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;

    if (!trackId || trackId.length < 10) {
      return res.status(400).json({ error: 'Invalid track ID' });
    }

    const url = await getPreviewUrl(trackId);

    return res.json({ url });
  } catch (err) {
    console.error(`[Preview] Error for ${req.params.trackId}:`, err.message);
    return res.status(500).json({ error: 'Failed to fetch preview', url: null });
  }
});

export default router;

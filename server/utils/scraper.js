/**
 * Spotify Embed Scraper
 * 
 * Fetches audio preview URLs by scraping the Spotify Embed Player HTML.
 * Spotify deprecated preview_url in their Web API, so we extract the
 * hidden MP3 URL from the embedded JSON blob in the embed page.
 */

// In-memory cache: trackId -> { url, timestamp }
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get the audio preview URL for a Spotify track.
 * @param {string} trackId - Spotify track ID
 * @returns {Promise<string|null>} The preview MP3 URL, or null if not found
 */
export async function getPreviewUrl(trackId) {
  // Check cache first
  const cached = cache.get(trackId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url;
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(
        `[Scraper] Failed to fetch embed page for ${trackId}: ${response.status}`
      );
      return null;
    }

    const html = await response.text();

    // Extract audio preview URL from the embedded JSON blob
    const regex = /"audioPreview":\{"url":"(https:\/\/[^"]+)"\}/;
    const match = html.match(regex);

    const url = match ? match[1] : null;

    // Cache the result (even null, to avoid repeated failed requests)
    cache.set(trackId, { url, timestamp: Date.now() });

    if (url) {
      console.log(`[Scraper] Found preview for ${trackId}`);
    } else {
      console.log(`[Scraper] No preview found for ${trackId}`);
    }

    return url;
  } catch (err) {
    console.error(`[Scraper] Error scraping preview for ${trackId}:`, err.message);
    return null;
  }
}

/**
 * Clear expired entries from the cache.
 */
export function cleanCache() {
  const now = Date.now();
  for (const [key, value] of cache) {
    if (now - value.timestamp >= CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Clean cache every 30 minutes
setInterval(cleanCache, 30 * 60 * 1000);

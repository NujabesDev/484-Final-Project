/**
 * Detect if a URL is a Reddit post
 * @param {string} url - URL to check
 * @returns {boolean} True if Reddit post URL
 */
export function isRedditPostUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a Reddit domain
    if (!hostname.includes('reddit.com')) {
      return false;
    }

    // Check if it's a post URL (contains /comments/)
    return urlObj.pathname.includes('/comments/');
  } catch (e) {
    return false;
  }
}

/**
 * Scrape thumbnail from Reddit post
 * @param {string} url - Reddit post URL
 * @returns {Promise<string|null>} Thumbnail URL or null if not found
 */
export async function scrapeRedditThumbnail(url) {
  try {
    // Convert Reddit URL to JSON API endpoint
    const jsonUrl = url.endsWith('/') ? url.slice(0, -1) + '.json' : url + '.json';

    // Fetch post data from Reddit's JSON API
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReadLaterExtension/1.0)'
      }
    });

    if (!response.ok) {
      console.warn('Failed to fetch Reddit post data:', response.status);
      return null;
    }

    const data = await response.json();

    // Reddit API returns an array with [post_data, comments_data]
    // The post data is in data[0].data.children[0].data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const postData = data[0]?.data?.children?.[0]?.data;
    if (!postData) {
      return null;
    }

    // Try to get the best available thumbnail/image
    // Priority: preview images > thumbnail > null

    // 1. Check for preview images (highest quality)
    if (postData.preview && postData.preview.images && postData.preview.images.length > 0) {
      const previewImage = postData.preview.images[0];

      // Get the source image (highest quality)
      if (previewImage.source && previewImage.source.url) {
        // Decode HTML entities in URL
        return decodeHtmlEntities(previewImage.source.url);
      }

      // Fallback to resolutions if source not available
      if (previewImage.resolutions && previewImage.resolutions.length > 0) {
        const bestResolution = previewImage.resolutions[previewImage.resolutions.length - 1];
        if (bestResolution && bestResolution.url) {
          return decodeHtmlEntities(bestResolution.url);
        }
      }
    }

    // 2. Check for thumbnail (lower quality, but better than nothing)
    if (postData.thumbnail &&
        postData.thumbnail !== 'self' &&
        postData.thumbnail !== 'default' &&
        postData.thumbnail !== 'nsfw' &&
        postData.thumbnail !== 'spoiler' &&
        postData.thumbnail.startsWith('http')) {
      return postData.thumbnail;
    }

    // 3. No thumbnail found
    return null;
  } catch (error) {
    console.error('Error scraping Reddit thumbnail:', error);
    return null;
  }
}

/**
 * Decode HTML entities in URLs (Reddit encodes URLs with &amp; etc)
 * @param {string} url - Encoded URL
 * @returns {string} Decoded URL
 */
function decodeHtmlEntities(url) {
  return url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

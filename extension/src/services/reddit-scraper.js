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
    // Priority: direct image URL > gallery images > preview source > preview high-res > null
    // Note: We avoid the low-quality thumbnail field as it's often blurry

    // 1. Check if the post URL itself is a direct image (i.redd.it, etc.)
    if (postData.post_hint === 'image' && postData.url) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const urlLower = postData.url.toLowerCase();
      if (imageExtensions.some(ext => urlLower.includes(ext)) ||
          postData.url.includes('i.redd.it') ||
          postData.url.includes('i.imgur.com')) {
        return postData.url;
      }
    }

    // 2. Check for gallery images (media_metadata contains full-size images)
    if (postData.media_metadata) {
      const mediaItems = Object.values(postData.media_metadata);
      if (mediaItems.length > 0) {
        const firstMedia = mediaItems[0];
        // Get the highest quality version from media metadata
        if (firstMedia.s && firstMedia.s.u) {
          return decodeHtmlEntities(firstMedia.s.u);
        }
        // Fallback to gif if it's a gif
        if (firstMedia.s && firstMedia.s.gif) {
          return decodeHtmlEntities(firstMedia.s.gif);
        }
      }
    }

    // 3. Check for preview images (use highest quality available)
    if (postData.preview && postData.preview.images && postData.preview.images.length > 0) {
      const previewImage = postData.preview.images[0];

      // Get the source image (highest quality)
      if (previewImage.source && previewImage.source.url) {
        return decodeHtmlEntities(previewImage.source.url);
      }

      // Fallback to highest resolution if source not available
      if (previewImage.resolutions && previewImage.resolutions.length > 0) {
        const bestResolution = previewImage.resolutions[previewImage.resolutions.length - 1];
        if (bestResolution && bestResolution.url) {
          return decodeHtmlEntities(bestResolution.url);
        }
      }
    }

    // 4. No high-quality image found - return null instead of low-quality thumbnail
    // This will trigger the "no image" placeholder on the website
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

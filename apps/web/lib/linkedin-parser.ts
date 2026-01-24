/**
 * LinkedIn URL Parser
 * Extracts profile information from LinkedIn URLs
 */

export interface LinkedInProfile {
  username?: string;
  vanityName?: string;
  url: string;
}

/**
 * Check if a string is a LinkedIn URL
 */
export function isLinkedInUrl(input: string): boolean {
  const linkedInPattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(in|pub)\/[\w-]+/i;
  return linkedInPattern.test(input.trim());
}

/**
 * Parse LinkedIn URL to extract profile information
 * Supports formats:
 * - https://www.linkedin.com/in/username
 * - https://linkedin.com/in/username/
 * - linkedin.com/in/username
 * - www.linkedin.com/in/username
 */
export function parseLinkedInUrl(url: string): LinkedInProfile | null {
  const trimmedUrl = url.trim();

  // Match LinkedIn profile URLs
  const pattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(in|pub)\/([\w-]+)/i;
  const match = trimmedUrl.match(pattern);

  if (!match) {
    return null;
  }

  const [, type, username] = match;

  return {
    username,
    vanityName: username,
    url: `https://www.linkedin.com/${type}/${username}`,
  };
}

/**
 * Extract search query from LinkedIn URL
 * Returns the username which can be used to search for the person
 */
export function getSearchQueryFromLinkedInUrl(url: string): string | null {
  const profile = parseLinkedInUrl(url);
  return profile?.username || null;
}

/**
 * Convert LinkedIn vanity name to a more readable format
 * e.g., "john-doe" -> "John Doe"
 */
export function formatLinkedInName(vanityName: string): string {
  return vanityName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

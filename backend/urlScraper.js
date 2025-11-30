// backend/urlScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes article content from a given URL
 */
async function scrapeArticle(url) {
    try {
        console.log(`Scraping URL: ${url}`);
        
        // Fetch the webpage with browser-like headers
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com/'
            },
            timeout: 15000,
            maxRedirects: 5
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract title - try multiple selectors, including NYTimes specific
        let title = $('meta[property="og:title"]').attr('content') ||
                    $('meta[name="twitter:title"]').attr('content') ||
                    $('h1[data-testid="headline"]').first().text().trim() || // NYTimes specific
                    $('h1').first().text().trim() ||
                    $('title').text().trim() ||
                    'Untitled Article';

        // Extract main content - try common article selectors, including NYTimes specific
        let articleText = '';
        
        const articleSelectors = [
            'section[data-testid="article-body"]', // NYTimes specific
            'article',
            '[role="article"]',
            '.article-content',
            '.article-body',
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '.main-content'
        ];

        for (const selector of articleSelectors) {
            const content = $(selector).first();
            if (content.length > 0) {
                // Remove script, style, and other non-content elements
                content.find('script, style, nav, footer, aside, .ad, .advertisement, .byline, .comments').remove();
                articleText = content.text().trim();
                if (articleText.length > 200) { // Good enough content
                    break;
                }
            }
        }

        // Fallback: get all paragraphs if no article container found or content is too short
        if (articleText.length < 200) {
            // Try NYTimes paragraph structure
            const paragraphs = $('p[data-testid="paragraph"]').map((i, el) => $(el).text()).get();
            if (paragraphs.length > 0) {
                articleText = paragraphs.join(' ').trim();
            } else {
                // Generic paragraph fallback
                const allParagraphs = $('p').map((i, el) => $(el).text()).get();
                articleText = allParagraphs.join(' ').trim();
            }
        }

        // Extract metadata
        const description = $('meta[property="og:description"]').attr('content') ||
                           $('meta[name="description"]').attr('content') ||
                           $('meta[name="twitter:description"]').attr('content') ||
                           '';

        const author = $('meta[property="article:author"]').attr('content') ||
                      $('[rel="author"]').text().trim() ||
                      $('.author').first().text().trim() ||
                      '';

        const publishedTime = $('meta[property="article:published_time"]').attr('content') ||
                             $('time[datetime]').first().attr('datetime') ||
                             '';

        // Extract source name from meta tags or URL
        let source = $('meta[property="og:site_name"]').attr('content') ||
                     $('meta[name="application-name"]').attr('content') ||
                     $('meta[name="twitter:site"]').attr('content');
        
        if (!source) {
            const urlObj = new URL(url);
            source = urlObj.hostname.replace('www.', '').split('.')[0];
            source = source.charAt(0).toUpperCase() + source.slice(1); // Capitalize
        } else {
            // Clean up common prefixes like "@" from twitter:site
            source = source.replace(/^@/, '').trim();
        }

        // Clean up text - remove control characters
        articleText = articleText
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\n+/g, '\n') // Normalize newlines
            .trim();

        return {
            title: title.replace(/[\x00-\x1F\x7F]/g, '').trim(),
            text: articleText,
            description: description.replace(/[\x00-\x1F\x7F]/g, '').trim(),
            author: author.replace(/[\x00-\x1F\x7F]/g, '').trim(),
            publishedTime: publishedTime,
            source: source,
            url: url,
            success: true
        };

    } catch (error) {
        console.error('Error scraping URL:', error.message);
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: 'Could not connect to URL. Please check the link is valid.'
            };
        } else if (error.response?.status === 403) {
            return {
                success: false,
                error: 'This website blocks automated access. Some sites (like NYTimes) require JavaScript or have bot protection. Try a different news source or copy the headline text directly.'
            };
        } else if (error.response?.status === 404) {
            return {
                success: false,
                error: 'Page not found. Please check the URL.'
            };
        } else {
            return {
                success: false,
                error: `Failed to scrape article: ${error.message}`
            };
        }
    }
}

/**
 * Convert scraped article to element format
 */
function articleToElement(article) {
    // Determine type based on content
    let type = 'corporate';
    const headline = article.title;
    
    if (headline.match(/politic|election|congress|senate|president|government|policy|legislation|vote|democrat|republican|biden|trump|kamala|harris/i)) {
        type = 'political';
    } else if (headline.match(/international|world|country|nation|diplomat|summit|treaty|geopolitic|russia|china|ukraine|israel|palestine|nato|eu|united nations/i)) {
        type = 'world';
    } else if (headline.match(/tech|ai|software|digital|cyber|quantum|blockchain|apple|google|microsoft|meta|tesla|nvidia/i)) {
        type = 'tech';
    } else if (headline.match(/business|economy|market|stock|trade|finance|bank|corporate|company|ceo|merger|acquisition/i)) {
        type = 'corporate';
    }
    
    return {
        type: type,
        text: headline,
        source: article.source,
        real: true,
        url: article.url,
        fullText: article.text.substring(0, 1000) // First 1000 chars for AI context
    };
}

module.exports = { scrapeArticle, articleToElement };


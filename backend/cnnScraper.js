// backend/cnnScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes CNN World page for article headlines and URLs
 * Returns an array of elements in the format expected by the prediction system
 */
async function scrapeCNNWorld(count = 20) {
    try {
        console.log('Scraping CNN World page...');
        
        // Fetch the CNN World page with browser-like headers
        const response = await axios.get('https://www.cnn.com/world', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com/'
            },
            timeout: 15000
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        const articles = [];
        const seenHeadlines = new Set();
        
        // Strategy 1: Find article links with headlines
        // CNN uses various selectors for headlines
        $('a[href*="/world/"], a[href*="/202"], a[href*="/2025"]').each((i, elem) => {
            if (articles.length >= count) return false;
            
            const $link = $(elem);
            let url = $link.attr('href');
            if (!url) return;
            
            // Make sure it's a full URL
            if (!url.startsWith('http')) {
                url = 'https://www.cnn.com' + url;
            }
            
            // Skip non-article URLs
            if (url.includes('/video/') || url.includes('/live-news/') || 
                url.includes('/gallery/') || url.includes('/interactive/') ||
                !url.match(/\/\d{4}\/\d{2}\/\d{2}\//) && !url.includes('/world/')) {
                return;
            }
            
            // Try to find headline text
            let headline = $link.text().trim();
            
            // If link text is empty or too short, look for nearby heading or span
            if (!headline || headline.length < 10) {
                const $heading = $link.find('h2, h3, h4, span.headline, span.container__headline').first();
                if ($heading.length) {
                    headline = $heading.text().trim();
                } else {
                    // Look for heading in parent
                    const $parentHeading = $link.parent().find('h2, h3, h4, span.headline, span.container__headline').first();
                    if ($parentHeading.length) {
                        headline = $parentHeading.text().trim();
                    } else {
                        // Look for data attributes or aria-label
                        headline = $link.attr('aria-label') || $link.attr('title') || 
                                   $link.find('[data-editable="headlineText"]').text().trim() || '';
                    }
                }
            }
            
            // Clean up headline
            headline = headline.replace(/\s+/g, ' ').trim();
            
            // Skip navigation items and non-article content
            const skipPatterns = [
                /^(see all|subscribe|log in|sign up|skip|menu|search|watch|listen|follow|edition|sign in|my account)/i,
                /^(video|live|breaking|developing|analysis|opinion|photos|gallery|interactive|newsletter|podcast)/i,
                /^(cyber monday|black friday|deals|ad feedback|close icon)/i,
                /<img/i, // Skip if headline contains HTML
                /^[^a-zA-Z]*$/, // Skip if no letters
                /^cnn$/i, // Skip just "CNN"
            ];
            
            const shouldSkip = skipPatterns.some(pattern => pattern.test(headline));
            
            // Skip if empty, too short, already seen, or matches skip patterns
            if (headline && headline.length > 15 && !seenHeadlines.has(headline.toLowerCase()) && !shouldSkip) {
                // Skip if it's already tragic
                if (!headline.match(/death|kill|crash|disaster|war|attack|dead|murder|assassination|massacre|terrorist|bombing|shooting|mass shooting/i)) {
                    seenHeadlines.add(headline.toLowerCase());
                    
                    // Determine type based on content
                    let type = 'corporate';
                    if (headline.match(/politic|election|congress|senate|president|government|policy|legislation|vote|democrat|republican|biden|trump|kamala|harris/i)) {
                        type = 'political';
                    } else if (headline.match(/international|world|country|nation|diplomat|summit|treaty|geopolitic|russia|china|ukraine|israel|palestine|nato|eu|united nations/i)) {
                        type = 'world';
                    } else if (headline.match(/tech|ai|software|digital|cyber|quantum|blockchain|apple|google|microsoft|meta|tesla|nvidia/i)) {
                        type = 'tech';
                    } else if (headline.match(/business|economy|market|stock|trade|finance|bank|corporate|company|ceo|merger|acquisition/i)) {
                        type = 'corporate';
                    }
                    
                    articles.push({
                        type: type,
                        text: headline,
                        source: 'CNN',
                        real: true,
                        url: url
                    });
                }
            }
        });
        
        // Strategy 2: Look for specific CNN headline classes
        $('.container__headline, .headline, [data-editable="headlineText"]').each((i, elem) => {
            if (articles.length >= count) return false;
            
            const $elem = $(elem);
            let headline = $elem.text().trim();
            if (!headline || headline.length < 10) return;
            
            // Find parent link
            const $link = $elem.closest('a[href]');
            let url = null;
            if ($link.length) {
                url = $link.attr('href');
                if (url && !url.startsWith('http')) {
                    url = 'https://www.cnn.com' + url;
                }
            }
            
            headline = headline.replace(/\s+/g, ' ').trim();
            
            // Skip navigation items
            const skipPatterns = [
                /^(see all|subscribe|log in|sign up|skip|menu|search|watch|listen|follow|edition)/i,
                /^(video|live|breaking|developing|analysis|opinion|photos|gallery|interactive)/i,
                /<img/i,
            ];
            const shouldSkip = skipPatterns.some(pattern => pattern.test(headline));
            
            if (headline && headline.length > 15 && !seenHeadlines.has(headline.toLowerCase()) && !shouldSkip) {
                if (!headline.match(/death|kill|crash|disaster|war|attack|dead|murder|assassination/i)) {
                    seenHeadlines.add(headline.toLowerCase());
                    
                    let type = 'corporate';
                    if (headline.match(/politic|election|congress|senate|president|government/i)) {
                        type = 'political';
                    } else if (headline.match(/international|world|country|nation/i)) {
                        type = 'world';
                    }
                    
                    articles.push({
                        type: type,
                        text: headline,
                        source: 'CNN',
                        real: true,
                        url: url || null
                    });
                }
            }
        });
        
        // Strategy 3: Try JSON-LD structured data
        try {
            $('script[type="application/ld+json"]').each((i, elem) => {
                if (articles.length >= count) return false;
                
                try {
                    const jsonData = JSON.parse($(elem).html());
                    // Handle both single objects and arrays
                    const items = Array.isArray(jsonData) ? jsonData : [jsonData];
                    
                    items.forEach(item => {
                        if (articles.length >= count) return;
                        
                        if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
                            const headline = item.headline || item.name;
                            let url = item.url || item['@id'];
                            
                            if (url && !url.startsWith('http')) {
                                url = 'https://www.cnn.com' + url;
                            }
                            
                            if (headline && headline.length > 10 && !seenHeadlines.has(headline.toLowerCase())) {
                                if (!headline.match(/death|kill|crash|disaster|war|attack|dead|murder|assassination/i)) {
                                    seenHeadlines.add(headline.toLowerCase());
                                    
                                    let type = 'corporate';
                                    if (headline.match(/politic|election|congress|senate|president|government/i)) {
                                        type = 'political';
                                    } else if (headline.match(/international|world|country|nation/i)) {
                                        type = 'world';
                                    }
                                    
                                    articles.push({
                                        type: type,
                                        text: headline,
                                        source: 'CNN',
                                        real: true,
                                        url: url || null
                                    });
                                }
                            }
                        }
                    });
                } catch (e) {
                    // Skip invalid JSON
                }
            });
        } catch (e) {
            console.log('Error parsing JSON-LD:', e.message);
        }
        
        // Shuffle and limit
        const shuffled = articles.sort(() => 0.5 - Math.random());
        const result = shuffled.slice(0, count);
        
        console.log(`✅ Scraped ${result.length} articles from CNN World`);
        return result;
        
    } catch (error) {
        console.error('Error scraping CNN World:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
        return [];
    }
}

module.exports = { scrapeCNNWorld };


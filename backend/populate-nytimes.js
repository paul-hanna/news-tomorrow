#!/usr/bin/env node
// Quick script to populate database with NYTimes articles
// Usage: node populate-nytimes.js [count]

const { populateFromNYTimes } = require('./nytimesScraper');

const count = parseInt(process.argv[2]) || 20;

console.log(`\n📰 Populating database with ${count} articles from NYTimes homepage...\n`);

populateFromNYTimes(count)
    .then(() => {
        console.log('\n✅ Done! Check your database for new predictions.\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });


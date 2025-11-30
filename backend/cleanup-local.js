#!/usr/bin/env node
// Script to delete predictions containing "Local" from PostgreSQL database
// Usage: node cleanup-local.js

require('dotenv').config();
const db = require('./database');

async function cleanupLocalPredictions() {
    try {
        console.log('\n🧹 Cleaning up predictions containing "Local"...\n');
        
        if (!db.usePostgres || !db.pool) {
            const error = 'PostgreSQL not configured. This script only works with PostgreSQL.';
            console.log(`⚠️  ${error}`);
            console.log('   Set DB_HOST in .env to use PostgreSQL.');
            if (process.env.SKIP_WAIT === 'true') {
                throw new Error(error);
            }
            process.exit(1);
        }
        
        // Find all predictions with "Local" in headline or components
        const query = `
            SELECT _id, headline, components 
            FROM predictions 
            WHERE headline ILIKE '%Local%' 
               OR components::text ILIKE '%Local%'
            ORDER BY created_at DESC
        `;
        
        const result = await db.pool.query(query);
        const predictions = result.rows;
        
        if (predictions.length === 0) {
            console.log('✅ No predictions found containing "Local"');
            if (process.env.SKIP_WAIT === 'true') {
                return { deleted: 0 };
            }
            process.exit(0);
        }
        
        console.log(`Found ${predictions.length} predictions containing "Local":\n`);
        
        // Show what will be deleted
        predictions.forEach((pred, i) => {
            console.log(`[${i + 1}] ${pred.headline.substring(0, 80)}...`);
        });
        
        console.log(`\n⚠️  About to delete ${predictions.length} predictions.`);
        
        // If running as API route, skip the wait
        if (process.env.SKIP_WAIT !== 'true') {
            console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
            // Wait 3 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Delete them
        const deleteQuery = `
            DELETE FROM predictions 
            WHERE headline ILIKE '%Local%' 
               OR components::text ILIKE '%Local%'
        `;
        
        const deleteResult = await db.pool.query(deleteQuery);
        
        console.log(`✅ Deleted ${deleteResult.rowCount} predictions containing "Local"\n`);
        
        if (process.env.SKIP_WAIT === 'true') {
            return { deleted: deleteResult.rowCount };
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error cleaning up:', error);
        if (process.env.SKIP_WAIT === 'true') {
            throw error;
        }
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    cleanupLocalPredictions();
}

module.exports = { cleanupLocalPredictions };


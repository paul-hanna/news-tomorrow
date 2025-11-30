// backend/database.js
const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let usePostgres = false;

// Initialize PostgreSQL connection if DB_HOST is set
if (process.env.DB_HOST) {
    try {
        pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'predictions',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        
        usePostgres = true;
        console.log('✅ PostgreSQL connection pool created');
    } catch (error) {
        console.error('❌ Error creating PostgreSQL pool:', error.message);
        pool = null;
        usePostgres = false;
    }
} else {
    console.log('⚠️  DB_HOST not set, using NeDB (local development)');
}

// Initialize database tables
async function initializeDatabase() {
    if (!pool) return;
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                _id VARCHAR(255) UNIQUE,
                components JSONB NOT NULL,
                headline TEXT NOT NULL,
                stock_photo_description TEXT,
                stock_image_url TEXT,
                predicted_date DATE,
                created_at TIMESTAMP DEFAULT NOW(),
                came_true BOOLEAN DEFAULT FALSE,
                source_url TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_created_at ON predictions(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_headline ON predictions(headline);
        `);
        console.log('✅ PostgreSQL tables initialized');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
    }
}

// Initialize on load
if (usePostgres) {
    initializeDatabase();
}

// Database adapter with NeDB-compatible API
const db = {
    // Find documents
    async find(query = {}) {
        if (!pool) {
            // Fallback to NeDB - return empty array
            return [];
        }
        
        try {
            let sql = 'SELECT * FROM predictions';
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            
            // Simple query support
            if (query._id) {
                conditions.push(`_id = $${paramIndex++}`);
                values.push(query._id);
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' ORDER BY created_at DESC';
            
            const result = await pool.query(sql, values);
            return result.rows.map(formatRow);
        } catch (error) {
            console.error('Database find error:', error);
            return [];
        }
    },
    
    // Insert document
    async insert(doc, callback) {
        if (!pool) {
            if (callback) return callback(new Error('PostgreSQL not configured'), null);
            throw new Error('PostgreSQL not configured');
        }
        
        try {
            // Generate _id if not provided
            if (!doc._id) {
                doc._id = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            const sql = `
                INSERT INTO predictions (
                    components, headline, stock_photo_description, stock_image_url,
                    predicted_date, created_at, came_true, _id, source_url
                ) VALUES ($1::jsonb, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            // Ensure components is a valid array and properly formatted for JSONB
            let components = doc.components || [];
            if (!Array.isArray(components)) {
                components = [components];
            }
            // Clean up any circular references or invalid values and stringify for JSONB
            const cleanedComponentsJson = JSON.stringify(JSON.parse(JSON.stringify(components)));

            const values = [
                cleanedComponentsJson, // Pass as JSON string for $1::jsonb
                doc.headline ? String(doc.headline).replace(/[\x00-\x1F\x7F]/g, '').trim() : '',
                doc.stockPhotoDescription || doc.stock_photo_description || null,
                doc.stockImageUrl || doc.stock_image_url || null,
                doc.predicted_date || doc.predictedDate,
                doc.created_at || new Date(),
                doc.came_true || doc.cameTrue || false,
                doc._id,
                doc.source_url || doc.sourceUrl || null
            ];

            const result = await pool.query(sql, values);
            const inserted = formatRow(result.rows[0]);
            
            if (callback) {
                callback(null, inserted);
            }
            
            return inserted;
        } catch (error) {
            console.error('Database insert error:', error);
            if (callback) {
                callback(error, null);
            } else {
                throw error;
            }
        }
    },
    
    // Update document
    async update(query, update, options = {}) {
        if (!pool) {
            return { numAffected: 0 };
        }
        
        try {
            const sql = `
                UPDATE predictions 
                SET headline = $1, stock_photo_description = $2, stock_image_url = $3,
                    came_true = $4, updated_at = NOW()
                WHERE _id = $5
                RETURNING *
            `;
            
            const result = await pool.query(sql, [
                update.headline,
                update.stockPhotoDescription || update.stock_photo_description,
                update.stockImageUrl || update.stock_image_url,
                update.came_true || update.cameTrue || false,
                query._id
            ]);
            
            return { numAffected: result.rowCount };
        } catch (error) {
            console.error('Database update error:', error);
            return { numAffected: 0 };
        }
    }
};

// Format database row to match NeDB format
function formatRow(row) {
    return {
        ...row,
        components: row.components, // Already parsed by pg
        stockPhotoDescription: row.stock_photo_description,
        stockImageUrl: row.stock_image_url,
        predicted_date: row.predicted_date,
        created_at: row.created_at,
        came_true: row.came_true,
        _id: row._id || row.id.toString(),
        source_url: row.source_url
    };
}

module.exports = db;
module.exports.usePostgres = usePostgres;
module.exports.pool = pool;


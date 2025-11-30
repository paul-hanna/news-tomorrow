// Migration script to initialize database
require('dotenv').config();
const db = require('./database');

async function migrate() {
  try {
    console.log('🔄 Initializing database...');
    
    if (!db.usePostgres) {
      console.log('⚠️  PostgreSQL not configured. Set DB_HOST in environment variables.');
      console.log('   Skipping migration (using NeDB for local dev)');
      process.exit(0);
    }
    
    await db.initializeDatabase();
    console.log('✅ Database initialized successfully');
    console.log('✅ Tables created/verified');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();


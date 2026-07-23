#!/usr/bin/env node

/**
 * MongoDB Connection Tester
 * Usage: node test-db-connection.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
const env = process.env.NODE_ENV || 'development';

console.log('\n=== MongoDB Connection Diagnostic ===\n');
console.log(`Environment: ${env}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

if (!mongoUri) {
  console.error('\n❌ ERROR: MONGODB_URI is not set in .env file');
  process.exit(1);
}

// Extract and display connection info (safely)
const urlObj = new URL(mongoUri);
console.log(`Host: ${urlObj.hostname}`);
console.log(`Database: ${urlObj.pathname.slice(1) || 'default'}`);
console.log(`Username: ${urlObj.username}`);
console.log(`Port: ${urlObj.port || 'default'}`);

console.log('\n📡 Attempting to connect...\n');

const connectWithOptions = async () => {
  try {
    const startTime = Date.now();
    
    const connection = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 45000,
      retryWrites: true,
      retryReads: true,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1'
    });

    const duration = Date.now() - startTime;
    
    console.log('✅ CONNECTION SUCCESSFUL!\n');
    console.log(`Connected in ${duration}ms`);
    console.log(`MongoDB Version: ${connection.connection.db.serverVersion || 'unknown'}`);
    console.log(`Connection State: Connected`);
    console.log(`Ready State: ${connection.connection.readyState}`);
    
    // Test a simple query
    console.log('\n📊 Testing database access...');
    const collections = await connection.connection.db.listCollections().toArray();
    console.log(`Available collections: ${collections.map(c => c.name).join(', ') || 'none'}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed successfully');
    process.exit(0);
    
  } catch (error) {
    const errorMsg = error.message || String(error);
    console.log('❌ CONNECTION FAILED!\n');
    console.log(`Error: ${errorMsg}\n`);
    
    // Provide helpful troubleshooting
    if (errorMsg.includes('bad auth')) {
      console.log('🔧 Troubleshooting: bad auth error');
      console.log('   1. Check MongoDB username and password in .env');
      console.log('   2. Ensure user exists in MongoDB Atlas Database Access');
      console.log('   3. Check if password contains special characters (should be URL-encoded)');
      console.log('   4. Verify user has access to the database\n');
    } else if (errorMsg.includes('ENOTFOUND')) {
      console.log('🔧 Troubleshooting: ENOTFOUND error');
      console.log('   1. Check MongoDB cluster URL is correct');
      console.log('   2. Verify internet connection');
      console.log('   3. Check if MongoDB Atlas cluster is running\n');
    } else if (errorMsg.includes('ECONNREFUSED')) {
      console.log('🔧 Troubleshooting: ECONNREFUSED error');
      console.log('   1. MongoDB server may be offline');
      console.log('   2. Check network access settings in MongoDB Atlas');
      console.log('   3. Ensure IP whitelist includes your current IP\n');
    } else if (errorMsg.includes('ETIMEDOUT')) {
      console.log('🔧 Troubleshooting: ETIMEDOUT error');
      console.log('   1. MongoDB connection timeout');
      console.log('   2. Check network connectivity');
      console.log('   3. Verify MongoDB Atlas network access settings\n');
    }
    
    console.log('Full error:');
    console.log(error);
    process.exit(1);
  }
};

connectWithOptions();

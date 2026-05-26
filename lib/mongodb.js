const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'nexatop';

let client;
let db;

async function connectDB() {
  if (db) return db;
  if (!uri) throw new Error('MONGODB_URI tidak ditemukan di environment');
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log('✅ MongoDB connected');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database belum terhubung. Panggil connectDB() terlebih dahulu.');
  return db;
}

async function closeDB() {
  if (client) await client.close();
}

module.exports = { connectDB, getDB, closeDB };
const redis = require('redis');
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/collabai');

const redisClient = redis.createClient({
    socket: {
        host: '127.0.0.1',
        port: 6379,
        reconnectStrategy: (retries) => {
            console.log(`Redis reconnect attempt #${retries}`);
            return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000
    }
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
});
redisClient.on('connect', () => {
    console.log('Redis connected');
});
redisClient.on('reconnecting', () => {
    console.log('Redis reconnecting...');
});

redisClient.connect();

const documentSchema = new mongoose.Schema({
    docId: { type: String, unique: true },
    content: String,
    updatedAt: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

module.exports = { redisClient, Document };
const redis = require('redis');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collabai';
mongoose.connect(MONGO_URI).then(() => {
    console.log('MongoDB connected successfully');
}).catch((err) => {
    console.warn('MongoDB connection note:', err.message);
});

// In-memory fallback cache when Redis is offline
const memoryStore = new Map();
let isRedisConnected = false;
let loggedRedisWarning = false;

const rawRedisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        reconnectStrategy: (retries) => {
            if (!loggedRedisWarning) {
                console.log('[CollabAI Data Layer] Redis server not detected at 127.0.0.1:6379 — using resilient in-memory store for hot path & sessions.');
                loggedRedisWarning = true;
            }
            return Math.min(retries * 500, 10000);
        },
        connectTimeout: 2000
    }
});

rawRedisClient.on('error', (err) => {
    if (isRedisConnected) {
        console.error('Redis Client Error:', err.message);
    }
    isRedisConnected = false;
});

rawRedisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('Redis connected successfully');
});

rawRedisClient.on('ready', () => {
    isRedisConnected = true;
});

rawRedisClient.on('reconnecting', () => {
    isRedisConnected = false;
});

rawRedisClient.connect().catch(() => {
    // Handled by in-memory fallback
});

const redisClient = {
    async set(key, value, options = {}) {
        if (isRedisConnected) {
            try {
                return await rawRedisClient.set(key, value, options);
            } catch (err) {
                // fall through to memory
            }
        }
        memoryStore.set(key, String(value));
        if (options && options.EX) {
            setTimeout(() => {
                if (memoryStore.get(key) === String(value)) {
                    memoryStore.delete(key);
                }
            }, options.EX * 1000).unref();
        }
        return 'OK';
    },

    async get(key) {
        if (isRedisConnected) {
            try {
                const val = await rawRedisClient.get(key);
                if (val !== null) return val;
            } catch (err) {
                // fall through to memory
            }
        }
        return memoryStore.has(key) ? memoryStore.get(key) : null;
    },

    async del(key) {
        if (isRedisConnected) {
            try {
                await rawRedisClient.del(key);
            } catch (err) {
                // fall through to memory
            }
        }
        memoryStore.delete(key);
        return 1;
    },

    on(event, handler) {
        rawRedisClient.on(event, handler);
    },

    connect() {
        return Promise.resolve();
    }
};

const documentSchema = new mongoose.Schema({
    docId: { type: String, unique: true, required: true },
    title: { type: String, default: 'Untitled Document' },
    content: { type: String, default: '' },
    version: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

const revisionSchema = new mongoose.Schema({
    docId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    content: { type: String, default: '' },
    title: { type: String, default: 'Untitled Document' },
    author: { type: String, default: 'anonymous' },
    authorName: { type: String, default: 'Collaborator' },
    label: { type: String, default: 'Auto-saved revision' },
    summary: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true }
});

revisionSchema.index({ docId: 1, version: -1 });

const actionItemSchema = new mongoose.Schema({
    docId: { type: String, required: true, index: true },
    task: { type: String, required: true },
    assignee: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    dependencies: { type: [String], default: [] },
    openQuestions: { type: [String], default: [] },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    createdBy: { type: String, default: 'anonymous' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

actionItemSchema.index({ docId: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);
const Revision = mongoose.model('Revision', revisionSchema);
const ActionItem = mongoose.model('ActionItem', actionItemSchema);

module.exports = {
    redisClient,
    Document,
    Revision,
    ActionItem,
    isRedisAvailable: () => isRedisConnected
};
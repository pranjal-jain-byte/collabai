const jwt = require('jsonwebtoken');
const { redisClient } = require('./db');

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';

function generateAccessToken(userId) {
    return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(userId) {
    return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
}

async function login(userId) {
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    await redisClient.set(`refresh:${userId}`, refreshToken, { EX: 7 * 24 * 60 * 60 });

    return { accessToken, refreshToken };
}

async function refresh(refreshToken) {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const stored = await redisClient.get(`refresh:${payload.userId}`);

    if (stored !== refreshToken) {
        throw new Error('refresh token revoked or invalid');
    }

    return generateAccessToken(payload.userId);
}

async function logout(userId) {
    await redisClient.del(`refresh:${userId}`);
}

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'no token' });

    try {
        req.user = jwt.verify(token, ACCESS_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'invalid or expired token' });
    }
}

module.exports = { login, refresh, logout, authMiddleware };
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Token format invalid. Expected: Bearer <token>' });
    }
    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_for_event_booking');
        req.user = decoded; // Contains id, email
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = authMiddleware;

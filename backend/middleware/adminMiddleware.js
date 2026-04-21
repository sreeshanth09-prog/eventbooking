const jwt = require('jsonwebtoken');

const adminMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Token format invalid.' });

    try {
        const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'supersecretjwtkey_for_event_booking');
        if (!decoded.is_admin) return res.status(403).json({ error: 'Access denied. Admins only.' });
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

module.exports = adminMiddleware;

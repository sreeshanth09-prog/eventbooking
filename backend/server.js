const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.send('Event Booking API is running...'));

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    const pool = require('./db');
    const bcrypt = require('bcryptjs');

    try {
        // Seed demo user
        const [demo] = await pool.query('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
        if (demo.length === 0) {
            const hashed = await bcrypt.hash('password123', 10);
            await pool.query('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 0)', ['Demo User', 'demo@example.com', hashed]);
            console.log('Demo user created: demo@example.com / password123');
        }

        // Seed admin user
        const [admin] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@eventbooking.com']);
        const adminHashed = await bcrypt.hash('admin123', 10);
        if (admin.length === 0) {
            await pool.query('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)', ['Admin', 'admin@eventbooking.com', adminHashed]);
            console.log('Admin user created: admin@eventbooking.com / admin123');
        } else {
            // Ensure existing admin has is_admin flag set and correct password
            await pool.query('UPDATE users SET is_admin = 1, password = ? WHERE email = ?', [adminHashed, 'admin@eventbooking.com']);
            console.log('Admin user updated with default password');
        }
    } catch (err) {
        console.error('Seeding notice:', err.message);
    }
});

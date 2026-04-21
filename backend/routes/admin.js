const express = require('express');
const pool = require('../db');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// GET all bookings (with user and event info)
router.get('/bookings', adminMiddleware, async (req, res) => {
    try {
        const [bookings] = await pool.query(`
            SELECT b.*, 
                   u.name as user_name, u.email as user_email,
                   e.name as event_name, e.venue, e.date_time, e.ticket_price
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN events e ON b.event_id = e.id
            ORDER BY b.cancel_requested DESC, b.booking_time DESC
        `);
        res.json(bookings);
    } catch (err) {
        console.error('Admin get bookings error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all events with booking count
router.get('/events', adminMiddleware, async (req, res) => {
    try {
        const [events] = await pool.query(`
            SELECT e.*, COUNT(b.id) as total_bookings, COALESCE(SUM(b.tickets_booked),0) as tickets_sold
            FROM events e
            LEFT JOIN bookings b ON e.id = b.event_id
            GROUP BY e.id
            ORDER BY e.date_time ASC
        `);
        res.json(events);
    } catch (err) {
        console.error('Admin get events error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET cancellation requests (pending)
router.get('/cancel-requests', adminMiddleware, async (req, res) => {
    try {
        const [bookings] = await pool.query(`
            SELECT b.*, 
                   u.name as user_name, u.email as user_email,
                   e.name as event_name, e.venue, e.date_time
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN events e ON b.event_id = e.id
            WHERE b.cancel_requested = 1 AND b.cancel_status = 'pending'
            ORDER BY b.booking_time DESC
        `);
        res.json(bookings);
    } catch (err) {
        console.error('Admin cancel requests error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// APPROVE cancellation
router.put('/bookings/:id/approve-cancel', adminMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [bookings] = await connection.query('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [req.params.id]);
        if (bookings.length === 0) {
            await connection.rollback(); connection.release();
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const booking = bookings[0];

        // Refund tickets to event pool
        await connection.query('UPDATE events SET available_tickets = available_tickets + ? WHERE id = ?', [booking.tickets_booked, booking.event_id]);

        // Delete the booking
        await connection.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);

        await connection.commit();
        connection.release();
        res.json({ message: 'Cancellation approved. Booking deleted and tickets refunded.' });
    } catch (err) {
        await connection.rollback(); connection.release();
        console.error('Admin approve cancel error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// REJECT cancellation
router.put('/bookings/:id/reject-cancel', adminMiddleware, async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE bookings SET cancel_requested = 0, cancel_status = "rejected" WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Booking not found.' });
        res.json({ message: 'Cancellation request rejected.' });
    } catch (err) {
        console.error('Admin reject cancel error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all users
router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, is_admin, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

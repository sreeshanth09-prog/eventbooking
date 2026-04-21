const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// IMPORTANT: All specific sub-routes must come BEFORE generic /:id routes

// Get bookings for the logged-in user
router.get('/user', authMiddleware, async (req, res) => {
    try {
        const [bookings] = await pool.query(
            `SELECT b.*, e.name as event_name, e.venue as event_venue, e.date_time as event_date 
             FROM bookings b
             JOIN events e ON b.event_id = e.id
             WHERE b.user_id = ?
             ORDER BY b.booking_time DESC`,
            [req.user.id]
        );
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a booking
router.post('/', authMiddleware, async (req, res) => {
    const { event_id, tickets_booked } = req.body;
    if (!event_id || !tickets_booked || tickets_booked <= 0) {
        return res.status(400).json({ error: 'Valid event ID and positive ticket count are required.' });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [events] = await connection.query('SELECT * FROM events WHERE id = ? FOR UPDATE', [event_id]);
        if (events.length === 0) { await connection.rollback(); connection.release(); return res.status(404).json({ error: 'Event not found.' }); }
        const event = events[0];
        if (event.available_tickets < tickets_booked) { await connection.rollback(); connection.release(); return res.status(400).json({ error: 'Not enough available tickets.' }); }
        const total_amount = event.ticket_price * tickets_booked;
        await connection.query('UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?', [tickets_booked, event_id]);
        const [result] = await connection.query(
            'INSERT INTO bookings (user_id, event_id, tickets_booked, total_amount) VALUES (?, ?, ?, ?)',
            [req.user.id, event_id, tickets_booked, total_amount]
        );
        await connection.commit();
        connection.release();
        res.status(201).json({ message: 'Booking successful!', bookingId: result.insertId });
    } catch (error) {
        await connection.rollback(); connection.release();
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User requests cancellation — MUST be before GET /:id
router.put('/:id/request-cancel', authMiddleware, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, req.user.id]);
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found or not yours.' });
        if (bookings[0].cancel_status === 'pending') {
            return res.status(400).json({ error: 'Cancellation already requested. Awaiting admin review.' });
        }
        await pool.query('UPDATE bookings SET cancel_requested = 1, cancel_status = "pending" WHERE id = ?', [bookingId]);
        res.json({ message: 'Cancellation request submitted. Awaiting admin approval.' });
    } catch (error) {
        console.error('Error requesting cancellation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single booking's details — generic /:id LAST
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [bookings] = await pool.query(
            `SELECT b.*, e.name as event_name, e.venue as event_venue, e.date_time as event_date 
             FROM bookings b
             JOIN events e ON b.event_id = e.id
             WHERE b.id = ? AND b.user_id = ?`,
            [req.params.id, req.user.id]
        );
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found or not yours.' });
        res.json(bookings[0]);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

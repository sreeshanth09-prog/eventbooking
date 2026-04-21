const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
    try {
        const [events] = await pool.query('SELECT * FROM events ORDER BY date_time ASC');
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a single event by ID
router.get('/:id', async (req, res) => {
    try {
        const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        res.json(events[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new event (Requires Auth)
router.post('/', authMiddleware, async (req, res) => {
    const { name, department, date_time, venue, ticket_price, available_tickets } = req.body;

    if (!name || !department || !date_time || !venue || typeof ticket_price === 'undefined' || typeof available_tickets === 'undefined') {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (ticket_price < 0 || available_tickets < 0) {
        return res.status(400).json({ error: 'Price and tickets must be positive.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO events (name, department, date_time, venue, ticket_price, available_tickets) VALUES (?, ?, ?, ?, ?, ?)',
            [name, department, date_time, venue, ticket_price, available_tickets]
        );
        res.status(201).json({ message: 'Event created successfully!', eventId: result.insertId });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update an event (Requires Auth)
router.put('/:id', authMiddleware, async (req, res) => {
    const { name, department, date_time, venue, ticket_price, available_tickets } = req.body;

    try {
        const [result] = await pool.query(
            'UPDATE events SET name=?, department=?, date_time=?, venue=?, ticket_price=?, available_tickets=? WHERE id=?',
            [name, department, date_time, venue, ticket_price, available_tickets, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        res.json({ message: 'Event updated successfully!' });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete an event (Requires Auth)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM events WHERE id=?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        res.json({ message: 'Event deleted successfully!' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

const pool = require('./db');
async function test() {
    try {
        await pool.query('SELECT cancel_requested FROM bookings LIMIT 1');
        console.log('Bookings table has cancel_requested column.');
    } catch (e) {
        console.log('Error 1:', e.message);
    }
    process.exit(0);
}
test();

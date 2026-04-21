const pool = require('./db');
async function test() {
    try {
        await pool.query('SELECT description FROM events LIMIT 1');
        console.log('Events table has description column.');
    } catch (e) {
        console.log('Error events:', e.message);
    }
    process.exit(0);
}
test();

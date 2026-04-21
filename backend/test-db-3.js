const pool = require('./db');
async function test() {
    try {
        await pool.query('SELECT is_admin FROM users LIMIT 1');
        console.log('users table has is_admin column.');
    } catch (e) {
        console.log('Error users:', e.message);
    }
    process.exit(0);
}
test();

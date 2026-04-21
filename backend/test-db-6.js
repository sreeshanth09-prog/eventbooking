const pool = require('./db');
const bcrypt = require('bcryptjs');
async function test() {
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@eventbooking.com']);
        const match = await bcrypt.compare('password123', users[0].password);
        console.log('Matches password123:', match);
    } catch (e) {
        console.log(e);
    }
    process.exit(0);
}
test();

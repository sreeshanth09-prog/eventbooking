const pool = require('./db');
const bcrypt = require('bcryptjs');
async function test() {
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@eventbooking.com']);
        const user = users[0];
        console.log('Hash in DB:', user.password);
        const match = await bcrypt.compare('admin123', user.password);
        console.log('Matches admin123:', match);
    } catch (e) {
        console.log(e);
    }
    process.exit(0);
}
test();

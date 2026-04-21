const pool = require('./db');
async function test() {
    try {
        const [users] = await pool.query('SELECT * FROM users');
        console.log('Users in DB:');
        users.forEach(u => console.log(`email: ${u.email}, is_admin: ${u.is_admin}`));
    } catch (e) {
        console.log('Error users:', e.message);
    }
    process.exit(0);
}
test();

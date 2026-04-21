document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    const user = api.getUser();
    if (!user || !user.is_admin) {
        alert('Access denied. Admins only.');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('adminName').textContent = user.name;
    document.getElementById('topbarTime').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Initial load
    loadOverview();
});

// ---- Page Switching ----
const pageTitles = {
    'overview': ['Overview', 'System overview and recent activity'],
    'cancel-requests': ['Cancel Requests', 'Review and act on user cancellation requests'],
    'bookings': ['All Bookings', 'Complete list of all platform bookings'],
    'events': ['Events', 'All events on the platform'],
    'users': ['Users', 'All registered users']
};

function switchPage(btn, page) {
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide pages
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // Update topbar
    const [title, subtitle] = pageTitles[page] || [page, ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;

    // Lazy load data
    const loaders = {
        'cancel-requests': loadCancelRequests,
        'bookings': loadAllBookings,
        'events': loadAdminEvents,
        'users': loadUsers,
        'overview': loadOverview
    };
    if (loaders[page]) loaders[page]();
}

// ---- Overview ----
async function loadOverview() {
    try {
        const [bookings, events, cancelRequests, users] = await Promise.all([
            api.request('/admin/bookings'),
            api.request('/admin/events'),
            api.request('/admin/cancel-requests'),
            api.request('/admin/users')
        ]);

        document.getElementById('stat-events').textContent = events.length;
        document.getElementById('stat-bookings').textContent = bookings.length;
        document.getElementById('stat-requests').textContent = cancelRequests.length;
        document.getElementById('stat-users').textContent = users.length;

        // Badge
        const badge = document.getElementById('requestBadge');
        if (cancelRequests.length > 0) {
            badge.textContent = cancelRequests.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        document.getElementById('pendingCount').textContent = `${cancelRequests.length} pending`;
        renderCancelTable('overviewCancelTable', cancelRequests, true);
    } catch (err) {
        console.error('Overview load error:', err);
    }
}

// ---- Cancel Requests ----
async function loadCancelRequests() {
    const container = document.getElementById('cancelRequestsTable');
    container.innerHTML = '<p style="padding:1.5rem; color:#94a3b8;">Loading...</p>';
    try {
        const requests = await api.request('/admin/cancel-requests');
        renderCancelTable('cancelRequestsTable', requests, false);
    } catch (err) {
        document.getElementById('cancelRequestsTable').innerHTML = `<p style="padding:1.5rem; color:#ef4444;">${err.message}</p>`;
    }
}

function renderCancelTable(containerId, requests, compact) {
    const container = document.getElementById(containerId);
    if (requests.length === 0) {
        container.innerHTML = `<div style="padding: 3rem; text-align:center; color:#94a3b8;"><i class="fa-solid fa-circle-check" style="font-size:2.5rem; margin-bottom:1rem; color:#d1fae5;"></i><p>No pending cancellation requests!</p></div>`;
        return;
    }
    let rows = requests.map(b => `
        <tr>
            <td><strong>${escHtml(b.user_name)}</strong><br><span style="color:#94a3b8; font-size:0.75rem;">${escHtml(b.user_email)}</span></td>
            <td>${escHtml(b.event_name)}</td>
            <td>${escHtml(b.venue)}</td>
            <td style="font-weight:700;">₹${parseFloat(b.total_amount).toFixed(2)}<br><span style="color:#94a3b8; font-size:0.75rem;">${b.tickets_booked} ticket(s)</span></td>
            <td>${new Date(b.booking_time).toLocaleDateString('en-IN')}</td>
            <td>
                <span class="badge badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>
            </td>
            ${!compact ? `<td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="action-btn action-approve" onclick="approveCancel(${b.id})"><i class="fa-solid fa-check"></i> Approve</button>
                    <button class="action-btn action-reject" onclick="rejectCancel(${b.id})"><i class="fa-solid fa-xmark"></i> Reject</button>
                </div>
            </td>` : `<td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="action-btn action-approve" onclick="approveCancel(${b.id})" style="font-size:0.75rem;">Approve</button>
                    <button class="action-btn action-reject" onclick="rejectCancel(${b.id})" style="font-size:0.75rem;">Reject</button>
                </div>
            </td>`}
        </tr>
    `).join('');

    container.innerHTML = `<table>
        <thead><tr>
            <th>User</th><th>Event</th><th>Venue</th><th>Amount</th><th>Booked On</th><th>Status</th><th>Action</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

async function approveCancel(id) {
    if (!confirm('Approve this cancellation? Tickets will be refunded to the event pool.')) return;
    try {
        await api.request(`/admin/bookings/${id}/approve-cancel`, 'PUT');
        showAdminAlert('Cancellation approved! Tickets refunded.', 'success');
        loadOverview();
        loadCancelRequests();
    } catch (err) {
        showAdminAlert(err.message, 'error');
    }
}

async function rejectCancel(id) {
    if (!confirm('Reject this cancellation request?')) return;
    try {
        await api.request(`/admin/bookings/${id}/reject-cancel`, 'PUT');
        showAdminAlert('Cancellation request rejected.', 'success');
        loadOverview();
        loadCancelRequests();
    } catch (err) {
        showAdminAlert(err.message, 'error');
    }
}

// ---- All Bookings ----
async function loadAllBookings() {
    const container = document.getElementById('allBookingsTable');
    container.innerHTML = '<p style="padding:1.5rem; color:#94a3b8;">Loading...</p>';
    try {
        const bookings = await api.request('/admin/bookings');
        if (bookings.length === 0) {
            container.innerHTML = '<p style="padding:2rem; color:#94a3b8; text-align:center;">No bookings yet.</p>';
            return;
        }
        const rows = bookings.map(b => {
            let statusBadge = '<span class="badge badge-active"><i class="fa-solid fa-circle-check"></i> Active</span>';
            if (b.cancel_status === 'pending') statusBadge = '<span class="badge badge-pending"><i class="fa-solid fa-clock"></i> Cancel Pending</span>';
            else if (b.cancel_status === 'rejected') statusBadge = '<span class="badge badge-rejected"><i class="fa-solid fa-xmark"></i> Rejected</span>';
            return `<tr>
                <td><strong>${escHtml(b.user_name)}</strong><br><span style="color:#94a3b8; font-size:0.75rem;">${escHtml(b.user_email)}</span></td>
                <td>${escHtml(b.event_name)}</td>
                <td>${escHtml(b.venue)}</td>
                <td style="font-weight:700;">₹${parseFloat(b.total_amount).toFixed(2)}</td>
                <td>${b.tickets_booked}</td>
                <td>${new Date(b.booking_time).toLocaleDateString('en-IN')}</td>
                <td>${statusBadge}</td>
            </tr>`;
        }).join('');
        container.innerHTML = `<table><thead><tr><th>User</th><th>Event</th><th>Venue</th><th>Amount</th><th>Tickets</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (err) {
        container.innerHTML = `<p style="padding:1.5rem; color:#ef4444;">${err.message}</p>`;
    }
}

// ---- Events ----
async function loadAdminEvents() {
    const container = document.getElementById('adminEventsTable');
    container.innerHTML = '<p style="padding:1.5rem; color:#94a3b8;">Loading...</p>';
    try {
        const events = await api.request('/admin/events');
        if (events.length === 0) {
            container.innerHTML = '<p style="padding:2rem; color:#94a3b8; text-align:center;">No events.</p>';
            return;
        }
        const rows = events.map(e => `<tr>
            <td><strong>${escHtml(e.name)}</strong></td>
            <td>${escHtml(e.department)}</td>
            <td>${escHtml(e.venue)}</td>
            <td>${new Date(e.date_time).toLocaleDateString('en-IN')}</td>
            <td style="font-weight:700;">₹${parseFloat(e.ticket_price).toFixed(0)}</td>
            <td>${e.available_tickets}</td>
            <td>${e.tickets_sold || 0}</td>
            <td>${e.available_tickets > 0
                ? '<span class="badge badge-active">Active</span>'
                : '<span class="badge badge-soldout">Sold Out</span>'}</td>
        </tr>`).join('');
        container.innerHTML = `<table><thead><tr><th>Name</th><th>Dept</th><th>Venue</th><th>Date</th><th>Price</th><th>Available</th><th>Sold</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (err) {
        container.innerHTML = `<p style="padding:1.5rem; color:#ef4444;">${err.message}</p>`;
    }
}

// ---- Users ----
async function loadUsers() {
    const container = document.getElementById('usersTable');
    container.innerHTML = '<p style="padding:1.5rem; color:#94a3b8;">Loading...</p>';
    try {
        const users = await api.request('/admin/users');
        const rows = users.map(u => `<tr>
            <td>${u.id}</td>
            <td><strong>${escHtml(u.name)}</strong></td>
            <td>${escHtml(u.email)}</td>
            <td>${u.is_admin ? '<span class="badge badge-pending"><i class="fa-solid fa-shield-halved"></i> Admin</span>' : '<span class="badge badge-active">User</span>'}</td>
            <td>${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
        </tr>`).join('');
        container.innerHTML = `<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (err) {
        container.innerHTML = `<p style="padding:1.5rem; color:#ef4444;">${err.message}</p>`;
    }
}

// ---- Helpers ----
function showAdminAlert(msg, type) {
    const el = document.getElementById('cancelAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = `admin-alert show ${type}`;
    setTimeout(() => el.className = 'admin-alert', 3500);
}

function escHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

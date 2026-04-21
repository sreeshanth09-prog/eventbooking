document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const bookingsList = document.getElementById('bookingsList');
    const alertBox = document.getElementById('alert');
    const user = api.getUser();

    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 5000);
    }

    function formatDate(d) {
        return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getCancelBadge(booking) {
        if (booking.cancel_status === 'pending') {
            return `<span class="cancel-badge pending"><i class="fa-solid fa-clock"></i> Cancellation Pending Review</span>`;
        } else if (booking.cancel_status === 'rejected') {
            return `<span class="cancel-badge rejected"><i class="fa-solid fa-xmark-circle"></i> Cancellation Rejected</span>`;
        }
        return '';
    }

    function getCancelButton(booking) {
        if (booking.cancel_status === 'pending') {
            return `<button class="btn btn-outline btn-block" disabled style="color:var(--text-secondary); cursor:not-allowed; opacity:0.6;">
                        <i class="fa-solid fa-hourglass-half"></i> Awaiting Admin Review
                    </button>`;
        }
        return `<button class="btn btn-danger-outline request-cancel-btn btn-block" data-id="${booking.id}">
                    <i class="fa-solid fa-triangle-exclamation"></i> Request Cancellation
                </button>`;
    }

    async function loadBookings() {
        bookingsList.innerHTML = '<p style="color: var(--text-secondary);">Loading bookings...</p>';
        try {
            const bookings = await api.request('/bookings/user');
            bookingsList.innerHTML = '';

            if (bookings.length === 0) {
                bookingsList.innerHTML = `
                    <div style="text-align: center; padding: 4rem 2rem; background: var(--surface-color); border-radius: var(--radius); border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-ticket" style="font-size: 3rem; color: var(--border-color); margin-bottom: 1rem; display:block;"></i>
                        <h2 style="color: var(--text-secondary); margin-bottom: 1rem; font-weight: 600;">No bookings yet</h2>
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Head over to events to book your first ticket</p>
                        <a href="index.html" class="btn btn-primary">Browse Events</a>
                    </div>
                `;
                return;
            }

            bookings.forEach(booking => {
                const item = document.createElement('div');
                item.className = 'card';

                item.innerHTML = `
                    <div class="card-icon-container" style="background-color: #f0fdf4; border: 2px solid #bbf7d0; color: #16a34a; flex-shrink:0;">
                        <i class="fa-solid fa-bookmark"></i>
                    </div>
                    <div class="card-content">
                        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                            <div class="card-title" style="margin-bottom:0;">${booking.event_name}</div>
                            ${getCancelBadge(booking)}
                        </div>
                        <div class="card-meta" style="flex-direction: column; gap: 0.4rem;">
                            <div class="card-meta-item">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>${booking.event_venue}</span>
                            </div>
                            <div class="card-meta-item">
                                <i class="fa-regular fa-calendar"></i>
                                <span>${formatDate(booking.event_date)}</span>
                            </div>
                            <div class="card-meta-item" style="font-size:0.78rem; color: var(--text-secondary);">
                                <i class="fa-regular fa-clock"></i>
                                <span>Booked: ${formatDate(booking.booking_time)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <div class="price">₹${parseFloat(booking.total_amount).toFixed(2)}</div>
                        <div style="color: var(--text-secondary); margin-bottom: 1rem; font-weight: 500; font-size:0.9rem;">
                            <i class="fa-solid fa-ticket"></i> ${booking.tickets_booked} Ticket(s)
                        </div>
                        ${getCancelButton(booking)}
                    </div>
                `;
                bookingsList.appendChild(item);
            });

            document.querySelectorAll('.request-cancel-btn').forEach(btn => {
                btn.addEventListener('click', (e) => handleRequestCancel(e.currentTarget.dataset.id));
            });

        } catch (error) {
            bookingsList.innerHTML = `<p style="color: var(--danger-color)">Error loading bookings: ${error.message}</p>`;
        }
    }

    async function handleRequestCancel(id) {
        if (!confirm('Request cancellation of this booking?\n\nYour request will be sent to the admin for review. Tickets will only be refunded once approved.')) {
            return;
        }
        try {
            const res = await api.request(`/bookings/${id}/request-cancel`, 'PUT');
            showAlert(res.message, 'success');
            loadBookings();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    }

    loadBookings();
});

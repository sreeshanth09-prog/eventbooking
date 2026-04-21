document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        window.location.href = 'index.html';
        return;
    }

    const alertBox = document.getElementById('alert');
    const bookingForm = document.getElementById('bookingForm');
    const loading = document.getElementById('loading');
    const eventDetails = document.getElementById('eventDetails');
    const ticketCountInput = document.getElementById('ticketCount');
    const totalAmountSpan = document.getElementById('totalAmount');
    const receiptOverlay = document.getElementById('receiptOverlay');

    let currentEvent = null;

    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';
    }

    async function loadEventDetails() {
        try {
            const event = await api.request(`/events/${eventId}`);
            currentEvent = event;

            document.getElementById('eventName').textContent = event.name;
            const d = new Date(event.date_time);
            document.getElementById('eventDateVenue').textContent = `${d.toLocaleString()} | ${event.venue}`;
            document.getElementById('ticketPrice').textContent = `₹${parseFloat(event.ticket_price).toFixed(2)}`;
            document.getElementById('availableTickets').textContent = event.available_tickets;

            ticketCountInput.max = event.available_tickets;
            updateTotal();

            loading.style.display = 'none';
            eventDetails.style.display = 'flex';
            bookingForm.style.display = 'block';

            if (event.available_tickets === 0) {
                document.getElementById('bookBtn').disabled = true;
                ticketCountInput.disabled = true;
                showAlert('This event is sold out.', 'error');
            }
        } catch (error) {
            loading.style.display = 'none';
            showAlert(error.message, 'error');
        }
    }

    function updateTotal() {
        if (!currentEvent) return;
        const count = parseInt(ticketCountInput.value) || 0;
        const total = count * currentEvent.ticket_price;
        totalAmountSpan.textContent = `₹${total.toFixed(2)}`;
    }

    ticketCountInput.addEventListener('input', updateTotal);

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const count = parseInt(ticketCountInput.value);
        if (count > currentEvent.available_tickets) {
            showAlert('Cannot book more than available tickets.', 'error');
            return;
        }

        const bookBtn = document.getElementById('bookBtn');
        try {
            bookBtn.disabled = true;
            bookBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';

            const data = await api.request('/bookings', 'POST', {
                event_id: eventId,
                tickets_booked: count
            });

            // Populate the receipt overlay
            const total = count * currentEvent.ticket_price;
            const d = new Date(currentEvent.date_time);
            document.getElementById('receiptAmount').textContent = `₹${total.toFixed(2)}`;
            document.getElementById('receiptEvent').textContent = currentEvent.name;
            document.getElementById('receiptVenue').textContent = currentEvent.venue;
            document.getElementById('receiptDate').textContent = d.toLocaleString();
            document.getElementById('receiptTickets').textContent = `${count} Ticket(s)`;
            document.getElementById('receiptId').textContent = `BK-${String(data.bookingId).padStart(6, '0')}`;

            // Show premium receipt overlay
            receiptOverlay.classList.add('show');

        } catch (error) {
            bookBtn.disabled = false;
            bookBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Confirm & Pay';
            showAlert(error.message, 'error');
        }
    });

    loadEventDetails();
});

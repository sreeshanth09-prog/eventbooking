document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const user = api.getUser();
    if (user) {
        document.getElementById('userName').textContent = user.name;
        if (user.is_admin) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'admin-nav-pill';
            adminLink.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Admin';
            document.getElementById('userName').after(adminLink);
        }
    }

    const eventsGrid = document.getElementById('eventsGrid');
    const alertBox = document.getElementById('alert');
    const createBtn = document.getElementById('createEventBtn');
    const formContainer = document.getElementById('createEventFormContainer');
    const cancelBtn = document.getElementById('cancelCreateBtn');
    const eventForm = document.getElementById('eventForm');

    // Toggle form
    createBtn.addEventListener('click', () => {
        formContainer.style.display = 'block';
        eventForm.reset();
        eventForm.dataset.mode = 'create';
    });

    cancelBtn.addEventListener('click', () => {
        formContainer.style.display = 'none';
        eventForm.reset();
    });

    // Form submission
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('eventName').value,
            department: document.getElementById('eventDept').value,
            date_time: document.getElementById('eventDate').value,
            venue: document.getElementById('eventVenue').value,
            ticket_price: parseFloat(document.getElementById('eventPrice').value),
            available_tickets: parseInt(document.getElementById('eventTickets').value)
        };

        try {
            const mode = eventForm.dataset.mode;
            if (mode === 'create') {
                await api.request('/events', 'POST', payload);
                showAlert('Event created successfully!', 'success');
            } else {
                const id = eventForm.dataset.eventId;
                await api.request(`/events/${id}`, 'PUT', payload);
                showAlert('Event updated successfully!', 'success');
            }
            
            formContainer.style.display = 'none';
            loadEvents();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });

    function showAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';
        setTimeout(() => alertBox.style.display = 'none', 3000);
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    async function loadEvents() {
        try {
            const events = await api.request('/events');
            eventsGrid.innerHTML = '';
            
            if (events.length === 0) {
                eventsGrid.innerHTML = '<p>No events found. Create one!</p>';
                return;
            }

            events.forEach(event => {
                const isSoldOut = event.available_tickets === 0;
                
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="card-icon-container">
                        <i class="fa-solid fa-calendar-star"></i>
                    </div>
                    <div class="card-content">
                        <div class="card-title">${event.name}</div>
                        <div class="card-meta">
                            <div class="card-meta-item">
                                <i class="fa-solid fa-location-dot"></i>
                                ${event.venue}
                            </div>
                            <div class="card-meta-item">
                                <i class="fa-regular fa-calendar"></i>
                                ${formatDate(event.date_time)}
                            </div>
                            <div class="card-meta-item">
                                <i class="fa-solid fa-users"></i>
                                Dept: ${event.department}
                            </div>
                            <div class="card-meta-item" style="color: ${isSoldOut ? 'var(--danger-color)' : 'inherit'}; font-weight: 500;">
                                <i class="fa-solid fa-ticket"></i>
                                Tickets Left: ${event.available_tickets}
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <div class="price">₹${parseFloat(event.ticket_price).toFixed(0)}</div>
                        ${isSoldOut 
                            ? `<button disabled class="btn btn-outline btn-block" style="color:var(--text-secondary); cursor:not-allowed;">Sold Out</button>`
                            : `<a href="booking.html?id=${event.id}" class="btn btn-primary btn-block"><i class="fa-solid fa-check"></i> Book Now</a>`
                        }
                        
                        <div class="card-buttons-row">
                            <button class="btn btn-outline edit-btn" data-id="${event.id}" style="padding: 0.5rem; font-size: 0.85rem; flex: 1;"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="btn btn-danger-outline delete-btn" data-id="${event.id}" style="padding: 0.5rem; font-size: 0.85rem; flex: 1;"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    </div>
                `;
                eventsGrid.appendChild(card);
            });

            // Bind edit/delete handlers
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => handleEdit(e.target.dataset.id, events));
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => handleDelete(e.target.dataset.id));
            });

        } catch (error) {
            eventsGrid.innerHTML = `<p style="color: var(--danger-color)">Error loading events: ${error.message}</p>`;
        }
    }

    function handleEdit(id, allEvents) {
        const event = allEvents.find(e => e.id == id);
        if (!event) return;
        
        document.getElementById('eventName').value = event.name;
        document.getElementById('eventDept').value = event.department;
        // Format for datetime-local
        const d = new Date(event.date_time);
        document.getElementById('eventDate').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('eventVenue').value = event.venue;
        document.getElementById('eventPrice').value = event.ticket_price;
        document.getElementById('eventTickets').value = event.available_tickets;

        formContainer.style.display = 'block';
        eventForm.dataset.mode = 'edit';
        eventForm.dataset.eventId = id;
        window.scrollTo(0, 0);
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this event? All associated bookings will be deleted.')) return;
        
        try {
            await api.request(`/events/${id}`, 'DELETE');
            showAlert('Event deleted.', 'success');
            loadEvents();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    }

    loadEvents();
});

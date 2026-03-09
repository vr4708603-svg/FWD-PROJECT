// Base URL for the Node.js Backend API
const API_BASE = 'http://localhost:3000/api';

// Global State
let currentUser = { name: '', role: '' };
let allEventsCache = []; // Fetched from Linked List on backend
let allHackathonsCache = [];
let allCombinedCache = [];

// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links a');

// =====================================
// INITIALIZATION
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if dark mode is saved
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Auto start polling for notifications (Deque)
    setInterval(fetchNotifications, 5000);
});

// =====================================
// UI & NAVIGATION
// =====================================
function showPage(pageId) {
    pages.forEach(p => p.classList.remove('active-page'));
    document.getElementById(pageId).classList.add('active-page');

    navLinks.forEach(l => l.classList.remove('active'));
    event.currentTarget.classList?.add('active');

    // Trigger page specific loads
    if (pageId === 'events-page') {
        fetchEvents();
        fetchPopularEvents();
    } else if (pageId === 'student-dashboard') {
        fetchEventsForSelect();
    } else if (pageId === 'admin-dashboard') {
        fetchAdminStats();
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));

    // Inject dynamic CSS variable changes for dark mode if needed
    if (document.body.classList.contains('dark-mode')) {
        document.documentElement.style.setProperty('--bg-color', '#000000');
        document.documentElement.style.setProperty('--surface-color', 'rgba(20, 20, 20, 0.8)');
    } else {
        document.documentElement.style.setProperty('--bg-color', '#0f172a');
        document.documentElement.style.setProperty('--surface-color', 'rgba(30, 41, 59, 0.7)');
    }
}

// =====================================
// AUTHENTICATION & LOGIN
// =====================================
function toggleLoginFields() {
    const roleInput = document.querySelector('input[name="role"]:checked').value;
    if (roleInput === 'admin') {
        document.getElementById('student-login-fields').style.display = 'none';
        document.getElementById('admin-login-fields').style.display = 'block';
    } else {
        document.getElementById('student-login-fields').style.display = 'block';
        document.getElementById('admin-login-fields').style.display = 'none';
    }
}

function login() {
    const roleInput = document.querySelector('input[name="role"]:checked').value;

    if (roleInput === 'admin') {
        const adminUser = document.getElementById('login-admin-username').value;
        const adminPass = document.getElementById('login-admin-password').value;
        if (adminUser === 'admin' && adminPass === '1234') {
            currentUser = { name: 'Admin', role: 'admin' };
            showPage('admin-dashboard');
            fetchEvents(); // To pre-load events cache
        } else {
            alert("Invalid admin credentials");
        }
    } else {
        const studentName = document.getElementById('login-student-name').value;
        if (!studentName.trim()) {
            alert("Please enter a name");
            return;
        }
        currentUser = { name: studentName, role: 'student' };
        document.getElementById('student-name-display').innerText = currentUser.name;
        showPage('student-dashboard');
    }
}

// =====================================
// API INTEGRATIONS (Data Structures)
// =====================================

// --- LINKED LIST ---
async function fetchEvents() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const data = await res.json();

        if (data.success) {
            allEventsCache = data.events || [];
            allHackathonsCache = data.hackathons || [];
            allCombinedCache = [...allEventsCache, ...allHackathonsCache];

            renderCards(allEventsCache, 'all-events-container');
            renderCards(allHackathonsCache, 'all-hackathons-container');

            // Render popular if provided here (optimization)
            if (data.popular) {
                renderPopular(data.popular);
            }
        }
    } catch (error) {
        console.error("Error fetching events list:", error);
    }
}

// --- MAX HEAP ---
async function fetchPopularEvents() {
    // Relying on the single payload fetch from above now
}

function renderPopular(popularArray) {
    const container = document.getElementById('popular-events-container');
    container.innerHTML = '';

    popularArray.forEach((event, index) => {
        container.innerHTML += `
            <div class="glass-card event-card scale-in" style="animation-delay: ${index * 0.1}s">
                <img src="${event.image}" class="event-image" alt="${event.name}">
                <div class="event-details">
                    <h3>#${index + 1} ${event.name}</h3>
                    <p class="small-text mb-2">${event.description}</p>
                    <div class="event-meta">
                        <span>🔥 ${event.registrations} Registrations</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- HASH TABLE ---
async function searchEventById() {
    const searchStr = document.getElementById('event-search').value.toLowerCase().trim();

    if (!searchStr) {
        renderCards(allEventsCache, 'all-events-container');
        renderCards(allHackathonsCache, 'all-hackathons-container');
        return;
    }

    // Client-side search for smoother UI filtering
    const filteredEvents = allEventsCache.filter(e => e.name.toLowerCase().includes(searchStr) || e.id.toLowerCase().includes(searchStr));
    const filteredHackathons = allHackathonsCache.filter(h => h.name.toLowerCase().includes(searchStr) || h.id.toLowerCase().includes(searchStr));

    renderCards(filteredEvents, 'all-events-container');
    renderCards(filteredHackathons, 'all-hackathons-container');
}

// Render dynamic event cards explicitly to a target container
function renderCards(itemArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (itemArray.length === 0) {
        container.innerHTML = '<p class="empty-state" style="grid-column: 1/-1;">No matching items found.</p>';
        return;
    }

    itemArray.forEach((item, index) => {
        let actionButtonHTML = '';

        if (currentUser.role === 'admin') {
            actionButtonHTML = `<button class="btn-secondary full-width mt-1" onclick="openAdminAddModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')">Add Student to Roster</button>`;
        } else {
            actionButtonHTML = `<button class="btn-primary full-width mt-1" onclick="openStudentRegisterModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')">Register Instantly</button>`;
        }

        container.innerHTML += `
            <div class="glass-card event-card scale-in" style="animation-delay: ${index * 0.1}s">
                <img src="${item.image}" class="event-image" alt="${item.name}">
                <div class="event-details">
                    <h3>${item.name}</h3>
                    <p class="small-text mb-2">${item.description}</p>
                    <div class="event-meta">
                        <span>📅 ${item.date}</span>
                        <span>🎟️ ${item.registrations}/${item.seats} Filled</span>
                    </div>
                    <div class="event-meta" style="margin-bottom:0.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top:0.5rem;">
                        <span>📍 ${item.venue || 'Virtual'}</span>
                        <span>⏱️ ${item.time || ''}</span>
                    </div>
                    ${actionButtonHTML}
                </div>
            </div>
        `;
    });
}

// =====================================
// MODAL LOGIC
// =====================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openStudentRegisterModal(eventId, eventName) {
    document.getElementById('reg-hidden-event-id').value = eventId;
    document.getElementById('reg-event-name').innerText = eventName;
    document.getElementById('reg-fullname').value = currentUser.name;
    document.getElementById('student-register-modal').classList.add('active');
}

function openAdminAddModal(eventId, eventName) {
    document.getElementById('admin-hidden-event-id').value = eventId;
    document.getElementById('admin-add-event-name').innerText = eventName;
    document.getElementById('admin-add-modal').classList.add('active');
}

async function submitStudentRegistration() {
    const eventId = document.getElementById('reg-hidden-event-id').value;
    const isVIP = document.getElementById('reg-vip').checked;

    // Values just collected for show (no backend DB saving these yet, using standard DSA)
    const email = document.getElementById('reg-email').value;
    const roll = document.getElementById('reg-roll').value;
    const fullname = document.getElementById('reg-fullname').value;

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: fullname || currentUser.name || "Student",
                eventId: eventId,
                isVIP: isVIP
            })
        });

        const data = await res.json();

        if (data.success) {
            alert('Successfully Registered');
            closeModal('student-register-modal');
            fetchEvents();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Registration error:", error);
    }
}

async function submitAdminAddStudent() {
    const eventId = document.getElementById('admin-hidden-event-id').value;
    const addUsername = document.getElementById('admin-add-username').value;

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: addUsername,
                eventId: eventId,
                isVIP: false
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('Successfully Added');
            closeModal('admin-add-modal');
            fetchEvents();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Registration error:", error);
    }
}

// (Old Registration via select dropdown removed)

// --- STACK ---
async function undoLastRegistration() {
    try {
        const res = await fetch(`${API_BASE}/register/undo`, { method: 'POST' });
        const data = await res.json();

        alert(data.message);
        if (data.success) {
            fetchEventsForSelect();
        }
    } catch (error) {
        console.error("Stack undo error:", error);
    }
}

// --- VIEW QUEUES (Admin) ---
async function fetchAdminStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/queues`);
        const data = await res.json();

        // Render Standard Queue
        const standardContainer = document.getElementById('standard-queue-view');
        if (data.standardQueue.length === 0) {
            standardContainer.innerHTML = '<p class="empty-state">Queue is empty</p>';
        } else {
            standardContainer.innerHTML = data.standardQueue.map(q =>
                `<div class="queue-item">Student: ${q.studentName} | Event: ${q.eventId}</div>`
            ).join('');
        }

        // Render VIP Priority Queue
        const vipContainer = document.getElementById('vip-queue-view');
        if (data.vipQueue.length === 0) {
            vipContainer.innerHTML = '<p class="empty-state">No VIPs waiting</p>';
        } else {
            vipContainer.innerHTML = data.vipQueue.map(q =>
                `<div class="queue-item vip-item">🌟 VIP: ${q.studentName} | Event: ${q.eventId}</div>`
            ).join('');
        }

        // Render Waitlist Circular Queue
        const waitlistContainer = document.getElementById('waitlist-view');
        if (data.waitlist.length === 0) {
            waitlistContainer.innerHTML = '<p class="empty-state" style="grid-column: span 2">Waitlist empty</p>';
        } else {
            waitlistContainer.innerHTML = data.waitlist.map((w, index) =>
                `<div class="circle-item filled" title="Event: ${w.eventId}">${w.studentName}</div>`
            ).join('');
        }

    } catch (error) {
        console.error("Admin stats fetch error:", error);
    }
}

// Dummy processing of queues (just aesthetic for demo)
function processNext(type) {
    alert(`Processing ${type} registration using Queue.dequeue() from backend data structure...`);
    // In a real flow, you'd hit an endpoint to dequeue on the server.
    // For presentation, updating the visual stat fetch is enough:
    setTimeout(fetchAdminStats, 500);
}

// --- DEQUE (NOTIFICATIONS) ---
let lastNotificationCount = 0;
async function fetchNotifications() {
    try {
        const res = await fetch(`${API_BASE}/notifications`);
        const data = await res.json();

        if (data.success) {
            const container = document.getElementById('notification-container');

            // Only update if there are new notifications to prevent UI jumping
            if (data.notifications.length !== lastNotificationCount) {
                container.innerHTML = '';
                lastNotificationCount = data.notifications.length;

                // Taking top 3 for visual cleanliness
                data.notifications.slice(0, 3).forEach(notif => {
                    container.innerHTML += `
                        <div class="notification ${notif.type}" onclick="clearOldestNotification()">
                            <div>
                                <strong>${notif.type === 'urgent' ? '⚠️ ' : '🔔 '}${notif.title}</strong>
                                <div class="small-text">${new Date(notif.timestamp).toLocaleTimeString()}</div>
                            </div>
                            <span class="small-text" style="cursor:pointer" title="Deque: Remove Back">Dismiss</span>
                        </div>
                    `;
                });
            }
        }
    } catch (error) {
        // Silent error for polling
    }
}

async function clearOldestNotification() {
    try {
        const res = await fetch(`${API_BASE}/notifications/clear`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            lastNotificationCount = 0; // Force refresh
            fetchNotifications();
        }
    } catch (error) {
        console.error("Error clearing notification deque:", error);
    }
}

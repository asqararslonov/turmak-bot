const fetch = require('node-fetch');

const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const BOT_TOKEN = process.env.BOT_TOKEN;

async function request(path, options = {}) {
    const url = `${BASE}${path}`;
    const { headers: extraHeaders, ...restOptions } = options;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
        ...restOptions,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
    return data;
}

function authHeaders(token) {
    return { Authorization: `Bearer ${token}` };
}

// ── Auth ───────────────────────────────────────────────
async function botAuth({ telegram_id, phone, name, gender }) {
    return request('/auth/bot', {
        method: 'POST',
        body: JSON.stringify({ telegram_id, phone, name, gender, bot_secret: BOT_TOKEN }),
    });
}

// ── Barbershops ────────────────────────────────────────
async function getBarbershops() {
    return request('/barbershops');
}

// ── Locations ──────────────────────────────────────────
async function getLocations() {
    return request('/locations');
}

// ── Barbers ────────────────────────────────────────────
async function getBarbersByShop(barbershop_id) {
    return request(`/barbers?barbershop_id=${barbershop_id}`);
}

async function getBarberServices(barber_id) {
    return request(`/barbers/${barber_id}/services`);
}

async function getBarberAvailability(barber_id, date) {
    return request(`/barbers/${barber_id}/availability?date=${date}`);
}

// ── Bookings ───────────────────────────────────────────
async function createBooking(token, { barber_id, service_id, day, time }) {
    return request('/bookings', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ barber_id, service_id, day, time }),
    });
}

async function getUserBookings(token, userId) {
    return request(`/users/${userId}/bookings`, {
        headers: authHeaders(token),
    });
}

async function deleteBooking(token, bookingId) {
    return request(`/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
    });
}

module.exports = {
    botAuth,
    getBarbershops,
    getLocations,
    getBarbersByShop,
    getBarberServices,
    getBarberAvailability,
    createBooking,
    getUserBookings,
    deleteBooking,
};

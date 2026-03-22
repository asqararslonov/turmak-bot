const fetch = require('node-fetch');

const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const BOT_TOKEN = process.env.BOT_TOKEN;

async function request(path, options = {}) {
    const url = `${BASE}${path}`;
    const { headers: extraHeaders, ...restOptions } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            ...restOptions,
        });
        clearTimeout(timeout);
        const data = await res.json().catch(e => { console.error('[api] JSON parse error:', e.message); return {}; });
        if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
        return data;
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
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
    const q = new URLSearchParams({ barbershop_id }).toString();
    return request(`/barbers?${q}`);
}

async function getBarberServices(barber_id) {
    return request(`/barbers/${encodeURIComponent(barber_id)}/services`);
}

async function getBarberAvailability(barber_id, date) {
    const q = new URLSearchParams({ date }).toString();
    return request(`/barbers/${encodeURIComponent(barber_id)}/availability?${q}`);
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

/**
 * Haversine distance in km between two lat/lng points
 */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format a date string YYYY-MM-DD to a human-readable Uzbek format
 */
function formatDate(dateStr) {
    const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    const days = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha'];
    const d = new Date(dateStr + 'T00:00:00');
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Format price in UZS
 */
function formatPrice(amount) {
    return `${Number(amount).toLocaleString('uz-UZ')} so'm`;
}

/**
 * Get next N dates starting from tomorrow, as YYYY-MM-DD strings
 */
function getNextDates(count = 14) {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= count; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
    }
    return dates;
}

/**
 * Status badge for bookings
 */
function statusBadge(status) {
    const badges = {
        pending: '🕐 Kutilmoqda',
        confirmed: '✅ Tasdiqlangan',
        cancelled: '❌ Bekor',
        completed: '✔️ Tugallangan',
    };
    return badges[status] || status;
}

module.exports = { haversineKm, formatDate, formatPrice, getNextDates, statusBadge };

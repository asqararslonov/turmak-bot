import axios from 'axios';

const API_BASE_URL = 'https://turmak-api.vercel.app/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    sendCode: (phone) => api.post('/auth/send-code', { phone }),
    verifyCode: (phone, code) => api.post('/auth/verify-code', { phone, code }),
    telegramWidget: (data) => api.post('/auth/telegram-widget', data),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    getBookings: (id) => api.get(`/users/${id}/bookings`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    patch: (id, data) => api.patch(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// Barbershops API
export const barbershopsAPI = {
    getAll: () => api.get('/barbershops'),
    getById: (id) => api.get(`/barbershops/${id}`),
    getBarbers: (id) => api.get(`/barbershops/${id}/barbers`),
    create: (data) => api.post('/barbershops', data),
    update: (id, data) => api.put(`/barbershops/${id}`, data),
    delete: (id) => api.delete(`/barbershops/${id}`),
};

// Barbers API
export const barbersAPI = {
    getAll: () => api.get('/barbers'),
    getById: (id) => api.get(`/barbers/${id}`),
    getServices: (id) => api.get(`/barbers/${id}/services`),
    getAvailability: (id, date) => api.get(`/barbers/${id}/availability`, { params: { date } }),
    getSchedule: (id) => api.get(`/barbers/${id}/schedule`),
    updateSchedule: (id, data) => api.patch(`/barbers/${id}/schedule`, data),
    create: (data) => api.post('/barbers', data),
    update: (id, data) => api.put(`/barbers/${id}`, data),
    delete: (id) => api.delete(`/barbers/${id}`),
};

// Bookings API
export const bookingsAPI = {
    getAll: (params) => api.get('/bookings', { params }),
    getById: (id) => api.get(`/bookings/${id}`),
    create: (data) => api.post('/bookings', data),
    update: (id, data) => api.patch(`/bookings/${id}`, data),
    markUserCame: (id, came) => api.patch(`/bookings/${id}/user-came`, { came }),
    delete: (id) => api.delete(`/bookings/${id}`),
    getNoShows: (barbershopId) => api.get('/bookings/no-shows', { params: { barbershop_id: barbershopId } }),
};

// Locations API
export const locationsAPI = {
    getAll: (params) => api.get('/locations', { params }),
    getById: (id) => api.get(`/locations/${id}`),
    getNearby: (params) => api.get('/locations/nearby', { params }),
    create: (data) => api.post('/locations', data),
    update: (id, data) => api.put(`/locations/${id}`, data),
    delete: (id) => api.delete(`/locations/${id}`),
};

// Media API
export const mediaAPI = {
    getAuth: () => api.get('/media/auth'),
    upload: (data) => api.post('/media/upload', data),
    // Barbershop gallery (for shop owners and shop barbers)
    getGallery: () => api.get('/media/barbershop/gallery'),
    addToGallery: (data) => api.post('/media/barbershop/gallery', data),
    removeFromGallery: (index) => api.delete(`/media/barbershop/gallery/${index}`),
    // Individual barber gallery
    getBarberGallery: () => api.get('/media/barber/gallery'),
    addToBarberGallery: (data) => api.post('/media/barber/gallery', data),
    removeFromBarberGallery: (index) => api.delete(`/media/barber/gallery/${index}`),
    deleteFile: (fileId) => api.delete(`/media/delete/${fileId}`),
};

// Calendar API
export const calendarAPI = {
    get: (date, barbershop_id) => api.get('/calendar', { params: { date, barbershop_id } }),
    getWeek: (start, barbershop_id) => api.get('/calendar/week', { params: { start, barbershop_id } }),
    createBooking: (data) => api.post('/calendar/booking', data),
    updateBooking: (id, data) => api.patch(`/calendar/booking/${id}`, data),
    deleteBooking: (id) => api.delete(`/calendar/booking/${id}`),
};

// Clients (CRM) API
export const clientsAPI = {
    getAll: (params) => api.get('/clients', { params }),
    getById: (id) => api.get(`/clients/${id}`),
    getVisits: (id) => api.get(`/clients/${id}/visits`),
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    delete: (id) => api.delete(`/clients/${id}`),
};

// Finance API
export const financeAPI = {
    getSummary: (params) => api.get('/finance/summary', { params }),
    getTransactions: (params) => api.get('/finance/transactions', { params }),
};

// Payroll API
export const payrollAPI = {
    getRules: (barbershop_id) => api.get('/payroll/rules', { params: { barbershop_id } }),
    saveRule: (data) => api.post('/payroll/rules', data),
    calculate: (params) => api.get('/payroll/calculate', { params }),
};

// Inventory API
export const inventoryAPI = {
    getAll: (params) => api.get('/inventory', { params }),
    getLowStock: (barbershop_id) => api.get('/inventory/low-stock', { params: { barbershop_id } }),
    getById: (id) => api.get(`/inventory/${id}`),
    create: (data) => api.post('/inventory', data),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    delete: (id) => api.delete(`/inventory/${id}`),
};

// Reviews API
export const reviewsAPI = {
    getByBarbershop: (barbershopId) => api.get(`/reviews/barbershop/${barbershopId}`),
};

// Notifications API
export const notificationsAPI = {
    getVapidKey: () => api.get('/notifications/vapid-public-key'),
    subscribe: (subscription) => api.post('/notifications/subscribe', { subscription }),
    unsubscribe: () => api.delete('/notifications/unsubscribe'),
    getInApp: () => api.get('/notifications'),
    markAllRead: () => api.patch('/notifications/read'),
};

// Service Categories API
export const serviceCategoriesAPI = {
    getAll: () => api.get('/service-categories'),
    create: (data) => api.post('/service-categories', data),
    update: (id, data) => api.put(`/service-categories/${id}`, data),
    delete: (id) => api.delete(`/service-categories/${id}`),
};

// Barbershop catalog API
export const catalogAPI = {
    update: (shopId, catalog) => api.put(`/barbershops/${shopId}/catalog`, { catalog }),
};

// Promo Codes API
export const promoCodesAPI = {
    getAll: (params) => api.get('/promo-codes', { params }),
    getById: (id) => api.get(`/promo-codes/${id}`),
    validate: (code, params) => api.get(`/promo-codes/validate/${code}`, { params }),
    create: (data) => api.post('/promo-codes', data),
    update: (id, data) => api.put(`/promo-codes/${id}`, data),
    delete: (id) => api.delete(`/promo-codes/${id}`),
    use: (id, bookingId) => api.post(`/promo-codes/${id}/use`, { booking_id: bookingId }),
    getMyCodes: () => api.get('/promo-codes/my'),
};

// Survey / Waitlist API
export const surveyAPI = {
    getAll: () => api.get('/survey'),
};

// Barber slug API additions
export const barberSlugAPI = {
    checkSlug: (slug) => api.get('/barbers/check-slug', { params: { slug } }),
    getBySlug: (slug) => api.get(`/barbers/slug/${slug}`),
};

// Banners API
export const bannersAPI = {
    getAll:  ()         => api.get('/banners?all=1'),
    create:  (data)     => api.post('/banners', data),
    update:  (id, data) => api.put(`/banners/${id}`, data),
    delete:  (id)       => api.delete(`/banners/${id}`),
};

export default api;

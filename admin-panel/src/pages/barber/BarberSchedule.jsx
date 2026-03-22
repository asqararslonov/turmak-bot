import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { bookingsAPI } from '../../services/api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Loader2, Filter, UserX } from 'lucide-react';

const BarberSchedule = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data: res } = await bookingsAPI.getAll();
      const list = res?.data ?? res ?? [];
      setBookings(list.filter(b => b.barber?.barber_id === user.barber_id));
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (bookingId, status) => {
    setActionLoading(bookingId);
    try {
      await bookingsAPI.update(bookingId, { status });
      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status } : b
      ));
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm(t('schedule.deleteConfirm'))) return;
    setActionLoading(bookingId);
    try {
      await bookingsAPI.delete(bookingId);
      setBookings(prev => prev.filter(b => b.booking_id !== bookingId));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const navigateDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';

  const statusLabels = {
    all: t('common.all'),
    pending: t('bookings.status.pending'),
    confirmed: t('bookings.status.confirmed'),
    cancelled: t('bookings.status.cancelled'),
    no_show: t('bookings.status.no_show'),
  };

  const filtered = bookings.filter(b => {
    if (viewMode === 'day' && b.day !== selectedDate) return false;
    if (viewMode === 'week') {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const bookingDate = new Date(b.day);
      if (bookingDate < start || bookingDate > end) return false;
    }
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  if (loading) return <LoadingSpinner size="lg" text={t('schedule.loading')} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('schedule.title')}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">{filtered.length} {t('nav.bookings').toLowerCase()}</p>
        </div>
        <div className="self-start sm:self-center flex items-center gap-2">
          {[
            { key: 'day',  label: t('calendar.day') },
            { key: 'week', label: t('calendar.week') },
            { key: 'all',  label: t('common.all') },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                viewMode === key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date navigation */}
      {viewMode !== 'all' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 flex-wrap">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field w-auto"
            />
            {isToday && (
              <span className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2.5 py-1 rounded-full font-bold border border-teal-100 dark:border-teal-800">
                {t('calendar.today')}
              </span>
            )}
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="text-sm text-teal-600 font-semibold hover:underline"
            >
              {t('schedule.goToToday')}
            </button>
          )}
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
          <Filter size={13} className="text-teal-600 dark:text-teal-400"/>
        </div>
        {['all', 'pending', 'confirmed', 'cancelled', 'no_show'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === status
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Summary mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-xl font-bold text-gray-900 dark:text-white" >{filtered.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('common.total')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800 border-l-4 border-l-amber-400">
          <p className="text-xl font-bold text-amber-500" >{filtered.filter(b => b.status === 'pending').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('bookings.status.pending')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800 border-l-4 border-l-emerald-400">
          <p className="text-xl font-bold text-emerald-500" >{filtered.filter(b => b.status === 'confirmed').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('bookings.status.confirmed')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800 border-l-4 border-l-red-400">
          <p className="text-xl font-bold text-red-500" >{filtered.filter(b => b.status === 'cancelled').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('bookings.status.cancelled')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-800 border-l-4 border-l-orange-400">
          <p className="text-xl font-bold text-orange-500" >{filtered.filter(b => b.status === 'no_show').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('bookings.status.no_show')}</p>
        </div>
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400">{t('bookings.noBookings')}</h3>
          <p className="text-gray-400 text-sm mt-1">
            {viewMode === 'day'
              ? `${t('schedule.noBookingsFor')} ${selectedDate}`
              : t('schedule.noBookingsFound')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <div
              key={booking.booking_id}
              className={`bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200 border-l-4 ${
                booking.status === 'confirmed' ? 'border-l-emerald-400' :
                booking.status === 'pending'   ? 'border-l-amber-400'  :
                booking.status === 'no_show'   ? 'border-l-orange-400' :
                'border-l-red-400'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="text-center shrink-0 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                    <p className="text-lg font-bold text-gray-900 dark:text-white font-mono leading-none" >{booking.time}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{booking.day}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white">{booking.user?.name || 'Unknown'}</p>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{booking.user?.phone}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{booking.service?.name}</span>
                      <span className="text-gray-400">{booking.service?.duration} min</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatPrice(booking.service?.price || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {booking.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(booking.booking_id, 'confirmed')}
                        disabled={actionLoading === booking.booking_id}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-100"
                        title={t('bookings.status.confirmed')}
                      >
                        {actionLoading === booking.booking_id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleAction(booking.booking_id, 'cancelled')}
                        disabled={actionLoading === booking.booking_id}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                        title={t('bookings.status.cancelled')}
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </button>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleAction(booking.booking_id, 'no_show')}
                      disabled={actionLoading === booking.booking_id}
                      className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-100"
                      title={t('bookings.status.no_show')}
                    >
                      {actionLoading === booking.booking_id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      ) : (
                        <UserX className="w-4 h-4 text-orange-600" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(booking.booking_id)}
                    disabled={actionLoading === booking.booking_id}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BarberSchedule;

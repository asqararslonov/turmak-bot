import React, { useState, useEffect, useRef } from 'react';
import {
  format, addDays, subDays, startOfWeek, addWeeks, subWeeks,
  startOfMonth, getDaysInMonth, addMonths, subMonths,
  isToday, isSameMonth,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  CheckCircle, XCircle, Trash2, Scissors, Phone, CreditCard,
  Banknote, Wifi, AlertCircle, UserPlus, Building2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { bookingsAPI, barbershopsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';

const CELL_HEIGHT = 60;
const TIME_START = 9;
const TIME_END = 20;
const COLUMN_WIDTH = 180;
const TIME_COL_WIDTH = 64;

const TIME_SLOTS = [];
for (let h = TIME_START; h < TIME_END; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatPrice(p) {
  return new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';
}

const STATUS_COLORS = {
  confirmed: { bg: 'bg-emerald-500', border: 'border-emerald-600' },
  pending:   { bg: 'bg-amber-400',   border: 'border-amber-500'   },
  cancelled: { bg: 'bg-red-400',     border: 'border-red-500'     },
};

const PAYMENT_ICONS = {
  cash:   <Banknote size={12} />,
  card:   <CreditCard size={12} />,
  online: <Wifi size={12} />,
};

const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'];

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ weekStart, weekData, onDayClick, t }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="flex flex-1 overflow-hidden">
      {days.map(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const dayData = weekData[ds] || { bookings: [] };
        const count = dayData.bookings?.length ?? 0;
        const today = isToday(day);
        return (
          <div
            key={ds}
            onClick={() => onDayClick(day)}
            className={`flex-1 border-r last:border-r-0 border-gray-200 dark:border-gray-700 cursor-pointer flex flex-col transition-colors hover:bg-teal-50 dark:hover:bg-gray-800 ${today ? 'bg-teal-50/60 dark:bg-teal-900/20' : ''}`}
          >
            <div className={`p-3 border-b border-gray-200 dark:border-gray-700 text-center flex-shrink-0 ${today ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-gray-50 dark:bg-gray-800/40'}`}>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {format(day, 'EEE')}
              </div>
              <div className={`text-3xl font-bold mt-0.5 leading-none ${today ? 'text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {format(day, 'd')}
              </div>
              <div className="mt-2 h-5 flex items-center justify-center">
                {count > 0 ? (
                  <span className="inline-flex items-center gap-1 bg-teal-600 text-white rounded-full px-2 py-0.5 text-xs font-medium">
                    <Calendar size={9} /> {count}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {dayData.bookings.slice(0, 8).map((booking, i) => {
                const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
                return (
                  <div key={booking.booking_id ?? i} className={`${colors.bg} rounded-md px-2 py-1 text-white text-xs leading-tight`}>
                    <div className="font-semibold truncate">{booking.time} · {booking.client_name}</div>
                    {booking.service?.name && <div className="text-white/75 truncate">{booking.service.name}</div>}
                  </div>
                );
              })}
              {count > 8 && (
                <div className="text-xs text-center text-gray-400 dark:text-gray-500 py-1">+{count - 8} {t('calendar.more')}</div>
              )}
              {count === 0 && (
                <div className="flex items-center justify-center h-16 text-xs text-gray-300 dark:text-gray-600">
                  {t('calendar.noBookings')}
                </div>
              )}
            </div>
            <div className="py-2 text-center border-t border-gray-100 dark:border-gray-700/50 flex-shrink-0">
              <span className="text-xs text-teal-500">{t('calendar.viewDay')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ selectedDate, monthData, onDayClick, t }) {
  const monthStart = startOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="flex flex-col flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 flex-1">
        {cells.map((day, idx) => {
          const ds = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, selectedDate);
          const today = isToday(day);
          const info = monthData[ds];
          const hasBookings = info && info.count > 0;
          const allConfirmed = hasBookings && info.confirmed === info.count;
          return (
            <div
              key={idx}
              onClick={() => inMonth && onDayClick(day)}
              className={`relative rounded-xl p-2 min-h-[70px] flex flex-col transition-all
                ${inMonth ? 'cursor-pointer' : 'opacity-30 pointer-events-none'}
                ${today ? 'ring-2 ring-teal-500' : ''}
                ${hasBookings && allConfirmed
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : hasBookings
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100'
                  : 'bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
            >
              <span className={`text-sm font-bold leading-none ${today ? hasBookings ? 'text-white' : 'text-teal-600' : ''}`}>
                {format(day, 'd')}
              </span>
              {hasBookings && (
                <div className="mt-auto">
                  <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    allConfirmed ? 'bg-white/25 text-white' : 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {info.count} bron
                  </span>
                  {info.revenue > 0 && (
                    <div className={`text-xs mt-0.5 truncate ${allConfirmed ? 'text-white/80' : 'text-emerald-600/70 dark:text-emerald-400/70'}`}>
                      {formatPrice(info.revenue)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminCalendar() {
  const { t } = useLanguage();
  const token = localStorage.getItem('token');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [viewTransition, setViewTransition] = useState(false);

  // Shop filter
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('all');

  // Data states
  const [allBookings, setAllBookings] = useState([]);
  const [calendarData, setCalendarData] = useState({ barbers: [], bookings: [] });
  const [weekData, setWeekData] = useState({});
  const [monthData, setMonthData] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  // Booking detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  // Load shops and all bookings on mount
  useEffect(() => {
    barbershopsAPI.getAll()
      .then(({ data }) => setShops(data || []))
      .catch(console.error);
    loadAllBookings();
  }, []);

  // Recompute or fetch when date/view/shop/bookings change
  useEffect(() => {
    if (selectedShopId === 'all') {
      if (viewMode === 'week') computeAllWeekData();
      else if (viewMode === 'month') computeAllMonthData();
      // day view derives directly from allBookings, no additional work
    } else {
      if (viewMode === 'day') fetchShopDayData();
      else if (viewMode === 'week') fetchShopWeekData();
      else fetchShopMonthData();
    }
  }, [selectedDate, viewMode, selectedShopId, allBookings]);

  // Scroll to current time in day view
  useEffect(() => {
    if (viewMode === 'day' && scrollRef.current && !loading) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const offset = ((currentMin - TIME_START * 60) / 30) * CELL_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, offset - 100);
    }
  }, [loading, viewMode]);

  const loadAllBookings = async () => {
    try {
      const { data: res } = await bookingsAPI.getAll();
      setAllBookings(res?.data ?? res ?? []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const computeAllWeekData = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const data = {};
    days.forEach(day => {
      const ds = format(day, 'yyyy-MM-dd');
      data[ds] = {
        bookings: allBookings
          .filter(b => b.day === ds)
          .map(b => ({
            booking_id: b.booking_id,
            client_name: b.user?.name || 'Mehmon',
            time: b.time,
            status: b.status,
            service: b.service,
          })),
      };
    });
    setWeekData(data);
  };

  const computeAllMonthData = () => {
    const month = format(selectedDate, 'yyyy-MM');
    const data = {};
    allBookings
      .filter(b => b.day?.startsWith(month))
      .forEach(b => {
        if (!data[b.day]) data[b.day] = { count: 0, confirmed: 0, revenue: 0 };
        data[b.day].count++;
        if (b.status === 'confirmed') {
          data[b.day].confirmed++;
          data[b.day].revenue += b.service?.price || 0;
        }
      });
    setMonthData(data);
  };

  const fetchShopDayData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/calendar?date=${dateStr}&barbershop_id=${selectedShopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load calendar');
      setCalendarData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopWeekData = async () => {
    setLoading(true);
    setError('');
    try {
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      const results = await Promise.all(
        days.map(day =>
          fetch(`/api/calendar?date=${format(day, 'yyyy-MM-dd')}&barbershop_id=${selectedShopId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.ok ? r.json() : { barbers: [], bookings: [] })
        )
      );
      const data = {};
      days.forEach((day, i) => { data[format(day, 'yyyy-MM-dd')] = results[i]; });
      setWeekData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopMonthData = async () => {
    setLoading(true);
    setError('');
    try {
      const month = format(selectedDate, 'yyyy-MM');
      const res = await fetch(`/api/calendar/month?month=${month}&barbershop_id=${selectedShopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load month data');
      const data = await res.json();
      setMonthData(data.days || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const goBack = () => {
    if (viewMode === 'month') setSelectedDate(d => subMonths(d, 1));
    else if (viewMode === 'week') setSelectedDate(d => subWeeks(d, 1));
    else setSelectedDate(d => subDays(d, 1));
  };

  const goForward = () => {
    if (viewMode === 'month') setSelectedDate(d => addMonths(d, 1));
    else if (viewMode === 'week') setSelectedDate(d => addWeeks(d, 1));
    else setSelectedDate(d => addDays(d, 1));
  };

  const switchViewMode = (mode) => {
    if (mode === viewMode) return;
    setViewTransition(true);
    setTimeout(() => { setViewMode(mode); setViewTransition(false); }, 180);
  };

  const handleDayClick = (day) => {
    setViewTransition(true);
    setTimeout(() => { setSelectedDate(day); setViewMode('day'); setViewTransition(false); }, 180);
  };

  const handleBookingClick = (e, booking) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setDetailModal(true);
  };

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await fetch(`/api/calendar/booking/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setDetailModal(false);
      if (selectedShopId !== 'all') fetchShopDayData();
      else loadAllBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!confirm(t('calendar.deleteBookingConfirm'))) return;
    try {
      await fetch(`/api/calendar/booking/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetailModal(false);
      if (selectedShopId !== 'all') fetchShopDayData();
      else loadAllBookings();
    } catch (err) {
      console.error(err);
    }
  };

  // Day view helpers (specific shop mode)
  const getBookingsForBarber = (barber_id) =>
    calendarData.bookings.filter(b => b.barber_id === barber_id);

  const isSlotOccupied = (barber_id, time) => {
    const slotMin = timeToMinutes(time);
    return calendarData.bookings.some(b => {
      if (b.barber_id !== barber_id) return false;
      const start = timeToMinutes(b.time);
      const end = start + (b.service?.duration || 30);
      return slotMin >= start && slotMin < end;
    });
  };

  // Stats
  const dayBookings = selectedShopId === 'all'
    ? allBookings.filter(b => b.day === dateStr)
    : calendarData.bookings;
  const totalBookings = dayBookings.length;
  const confirmedCount = dayBookings.filter(b => b.status === 'confirmed').length;
  const revenue = dayBookings
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + (b.service?.price || 0), 0);

  const isDateToday = isToday(selectedDate);
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
  const monthLabel = format(selectedDate, 'MMMM yyyy');

  // "All" mode day view: all bookings for the selected date, sorted by time
  const allDayBookings = allBookings
    .filter(b => b.day === dateStr)
    .sort((a, b) => (a.time < b.time ? -1 : 1));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">

          {/* Shop selector */}
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400 shrink-0" />
            <select
              className="input-field text-sm py-1.5 min-w-[180px]"
              value={selectedShopId}
              onChange={e => setSelectedShopId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Barcha barbershoplar</option>
              {shops.map(shop => (
                <option key={shop.barbershop_id ?? shop.id} value={shop.barbershop_id ?? shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={goBack} className="btn-secondary p-2"><ChevronLeft size={18} /></button>
            <div className="text-center flex-1 sm:flex-none sm:min-w-[200px]">
              {viewMode === 'week' ? (
                <div className="font-semibold text-gray-900 dark:text-white text-base">{weekLabel}</div>
              ) : viewMode === 'month' ? (
                <div className="font-semibold text-gray-900 dark:text-white text-lg">{monthLabel}</div>
              ) : (
                <>
                  <div className="font-semibold text-gray-900 dark:text-white text-lg">
                    {format(selectedDate, 'EEEE, MMM d')}
                  </div>
                  <div className="text-xs text-gray-500">{format(selectedDate, 'yyyy')}</div>
                </>
              )}
            </div>
            <button onClick={goForward} className="btn-secondary p-2"><ChevronRight size={18} /></button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`btn-secondary px-3 py-1.5 text-sm ${isDateToday && viewMode === 'day' ? 'ring-2 ring-teal-500' : ''}`}
            >
              {t('calendar.today')}
            </button>
          </div>

          {/* Day stats */}
          {viewMode === 'day' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5">
                <Calendar size={14} className="text-teal-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{totalBookings} {t('calendar.bookingsCount')}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl px-3 py-1.5">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{confirmedCount} {t('calendar.confirmedCount')}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-1.5">
                <Banknote size={14} className="text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-medium text-teal-700 dark:text-teal-400">{formatPrice(revenue)}</span>
              </div>
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {[
              { key: 'day',   label: t('calendar.day')   },
              { key: 'week',  label: t('calendar.week')  },
              { key: 'month', label: t('calendar.month') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchViewMode(key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === key
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────── */}
      <div className="card flex-1 overflow-hidden flex flex-col min-h-[400px]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner size="lg" text={t('calendar.loadingCalendar')} />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500">
            <AlertCircle size={20} className="mr-2" /> {error}
          </div>
        ) : (
          <div
            className="flex flex-col flex-1 overflow-hidden transition-opacity duration-200"
            style={{ opacity: viewTransition ? 0 : 1 }}
          >
            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <MonthView
                selectedDate={selectedDate}
                monthData={monthData}
                onDayClick={handleDayClick}
                t={t}
              />
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
              <WeekView
                weekStart={weekStart}
                weekData={weekData}
                onDayClick={handleDayClick}
                t={t}
              />
            )}

            {/* DAY VIEW — "All barbershops": time-sorted booking list */}
            {viewMode === 'day' && selectedShopId === 'all' && (
              <div className="flex flex-col flex-1 overflow-y-auto">
                {allDayBookings.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 py-20">
                    <Calendar size={48} className="opacity-30" />
                    <p className="text-lg">{t('calendar.noBookings')}</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {allDayBookings.map(booking => {
                      const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
                      const clientName = booking.user?.name || booking.guest_name || 'Mehmon';
                      const clientPhone = booking.user?.phone || booking.guest_phone;
                      return (
                        <div
                          key={booking.booking_id}
                          onClick={(e) => handleBookingClick(e, {
                            ...booking,
                            client_name: clientName,
                            client_phone: clientPhone,
                          })}
                          className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          {/* Time */}
                          <div className="w-12 text-center flex-shrink-0">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{booking.time}</span>
                          </div>

                          {/* Status stripe */}
                          <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${colors.bg}`} />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{clientName}</span>
                              {clientPhone && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <Phone size={10} /> {clientPhone}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {booking.barber?.name && (
                                <span className="font-medium text-gray-600 dark:text-gray-400">{booking.barber.name}</span>
                              )}
                              {booking.service?.name && <span> · {booking.service.name}</span>}
                            </div>
                          </div>

                          {/* Price + status */}
                          <div className="flex-shrink-0 text-right space-y-1">
                            {booking.service?.price > 0 && (
                              <div className="text-sm font-semibold text-teal-600">{formatPrice(booking.service.price)}</div>
                            )}
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white ${colors.bg}`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DAY VIEW — specific shop: per-barber grid */}
            {viewMode === 'day' && selectedShopId !== 'all' && (
              calendarData.barbers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 py-20">
                  <Scissors size={48} className="opacity-30" />
                  <p className="text-lg">{t('calendar.noBarbers')}</p>
                  <p className="text-sm">{t('calendar.noBarbersDesc')}</p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Barber headers */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                    <div
                      style={{ width: TIME_COL_WIDTH, minWidth: TIME_COL_WIDTH }}
                      className="border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    />
                    <div className="flex overflow-x-auto">
                      {calendarData.barbers.map(barber => (
                        <div
                          key={barber.barber_id}
                          style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
                          className="flex items-center gap-2 px-3 py-3 border-r border-gray-200 dark:border-gray-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {barber.image
                              ? <img src={barber.image} alt={barber.name} className="w-full h-full object-cover" />
                              : <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{barber.name[0]}</span>
                            }
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{barber.name}</div>
                            <div className="text-xs text-gray-400">{barber.services?.length || 0} {t('calendar.servicesCount')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable grid */}
                  <div ref={scrollRef} className="flex flex-1 overflow-auto">
                    {/* Time labels */}
                    <div
                      style={{ width: TIME_COL_WIDTH, minWidth: TIME_COL_WIDTH }}
                      className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
                    >
                      {TIME_SLOTS.map(time => (
                        <div
                          key={time}
                          style={{ height: CELL_HEIGHT }}
                          className="flex items-start justify-end pr-3 pt-1 border-b border-gray-100 dark:border-gray-700/50"
                        >
                          <span className="text-xs text-gray-400 font-mono">{time}</span>
                        </div>
                      ))}
                    </div>

                    {/* Barber columns */}
                    <div className="flex flex-1 overflow-x-auto">
                      {calendarData.barbers.map(barber => {
                        const barberBookings = getBookingsForBarber(barber.barber_id);
                        return (
                          <div
                            key={barber.barber_id}
                            style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
                            className="relative border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
                          >
                            {/* Empty slot rows */}
                            {TIME_SLOTS.map((time, idx) => (
                              <div
                                key={time}
                                style={{ height: CELL_HEIGHT }}
                                className={`border-b border-gray-100 dark:border-gray-700/50 ${idx % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''}`}
                              />
                            ))}

                            {/* Booking cards */}
                            {barberBookings.map(booking => {
                              const startMin = timeToMinutes(booking.time) - TIME_START * 60;
                              const duration = booking.service?.duration || 30;
                              const top = (startMin / 30) * CELL_HEIGHT;
                              const height = Math.max((duration / 30) * CELL_HEIGHT - 2, 28);
                              const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
                              return (
                                <div
                                  key={booking.booking_id}
                                  style={{ top, height, left: 3, right: 3, position: 'absolute' }}
                                  onClick={(e) => handleBookingClick(e, booking)}
                                  className={`${colors.bg} ${colors.border} border rounded-lg shadow-sm cursor-pointer overflow-hidden z-10 hover:brightness-95 transition-all`}
                                >
                                  <div className="px-2 py-1 h-full flex flex-col justify-start gap-0.5">
                                    <div className="flex items-center gap-1">
                                      {booking.is_walk_in && <UserPlus size={10} className="text-white/80 flex-shrink-0" />}
                                      <span className="text-white text-xs font-semibold truncate leading-tight">{booking.client_name}</span>
                                    </div>
                                    {height > 36 && (
                                      <span className="text-white/80 text-xs truncate leading-tight">{booking.service?.name}</span>
                                    )}
                                    {height > 52 && (
                                      <div className="flex items-center gap-1 text-white/70 text-xs">
                                        <Clock size={9} /> {booking.time} · {duration}{t('calendar.min')}
                                      </div>
                                    )}
                                    {height > 68 && (
                                      <div className="flex items-center gap-1 text-white/70 text-xs">
                                        {PAYMENT_ICONS[booking.payment_method]}
                                        {formatPrice(booking.service?.price || 0)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Current time indicator */}
                            {isDateToday && (() => {
                              const now = new Date();
                              const nowMin = now.getHours() * 60 + now.getMinutes();
                              if (nowMin < TIME_START * 60 || nowMin > TIME_END * 60) return null;
                              const top = ((nowMin - TIME_START * 60) / 30) * CELL_HEIGHT;
                              return (
                                <div
                                  style={{ top, left: 0, right: 0, position: 'absolute' }}
                                  className="h-0.5 bg-red-500 z-20 pointer-events-none"
                                >
                                  <div className="w-2 h-2 rounded-full bg-red-500 -mt-0.75 -ml-1" />
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Booking detail modal ──────────────────────────────────────── */}
      {selectedBooking && (
        <Modal
          isOpen={detailModal}
          onClose={() => setDetailModal(false)}
          title={t('calendar.bookingDetails')}
          size="sm"
        >
          <div className="space-y-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white ${
              STATUS_COLORS[selectedBooking.status]?.bg || 'bg-gray-500'
            }`}>
              <span className="capitalize">{selectedBooking.status}</span>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <User size={18} className="text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedBooking.client_name || selectedBooking.user?.name || 'Mehmon'}
                </div>
                {(selectedBooking.client_phone || selectedBooking.user?.phone) && (
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone size={12} /> {selectedBooking.client_phone || selectedBooking.user?.phone}
                  </div>
                )}
                {selectedBooking.is_walk_in && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                    <UserPlus size={10} /> {t('calendar.walkInLabel')}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {selectedBooking.barber?.name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('common.barber')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{selectedBooking.barber.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{t('common.service')}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{selectedBooking.service?.name || '—'}</span>
              </div>
              {selectedBooking.service?.duration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('calendar.duration')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{selectedBooking.service.duration} {t('calendar.min')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{t('common.time')}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{selectedBooking.day} · {selectedBooking.time}</span>
              </div>
              {selectedBooking.service?.price > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('common.price')}</span>
                  <span className="font-semibold text-teal-600">{formatPrice(selectedBooking.service.price)}</span>
                </div>
              )}
              {selectedBooking.payment_method && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('calendar.payment')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    {PAYMENT_ICONS[selectedBooking.payment_method]}
                    <span className="capitalize">{selectedBooking.payment_method}</span>
                  </span>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">{t('common.notes')}: </span>
                  <span className="text-gray-700 dark:text-gray-300">{selectedBooking.notes}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-700">
              {selectedBooking.status !== 'confirmed' && (
                <button
                  onClick={() => handleStatusUpdate(selectedBooking.booking_id, 'confirmed')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <CheckCircle size={14} /> {t('common.confirm')}
                </button>
              )}
              {selectedBooking.status !== 'cancelled' && (
                <button
                  onClick={() => handleStatusUpdate(selectedBooking.booking_id, 'cancelled')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors border border-red-200 dark:border-red-700"
                >
                  <XCircle size={14} /> {t('common.cancel')}
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedBooking.booking_id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm transition-colors"
              >
                <Trash2 size={14} /> {t('common.delete')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

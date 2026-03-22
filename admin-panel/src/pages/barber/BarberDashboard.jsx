import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { barbersAPI, bookingsAPI } from '../../services/api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Calendar, DollarSign, Clock, TrendingUp, Star, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const BarberDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user.barber_id) {
      setLoading(false);
      return;
    }
    try {
      const [barberRes, bookingsRes] = await Promise.all([
        barbersAPI.getById(user.barber_id),
        bookingsAPI.getAll(),
      ]);
      setBarber(barberRes.data);
      const list = bookingsRes.data?.data ?? bookingsRes.data ?? [];
      setBookings(list.filter(b => b.barber?.barber_id === user.barber_id));
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId, status) => {
    setActionLoading(bookingId);
    try {
      await bookingsAPI.update(bookingId, { status });
      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status } : b
      ));
    } catch (err) {
      console.error('Failed to update booking:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text={t('dashboard.loading')} />;

  if (!user.barber_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Star className="w-8 h-8 text-primary-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('dashboard.noProfileTitle') || 'Set up your barber profile'}</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">{t('dashboard.noProfileDesc') || 'You haven\'t created a barber profile yet. Go to Profile to get started.'}</p>
        </div>
      </div>
    );
  }

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const pending = bookings.filter(b => b.status === 'pending');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const totalRevenue = confirmed.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.day === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const upcomingBookings = bookings
    .filter(b => b.day >= today && b.status !== 'cancelled')
    .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time))
    .slice(0, 10);

  const statusData = [
    { name: t('bookings.status.confirmed'), value: confirmed.length, color: '#10b981' },
    { name: t('bookings.status.pending'), value: pending.length, color: '#f59e0b' },
    { name: t('bookings.status.cancelled'), value: cancelled.length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('dashboard.welcome')}, {user.name}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">{t('dashboard.scheduleSubtitle')}</p>
        </div>
        {barber?.rating > 0 && (
          <div className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-bold text-amber-600">{barber.rating}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {label: t('dashboard.totalBookings'), desc: t('dashboard.scheduleSubtitle'), value: bookings.length, Icon: Calendar},
          {label: t('dashboard.totalRevenue'), desc: t('bookings.status.confirmed'), value: formatPrice(totalRevenue), Icon: DollarSign},
          {label: t('bookings.status.pending'), desc: t('schedule.loading'), value: pending.length, Icon: Clock},
          {label: t('dashboard.todayBookings'), desc: today, value: todayBookings.length, Icon: TrendingUp},
        ].map(({label, desc, value, Icon}) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Icon size={18}/>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">{desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <Calendar size={13} className="text-teal-600 dark:text-teal-400"/>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.todaysSchedule')}</h3>
            </div>
            <span className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">{today}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-900">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.time')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.customer')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.service')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.price')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {todayBookings.length > 0 ? todayBookings.map((b) => (
                  <tr key={b.booking_id} className="hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-gray-100">{b.time}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{b.user?.name}</p>
                      <p className="text-xs text-gray-400">{b.user?.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      {b.service?.name}
                      <span className="text-xs text-gray-400 ml-1">({b.service?.duration}min)</span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">{formatPrice(b.service?.price || 0)}</td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4">
                      {b.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleBookingAction(b.booking_id, 'confirmed')}
                            disabled={actionLoading === b.booking_id}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-100"
                            title={t('bookings.status.confirmed')}
                          >
                            {actionLoading === b.booking_id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleBookingAction(b.booking_id, 'cancelled')}
                            disabled={actionLoading === b.booking_id}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                            title={t('bookings.status.cancelled')}
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                      {t('dashboard.noBookingsToday')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <TrendingUp size={13} className="text-amber-500"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.overallStatus')}</h3>
          </div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">{t('dashboard.noBookings')}</div>
          )}

          {/* Quick services */}
          {barber?.services?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-50 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('nav.services')}</p>
              <div>
                {barber.services.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{s.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(s.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <Clock size={13} className="text-teal-600 dark:text-teal-400"/>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.upcomingBookings')}</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-900">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.time')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.customer')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.service')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {upcomingBookings.map((b) => (
                  <tr key={b.booking_id} className="hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">{b.day}</td>
                    <td className="px-5 py-4 font-mono text-gray-700 dark:text-gray-300">{b.time}</td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{b.user?.name}</td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{b.service?.name}</td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4">
                      {b.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleBookingAction(b.booking_id, 'confirmed')}
                            disabled={actionLoading === b.booking_id}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-100"
                            title={t('bookings.status.confirmed')}
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => handleBookingAction(b.booking_id, 'cancelled')}
                            disabled={actionLoading === b.booking_id}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                            title={t('bookings.status.cancelled')}
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;

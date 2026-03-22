import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { barbershopsAPI, bookingsAPI } from '../../services/api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Users, Calendar, DollarSign, Clock, TrendingUp, MapPin, Star, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [shopRes, bookingsRes] = await Promise.all([
          barbershopsAPI.getById(user.barbershop_id),
          bookingsAPI.getAll(),
        ]);
        setShop(shopRes.data);
        const myBarberIds = shopRes.data.barbers || [];
        const list = bookingsRes.data?.data ?? bookingsRes.data ?? [];
        setBookings(list.filter(b => myBarberIds.includes(b.barber?.barber_id)));
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.barbershop_id]);

  if (loading) return <LoadingSpinner size="lg" text={t('dashboard.loading')} />;

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const pending = bookings.filter(b => b.status === 'pending');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const totalRevenue = confirmed.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.day === today);

  const barberData = {};
  bookings.forEach(b => {
    const name = b.barber?.name || 'Unknown';
    if (!barberData[name]) barberData[name] = { name, bookings: 0, revenue: 0 };
    barberData[name].bookings++;
    if (b.status === 'confirmed') barberData[name].revenue += b.service?.price || 0;
  });
  const barberChart = Object.values(barberData).sort((a, b) => b.revenue - a.revenue);

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
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('dashboard.welcome')}, {user.name}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            {shop?.name || t('nav.barbershop')} — {t('dashboard.overview')}
          </p>
        </div>
        {shop && (
          <div className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-lg text-amber-600">{shop.rating || 0}</span>
          </div>
        )}
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t('dashboard.totalBookings'), desc: t('dashboard.overview'), value: bookings.length, Icon: Calendar },
          { label: t('dashboard.totalRevenue'), desc: t('bookings.status.confirmed'), value: formatPrice(totalRevenue), Icon: DollarSign },
          { label: t('dashboard.activeBarbers'), desc: t('nav.barbershop'), value: shop?.barbers?.length || 0, Icon: Users },
          { label: t('nav.locations'), desc: t('nav.barbershop'), value: shop?.locations?.length || 0, Icon: MapPin },
        ].map(({ label, desc, value, Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Icon size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">{desc}</div>
          </div>
        ))}
      </div>

      {/* Secondary Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{t('bookings.status.pending')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pending.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{t('bookings.status.confirmed')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{confirmed.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{t('dashboard.todayBookings')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayBookings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <BarChart2 size={14} className="text-teal-600" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.revenueByBarber')}</h3>
          </div>
          {barberChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barberChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => (v / 1000) + 'K'} />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">{t('common.noData')}</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <TrendingUp size={14} className="text-teal-600" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.bookingStatus')}</h3>
          </div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600 dark:text-gray-400">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">{t('dashboard.noBookings')}</div>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Calendar size={14} className="text-teal-600" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.todaysSchedule')}</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-900">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.time')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.barber')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.service')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {todayBookings.length > 0 ? todayBookings
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                .map((b, i) => (
                  <tr key={i} className="hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-gray-100">{b.time}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{b.user?.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{b.barber?.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{b.service?.name}</td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                  </tr>
                )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">{t('dashboard.noBookingsToday')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;

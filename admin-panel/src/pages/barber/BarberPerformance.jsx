import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { barbersAPI, bookingsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { DollarSign, Calendar, TrendingUp, Star, Clock, AlertTriangle, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const BarberPerformance = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!user.barber_id) { setLoading(false); return; }
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
    load();
  }, [user.barber_id]);

  if (loading) return <LoadingSpinner size="lg" text={t('performance.loading')} />;

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const pending = bookings.filter(b => b.status === 'pending');
  const totalRevenue = confirmed.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const avgBookingValue = confirmed.length > 0 ? Math.round(totalRevenue / confirmed.length) : 0;
  const cancellationRate = bookings.length > 0 ? ((cancelled.length / bookings.length) * 100).toFixed(1) : 0;
  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';

  const revenueByDate = {};
  confirmed.forEach(b => {
    if (!revenueByDate[b.day]) revenueByDate[b.day] = 0;
    revenueByDate[b.day] += b.service?.price || 0;
  });
  const revenueChart = Object.entries(revenueByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, revenue]) => ({ date, revenue }));

  const bookingsByDate = {};
  bookings.forEach(b => {
    if (!bookingsByDate[b.day]) bookingsByDate[b.day] = { date: b.day, total: 0, confirmed: 0 };
    bookingsByDate[b.day].total++;
    if (b.status === 'confirmed') bookingsByDate[b.day].confirmed++;
  });
  const trendData = Object.values(bookingsByDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const serviceStats = {};
  bookings.forEach(b => {
    const name = b.service?.name;
    if (!name) return;
    if (!serviceStats[name]) serviceStats[name] = { name, count: 0, revenue: 0 };
    serviceStats[name].count++;
    if (b.status === 'confirmed') serviceStats[name].revenue += b.service?.price || 0;
  });
  const popularServices = Object.values(serviceStats).sort((a, b) => b.count - a.count);

  const statusData = [
    { name: t('bookings.status.confirmed'), value: confirmed.length, color: '#10b981' },
    { name: t('bookings.status.pending'),   value: pending.length,   color: '#f59e0b' },
    { name: t('bookings.status.cancelled'), value: cancelled.length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const hourStats = {};
  bookings.forEach(b => {
    const hour = b.time?.split(':')[0];
    if (!hour) return;
    if (!hourStats[hour]) hourStats[hour] = 0;
    hourStats[hour]++;
  });
  const hourChart = Object.entries(hourStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Performance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('nav.performance')}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">{t('performance.subtitle')}</p>
        </div>
        {barber?.rating > 0 && (
          <div className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-bold text-amber-600">{barber.rating}</span>
            <span className="text-sm text-amber-500 ml-0.5">{t('performance.rating')}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {label: t('dashboard.totalRevenue'), desc: t('bookings.status.confirmed'), value: formatPrice(totalRevenue), Icon: DollarSign},
          {label: t('dashboard.totalBookings'), desc: t('performance.subtitle'), value: bookings.length, Icon: Calendar},
          {label: t('finance.avgBookingValue'), desc: t('bookings.status.confirmed'), value: formatPrice(avgBookingValue), Icon: Target},
          {label: t('admin.cancellationRate'), desc: parseFloat(cancellationRate) > 20 ? 'High — needs attention' : 'Healthy rate', value: cancellationRate + '%', Icon: AlertTriangle},
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

      {/* Revenue over time */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
            <TrendingUp size={13} className="text-teal-600 dark:text-teal-400"/>
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('performance.revenueOverTime')}</h3>
        </div>
        {revenueChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="barberRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => (v / 1000) + 'K'} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatPrice(value)} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#barberRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-300 text-sm">{t('performance.noRevenueData')}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking trends */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Calendar size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('admin.bookingTrends')}</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total"     stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name={t('common.total')} />
                <Line type="monotone" dataKey="confirmed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name={t('bookings.status.confirmed')} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">{t('common.noData')}</div>
          )}
        </div>

        {/* Status pie */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock size={13} className="text-amber-500"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('dashboard.bookingStatus')}</h3>
          </div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">{t('common.noData')}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak hours */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Clock size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('performance.busiestHours')}</h3>
          </div>
          {hourChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name={t('nav.bookings')} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">{t('common.noData')}</div>
          )}
        </div>

        {/* Service popularity */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Target size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('performance.servicePerformance')}</h3>
          </div>
          {popularServices.length > 0 ? (
            <div className="space-y-4">
              {popularServices.map((service, i) => {
                const maxCount = popularServices[0]?.count || 1;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{service.name}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{service.count} {t('performance.nBookings')}</span>
                        <span className="text-xs text-gray-400 ml-2">{formatPrice(service.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(service.count / maxCount) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">{t('common.noData')}</div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
            <TrendingUp size={13} className="text-teal-600 dark:text-teal-400"/>
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('performance.summary')}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-center">
            <p className="text-2xl font-bold text-emerald-600" >{confirmed.length}</p>
            <p className="text-xs text-emerald-500 font-semibold mt-1">{t('bookings.status.confirmed')}</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-center">
            <p className="text-2xl font-bold text-amber-500" >{pending.length}</p>
            <p className="text-xs text-amber-400 font-semibold mt-1">{t('bookings.status.pending')}</p>
          </div>
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-center">
            <p className="text-2xl font-bold text-red-500" >{cancelled.length}</p>
            <p className="text-xs text-red-400 font-semibold mt-1">{t('bookings.status.cancelled')}</p>
          </div>
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 text-center">
            <p className="text-2xl font-bold text-teal-600">{barber?.services?.length || 0}</p>
            <p className="text-xs text-teal-500 font-semibold mt-1">{t('services.count')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberPerformance;

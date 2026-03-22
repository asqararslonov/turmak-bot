import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { barbershopsAPI, bookingsAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { DollarSign, Calendar, TrendingUp, Users, Star, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const OwnerStats = () => {
  const { user } = useAuth();
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

  if (loading) return <LoadingSpinner size="lg" text="Loading statistics..." />;

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const pending = bookings.filter(b => b.status === 'pending');
  const totalRevenue = confirmed.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const cancellationRate = bookings.length > 0 ? ((cancelled.length / bookings.length) * 100).toFixed(1) : 0;
  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';

  // Revenue by date
  const revenueByDate = {};
  confirmed.forEach(b => {
    if (!revenueByDate[b.day]) revenueByDate[b.day] = 0;
    revenueByDate[b.day] += b.service?.price || 0;
  });
  const revenueChart = Object.entries(revenueByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, revenue]) => ({ date, revenue }));

  // Bookings per barber
  const barberStats = {};
  bookings.forEach(b => {
    const name = b.barber?.name || 'Unknown';
    if (!barberStats[name]) barberStats[name] = { name, total: 0, confirmed: 0, cancelled: 0, revenue: 0 };
    barberStats[name].total++;
    if (b.status === 'confirmed') {
      barberStats[name].confirmed++;
      barberStats[name].revenue += b.service?.price || 0;
    }
    if (b.status === 'cancelled') barberStats[name].cancelled++;
  });
  const barberChart = Object.values(barberStats).sort((a, b) => b.revenue - a.revenue);

  // Service popularity
  const serviceStats = {};
  bookings.forEach(b => {
    const name = b.service?.name;
    if (!name) return;
    if (!serviceStats[name]) serviceStats[name] = { name, count: 0, revenue: 0 };
    serviceStats[name].count++;
    if (b.status === 'confirmed') serviceStats[name].revenue += b.service?.price || 0;
  });
  const popularServices = Object.values(serviceStats).sort((a, b) => b.count - a.count).slice(0, 6);

  // Bookings by status
  const statusData = [
    { name: 'Confirmed', value: confirmed.length, color: '#10b981' },
    { name: 'Pending', value: pending.length, color: '#f59e0b' },
    { name: 'Cancelled', value: cancelled.length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Bookings trend by date
  const bookingsByDate = {};
  bookings.forEach(b => {
    if (!bookingsByDate[b.day]) bookingsByDate[b.day] = { date: b.day, total: 0, confirmed: 0 };
    bookingsByDate[b.day].total++;
    if (b.status === 'confirmed') bookingsByDate[b.day].confirmed++;
  });
  const trendData = Object.values(bookingsByDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Statistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            Statistics
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">{shop?.name || 'Barbershop'} performance overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label:'Total Revenue',      desc:'From confirmed bookings', value: formatPrice(totalRevenue), Icon: DollarSign },
          { label:'Total Bookings',     desc:'All time bookings',       value: bookings.length,           Icon: Calendar  },
          { label:'Confirmed',          desc:'Successfully completed',  value: confirmed.length,          Icon: TrendingUp },
          { label:'Cancellation Rate',  desc: parseFloat(cancellationRate) > 20 ? 'High — needs attention' : 'Healthy rate', value: cancellationRate + '%', Icon: AlertTriangle },
        ].map(({ label, desc, value, Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <Icon size={18} className="text-teal-600 dark:text-teal-400"/>
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
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Revenue Over Time</h3>
        </div>
        {revenueChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="ownerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => (v / 1000) + 'K'} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatPrice(value)} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#ownerRevenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-300 text-sm">No revenue data yet</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking trends */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Calendar size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Booking Trends</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Total" />
                <Line type="monotone" dataKey="confirmed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Confirmed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Star size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Booking Status</h3>
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
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by barber */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Users size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Revenue by Barber</h3>
          </div>
          {barberChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barberChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => (v / 1000) + 'K'} />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>

        {/* Popular services */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Star size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Popular Services</h3>
          </div>
          {popularServices.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={popularServices}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {popularServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Barber performance table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Users size={13} className="text-teal-600 dark:text-teal-400"/>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Barber Performance</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-800">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Barber</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bookings</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confirmed</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cancelled</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cancel Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {barberChart.map((barber, i) => (
                <tr key={i} className="hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-gray-100">{barber.name}</td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{barber.total}</td>
                  <td className="px-5 py-4 text-emerald-600 font-semibold">{barber.confirmed}</td>
                  <td className="px-5 py-4 text-red-500">{barber.cancelled}</td>
                  <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">{formatPrice(barber.revenue)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-semibold ${
                      barber.total > 0 && (barber.cancelled / barber.total) > 0.2 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {barber.total > 0 ? ((barber.cancelled / barber.total) * 100).toFixed(1) + '%' : '0%'}
                    </span>
                  </td>
                </tr>
              ))}
              {barberChart.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-300 text-sm">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerStats;

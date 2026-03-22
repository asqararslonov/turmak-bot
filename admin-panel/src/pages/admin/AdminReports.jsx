import { useState, useEffect } from 'react';
import { barbershopsAPI, barbersAPI, bookingsAPI, usersAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Users, Download, Star, AlertTriangle } from 'lucide-react';

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ barbershops: [], barbers: [], bookings: [], users: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const [barbershops, barbers, bookings, users] = await Promise.all([
          barbershopsAPI.getAll(),
          barbersAPI.getAll(),
          bookingsAPI.getAll(),
          usersAPI.getAll(),
        ]);
        setData({
          barbershops: barbershops.data?.data ?? barbershops.data ?? [],
          barbers:     barbers.data?.data     ?? barbers.data     ?? [],
          bookings:    bookings.data?.data     ?? bookings.data    ?? [],
          users:       users.data?.data        ?? users.data       ?? [],
        });
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Generating reports..." />;

  const { barbershops, barbers, bookings, users } = data;
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmed.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' UZS';

  // Revenue by date
  const revenueByDate = {};
  confirmed.forEach(b => {
    if (!revenueByDate[b.day]) revenueByDate[b.day] = 0;
    revenueByDate[b.day] += b.service?.price || 0;
  });
  const revenueChart = Object.entries(revenueByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, revenue]) => ({ date, revenue }));

  // Top barbers by revenue
  const barberStats = {};
  bookings.forEach(b => {
    const id = b.barber?.barber_id;
    if (!id) return;
    if (!barberStats[id]) barberStats[id] = { name: b.barber.name, bookings: 0, revenue: 0, cancelled: 0 };
    barberStats[id].bookings++;
    if (b.status === 'confirmed') barberStats[id].revenue += b.service?.price || 0;
    if (b.status === 'cancelled') barberStats[id].cancelled++;
  });
  const topBarbers = Object.values(barberStats).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

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

  // Bookings per day-of-week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const bookingsByDow = dayNames.map(day => ({ day, count: 0 }));
  bookings.forEach(b => {
    const dow = new Date(b.day).getDay();
    if (bookingsByDow[dow]) bookingsByDow[dow].count++;
  });

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comprehensive platform performance overview</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Booking Value</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {confirmed.length > 0 ? formatPrice(Math.round(totalRevenue / confirmed.length)) : '0 UZS'}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {bookings.length > 0 ? ((confirmed.length / bookings.length) * 100).toFixed(1) + '%' : '0%'}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {barbershops.length > 0
                  ? (barbershops.reduce((s, b) => s + (b.rating || 0), 0) / barbershops.length).toFixed(1)
                  : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Over Time</h3>
        {revenueChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (v / 1000) + 'K'} />
              <Tooltip formatter={(value) => formatPrice(value)} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400">No revenue data</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top barbers */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Barbers by Revenue</h3>
          {topBarbers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBarbers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tickFormatter={(v) => (v / 1000) + 'K'} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Bar dataKey="revenue" fill="#b8912e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No barber data</div>
          )}
        </div>

        {/* Popular services */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Most Popular Services</h3>
          {popularServices.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={popularServices} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {popularServices.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No service data</div>
          )}
        </div>
      </div>

      {/* Bookings by day of week */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bookings by Day of Week</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={bookingsByDow}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Bookings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top performers table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Barber Performance Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Barber</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cancelled</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cancel Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {topBarbers.map((barber, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{barber.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{barber.bookings}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(barber.revenue)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{barber.cancelled}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      barber.bookings > 0 && (barber.cancelled / barber.bookings) > 0.2 ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {barber.bookings > 0 ? ((barber.cancelled / barber.bookings) * 100).toFixed(1) + '%' : '0%'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;

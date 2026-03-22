import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { barbershopsAPI, barbersAPI, usersAPI, bookingsAPI, locationsAPI, surveyAPI } from '../../services/api';
import StatsCard    from '../../components/UI/StatsCard';
import DataTable    from '../../components/UI/DataTable';
import StatusBadge  from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  Store, Scissors, Users, Calendar,
  DollarSign, MapPin, Clock, TrendingUp,
  Eye, XCircle, RefreshCw, UserPlus, Phone, Send,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #f1f5f9',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 13,
};

const fmt = (price) => new Intl.NumberFormat('uz-UZ').format(price) + ' UZS';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const buildSparkline = (valueByDay) => {
  return Array.from({ length: 7 }, (_, i) => valueByDay[daysAgo(6 - i)] ?? 0);
};

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-soft-md text-xs">
      {label && <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-700 dark:text-gray-200">
            {p.name}: <strong>{formatter ? formatter(p.value) : p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
const ROLE_LABELS = {
  barber:            'Sartarosh',
  barbershop_owner:  'Salon egasi',
  curious:           'Qiziquvchi',
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    barbershops: [], barbers: [], users: [], bookings: [], locations: [],
  });
  const [waitlist, setWaitlist] = useState([]);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const [barbershops, barbers, users, bookings, locations, survey] = await Promise.all([
          barbershopsAPI.getAll(),
          barbersAPI.getAll(),
          usersAPI.getAll(),
          bookingsAPI.getAll(),
          locationsAPI.getAll(),
          surveyAPI.getAll(),
        ]);
        setData({
          barbershops: barbershops.data?.data ?? barbershops.data ?? [],
          barbers:     barbers.data?.data     ?? barbers.data     ?? [],
          users:       users.data?.data        ?? users.data       ?? [],
          bookings:    bookings.data?.data     ?? bookings.data    ?? [],
          locations:   locations.data?.data    ?? locations.data   ?? [],
        });
        setWaitlist(survey.data?.data || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddToSystem = async (entry) => {
    const id = entry._id;
    setAddingId(id);
    try {
      const role = entry.role === 'barber' ? 'barber'
                 : entry.role === 'barbershop_owner' ? 'barbershop_owner'
                 : 'user';
      await usersAPI.create({
        name:  entry.contact?.name  || 'Nomsiz',
        phone: entry.contact?.phone || '',
        role,
      });
      setAddedIds(prev => new Set([...prev, id]));
    } catch (err) {
      alert(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text={t('dashboard.loading')} />;

  const { barbershops, barbers, users, bookings, locations } = data;

  /* ── Derived metrics ──────────────────────────────────────── */
  const confirmed    = bookings.filter(b => b.status === 'confirmed');
  const pending      = bookings.filter(b => b.status === 'pending');
  const cancelled    = bookings.filter(b => b.status === 'cancelled');
  const totalRevenue = confirmed.reduce((s, b) => s + (b.service?.price || 0), 0);
  const cancelRate   = bookings.length ? ((cancelled.length / bookings.length) * 100).toFixed(1) : 0;

  /* ── Sparklines (last 7 days) ─────────────────────────────── */
  const bookingsByDay = {};
  const revenueByDay  = {};
  bookings.forEach(b => {
    bookingsByDay[b.day] = (bookingsByDay[b.day] ?? 0) + 1;
    if (b.status === 'confirmed') {
      revenueByDay[b.day] = (revenueByDay[b.day] ?? 0) + (b.service?.price || 0);
    }
  });
  const bookingSparkline = buildSparkline(bookingsByDay);
  const revenueSparkline = buildSparkline(revenueByDay);

  /* ── Trend % (last 7 vs previous 7 days) ─────────────────── */
  const calcTrend = (byDay) => {
    const recent = Array.from({ length: 7 }, (_, i) => byDay[daysAgo(i)]     ?? 0).reduce((a, b) => a + b, 0);
    const prior  = Array.from({ length: 7 }, (_, i) => byDay[daysAgo(7 + i)] ?? 0).reduce((a, b) => a + b, 0);
    if (prior === 0) return null;
    const pct = (((recent - prior) / prior) * 100).toFixed(1);
    return { dir: parseFloat(pct) >= 0 ? 'up' : 'down', label: `${pct > 0 ? '+' : ''}${pct}%` };
  };
  const bookingTrend = calcTrend(bookingsByDay);
  const revenueTrend = calcTrend(revenueByDay);

  /* ── Booking trend line chart (last 14 days) ──────────────── */
  const trendData = Object.values(
    bookings.reduce((acc, b) => {
      if (!acc[b.day]) acc[b.day] = { date: b.day, total: 0, confirmed: 0, revenue: 0 };
      acc[b.day].total++;
      if (b.status === 'confirmed') {
        acc[b.day].confirmed++;
        acc[b.day].revenue += b.service?.price || 0;
      }
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  /* ── Pie: booking status ──────────────────────────────────── */
  const statusData = [
    { name: t('bookings.status.confirmed'), value: confirmed.length, color: '#10b981' },
    { name: t('bookings.status.pending'),   value: pending.length,   color: '#f59e0b' },
    { name: t('bookings.status.cancelled'), value: cancelled.length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  /* ── Bar: top 5 barbershops by revenue ───────────────────── */
  const shopStats = barbershops
    .map(shop => {
      const sb = bookings.filter(b => shop.barbers?.includes(b.barber?.barber_id));
      return {
        name:     shop.name,
        revenue:  sb.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.service?.price || 0), 0),
        bookings: sb.length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  /* ── Pie: user roles ─────────────────────────────────────── */
  const userRoles = [
    { name: t('admin.roleCustomers'), value: users.filter(u => u.role === 'user').length,              color: '#4f46e5' },
    { name: t('admin.roleBarbers'),   value: users.filter(u => u.role === 'barber').length,            color: '#f97316' },
    { name: t('admin.roleOwners'),    value: users.filter(u => u.role === 'barbershop_owner').length,  color: '#f59e0b' },
    { name: t('admin.roleAdmins'),    value: users.filter(u => u.role === 'admin').length,             color: '#ef4444' },
  ].filter(d => d.value > 0);

  /* ── DataTable config ────────────────────────────────────── */
  const bookingColumns = [
    {
      key: 'customer', header: t('common.customer'), sortable: true,
      accessor: r => r.user?.name || 'Unknown',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
            {(row.user?.name?.[0] || 'U')}
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{row.user?.name || 'Unknown'}</span>
        </div>
      ),
    },
    { key: 'barber',   header: t('common.barber'),   accessor: r => r.barber?.name   || 'Unknown' },
    { key: 'service',  header: t('common.service'),  accessor: r => r.service?.name  || '—' },
    { key: 'datetime', header: t('common.date'),     accessor: r => `${r.day} ${r.time}` },
    {
      key: 'price', header: t('common.price'), sortable: true,
      accessor: r => r.service?.price || 0,
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">{fmt(row.service?.price || 0)}</span>
      ),
    },
    {
      key: 'status', header: t('common.status'),
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const bookingFilters = [
    {
      key: 'status', label: t('common.status'),
      options: [
        { label: t('bookings.status.confirmed'), value: 'confirmed' },
        { label: t('bookings.status.pending'),   value: 'pending'   },
        { label: t('bookings.status.cancelled'), value: 'cancelled' },
      ],
    },
  ];

  const bookingActions = [
    { label: t('admin.viewDetails'), icon: Eye,      onClick: (row) => console.log('view',   row) },
    { label: t('common.cancel'),     icon: XCircle,  onClick: (row) => console.log('cancel', row), variant: 'danger' },
  ];

  const bookingBulk = [
    { label: t('admin.exportSelected'), onClick: (rows) => console.log('export', rows) },
    { label: t('admin.cancelSelected'), onClick: (rows) => console.log('bulk-cancel', rows), variant: 'danger' },
  ];

  const recentBookings = [...bookings]
    .sort((a, b) => (b.day + b.time).localeCompare(a.day + a.time));

  /* ── Empty chart placeholder (uses t from outer scope) ────── */
  const EmptyChart = () => (
    <div className="flex flex-col items-center justify-center h-[220px] gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <TrendingUp className="w-5 h-5 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.noData')}</p>
    </div>
  );

  /* ═════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.platformOverview')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.platformSnapshotDesc')}
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          {t('common.refresh')}
        </button>
      </div>

      {/* ── KPI cards (4 primary with sparklines) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('dashboard.totalBookings')}
          value={bookings.length}
          icon={Calendar}
          color="primary"
          trend={bookingTrend?.dir}
          trendValue={bookingTrend?.label}
          subtitle={t('admin.allTime')}
          sparkline={bookingSparkline}
        />
        <StatsCard
          title={t('dashboard.totalRevenue')}
          value={fmt(totalRevenue)}
          icon={DollarSign}
          color="green"
          trend={revenueTrend?.dir}
          trendValue={revenueTrend?.label}
          subtitle={t('admin.confirmedOnly')}
          sparkline={revenueSparkline}
        />
        <StatsCard
          title={t('admin.barbershops')}
          value={barbershops.length}
          icon={Store}
          color="orange"
          subtitle={t('admin.registeredVenues')}
          sparkline={Array(7).fill(barbershops.length)}
        />
        <StatsCard
          title={t('admin.registeredUsers')}
          value={users.length}
          icon={Users}
          color="blue"
          subtitle={t('admin.allRoles')}
          sparkline={Array(7).fill(users.length)}
        />
      </div>

      {/* ── Secondary metric tiles ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('admin.activeBarbers'),   value: barbers.length,    icon: Scissors, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300' },
          { label: t('admin.locations'),       value: locations.length,  icon: MapPin,   color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400' },
          { label: t('bookings.status.pending'), value: pending.length,  icon: Clock,    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
          {
            label: t('admin.cancellationRate'),
            value: cancelRate + '%',
            icon: TrendingUp,
            color: parseFloat(cancelRate) > 20
              ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row 1 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking trend line */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('admin.bookingTrends')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('admin.bookingTrendsDesc')}</p>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(v) => <span className="text-gray-600 dark:text-gray-300">{v}</span>}
                />
                <Line type="monotone" dataKey="total"     stroke="#4f46e5" strokeWidth={2.5} dot={false} name={t('common.total')}                  activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="confirmed" stroke="#10b981" strokeWidth={2.5} dot={false} name={t('bookings.status.confirmed')} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Booking status donut */}
        <div className="card p-6 flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('dashboard.bookingStatus')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('admin.bookingStatusDesc')}</p>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={4} dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v, n) => [`${v} ${t('nav.bookings').toLowerCase()}`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-auto pt-3 flex flex-col gap-2">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 dark:text-gray-300">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* ── Charts row 2 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top barbershops */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('admin.topBarbershops')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('admin.topBarbershopsDesc')}</p>
          {shopStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={shopStats} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [fmt(v), t('admin.revenue')]}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* User distribution */}
        <div className="card p-6 flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('admin.userDistribution')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('admin.userDistributionDesc')}</p>
          {userRoles.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={userRoles}
                    cx="50%" cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {userRoles.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-auto pt-3 flex flex-col gap-2">
                {userRoles.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 dark:text-gray-300">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* ── Recent bookings DataTable ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('dashboard.recentBookings')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('admin.recentBookingsDesc')}</p>
          </div>
        </div>
        <DataTable
          columns={bookingColumns}
          data={recentBookings}
          searchKeys={['user.name', 'barber.name', 'service.name', 'day', 'status']}
          filters={bookingFilters}
          actions={bookingActions}
          bulkActions={bookingBulk}
          selectable
          pageSize={8}
          emptyMessage={t('dashboard.noBookings')}
        />
      </div>

      {/* ── Waitlist ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              Kutish ro'yxati
              {waitlist.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                  {waitlist.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Turmak.uz orqali ro'yxatdan o'tishni so'raganlar
            </p>
          </div>
        </div>

        {waitlist.length === 0 ? (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Kutish ro'yxati bo'sh</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ism</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefon</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telegram</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rol</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sana</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {waitlist.map((entry) => {
                    const isAdded   = addedIds.has(entry._id);
                    const isLoading = addingId === entry._id;
                    const roleLabel = ROLE_LABELS[entry.role] || entry.role;
                    const date = entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString('uz-UZ')
                      : '—';
                    return (
                      <tr key={entry._id} className={`transition-colors ${isAdded ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {entry.contact?.name?.[0] || '?'}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{entry.contact?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <a href={`tel:${entry.contact?.phone}`} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            {entry.contact?.phone || '—'}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {entry.contact?.tg ? (
                            <a href={`https://t.me/${entry.contact.tg.replace('@', '')}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                              <Send className="w-3.5 h-3.5 shrink-0" />
                              {entry.contact.tg}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            entry.role === 'barber'           ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                            entry.role === 'barbershop_owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                                                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {roleLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{date}</td>
                        <td className="px-4 py-3 text-right">
                          {isAdded ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Qo'shildi</span>
                          ) : (
                            <button
                              onClick={() => handleAddToSystem(entry)}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors ml-auto"
                            >
                              {isLoading ? (
                                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                              Tizimga qo'shish
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

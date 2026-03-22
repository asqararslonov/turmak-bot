import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { barbershopsAPI, bookingsAPI } from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Filter, Download, CheckCircle, XCircle, Calendar, Clock, TrendingUp, DollarSign } from 'lucide-react';

const OwnerBookings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const [shopRes, bookingsRes] = await Promise.all([
        barbershopsAPI.getById(user.barbershop_id),
        bookingsAPI.getAll(),
      ]);
      const myBarberIds = shopRes.data.barbers || [];
      const list = bookingsRes.data?.data ?? bookingsRes.data ?? [];
      setBookings(list.filter(b => myBarberIds.includes(b.barber?.barber_id)));
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCame = async (bookingId, came) => {
    try {
      const { data } = await bookingsAPI.markUserCame(bookingId, came);
      setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, userCame: data.userCame } : b));
    } catch (err) {
      console.error('Failed to mark came:', err);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('uz-UZ').format(price) + ' UZS';

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (dateFilter && b.day !== dateFilter) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', t('common.date'), t('common.time'), t('common.customer'), t('common.phone'), t('common.barber'), t('common.service'), t('common.price'), t('common.status')];
    const rows = filtered.map(b => [
      b.booking_id, b.day, b.time, b.user?.name || '', b.user?.phone || '',
      b.barber?.name || '', b.service?.name || '', b.service?.price || 0, b.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmedRevenue = filtered
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.service?.price || 0), 0);

  const statusLabels = {
    all: t('common.all'),
    pending: t('bookings.status.pending'),
    confirmed: t('bookings.status.confirmed'),
    cancelled: t('bookings.status.cancelled'),
    no_show: t('bookings.status.no_show'),
  };

  const columns = [
    {
      key: 'booking_id',
      header: 'ID',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-gray-500">#{row.booking_id}</span>,
    },
    {
      key: 'customer',
      header: t('common.customer'),
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.user?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">{row.user?.phone}</p>
        </div>
      ),
    },
    {
      key: 'barber',
      header: t('common.barber'),
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.barber?.image ? (
            <img src={row.barber.image} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-xs font-bold text-teal-600 dark:text-teal-400">
              {row.barber?.name?.[0] || '?'}
            </div>
          )}
          <span className="text-gray-700 dark:text-gray-300">{row.barber?.name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'service',
      header: t('common.service'),
      render: (row) => (
        <div>
          <p className="text-gray-900 dark:text-white">{row.service?.name || '-'}</p>
          <p className="text-xs text-gray-500">{row.service?.duration ? `${row.service.duration} min` : ''}</p>
        </div>
      ),
    },
    {
      key: 'day',
      header: t('finance.dateAndTime'),
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.day}</p>
          <p className="text-xs text-gray-500">{row.time}</p>
        </div>
      ),
    },
    {
      key: 'price',
      header: t('common.price'),
      sortable: true,
      accessor: (row) => row.service?.price || 0,
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(row.service?.price || 0)}</span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'userCame',
      header: t('bookings.markCame'),
      render: (row) => {
        if (row.userCame === null || row.userCame === undefined) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMarkCame(row.booking_id, true)}
                className="p-1 rounded hover:bg-emerald-50 text-gray-300 hover:text-emerald-500 transition-colors"
                title={t('bookings.came')}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMarkCame(row.booking_id, false)}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                title={t('bookings.didntCome')}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          );
        }
        return row.userCame ? (
          <button
            onClick={() => handleMarkCame(row.booking_id, false)}
            className="text-xs font-medium text-emerald-600 hover:underline"
          >
            {t('bookings.came')}
          </button>
        ) : (
          <button
            onClick={() => handleMarkCame(row.booking_id, true)}
            className="text-xs font-medium text-red-500 hover:underline"
          >
            {t('bookings.didntCome')}
          </button>
        );
      },
    },
  ];

  if (loading) return <LoadingSpinner size="lg" text={t('dashboard.loading')} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Bookings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('bookings.title')}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">{filtered.length} {t('nav.bookings').toLowerCase()}</p>
        </div>
        <button
          onClick={exportCSV}
          className="self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex-shrink-0"
        >
          <Download size={16} /> {t('finance.exportCSV')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {['all', 'pending', 'confirmed', 'cancelled', 'no_show'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 border ${
              statusFilter === status
                ? 'bg-teal-600 text-white shadow-sm border-transparent'
                : 'bg-slate-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-transparent'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input-field w-auto text-sm rounded-xl"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="text-xs font-bold text-teal-600 hover:underline flex-shrink-0">
            {t('finance.clearDate')}
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t('common.total'), desc: t('nav.bookings'), value: filtered.length, Icon: Calendar },
          { label: t('bookings.status.pending'), desc: t('bookings.status.pending'), value: filtered.filter(b => b.status === 'pending').length, Icon: Clock },
          { label: t('bookings.status.confirmed'), desc: t('bookings.status.confirmed'), value: filtered.filter(b => b.status === 'confirmed').length, Icon: TrendingUp },
          { label: t('finance.revenue'), desc: t('bookings.status.confirmed'), value: formatPrice(confirmedRevenue), Icon: DollarSign },
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

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          searchKeys={['user.name', 'barber.name', 'service.name', 'user.phone']}
        />
      </div>
    </div>
  );
};

export default OwnerBookings;

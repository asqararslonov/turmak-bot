import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { bookingsAPI } from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Filter, Download } from 'lucide-react';

const AdminBookings = () => {
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
      const { data: res } = await bookingsAPI.getAll();
      setBookings(res?.data ?? res ?? []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
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
      b.booking_id, b.day, b.time,
      b.user?.name || '', b.user?.phone || '',
      b.barber?.name || '', b.service?.name || '',
      b.service?.price || 0, b.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabels = {
    all: t('common.all'),
    pending: t('bookings.status.pending'),
    confirmed: t('bookings.status.confirmed'),
    cancelled: t('bookings.status.cancelled'),
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
            <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600">
              {row.barber?.name?.[0] || '?'}
            </div>
          )}
          <span>{row.barber?.name || 'Unknown'}</span>
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
  ];

  if (loading) return <LoadingSpinner size="lg" text={t('dashboard.loading')} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finance.allBookings')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filtered.length} {t('nav.bookings').toLowerCase()}{statusFilter !== 'all' ? ` (${statusLabels[statusFilter]})` : ''}
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 self-start">
          <Download className="w-4 h-4" /> {t('finance.exportCSV')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'pending', 'confirmed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input-field w-auto text-sm"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="text-sm text-primary-600 hover:underline">
            {t('finance.clearDate')}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('common.total'),                   count: filtered.length,                                         color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
          { label: t('bookings.status.pending'),         count: filtered.filter(b => b.status === 'pending').length,   color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
          { label: t('bookings.status.confirmed'),       count: filtered.filter(b => b.status === 'confirmed').length, color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
          { label: t('bookings.status.cancelled'),       count: filtered.filter(b => b.status === 'cancelled').length, color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`p-4 rounded-xl ${color} text-center`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm opacity-80">{label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchKeys={['user.name', 'barber.name', 'service.name', 'user.phone']}
      />
    </div>
  );
};

export default AdminBookings;

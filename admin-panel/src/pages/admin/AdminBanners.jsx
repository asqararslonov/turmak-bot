import { useState, useEffect } from 'react';
import { bannersAPI, barbershopsAPI, promoCodesAPI } from '../../services/api';
import api from '../../services/api';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight, Image, ArrowUp, ArrowDown } from 'lucide-react';

const EMPTY_FORM = { barbershop_id: '', barber_id: '', promo_id: '', order: 0, active: true };

const AdminBanners = () => {
  const [banners,     setBanners]     = useState([]);
  const [shops,       setShops]       = useState([]);
  const [indBarbers,  setIndBarbers]  = useState([]);
  const [promos,      setPromos]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [targetType,  setTargetType]  = useState('shop'); // 'shop' | 'barber'
  const [success,     setSuccess]     = useState('');
  const [error,       setError]       = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bannersRes, shopsRes, barbersRes, promosRes] = await Promise.all([
        bannersAPI.getAll(),
        barbershopsAPI.getAll(),
        api.get('/barbers?individual=true&limit=50'),
        promoCodesAPI.getAll(),
      ]);
      setBanners(bannersRes.data);
      setShops((shopsRes.data.data ?? shopsRes.data) || []);
      setIndBarbers((barbersRes.data.data ?? barbersRes.data) || []);
      setPromos(Array.isArray(promosRes.data) ? promosRes.data : (promosRes.data.data || []));
    } catch (err) {
      setError('Ma\'lumotlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setTargetType('shop');
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const promo_id = Number(form.promo_id);
    if (!promo_id) return setError('Promokod tanlang');

    const barbershop_id = targetType === 'shop'   && form.barbershop_id ? Number(form.barbershop_id) : null;
    const barber_id     = targetType === 'barber' && form.barber_id     ? Number(form.barber_id)     : null;
    if (!barbershop_id && !barber_id) return setError('Sartaroshxona yoki barber tanlang');

    setSaving(true);
    setError('');
    try {
      const { data } = await bannersAPI.create({ barbershop_id, barber_id, promo_id, order: Number(form.order), active: form.active });
      setBanners(prev => [...prev, data].sort((a, b) => a.order - b.order));
      setShowModal(false);
      flash('Banner qo\'shildi!');
    } catch (err) {
      setError(err.response?.data?.error || 'Saqlash xatosi');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner) => {
    try {
      const { data } = await bannersAPI.update(banner.banner_id, { active: !banner.active });
      setBanners(prev => prev.map(b => b.banner_id === banner.banner_id ? data : b));
    } catch {
      flash('Yangilab bo\'lmadi', true);
    }
  };

  const handleDelete = async (banner) => {
    const name = banner.barbershop?.name || banner.barber?.name || `#${banner.banner_id}`;
    if (!window.confirm(`"${name}" bannerini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await bannersAPI.delete(banner.banner_id);
      setBanners(prev => prev.filter(b => b.banner_id !== banner.banner_id));
      flash('Banner o\'chirildi');
    } catch {
      flash('O\'chirib bo\'lmadi', true);
    }
  };

  const moveOrder = async (banner, dir) => {
    const newOrder = banner.order + dir;
    try {
      const { data } = await bannersAPI.update(banner.banner_id, { order: newOrder });
      setBanners(prev => prev.map(b => b.banner_id === banner.banner_id ? data : b).sort((a, b) => a.order - b.order));
    } catch {
      flash('Tartib yangilanmadi', true);
    }
  };

  const selectedPromo = promos.find(p => p.promo_id === Number(form.promo_id));

  if (loading) return <LoadingSpinner size="lg" text="Yuklanmoqda..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🎡 Banner boshqaruvi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bosh sahifadagi promo slider uchun banner slotlarini boshqaring
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
          <Plus size={16} /> Banner qo'shish
        </button>
      </div>

      {/* Alerts */}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">{success}</div>}
      {error   && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">{error}</div>}

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
        <strong>Qanday ishlaydi:</strong> Har bir banner — bitta sartaroshxona yoki individual barber + promokod juftligi.
        Faqat <strong>faol</strong> va muddati o'tmagan promokodlar bosh sahifada ko'rsatiladi.
      </div>

      {/* Banners list */}
      {banners.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Image size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Hali banner yo'q</p>
          <p className="text-sm mt-1">Birinchi bannerni qo'shing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => {
            const shopName  = b.barbershop?.name || b.barber?.business_name || b.barber?.name || '?';
            const shopImg   = b.barbershop?.image || b.barber?.image;
            const promoCode = b.promo?.code || '—';
            const promoVal  = b.promo ? (b.promo.type === 'percentage' ? `−${b.promo.value}%` : `−${(b.promo.value/1000).toFixed(0)}K`) : '—';
            const expired   = b.promo && new Date(b.promo.expiresAt) < new Date();

            return (
              <div key={b.banner_id} className={`bg-white dark:bg-gray-800 rounded-xl border ${b.active ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'} p-4 flex items-center gap-4`}>
                {/* Order */}
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => moveOrder(b, -1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                    <ArrowUp size={14} />
                  </button>
                  <span className="text-xs font-mono text-gray-400 w-4 text-center">{b.order}</span>
                  <button onClick={() => moveOrder(b, 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                    <ArrowDown size={14} />
                  </button>
                </div>

                {/* Shop avatar */}
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {shopImg
                    ? <img src={shopImg} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xl">✂️</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">{shopName}</span>
                    {b.barber && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">Individual barber</span>}
                    {!b.active && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">Nofaol</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm font-mono font-bold text-yellow-600 dark:text-yellow-400">{promoCode}</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{promoVal}</span>
                    {expired && <span className="text-xs text-red-500">⚠️ Muddati o'tgan</span>}
                    {b.promo?.expiresAt && !expired && (
                      <span className="text-xs text-gray-400">
                        {new Date(b.promo.expiresAt).toLocaleDateString('uz-UZ')} gacha
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(b)}
                    title={b.active ? 'Nofaol qilish' : 'Faollashtirish'}
                    className={`p-2 rounded-lg transition-colors ${b.active ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {b.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yangi banner qo'shish">
        <div className="space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}

          {/* Target type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tur</label>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {['shop', 'barber'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTargetType(t); setForm(f => ({ ...f, barbershop_id: '', barber_id: '' })); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${targetType === t ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  {t === 'shop' ? '🏪 Sartaroshxona' : '✂️ Individual barber'}
                </button>
              ))}
            </div>
          </div>

          {/* Shop / barber selector */}
          {targetType === 'shop' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sartaroshxona</label>
              <select
                value={form.barbershop_id}
                onChange={e => setForm(f => ({ ...f, barbershop_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">— Tanlang —</option>
                {shops.map(s => (
                  <option key={s.barbershop_id} value={s.barbershop_id}>
                    {s.name} (#{s.barbershop_id}) ⭐{s.rating}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Individual barber</label>
              <select
                value={form.barber_id}
                onChange={e => setForm(f => ({ ...f, barber_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">— Tanlang —</option>
                {indBarbers.filter(b => b.name && b.name !== 'Pending Setup').map(b => (
                  <option key={b.barber_id} value={b.barber_id}>
                    {b.business_name || b.name} (#{b.barber_id}) ⭐{b.rating}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Promo code selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promokod</label>
            <select
              value={form.promo_id}
              onChange={e => setForm(f => ({ ...f, promo_id: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">— Tanlang —</option>
              {promos.filter(p => p.active && new Date(p.expiresAt) > new Date()).map(p => (
                <option key={p.promo_id} value={p.promo_id}>
                  {p.code} — {p.type === 'percentage' ? `${p.value}%` : `${(p.value/1000).toFixed(0)}K so'm`} ({p.title})
                </option>
              ))}
            </select>
            {selectedPromo && (
              <p className="text-xs text-gray-500 mt-1">
                Muddati: {new Date(selectedPromo.expiresAt).toLocaleDateString('uz-UZ')} · Foydalanish: {selectedPromo.usedCount}/{selectedPromo.maxUses}
              </p>
            )}
          </div>

          {/* Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tartib raqami</label>
            <input
              type="number"
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              min={0}
            />
            <p className="text-xs text-gray-400 mt-1">Kichik raqam — slider boshida ko'rsatiladi</p>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Faol (darhol ko'rsatilsin)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Saqlash
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Bekor
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminBanners;

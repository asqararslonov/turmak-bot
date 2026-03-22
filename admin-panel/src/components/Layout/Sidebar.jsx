import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart2, Scissors, MapPin, Users, Calendar, Image, LogOut,
  LayoutDashboard, ChevronLeft, ChevronRight, CalendarDays, UserRound,
  DollarSign, Package, Megaphone, Wallet, Tag, Clock, Star, Settings,
  UserX, TrendingUp, Zap, Layers,
} from 'lucide-react';

// ── Link definitions ─────────────────────────────────────────────────────────

const OWNER_SIMPLE = [
  { path: '/',              labelKey: 'nav.dashboard',  icon: LayoutDashboard, tour: 'nav-dashboard' },
  { path: '/calendar',      labelKey: 'nav.calendar',   icon: CalendarDays,    tour: 'nav-calendar'  },
  { path: '/bookings',      labelKey: 'nav.bookings',   icon: Calendar,        tour: 'nav-bookings'  },
  { path: '/clients',       labelKey: 'nav.clients',    icon: UserRound,       tour: 'nav-clients'   },
  { path: '/barbers',       labelKey: 'nav.barbers',    icon: Users,           tour: 'nav-barbers'   },
  { path: '/my-barbershop', labelKey: 'nav.barbershop', icon: Scissors,        tour: 'nav-shop'      },
  { path: '/settings',      labelKey: 'nav.settings',   icon: Settings                               },
];

const OWNER_ADVANCED = [
  { path: '/',              labelKey: 'nav.dashboard',   icon: LayoutDashboard, group: 'Main',     tour: 'nav-dashboard' },
  { path: '/calendar',      labelKey: 'nav.calendar',    icon: CalendarDays,    group: 'Main',     tour: 'nav-calendar'  },
  { path: '/bookings',      labelKey: 'nav.bookings',    icon: Calendar,        group: 'Main',     tour: 'nav-bookings'  },
  { path: '/clients',       labelKey: 'nav.clients',     icon: UserRound,       group: 'Main',     tour: 'nav-clients'   },
  { path: '/my-barbershop', labelKey: 'nav.barbershop',  icon: Scissors,        group: 'Manage',   tour: 'nav-shop'      },
  { path: '/barbers',       labelKey: 'nav.barbers',     icon: Users,           group: 'Manage',   tour: 'nav-barbers'   },
  { path: '/locations',     labelKey: 'nav.locations',   icon: MapPin,          group: 'Manage',   tour: 'nav-locations' },
  { path: '/gallery',       labelKey: 'nav.gallery',     icon: Image,           group: 'Manage',   tour: 'nav-gallery'   },
  { path: '/finance',       labelKey: 'nav.finance',     icon: DollarSign,      group: 'Business', tour: 'nav-finance'   },
  { path: '/payroll',       labelKey: 'nav.payroll',     icon: Wallet,          group: 'Business', tour: 'nav-payroll'   },
  { path: '/inventory',     labelKey: 'nav.inventory',   icon: Package,         group: 'Business', tour: 'nav-inventory' },
  { path: '/promos',        labelKey: 'nav.promos',      icon: Tag,             group: 'Business', tour: 'nav-promos'    },
  { path: '/reviews',       labelKey: 'nav.reviews',     icon: Star,            group: 'Business', tour: 'nav-reviews'   },
  { path: '/no-shows',      labelKey: 'nav.noShows',     icon: UserX,           group: 'Business'                        },
  { path: '/stats',         labelKey: 'nav.statistics',  icon: BarChart2,       group: 'Business', tour: 'nav-stats'     },
  { path: '/settings',      labelKey: 'nav.settings',    icon: Settings,        group: 'Business'                        },
];

const BARBER_SIMPLE = [
  { path: '/',                labelKey: 'nav.dashboard',    icon: LayoutDashboard, tour: 'nav-dashboard'  },
  { path: '/calendar',        labelKey: 'nav.calendar',     icon: CalendarDays,    tour: 'nav-calendar'   },
  { path: '/schedule',        labelKey: 'nav.schedule',     icon: Calendar,        tour: 'schedule'       },
  { path: '/clients',         labelKey: 'nav.clients',      icon: UserRound,       tour: 'nav-clients'    },
  { path: '/promos',          labelKey: 'nav.promos',       icon: Tag,                                    },
  { path: '/profile',         labelKey: 'nav.profile',      icon: Users,           tour: 'profile'        },
  { path: '/settings',        labelKey: 'nav.settings',     icon: Settings                                },
];

const BARBER_ADVANCED = [
  { path: '/',                labelKey: 'nav.dashboard',    icon: LayoutDashboard, tour: 'nav-dashboard'  },
  { path: '/calendar',        labelKey: 'nav.calendar',     icon: CalendarDays,    tour: 'nav-calendar'   },
  { path: '/schedule',        labelKey: 'nav.schedule',     icon: Calendar,        tour: 'schedule'       },
  { path: '/clients',         labelKey: 'nav.clients',      icon: UserRound,       tour: 'nav-clients'    },
  { path: '/schedule/manage', labelKey: 'nav.workingHours', icon: Clock,           tour: 'working-hours'  },
  { path: '/promos',          labelKey: 'nav.promos',       icon: Tag,                                    },
  { path: '/profile',         labelKey: 'nav.profile',      icon: Users,           tour: 'profile'        },
  { path: '/services',        labelKey: 'nav.services',     icon: Scissors,        tour: 'services'       },
  { path: '/gallery',         labelKey: 'nav.gallery',      icon: Image,           tour: 'gallery'        },
  { path: '/stats',           labelKey: 'nav.performance',  icon: BarChart2,       tour: 'performance'    },
  { path: '/settings',        labelKey: 'nav.settings',     icon: Settings                                },
];

// ── Component ────────────────────────────────────────────────────────────────

const Sidebar = ({ collapsed, onToggleCollapse, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const [advanced, setAdvanced] = useState(
    () => localStorage.getItem('turmak_nav_mode') === 'advanced'
  );

  const toggleMode = () => {
    const next = !advanced;
    setAdvanced(next);
    localStorage.setItem('turmak_nav_mode', next ? 'advanced' : 'simple');
  };

  const links = (() => {
    switch (user?.role) {
      case 'admin':
        return [
          { path: '/',                   labelKey: 'nav.dashboard',         icon: LayoutDashboard },
          { path: '/calendar',           labelKey: 'nav.calendar',          icon: CalendarDays    },
          { path: '/barbershops',        labelKey: 'nav.barbershop',        icon: Scissors        },
          { path: '/users',              labelKey: 'nav.barbers',           icon: Users           },
          { path: '/bookings',           labelKey: 'nav.bookings',          icon: Calendar        },
          { path: '/reports',            labelKey: 'nav.statistics',        icon: BarChart2       },
          { path: '/service-categories', labelKey: 'nav.serviceCategories', icon: Tag             },
          { path: '/banners',            labelKey: 'nav.banners',           icon: Megaphone       },
          { path: '/settings',           labelKey: 'nav.settings',          icon: Settings        },
        ];
      case 'barbershop_owner':
        return advanced ? OWNER_ADVANCED : OWNER_SIMPLE;
      case 'barber':
        return advanced ? BARBER_ADVANCED : BARBER_SIMPLE;
      default:
        return [];
    }
  })();

  const isActive = (path) => location.pathname === path;

  const grouped = links.reduce((acc, link) => {
    const g = link.group || 'Main';
    if (!acc[g]) acc[g] = [];
    acc[g].push(link);
    return acc;
  }, {});
  const groupOrder = [...new Set(links.map(l => l.group || 'Main'))];

  const groupLabel = (g) => {
    const map = { Main: t('nav.groups.main'), Manage: t('nav.groups.manage'), Business: t('nav.groups.business') };
    return map[g] || g;
  };

  const renderLink = (link) => {
    const Icon = link.icon;
    const active = isActive(link.path);
    const label = t(link.labelKey);
    return (
      <Link
        key={link.path}
        to={link.path}
        title={collapsed ? label : undefined}
        data-tour={link.tour}
        aria-current={active ? 'page' : undefined}
        onClick={onClose}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
          ${collapsed ? 'justify-center' : ''}
          ${active
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-primary-200 hover:bg-white/10 hover:text-white'
          }`}
      >
        <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-white' : 'text-primary-300 group-hover:text-white'}`} />
        {!collapsed && <span className="truncate">{label}</span>}
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-primary-950 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-soft-md">
            {label}
            <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-4 border-transparent border-r-primary-950" />
          </span>
        )}
      </Link>
    );
  };

  const showModeToggle = user?.role === 'barbershop_owner' || user?.role === 'barber';

  return (
    <aside
      className={`flex flex-col h-full bg-primary-800 border-r border-primary-700 shadow-soft transition-all duration-300 overflow-hidden
        ${collapsed ? 'w-[72px]' : 'w-64'}`}
    >
      {/* ── Logo ──────────────────────────────────────────────── */}
      <div className={`flex items-center h-16 border-b border-primary-700/60 shrink-0 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Scissors className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-tight leading-tight">Turmak.uz</h1>
            <p className="text-[11px] text-primary-300 leading-tight">Admin Panel</p>
          </div>
        )}
      </div>

      {/* ── Nav links ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {groupOrder.length > 1 ? (
          groupOrder.map(group => (
            <div key={group} className="mb-3">
              {!collapsed && (
                <div className="px-3 pb-1 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-300/60">
                    {groupLabel(group)}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {(grouped[group] || []).map(renderLink)}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-0.5">
            {links.map(renderLink)}
          </div>
        )}

        {/* ── Mode toggle ───────────────────────────────────────── */}
        {showModeToggle && (
          <div className={`mt-3 pt-3 border-t border-primary-700/40 ${collapsed ? 'flex justify-center' : ''}`}>
            <button
              onClick={toggleMode}
              title={collapsed ? (advanced ? t('nav.simpleMode') : t('nav.advancedMode')) : undefined}
              className={`relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group
                ${collapsed ? 'justify-center' : ''}
                ${advanced
                  ? 'text-amber-300 hover:bg-amber-400/10'
                  : 'text-primary-300 hover:bg-white/10 hover:text-white'
                }`}
            >
              {advanced
                ? <Zap className="w-[16px] h-[16px] shrink-0 text-amber-400" />
                : <Layers className="w-[16px] h-[16px] shrink-0" />
              }
              {!collapsed && (
                <span>{advanced ? t('nav.advancedMode') : t('nav.simpleMode')}</span>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-primary-950 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-soft-md">
                  {advanced ? t('nav.simpleMode') : t('nav.advancedMode')}
                  <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-4 border-transparent border-r-primary-950" />
                </span>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* ── User + controls ───────────────────────────────────── */}
      <div className="p-2.5 pb-safe border-t border-primary-700/60 space-y-1">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name || 'User'}</p>
              <p className="text-[11px] text-primary-300 truncate capitalize leading-tight">{user?.role?.replace('_', ' ') || 'Guest'}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          title={collapsed ? t('nav.signOut') : undefined}
          className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/15 rounded-xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70
            ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t('nav.signOut')}</span>}
        </button>

        <button
          onClick={onToggleCollapse}
          className={`hidden lg:flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 shrink-0" />
            : <><ChevronLeft className="w-4 h-4 shrink-0" /><span>{t('nav.collapse')}</span></>
          }
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

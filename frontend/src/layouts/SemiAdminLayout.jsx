import React, { useState } from 'react';
import {
  LogOut, Menu, X, ChevronRight,
  LayoutDashboard, ArrowLeftRight, Redo2
} from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function SemiAdminLayout() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/semi-admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    // { path: '/semi-admin/agents',       label: 'Agents',       icon: Users           },
    { path: '/semi-admin/transactions', label: 'Transactions', icon: ArrowLeftRight  },
    // { path: '/semi-admin/redirections', label: 'Redirections', icon: Redo2  },
    // { path: '/semi-admin/historiques',  label: 'Historiques',  icon: History         },
    // { path: '/semi-admin/balances',     label: 'Balances',     icon: Wallet          },
    // { path: '/semi-admin/numbers',      label: 'Numéros',      icon: Phone           },
  ];

  const isActiveLink = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-violet-50/30">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/60
        shadow-xl lg:shadow-none p-6 z-50 h-screen lg:h-auto
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        lg:translate-x-0 flex flex-col
      `}>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Semi-Admin
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Supervision</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveLink(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-violet-50 text-violet-700 border border-violet-200/60 shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <div className={`
                  p-2 rounded-lg transition-colors duration-200
                  ${isActive
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }
                `}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                )}
                <ChevronRight className={`
                  w-4 h-4 transition-transform duration-200
                  ${isActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}
                  group-hover:translate-x-0.5
                `} />
              </Link>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div className="mt-8 pt-6 border-t border-slate-200/60">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 text-red-700 hover:text-red-800 border border-red-200/60 hover:border-red-300/60 transition-all duration-200 group w-full shadow-sm hover:shadow-md"
          >
            <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-200">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm flex-1 text-left">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 lg:p-8 min-h-screen overflow-x-hidden">
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm min-h-[calc(100vh-2rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
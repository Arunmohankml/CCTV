import React from 'react';
import { Users, Car, Package, Hash, ShieldAlert } from 'lucide-react';

export default function StatsGrid({ statistics }) {
  const stats = statistics || {
    people_count: 0,
    vehicle_count: 0,
    objects_count: 0,
    plates_scanned_count: 0,
    intrusion_count: 0
  };

  const cards = [
    {
      title: 'People',
      value: stats.people_count,
      icon: <Users className='w-5 h-5 text-sky-400' />,
      textColor: 'text-white',
      badge: 'Active Track',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    },
    {
      title: 'Vehicles',
      value: stats.vehicle_count,
      icon: <Car className='w-5 h-5 text-amber-400' />,
      textColor: 'text-white',
      badge: 'Traffic Flow',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      title: 'Objects',
      value: stats.objects_count || 0,
      icon: <Package className='w-5 h-5 text-purple-400' />,
      textColor: 'text-white',
      badge: 'Items & Baggage',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      title: 'ANPR Plates',
      value: stats.plates_scanned_count,
      icon: <Hash className='w-5 h-5 text-emerald-400' />,
      textColor: 'text-white',
      badge: 'OCR Verified',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      title: 'Intrusions',
      value: stats.intrusion_count,
      icon: <ShieldAlert className='w-5 h-5 text-rose-400' />,
      textColor: stats.intrusion_count > 0 ? 'text-rose-400' : 'text-white',
      badge: 'Perimeter Breaches',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl shadow-md flex flex-col justify-between transition-all hover:border-slate-700/90 hover:bg-slate-850"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {card.title}
            </span>
            <div className={`p-2 rounded-xl border flex items-center justify-center ${card.badgeColor}`}>
              {card.icon}
            </div>
          </div>

          <div>
            <p className={`text-3xl font-extrabold tracking-tight ${card.textColor}`}>
              {card.value}
            </p>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
              {card.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

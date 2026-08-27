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
      title: 'Pedestrians',
      value: stats.people_count,
      icon: <Users className='w-4 h-4 text-zinc-300' />,
      badge: 'Active Track'
    },
    {
      title: 'Vehicles',
      value: stats.vehicle_count,
      icon: <Car className='w-4 h-4 text-zinc-300' />,
      badge: 'Traffic Flow'
    },
    {
      title: 'Objects',
      value: stats.objects_count || 0,
      icon: <Package className='w-4 h-4 text-zinc-300' />,
      badge: 'Monitored Items'
    },
    {
      title: 'ANPR Plates',
      value: stats.plates_scanned_count,
      icon: <Hash className='w-4 h-4 text-zinc-300' />,
      badge: 'OCR Verified'
    },
    {
      title: 'Incidents',
      value: stats.intrusion_count,
      icon: <ShieldAlert className='w-4 h-4 text-rose-400' />,
      badge: 'Breaches / Speed',
      isAlert: stats.intrusion_count > 0
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`p-4 px-5 rounded-3xl border backdrop-blur-2xl transition-all shadow-lg ${
            card.isAlert
              ? "bg-rose-950/15 border-rose-500/30"
              : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/80"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {card.title}
            </span>
            <div className="p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center">
              {card.icon}
            </div>
          </div>

          <div>
            <p className={`text-2xl font-bold tracking-tight ${card.isAlert ? "text-rose-400" : "text-white"}`}>
              {card.value}
            </p>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5 block tracking-wide">
              {card.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

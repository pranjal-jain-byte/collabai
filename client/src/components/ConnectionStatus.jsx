// ConnectionStatus Component

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function ConnectionStatus({ status }) {
  if (status === 'connected') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline">Live OT</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
        <span className="hidden sm:inline">Connecting</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <WifiOff className="w-3 h-3 text-red-500" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
}

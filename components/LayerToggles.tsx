'use client'

import { useSatelliteStore } from '@/store/satelliteStore'
import {
  Eye,
  EyeOff,
  Radio,
  Plane,
  Ship,
  Orbit,
  Shield,
} from 'lucide-react'

export default function LayerToggles() {
  const {
    showOrbits,
    showCoverage,
    showJamming,
    showFlights,
    showVessels,
    toggleOrbits,
    toggleCoverage,
    toggleJamming,
    toggleFlights,
    toggleVessels,
  } = useSatelliteStore()

  const layers = [
    {
      label: 'ORBITS',
      active: showOrbits,
      toggle: toggleOrbits,
      icon: <Orbit size={12} />,
      color: 'intel-cyan',
    },
    {
      label: 'COVERAGE',
      active: showCoverage,
      toggle: toggleCoverage,
      icon: <Radio size={12} />,
      color: 'intel-green',
    },
    {
      label: 'GPS JAM',
      active: showJamming,
      toggle: toggleJamming,
      icon: <Shield size={12} />,
      color: 'intel-red',
    },
    {
      label: 'ADS-B',
      active: showFlights,
      toggle: toggleFlights,
      icon: <Plane size={12} />,
      color: 'intel-cyan',
    },
    {
      label: 'AIS',
      active: showVessels,
      toggle: toggleVessels,
      icon: <Ship size={12} />,
      color: 'intel-amber',
    },
  ]

  return (
    <div className="absolute bottom-16 right-4 z-[1000] flex flex-col gap-1 font-mono">
      {layers.map((l) => (
        <button
          key={l.label}
          onClick={l.toggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all text-[10px] tracking-wider ${
            l.active
              ? `bg-${l.color}/15 text-${l.color} border border-${l.color}/30`
              : 'bg-black/50 text-gray-600 border border-transparent hover:text-gray-400'
          }`}
          style={
            l.active
              ? {
                  backgroundColor: `var(--color, rgba(0,229,255,0.1))`,
                  borderColor: `var(--bcolor, rgba(0,229,255,0.2))`,
                }
              : {}
          }
        >
          {l.active ? <Eye size={12} /> : <EyeOff size={12} />}
          {l.label}
        </button>
      ))}
    </div>
  )
}

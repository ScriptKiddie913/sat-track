'use client'

import { useEffect, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSatelliteStore } from '@/store/satelliteStore'
import { CATEGORY_LABELS } from '@/lib/satellites-data'
import { JAMMING_ZONES, AIS_VESSELS, GROUND_STATIONS, GODS_EYE_MODES } from '@/lib/intel-data'
import SatellitePanel from '@/components/SatellitePanel'
import TrackingHUD from '@/components/TrackingHUD'
import Timeline from '@/components/Timeline'
import CountryDashboard from '@/components/CountryDashboard'
import ImageryPanel from '@/components/ImageryPanel'
import LayerToggles from '@/components/LayerToggles'

const IntelMap = dynamic(() => import('@/components/IntelMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-intel-bg flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-2 border-intel-cyan/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-intel-cyan border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-3 border border-intel-cyan/30 rounded-full" />
          <div className="absolute inset-3 border border-intel-green border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <div className="text-intel-cyan font-mono text-xs tracking-[0.3em] animate-pulse">
          INITIALIZING
        </div>
        <div className="text-gray-600 font-mono text-[10px] mt-1">
          Loading satellite intelligence...
        </div>
      </div>
    </div>
  ),
})

export default function Home() {
  const {
    category, setCategory, setSatellites, satellites,
    showSatellites, toggleSatellites,
    showVessels, toggleVessels,
    showStations, toggleStations,
    showQuakes, toggleQuakes,
    showEvents, toggleEvents,
    godsEyeMode, setGodsEyeMode,
    sidebarCollapsed, toggleSidebar,
    setQuakes, setEvents,
    quakes, events,
  } = useSatelliteStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'sat' | 'ship'>('sat')

  // Fetch TLE data
  const fetchTLE = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tle?category=${category}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.satellites && data.satellites.length > 0) {
        setSatellites(data.satellites)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('TLE fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [category, setSatellites])

  useEffect(() => {
    fetchTLE()
    const iv = setInterval(fetchTLE, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [fetchTLE])

  // Fetch quakes + events on mount
  useEffect(() => {
    fetch('/api/quakes').then(r => r.json()).then(d => { if (d.quakes) setQuakes(d.quakes) }).catch(() => {})
    fetch('/api/events').then(r => r.json()).then(d => { if (d.events) setEvents(d.events) }).catch(() => {})
    const iv = setInterval(() => {
      fetch('/api/quakes').then(r => r.json()).then(d => { if (d.quakes) setQuakes(d.quakes) }).catch(() => {})
      fetch('/api/events').then(r => r.json()).then(d => { if (d.events) setEvents(d.events) }).catch(() => {})
    }, 10 * 60 * 1000)
    return () => clearInterval(iv)
  }, [setQuakes, setEvents])

  const activeJammed = JAMMING_ZONES.filter(z => z.active).length

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-intel-bg">
      {/* Left sidebar */}
      <div
        className="relative flex flex-col border-r border-gray-800/50 bg-intel-bg/95 backdrop-blur-sm z-[1001]"
        style={{
          width: sidebarCollapsed ? 0 : 320,
          minWidth: sidebarCollapsed ? 0 : 320,
          overflow: 'hidden',
          transition: 'width 0.3s ease, min-width 0.3s ease',
        }}
      >
        <SatellitePanel />
      </div>

      {/* Sidebar collapse/expand button */}
      <button
        onClick={toggleSidebar}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-[1002] bg-gray-900/90 hover:bg-gray-800 text-gray-400 hover:text-intel-cyan border border-gray-700/50 rounded-r-md px-1 py-3 transition-all"
        style={{ left: sidebarCollapsed ? 0 : 320, transition: 'left 0.3s ease' }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          {sidebarCollapsed
            ? <path d="M4 1l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none"/>
            : <path d="M8 1l-5 5 5 5" stroke="currentColor" strokeWidth="2" fill="none"/>}
        </svg>
      </button>

      {/* Main map area */}
      <main className="flex-1 relative overflow-hidden">
        <IntelMap />

        {/* ── Top center: mode toggle + stats ── */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3">
          {/* SAT / SHIP mode toggle */}
          <div className="flex bg-gray-900/90 border border-gray-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('sat')}
              className={`px-4 py-1.5 font-mono text-xs tracking-wider transition-all ${
                mode === 'sat'
                  ? 'bg-intel-cyan/20 text-intel-cyan border-r border-intel-cyan/30'
                  : 'text-gray-500 hover:text-gray-300 border-r border-gray-700/50'
              }`}
            >
              SAT
            </button>
            <button
              onClick={() => setMode('ship')}
              className={`px-4 py-1.5 font-mono text-xs tracking-wider transition-all ${
                mode === 'ship'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              SHIP
            </button>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700/40 rounded-lg px-3 py-1.5 font-mono text-[10px]">
            <span className="text-intel-cyan">{satellites.length} SAT</span>
            <span className="text-gray-700">|</span>
            <span className="text-blue-400">{AIS_VESSELS.length} SHIP</span>
            <span className="text-gray-700">|</span>
            <span className="text-red-400">{quakes.length} QUAKE</span>
            <span className="text-gray-700">|</span>
            <span className="text-yellow-400">{events.length} EVENT</span>
            <span className="text-gray-700">|</span>
            <span className="text-green-400">{GROUND_STATIONS.length} GS</span>
            {activeJammed > 0 && (
              <>
                <span className="text-gray-700">|</span>
                <span className="text-red-500">{activeJammed} JAMMED</span>
              </>
            )}
          </div>
        </div>

        {/* ── Top right: layer toggles ── */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
          {[
            { label: 'SAT', active: showSatellites, toggle: toggleSatellites, color: '#00e5ff' },
            { label: 'SHIP', active: showVessels, toggle: toggleVessels, color: '#42a5f5' },
            { label: 'STATION', active: showStations, toggle: toggleStations, color: '#ff6600' },
            { label: 'QUAKE', active: showQuakes, toggle: toggleQuakes, color: '#ff3d3d' },
            { label: 'EVENT', active: showEvents, toggle: toggleEvents, color: '#ffee00' },
          ].map(({ label, active, toggle, color }) => (
            <button
              key={label}
              onClick={toggle}
              className="flex items-center gap-2 px-2.5 py-1 rounded font-mono text-[10px] tracking-wider transition-all border"
              style={{
                background: active ? `${color}15` : 'rgba(0,0,0,0.6)',
                borderColor: active ? `${color}40` : 'rgba(255,255,255,0.05)',
                color: active ? color : '#555',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: active ? color : '#333' }} />
              {label}
            </button>
          ))}
        </div>

        {/* ── God's Eye HD panel ── */}
        <div className="absolute top-3 right-32 z-[1000]">
          <div className="bg-gray-900/90 border border-gray-700/50 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] font-mono text-gray-500 tracking-wider border-b border-gray-800/50">
              GOD&apos;S EYE HD
            </div>
            <div className="flex flex-col">
              {GODS_EYE_MODES.map((ge) => (
                <button
                  key={ge.id}
                  onClick={() => setGodsEyeMode(godsEyeMode === ge.id ? null : ge.id)}
                  className={`px-3 py-1 text-left font-mono text-[10px] transition-all ${
                    godsEyeMode === ge.id
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {ge.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overlays */}
        <CountryDashboard />
        <TrackingHUD />
        <ImageryPanel />
        <LayerToggles />

        {/* ── Category tab bar (below map, above timeline) ── */}
        <div className="absolute bottom-20 left-0 right-0 z-[1000]">
          <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-hide">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key as any)}
                className={`whitespace-nowrap px-2.5 py-1 rounded font-mono text-[9px] tracking-wider transition-all border ${
                  category === key
                    ? 'bg-intel-cyan/20 text-intel-cyan border-intel-cyan/30'
                    : 'bg-gray-900/60 text-gray-600 border-gray-800/30 hover:text-gray-400 hover:bg-gray-800/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="absolute bottom-14 left-4 z-[1000] font-mono text-[10px] flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-intel-amber animate-pulse' : satellites.length > 0 ? 'bg-intel-green' : 'bg-intel-red'}`}
            />
            <span className="text-gray-500">
              {loading
                ? 'FETCHING TLE...'
                : error
                  ? `ERROR: ${error}`
                  : `${satellites.length.toLocaleString()} OBJECTS · LIVE SGP4 PROPAGATION`}
            </span>
          </div>
          <span className="text-gray-700">|</span>
          <span className="text-gray-600">ESRI WORLD IMAGERY</span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-600">CELESTRAK TLE</span>
        </div>

        {/* Timeline */}
        <Timeline />

        {/* Scan line effect */}
        <div className="scan-line" />
      </main>
    </div>
  )
}

'use client'

import { useEffect, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSatelliteStore } from '@/store/satelliteStore'
import SatellitePanel from '@/components/SatellitePanel'
import TrackingHUD from '@/components/TrackingHUD'
import Timeline from '@/components/Timeline'
import CountryDashboard from '@/components/CountryDashboard'
import ImageryPanel from '@/components/ImageryPanel'
import LayerToggles from '@/components/LayerToggles'

// Leaflet must be client-only
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
  const { category, setSatellites, satellites } = useSatelliteStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    // Refresh every 5 minutes
    const iv = setInterval(fetchTLE, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [fetchTLE])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-intel-bg">
      {/* Left panel */}
      <SatellitePanel />

      {/* Main map area */}
      <main className="flex-1 relative overflow-hidden">
        <IntelMap />

        {/* Overlays */}
        <CountryDashboard />
        <TrackingHUD />
        <ImageryPanel />
        <LayerToggles />

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

'use client'

import { useSatelliteStore } from '@/store/satelliteStore'
import { guessOwnerFromName, COUNTRY_LIST, getOwnerInfo } from '@/lib/country-map'
import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'

export default function CountryDashboard() {
  const { satellites } = useSatelliteStore()

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    satellites.forEach((s) => {
      const code = guessOwnerFromName(s.name)
      counts[code] = (counts[code] || 0) + 1
    })

    return COUNTRY_LIST.map((c) => ({
      ...c,
      count: counts[c.code] || 0,
      info: getOwnerInfo(c.code),
    }))
      .sort((a, b) => b.count - a.count)
      .filter((c) => c.count > 0)
  }, [satellites])

  const maxCount = Math.max(...stats.map((s) => s.count), 1)

  if (stats.length === 0) return null

  return (
    <div className="absolute top-4 left-4 z-[1000] w-64 bg-black/85 backdrop-blur-md border border-intel-border rounded-lg overflow-hidden font-mono">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-intel-border">
        <BarChart3 size={12} className="text-intel-cyan" />
        <span className="text-intel-cyan text-[10px] font-bold tracking-[0.15em]">
          NATION INTELLIGENCE
        </span>
      </div>

      <div className="p-3 space-y-1.5">
        {stats.slice(0, 12).map((c) => (
          <div key={c.code} className="group">
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-gray-400">
                {c.flag} {c.code}
              </span>
              <span className="text-gray-300 tabular-nums">
                {c.count.toLocaleString()}
              </span>
            </div>
            <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(c.count / maxCount) * 100}%`,
                  backgroundColor: c.info.color,
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-intel-border text-[9px] text-gray-600">
        TOTAL: {satellites.length.toLocaleString()} TRACKED OBJECTS
      </div>
    </div>
  )
}

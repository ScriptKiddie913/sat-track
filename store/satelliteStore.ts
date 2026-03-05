import { create } from 'zustand'
import type { TLESatellite, SatCategory } from '@/lib/types'

interface SatelliteStore {
  satellites: TLESatellite[]
  category: SatCategory
  lockedId: string | null
  searchQuery: string
  countryFilter: string | null
  showOrbits: boolean
  showCoverage: boolean
  showJamming: boolean
  showFlights: boolean
  showVessels: boolean
  activeImageryLayer: string | null
  timelineOffset: number // minutes offset from now (-60 to +60)
  isPlaying: boolean
  countryCounts: Record<string, number>

  setSatellites: (sats: TLESatellite[]) => void
  setCategory: (cat: SatCategory) => void
  setLockedId: (id: string | null) => void
  toggleLock: (id: string) => void
  setSearch: (q: string) => void
  setCountryFilter: (code: string | null) => void
  toggleOrbits: () => void
  toggleCoverage: () => void
  toggleJamming: () => void
  toggleFlights: () => void
  toggleVessels: () => void
  setImageryLayer: (id: string | null) => void
  setTimelineOffset: (offset: number) => void
  setIsPlaying: (p: boolean) => void
  setCountryCounts: (c: Record<string, number>) => void
}

export const useSatelliteStore = create<SatelliteStore>((set) => ({
  satellites: [],
  category: 'active',
  lockedId: null,
  searchQuery: '',
  countryFilter: null,
  showOrbits: true,
  showCoverage: true,
  showJamming: true,
  showFlights: true,
  showVessels: true,
  activeImageryLayer: null,
  timelineOffset: 0,
  isPlaying: false,
  countryCounts: {},

  setSatellites: (sats) => set({ satellites: sats }),
  setCategory: (cat) => set({ category: cat }),
  setLockedId: (id) => set({ lockedId: id }),
  toggleLock: (id) =>
    set((s) => ({ lockedId: s.lockedId === id ? null : id })),
  setSearch: (q) => set({ searchQuery: q }),
  setCountryFilter: (code) =>
    set((s) => ({ countryFilter: s.countryFilter === code ? null : code })),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleCoverage: () => set((s) => ({ showCoverage: !s.showCoverage })),
  toggleJamming: () => set((s) => ({ showJamming: !s.showJamming })),
  toggleFlights: () => set((s) => ({ showFlights: !s.showFlights })),
  toggleVessels: () => set((s) => ({ showVessels: !s.showVessels })),
  setImageryLayer: (id) =>
    set((s) => ({ activeImageryLayer: s.activeImageryLayer === id ? null : id })),
  setTimelineOffset: (offset) => set({ timelineOffset: offset }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setCountryCounts: (c) => set({ countryCounts: c }),
}))

import { create } from 'zustand'
import type { TLESatellite, SatCategory, Quake, EONETEvent, AISVessel } from '@/lib/types'

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
  showSatellites: boolean
  showStations: boolean
  showQuakes: boolean
  showEvents: boolean
  activeImageryLayer: string | null
  godsEyeMode: string | null
  timelineOffset: number
  isPlaying: boolean
  countryCounts: Record<string, number>
  sidebarCollapsed: boolean
  quakes: Quake[]
  events: EONETEvent[]
  liveVessels: AISVessel[]

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
  toggleSatellites: () => void
  toggleStations: () => void
  toggleQuakes: () => void
  toggleEvents: () => void
  setImageryLayer: (id: string | null) => void
  setGodsEyeMode: (id: string | null) => void
  setTimelineOffset: (offset: number) => void
  setIsPlaying: (p: boolean) => void
  setCountryCounts: (c: Record<string, number>) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setQuakes: (q: Quake[]) => void
  setEvents: (e: EONETEvent[]) => void
  setLiveVessels: (v: AISVessel[]) => void
}

export const useSatelliteStore = create<SatelliteStore>()((set) => ({
  satellites: [],
  category: 'active' as SatCategory,
  lockedId: null,
  searchQuery: '',
  countryFilter: null,
  showOrbits: true,
  showCoverage: true,
  showJamming: true,
  showFlights: true,
  showVessels: true,
  showSatellites: true,
  showStations: true,
  showQuakes: true,
  showEvents: true,
  activeImageryLayer: null,
  godsEyeMode: null,
  timelineOffset: 0,
  isPlaying: false,
  countryCounts: {} as Record<string, number>,
  sidebarCollapsed: false,
  quakes: [] as Quake[],
  events: [] as EONETEvent[],
  liveVessels: [] as AISVessel[],

  setSatellites: (sats: TLESatellite[]) => set({ satellites: sats }),
  setCategory: (cat: SatCategory) => set({ category: cat }),
  setLockedId: (id: string | null) => set({ lockedId: id }),
  toggleLock: (id: string) =>
    set((s) => ({ lockedId: s.lockedId === id ? null : id })),
  setSearch: (q: string) => set({ searchQuery: q }),
  setCountryFilter: (code: string | null) =>
    set((s) => ({ countryFilter: s.countryFilter === code ? null : code })),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleCoverage: () => set((s) => ({ showCoverage: !s.showCoverage })),
  toggleJamming: () => set((s) => ({ showJamming: !s.showJamming })),
  toggleFlights: () => set((s) => ({ showFlights: !s.showFlights })),
  toggleVessels: () => set((s) => ({ showVessels: !s.showVessels })),
  toggleSatellites: () => set((s) => ({ showSatellites: !s.showSatellites })),
  toggleStations: () => set((s) => ({ showStations: !s.showStations })),
  toggleQuakes: () => set((s) => ({ showQuakes: !s.showQuakes })),
  toggleEvents: () => set((s) => ({ showEvents: !s.showEvents })),
  setImageryLayer: (id: string | null) =>
    set((s) => ({ activeImageryLayer: s.activeImageryLayer === id ? null : id })),
  setGodsEyeMode: (id: string | null) =>
    set((s) => ({ godsEyeMode: s.godsEyeMode === id ? null : id })),
  setTimelineOffset: (offset: number) => set({ timelineOffset: offset }),
  setIsPlaying: (p: boolean) => set({ isPlaying: p }),
  setCountryCounts: (c: Record<string, number>) => set({ countryCounts: c }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v: boolean) => set({ sidebarCollapsed: v }),
  setQuakes: (q: Quake[]) => set({ quakes: q }),
  setEvents: (e: EONETEvent[]) => set({ events: e }),
  setLiveVessels: (v: AISVessel[]) => set({ liveVessels: v }),
}))

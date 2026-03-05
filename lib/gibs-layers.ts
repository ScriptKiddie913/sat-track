import type { GIBSLayer } from './types'

function getGIBSDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 2) // GIBS typically 1-2 days behind
  return d.toISOString().split('T')[0]
}

export const GIBS_LAYERS: GIBSLayer[] = [
  {
    id: 'modis_terra',
    name: 'MODIS Terra True Color',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${getGIBSDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    resolution: '250m',
    updateRate: 'Daily',
    maxZoom: 9,
  },
  {
    id: 'modis_aqua',
    name: 'MODIS Aqua True Color',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_CorrectedReflectance_TrueColor/default/${getGIBSDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    resolution: '250m',
    updateRate: 'Daily',
    maxZoom: 9,
  },
  {
    id: 'viirs_snpp',
    name: 'VIIRS SNPP True Color',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${getGIBSDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    resolution: '250m',
    updateRate: 'Daily',
    maxZoom: 9,
  },
  {
    id: 'viirs_night',
    name: 'VIIRS Night Lights',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-04-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    resolution: '500m',
    updateRate: 'Annual',
    maxZoom: 8,
  },
  {
    id: 'fires',
    name: 'Active Fires (MODIS)',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Thermal_Anomalies_Day/default/${getGIBSDate()}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
    resolution: '1km',
    updateRate: 'Daily',
    maxZoom: 7,
  },
  {
    id: 'snow_cover',
    name: 'Snow Cover (MODIS)',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDSI_Snow_Cover/default/${getGIBSDate()}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
    resolution: '500m',
    updateRate: 'Daily',
    maxZoom: 8,
  },
  {
    id: 'sea_surface_temp',
    name: 'Sea Surface Temperature',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L2_SST_Day/default/${getGIBSDate()}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
    resolution: '1km',
    updateRate: 'Daily',
    maxZoom: 7,
  },
]

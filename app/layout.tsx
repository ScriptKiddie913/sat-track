import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SAT-INTEL | Satellite Intelligence Platform',
  description:
    'Real-time satellite tracking, orbit prediction, GPS jamming detection, and Earth observation intelligence',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className="bg-intel-bg text-white antialiased">{children}</body>
    </html>
  )
}

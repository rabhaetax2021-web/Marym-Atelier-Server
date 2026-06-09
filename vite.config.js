import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { notifyReservationDevPlugin } from './vite-plugin-notify-api.js'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    notifyReservationDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['appicon.jpg', 'robots.txt'],
      manifest: {
        name: 'Marym Atelier',
        short_name: 'Marym',
        description: 'Bridal Couture — Rental Luxury Dresses',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/appicon.jpg',
            sizes: 'any',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
})

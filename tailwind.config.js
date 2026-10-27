/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hijau: '#00A859',
        kertas: '#FBF6EA',
        kopi: '#3B2416',
        sambal: '#D7362B',
        kunyit: '#F4B42A',
        pandan: '#2F8F5B',
        malam: '#140C1F',
      },
      fontFamily: {
        pixel: ['"Silkscreen"', 'monospace'],
        body: ['"Pixelify Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

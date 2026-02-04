/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'rikken-blue': '#60A5FA',
                'rikken-green': '#34D399',
                'rikken-accent': '#818CF8',
            },
            backgroundImage: {
                'gradient-main': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
            boxShadow: {
                'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
                'soft': '0 8px 30px rgba(0, 0, 0, 0.12)',
                'button': '0 4px 15px rgba(102, 126, 234, 0.4)',
            },
        },
    },
    plugins: [],
}

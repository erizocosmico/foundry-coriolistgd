const path = require('path');

const config = {
  root: './',
  base: '/systems/coriolistgd/',
  publicDir: path.resolve(__dirname, 'system'),
  server: {
    port: 8080,
    open: true,
    proxy: {
      '^/systems/coriolistgd/(lang|templates)/.*': {
        target: 'http://localhost:8080/',
        rewrite: (path) => path.replace(/^\/systems\/coriolistgd/, '/systems/coriolistgd/system'),
      },
      '^(?!/systems/coriolistgd)': 'http://localhost:30000/',
      '/socket.io': {
        target: 'ws://localhost:30000',
        ws: true,
      },
    },
  },
  build: {
    assetsInlineLimit: 0,
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    brotliSize: true,
    lib: {
      name: 'coriolis',
      entry: path.resolve(__dirname, 'src/index.js'),
      formats: ['es'],
      fileName: () => 'coriolis.js',
    },
    rollupOptions: {
      output: {
        assetFileNames(chunkInfo) {
          if (chunkInfo.name === 'style.css') return 'coriolis.css';
          return chunkInfo.name || '(name)';
        },
      },
    },
  },
  plugins: [],
};

export default config;

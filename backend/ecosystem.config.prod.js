module.exports = {
  apps: [{
    name: 'wia11y',
    script: 'src/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MONGODB_URI: 'mongodb+srv://wia11y_admin:ZZyTkJrL34javvag@wia11y.wpyxo.mongodb.net/?retryWrites=true&w=majority&appName=WiA11y',
      JWT_SECRET: 'p2s5v8y/B?E(H+MbQeThWmZq4t6w9z$C&F)J@NcRfUjXn2r5u8x/A%D*G-KaPdS',
      CORS_ORIGIN: 'https://wia11y.netlify.app'
    },
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    max_memory_restart: '500M'
  }]
}; 
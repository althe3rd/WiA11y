module.exports = {
  apps: [{
    name: 'wia11y',
    script: 'src/server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      MONGODB_URI: process.env.MONGODB_URI,
      JWT_SECRET: process.env.JWT_SECRET,
      CORS_ORIGIN: process.env.CORS_ORIGIN
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
    exp_backoff_restart_delay: 100,
    env_file: '.env.production'
  }]
} 
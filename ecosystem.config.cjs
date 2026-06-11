module.exports = {
  apps: [
    {
      name: 'marymatelier',
      script: './server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'marymatelier',
        DB_USER: 'app',
        DB_PASSWORD: 'Marym2026',
        DB_SSL: 'true',
        API_URL: '',
        CORS_ORIGIN: '',
        VITE_API_URL: '',
        LOG_LEVEL: 'info',
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      // Increase backoff so PM2 doesn't rapidly restart on repeated failures
      exp_backoff_restart_delay: 5000,
      // Extra delay before restarting (ms)
      restart_delay: 5000,
    },
  ],
};

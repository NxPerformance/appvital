module.exports = {
  apps: [
    {
      name: "vitalissy-backend",
      cwd: "/var/www/vital-app-main/backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};

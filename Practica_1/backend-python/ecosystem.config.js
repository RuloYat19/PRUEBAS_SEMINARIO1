module.exports = {
  apps: [{
    name: 'backend-python',
    script: 'src/server.py',
    interpreter: 'python3.11',
    args: '',
    env: {
      NODE_ENV: 'production',
      PYTHONUNBUFFERED: 'true'
    },
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '300M',
    error_file: '/home/ec2-user/logs/python-error.log',
    out_file: '/home/ec2-user/logs/python-out.log',
    log_file: '/home/ec2-user/logs/python-combined.log',
    time: true,
    kill_timeout: 5000
  }]
};
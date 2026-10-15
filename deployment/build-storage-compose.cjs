const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'storage-server.cjs'));
const command = JSON.stringify(['node', '-e', "eval(Buffer.from(process.env.STORAGE_SOURCE, 'base64').toString())"]);
const healthcheck = JSON.stringify(['CMD', 'node', '-e', "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);
const yaml = `services:
  inova-livros-storage:
    image: node:24.18.0-bookworm-slim
    container_name: inova-livros-storage
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    environment:
      STORAGE_SOURCE: ${JSON.stringify(source.toString('base64'))}
      STORAGE_ROOT: /data/capas
    command: ${command}
    volumes:
      - inova_livros_capas:/data
    networks: [secti]
    healthcheck:
      test: ${healthcheck}
      interval: 30s
      timeout: 5s
      retries: 3
volumes:
  inova_livros_capas:
    name: inova_livros_capas
networks:
  secti:
    external: true
`;
fs.writeFileSync(path.join(__dirname, 'storage.compose.yml'), yaml);

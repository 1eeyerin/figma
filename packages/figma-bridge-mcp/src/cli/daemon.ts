import { createBridgeDaemon } from '../daemon';

const daemon = createBridgeDaemon({
  wsPort: Number(process.env.WS_PORT ?? 8765),
  httpPort: Number(process.env.HTTP_PORT ?? 8766),
});

process.on('SIGTERM', () => {
  daemon.close();
  process.exit(0);
});

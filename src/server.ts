import { buildServer } from "./api/server.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildServer({ logger: true });

app
  .listen({ port, host })
  .then((address) => {
    app.log.info(`echo listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

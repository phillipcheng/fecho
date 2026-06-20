import { buildServer } from "./api/server.js";
import { createRepository } from "./store/factory.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  const { repo, backend, database } = await createRepository();
  const app = buildServer({ repo, logger: true });

  app.log.info(
    backend === "mysql"
      ? `echo store: mysql (database "${database}")`
      : "echo store: in-memory (set MYSQL_* env vars to persist)",
  );

  const shutdown = async () => {
    await app.close();
    await repo.close?.();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const address = await app.listen({ port, host });
  app.log.info(`echo listening on ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

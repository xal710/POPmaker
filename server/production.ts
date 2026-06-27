import { ensureComparisonDataFile } from "./config";
import { startPopServer } from "./startServer";

ensureComparisonDataFile();

void startPopServer({
  host: "0.0.0.0",
  port: Number(process.env.PORT) || 3000,
}).then(({ port, host }) => {
  console.log(`POP tool running at http://${host}:${port}`);
});

import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const dbUrl = process.env["SHARED_DATABASE_URL"] || process.env["DATABASE_URL"] || "";
const dbHost = dbUrl.replace(/:[^:@]*@/, ":***@").split("@")[1]?.split("/")[0] ?? "unknown";

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`DB host: ${dbHost}`);
});

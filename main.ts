import { app } from "./app.ts";
import { closeDatabase, initDatabase } from "./db.ts";

initDatabase();

const server = Deno.serve(app.fetch);
server.finished.then(() => closeDatabase());

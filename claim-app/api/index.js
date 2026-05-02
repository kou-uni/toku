// Vercel serverless entry — wraps the Express app so all routes
// (static + dynamic + API) are handled by a single function.
import app from "../server.js";
export default app;

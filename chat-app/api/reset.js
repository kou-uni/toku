// Vercel Serverless: /api/reset
// Stateless on Vercel — frontend should clear local state too.

export default async function handler(_req, res) {
  res.status(200).json({ ok: true, note: "stateless on serverless; client should clear UI state" });
}

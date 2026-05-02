// Vercel Serverless: /api/story/:beat
// Disabled on Vercel — requires shell tools (sui CLI, agent keypair, on-chain mutations).
// Use the local chat-app for full story playback.

export default async function handler(_req, res) {
  res.status(503).json({
    error: "story_unavailable_on_serverless",
    message: "ストーリー演出はオンチェーン操作を伴うため、ライブデモ環境(ローカル chat-app)で再生してください。",
  });
}

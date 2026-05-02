// Vercel Serverless: /api/tool/:name
// Disabled on Vercel — these endpoints execute Sui CLI shell scripts that
// require the agent's local keypair. Use the local chat-app to run them.

export default async function handler(_req, res) {
  res.status(503).json({
    error: "tool_unavailable_on_serverless",
    message: "オンチェーン操作はライブデモ環境(ローカル chat-app)で実行されます。",
  });
}

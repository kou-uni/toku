// Vercel Serverless: /api/story/list
// Read-only — list of beats. Actual story execution requires shell tools (local only).

const STORY_BEATS = [
  { id: "tsumu-self", label: "① 自分の中に、徳を積む(3分の座)", hasTool: true },
  { id: "tsumu-share", label: "② 友達に紹介する(連鎖が始まる)", hasTool: true },
];

export default async function handler(_req, res) {
  res.status(200).json(STORY_BEATS);
}

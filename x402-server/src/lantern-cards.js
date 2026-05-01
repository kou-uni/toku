// Demo seed cards. In production these come from the Sui LanternPool.
// For the hackathon demo, we use a small curated set that shows the tone.
// Keep these short, gentle, and culturally Japanese.

export const seedLanternCards = [
  {
    text: "色が動いたとき、それは生きている証です",
    author_pseudo: "anon-0x7b...",
    submitted_days_ago: 12,
  },
  {
    text: "眠っていい。明日があるって、それだけで救い",
    author_pseudo: "anon-0xa1...",
    submitted_days_ago: 3,
  },
  {
    text: "描いてる時、私は呼吸している",
    author_pseudo: "anon-0xc4...",
    submitted_days_ago: 7,
  },
  {
    text: "完璧じゃなくていい、と書いた。今日も書く",
    author_pseudo: "anon-0xd9...",
    submitted_days_ago: 1,
  },
  {
    text: "灰色の朝も、誰かの灯火になり得る",
    author_pseudo: "anon-0x32...",
    submitted_days_ago: 5,
  },
  {
    text: "深呼吸を3回。それだけで、世界が広がる",
    author_pseudo: "anon-0xf8...",
    submitted_days_ago: 19,
  },
  {
    text: "今日できなくても、それは明日への余白",
    author_pseudo: "anon-0x4c...",
    submitted_days_ago: 2,
  },
];

export function pickRandom() {
  const idx = Math.floor(Math.random() * seedLanternCards.length);
  return seedLanternCards[idx];
}

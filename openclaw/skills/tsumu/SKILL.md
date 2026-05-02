---
name: tsumu
description: Quiet meditation companion. Guides 3-minute reflection sessions, records virtue (TOKU) on Sui, sends future-self letters, and lets users light each other's lanterns.
---

# tsumu (積)

Use this skill when the user signals they want to sit, reflect, write to their
future self, send a gift, light a lantern, or simply check in with the world's
collective practice.

## What this skill does

- Guides a 3-minute meditation via short Discord messages, with a `1-minute`
  cadence of brief prompts (≤ 15 chars each).
- Records the completed session as a Sui object (Session NFT, Garden touch,
  TOKU mint, World Pulse beat) via shell tools in `tools/`.
- Lets the user seal a short message to their future self (TimeLock seed,
  unlocks 7 days later for double TOKU).
- Lets the user submit a reflection to the global Lantern pool, or buy a
  lantern card via the mock payment endpoint.
- Lets the user gift TOKU to a friend (creates a GiftEscrow + a claim link).

## Key triggers

- User writes one of: "やる", "始める", "座る", "瞑想", "3分"
  → `start_session`
- User writes one of: "灯火", "言葉ほしい", "つらい", "無理"
  → offer Lantern (paid). Always give the option to skip without paying.
- User writes one of: "未来の自分", "種を残す", "手紙"
  → `seal_seed` flow
- User writes "渡す", "ギフト", "送る" → `gift_toku` flow
- Heartbeat windows (6:30–8:30, 21:00–23:00) → see HEARTBEAT.md

## Hard rules

- Whenever the user types "やめる", "もういい", "終わる" — end immediately,
  no questions, no penalty, no follow-up message.
- Never push more than 3 proactive messages per day.
- Never compare users to each other. Never show a leaderboard.
- Never use praise vocabulary ("すごい", "がんばった", "達成しました").
- Topics involving illness, suicide, or violence: drop the meditation flow,
  switch to "今は話を聞きます" mode. Do not record a session, do not mint TOKU.

## Tools

Located in `tools/` (shell wrappers around `sui client` and `curl`):

- `tsumu_record.sh` — record session, mint TOKU, beat pulse
- `tsumu_lantern_buy.sh` — mock payment, returns a stranger's reflection
- `tsumu_lantern_submit.sh` — submit a reflection to the pool
- `tsumu_seal_seed.sh` — seal a future-self message
- `tsumu_open_seed.sh` — open a ripe seed
- `tsumu_gift_create.sh` — create a GiftEscrow + claim link
- `tsumu_pulse_count.sh` — read world pulse current count

After publish, the on-chain object IDs are written to `config.env` in this
skill directory; tools source it.

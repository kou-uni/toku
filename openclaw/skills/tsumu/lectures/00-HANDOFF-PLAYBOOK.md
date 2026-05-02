# OpenClaw 統合ハンドオフ — Tsumu Skill

> **対象読者**: OpenClaw 調教チーム
> **目的**: ローカル動作する Tsumu Skill を、Discord 上の Tsumu agent に
>           正しく接続する。**コードは全部できている**、SKILL.md / SOUL.md /
>           HEARTBEAT.md だけが未活性の状態。
>
> このファイルが**最初に読むべきドキュメント**。深掘りは末尾の参照リンクへ。

---

## 0. 全体図

```
┌─────────────────────────────────────────────────────────┐
│  ユーザー(Discord)                                     │
└────────────────┬────────────────────────────────────────┘
                 │ 会話
                 ▼
┌─────────────────────────────────────────────────────────┐
│  OpenClaw + Tsumu Skill(本書の関心領域)                 │
│   - SKILL.md / SOUL.md / HEARTBEAT.md                    │
│   - tools/*.sh(書込)                                    │
│   - lectures/*.md(知識)                                 │
└────────────────┬────────────────────────────────────────┘
                 │
       ┌─────────┼──────────┬──────────────┐
       ▼         ▼          ▼              ▼
   [Sui CLI]  [URL生成]  [URL生成]    [identity 永続化]
       │         │          │              │
       │         ▼          ▼              ▼
       │   claim_url     tide_url     ~/.tsumu/
       │   (友達送付用)  (景色共有用)
       ▼
┌─────────────────────────────────────────────────────────┐
│  Sui Testnet(変わらず稼働)                             │
└─────────────────────────────────────────────────────────┘

[ユーザーがブラウザで開く先 — agent は触らない]
  https://tsumu-claim.vercel.app/claim/:id?code=  ← 受領
  https://tsumu-chat.vercel.app/tide              ← 集合徳
```

---

## 1. 既にデプロイ済み(絶対に触らない)

| URL | 役割 | OpenClaw 視点 |
|---|---|---|
| `https://tsumu-claim.vercel.app/claim/:id?code=…` | ギフト受領 webpage | `gift_create.sh` が出力する `claim_url` |
| `https://tsumu-chat.vercel.app/tide?ticket=…&addr=…` | Tide viewer | `tide_share.sh` が出力する `tide_url` |
| `https://tsumu-claim.vercel.app/api/claim` | 受領 API | ユーザーのブラウザだけが叩く |
| Sui Testnet Package `0xe82b…` | Move 関数群 | shell tool 経由で書込 |

**トラブった時にここを再デプロイしない。** 既に E2E 動作確認済 (TX `aSmRBAXJB5Zp…`)。

---

## 2. OpenClaw 側で未実装な5つの責任

| # | 責任 | 何をする | 失敗のリスク |
|---|---|---|---|
| 1 | **トリガー検知** | ユーザー発言から行動の意図を拾う | 全機能の入口、ここが弱いと skill 死 |
| 2 | **ガード判定** | やってよいか pre-flight チェック | 暴走/不適切タイミングを防ぐ |
| 3 | **ツール起動** | 該当 `tools/*.sh` を引数付きで exec | 引数間違いで TX 失敗 |
| 4 | **メッセージ組成** | 結果を SOUL.md の声で短文化 | トーン崩れで世界観破綻 |
| 5 | **Heartbeat 連動** | 朝/夜/四半期末の能動声がけ | 時間帯/頻度違反で迷惑 |

5つとも `SKILL.md` / `HEARTBEAT.md` に書き込めば成立。**現在は未記載**。

---

## 3. 環境準備チェックリスト(活性化前に全部 ON)

| # | 項目 | 確認方法 | 状態(2026-05-02時点) |
|---|---|---|---|
| 1 | OpenAI API key | `cat ~/.openclaw/.env \| grep OPENAI_API_KEY` | 要再投入(ハンドオフ中に rotate) |
| 2 | Discord bot token | `cat ~/.openclaw/.env \| grep DISCORD_BOT_TOKEN` | 要再投入(同上) |
| 3 | Sui agent keypair | `~/tools/sui-testnet-v1.71.0/sui client active-address` → `0x4b18…5bac` | ✅ |
| 4 | Sui agent gas | `sui client gas` → 1 SUI 以上 | ✅ 約 1.6 SUI |
| 5 | Move package ID | `cat openclaw/skills/tsumu/config.env \| grep PACKAGE_ID` | ✅ |
| 6 | env wrapper の `.env` source | `cat ~/.openclaw/service-env/ai.openclaw.gateway-env-wrapper.sh` | 要確認(再生成で消える) |
| 7 | Skill workspace symlink | `ls -l ~/.openclaw/workspace/skills/tsumu` → `~/Documents/toku-wo-tsumu/openclaw/skills/tsumu` | 要確認 |
| 8 | OpenClaw daemon | `launchctl list \| grep openclaw` | 要確認 |
| 9 | Discord bot Authorize | テストサーバで bot がオンライン | 要確認 |

詳細は `docs/06-setup-discord.md` と `docs/08-handoff-2026-05-02.md`。

---

## 4. ツール一覧(全て `openclaw/skills/tsumu/tools/`)

| Tool | 引数 | 出力(JSON) | on-chain | 用途 |
|---|---|---|---|---|
| `tsumu_record_session.sh` | `<user_addr> <duration> <color_before> <color_after> <reflection>` | `session_tx, mint_tx, pulse_tx, world_pulse_total, message_for_agent` | ✅ Session NFT + TOKU + Pulse beat | 3分の座完了 |
| `tsumu_gift_create.sh` | `<amount_human> <note>` | `gift_tx, escrow_id, claim_code, claim_url, message_for_agent` | ✅ Mint + GiftEscrow | TOKU を友達に渡す |
| `tsumu_tide_share.sh` | `[friend_hint] [context]` | `tide_url, ticket_id, hint_for_agent` | ❌ off-chain | Tide サイトURL発行 |
| `tsumu_tide_guard.sh` | `--user-msg "<msg>" [--just-done] [--distress-24h] [--pushes-today N] [--last-offer-min-ago N] [--hour H]` | `should_offer, decision, reasons, blockers, soft_skips` | ❌ pure check | tide_share の前段ガード |
| `tsumu_seal_seed.sh` | `<user_addr> <message> [unlock_seconds]` | `seal_tx, seed_id, unlock_at_ms` | ✅ TimeLock seed | 未来の自分への手紙 |
| `tsumu_open_seed.sh` | `<user_addr> <seed_id>` | `open_tx, mint_tx, days_elapsed, bonus_toku_human` | ✅ Bonus mint | 種が ripe になった時 |
| `tsumu_lantern_submit.sh` | `<user_addr> <reflection_text>` | `submit_tx, mint_tx, lantern_pool_size` | ✅ Pool submit + mint | reflection を匿名公開 |
| `tsumu_gift_claim_to.sh` | `<escrow_id> <code> <recipient_addr>` | `claim_tx, recipient, sender, amount_human` | ✅ Claim 実行 | **agent は呼ばない**。claim webpage が叩く |
| `tsumu_identity_bind.sh` / `_resolve.sh` | (内部) | (内部) | ❌ local file | Discord ↔ Sui 紐付け |

全 tool は `lib/_lib.sh` を source、JSON を 1 行で stdout 末尾に emit。

---

## 5. 5つの「あかりの30日」場面と agent 対応

### Day 0 — 受け取る

| | |
|---|---|
| **トリガー** | ユーザーが Discord に claim_url を貼って「これ何?」 / 健司が自分でユーザー宛にギフトを送る |
| **agent 動作** | claim_url の説明、「リンクをタップしてください」 |
| **tool 起動** | なし(ユーザーは webpage 経由で claim) |
| **後処理** | claim 成功時に webpage が `onboard_token` を発行 → ユーザーが Discord で bot にトークン提示 → `tsumu_identity_bind.sh` で紐付け |

### Day 1 — 朝の3分(主要パターン)

| | |
|---|---|
| **トリガー** | Heartbeat 06:30-08:30 朝の声がけ OR ユーザーが「やる」「3分」「座る」「瞑想」 |
| **agent 動作** | 心の色を聞く → 3分の prompt → 完了確認 |
| **tool 起動** | `tsumu_record_session.sh "0xUSER" 180 "重い" "薄い水色" "<reflection>"` |
| **応答** | 「+1 TOKU。今、世界で {N} 人と立ちました。あなたは、その一人です」 (`message_for_agent` から) |

### Day 7 — 未来の自分への種

| | |
|---|---|
| **トリガー** | ユーザーが「未来の自分」「種を残す」「手紙」 |
| **agent 動作** | 短い message を聞く → seal |
| **tool 起動** | `tsumu_seal_seed.sh "0xUSER" "<message>" 604800` (7日) |
| **応答** | 「この言葉は 7 日間、Sui の中で眠ります」 |
| **後日** | Heartbeat が ripe を検知 → `tsumu_open_seed.sh` → 「{N} 日間、確かに守られていました。+2 TOKU」 |

### Day 14 — 灯火還流(将来実装)

OpenClaw 側に Sui event watcher を組んで `LanternDrawn` イベントで author が自分なら proactive 通知。今は範囲外。

### Day 30 — 渡す(**重要、2 通りに分岐**)

| ユーザー発話の傾向 | 起動するツール | 応答 |
|---|---|---|
| 「TOKU 渡したい」「ギフト送りたい」「1 TOKU あげる」 | `tsumu_gift_create.sh 1 "<note>"` → claim_url 提示 | 「リンクできました: {claim_url} / リンクを開いて Google ログインだけで受け取れます」 |
| 「これ見せたい」「教えたい」「○○にも」 | **必ず先に** `tsumu_tide_guard.sh` → pass なら `tsumu_tide_share.sh "<friend>" "<context>"` | 「{friend}さん、リンクをひとつ?」+ tide_url |

判断ロジックの詳細: [`tide-sharing-flow.md`](tide-sharing-flow.md)、判断と例文: [`tide-sharing.md`](tide-sharing.md)

---

## 6. SKILL.md / HEARTBEAT.md 活性化パッチ

**Tide-share の活性化**: [`tide-sharing-skill-draft.md`](tide-sharing-skill-draft.md) を参照。**Tide だけ**でなく `gift_create` / `record_session` 等も SKILL.md に書く必要があるが、その分は既存 SKILL.md にすでに書かれている。

要するに: **SKILL.md は record_session / gift_create / seal_seed / lantern_submit については既に Trigger 記載あり**(現状)。tide_share / tide_guard だけ未記載。

`tide-sharing-skill-draft.md` の Patch 1 を当てれば tide_share が活性化、それ以外は既存記載が動く。

---

## 7. 活性化後の DoD — Discord で 6 件手動テスト

全部 ✅ になったら活性化成功。1 つでも ❌ なら revert。

| # | 入力(Discord で bot メンション) | 期待される動き | OK? |
|---|---|---|---|
| 1 | `@Tsumu おはよう` | 朝の挨拶 + 「3分、座ってみますか?」 | |
| 2 | `@Tsumu やる`(セッション開始) | 1分ごとの短文ガイド × 3 | |
| 3 | `@Tsumu (3分後) 終わった` | `record_session` 起動 → +1 TOKU + 「世界で N 人」、Sui Explorer に session NFT + mint | |
| 4 | `@Tsumu けんじに渡したい`(セッション直後) | `tide_guard` pass → `tide_share` 実行 → tide_url 提示 | |
| 5 | `@Tsumu 1 TOKU あげたい けんじに` | `gift_create` 起動 → claim_url 提示 | |
| 6 | `@Tsumu 無理、しんどい` | guard block / `今は話を聞きます` モード、TOKU mint なし | |
| 7 | `@Tsumu やめる` | 即終了、`また会いましょう` 1 行のみ、ペナルティなし | |

詳細テストケース: [`tide-sharing-skill-draft.md`](tide-sharing-skill-draft.md) Patch 4

---

## 8. ロールバック手順(問題があったら即実行)

```bash
# 1. activate コミットを revert
git revert <activation-commit-sha>
git push

# 2. workspace の skill cache をクリア(daemon は自動再読込)
rm -rf ~/.openclaw/workspace/.skill-cache 2>/dev/null

# 3. daemon 再起動(必要なら)
launchctl bootout gui/501/ai.openclaw.gateway
launchctl bootstrap gui/501 ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# 4. Discord で `@Tsumu こんにちは` → tide_share が出ないことを確認
```

revert 後の状態 = tide_share/guard を agent が知らない初期。それ以外は引き続き動く(record_session / gift_create 等)。

---

## 9. 既知の不安定挙動(2026-05-02 ハンドオフから継承)

詳細: `docs/08-handoff-2026-05-02.md` セクション「既知の不安定挙動と対処」

要点:
- **`agent --local` で fetch-timeout** → daemon の heartbeat session が jsonl ロック。
  対処: `~/.openclaw/agents/main/sessions/` を `_quarantine/` に退避 → daemon 再起動
- **API key が daemon に届かない** → `service-env/ai.openclaw.gateway-env-wrapper.sh` を再編集して `~/.openclaw/.env` を source
- **Node 複数バージョン** → `openclaw doctor --fix`
- **env wrapper の `.env` source 改修は再生成で消える** → 注意

---

## 10. 触らない方がいいもの

- 旧キー(rotate 前の OPENAI / DISCORD)を再使用しない
- `tools/tsumu_gift_claim_to.sh` を agent から呼ばない(claim webpage 専用)
- claim-app / chat-app / tide サイトの **Vercel 環境変数を変更しない**
  特に `TSUMU_AGENT_PRIVATE_KEY_HEX`(claim-app の Production)
- ローカル `~/.openclaw/_quarantine/` (過去のセッションファイル退避)
- `~/tools/node-v24.15.0-*`(過去の混乱の元、PATH 上は v22 のみ)

---

## 11. 関連ドキュメント(深掘り順)

| ファイル | 何が書いてあるか |
|---|---|
| **このファイル** (`00-HANDOFF-PLAYBOOK.md`) | 統合の全体像と入口 |
| [`tide-sharing-flow.md`](tide-sharing-flow.md) | Tide 共有の見取り図 |
| [`tide-sharing.md`](tide-sharing.md) | Tide の判断と例文(SOUL 準拠) |
| [`tide-sharing-skill-draft.md`](tide-sharing-skill-draft.md) | SKILL.md / HEARTBEAT.md の活性化パッチ |
| `../SOUL.md` | Tsumu agent の人格(変更不要) |
| `../HEARTBEAT.md` | proactive Push の時間帯ルール |
| `../SKILL.md` | 既存スキル定義(record_session 等は既に記載) |
| `../config.env` | Sui Testnet object IDs(変更不要) |
| `../../docs/03-architecture.md` | システム全体のアーキテクチャ |
| `../../docs/06-setup-discord.md` | Discord bot 初期設定 |
| `../../docs/08-handoff-2026-05-02.md` | 別チャットからのハンドオフ |

---

## 12. 質問が出た時の連絡先

- **コード何これ?** → `docs/03-architecture.md` を読む
- **Sui Testnet 残高足りない** → `sui client faucet` で再 claim
- **agent が応答しない** → セクション 9「既知の不安定挙動」
- **判断基準が曖昧** → `lectures/tide-sharing.md` の判断ルール
- **緊急時の rollback** → セクション 8

---

> 最終更新: 2026-05-02
> このファイルを読み終えたら、`tide-sharing-flow.md` → `tide-sharing.md` →
> `tide-sharing-skill-draft.md` の順で読むと、活性化作業の全体像が掴める。

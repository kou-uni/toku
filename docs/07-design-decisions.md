# 07. 設計判断の記録(2026-05-02 提出前)

> 提出 4-5 時間前(13:00–14:30 頃)に行った構成判断と、その理由。
> 本ドキュメントは「最終的に何を選んだか」を残すためのもの。
> 試行錯誤の詳細経緯は意図的に省略している。

---

## 全体構成図(最終形)

Tsumu は **2 つの利用動線(surface)を並行**で持つ。両者は同じ `openclaw/skills/tsumu/` 配下の `SOUL.md`(人格)と `tools/`(オンチェーンスクリプト群)を共有する。

```
                    ┌──────────────────────────┐
                    │  公開(Vercel)            │
                    │                            │
                    │   toku-site (静的)        │
                    │   ├─ /  Landing page      │
                    │   ├─ /pitch        (full) │
                    │   ├─ /pitch-2min          │
                    │   └─ /pitch-story         │
                    │                            │
                    │   ⤷ ここに claim/Discord  │
                    │      への導線(リンク)を  │
                    │      OpenClaw が提示する  │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                      │
              ▼                                      ▼
   ┌──────────────────────┐              ┌──────────────────────┐
   │  Web 動線(画面共有) │              │  Discord 動線(本命) │
   │                      │              │                      │
   │  Browser             │              │  Discord client      │
   │     │                │              │     │                │
   │     ▼                │              │     ▼                │
   │  ローカル            │              │  Discord (discord.com│
   │  chat-app  :3100     │              │  からの outbound conn)│
   │  ├─ /api/chat        │              │     │                │
   │  │  (OpenAI 直接)    │              │     ▼                │
   │  ├─ /api/tool/*      │              │  ローカル OpenClaw   │
   │  │  (sui CLI)        │              │  daemon  :18789      │
   │  └─ /api/state       │              │  ├─ Skill: tsumu     │
   │  (Sui RPC)           │              │  │   SOUL.md         │
   │                      │              │  │   tools/          │
   │  ※ 自前 bridge      │              │  ├─ OpenAI 呼び出し  │
   │    SOUL は同じ参照   │              │  └─ Tsumu リンク提示 │
   │                      │              │     (claim/site URL) │
   └──────────┬───────────┘              └──────────┬───────────┘
              │                                      │
              └──────────────┬───────────────────────┘
                             │ 両 surface が同じ tools/ を実行
                             ▼
              ┌──────────────────────────────┐
              │  ローカル共通                  │
              │                                │
              │  claim-app :3000              │
              │   (ギフト受領 UI + sui CLI)   │
              │                                │
              │  openclaw/skills/tsumu/       │
              │   SKILL.md / SOUL.md /        │
              │   HEARTBEAT.md / tools/(6)   │
              │                                │
              │  move/tsumu/                  │
              │   Sui Move 7 モジュール       │
              │   (Testnet publish 済み)      │
              │                                │
              │  scripts/demo-runner.sh       │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  外部依存                      │
              │                                │
              │   Sui Testnet                 │
              │     Package v1: 0xbb21…7f02   │
              │     Package v2: 0xe82b…2f43   │
              │                                │
              │   OpenAI API                  │
              │     gpt-4o-mini               │
              └──────────────────────────────┘
```

**重要**: Discord 動線は **Discord 側からの outbound 接続**でローカル OpenClaw に届くので、tunnel(ngrok / cloudflared)は不要。OpenClaw daemon が discord.com への WebSocket gateway を貼って待ち受ける構造。

---

## リポジトリ分割

ハッカソン提出までの 4-5 時間で「公開できるもの」と「ローカルで動くもの」を分離するため、リポジトリを 2 本立てに整理した。

| リポジトリ | 役割 | 公開状態 |
|---|---|---|
| **kou-uni/toku-site** | プレゼン用静的サイト(本ドキュメントは含まれない) | Vercel 公開 |
| **kou-uni/toku-wo-tsumu** | 実装本体(本ドキュメント含む) | リポジトリ自体は public、デプロイなし |

### 判断理由

- **公開する価値があるもの = ピッチ**(judge / 翌日に見直す観客向け)
- **デモは画面共有で見せる**(claim/chat/Sui Explorer/ターミナル)
- ローカル実行のコードを Vercel に上げると、Sui CLI / 秘密鍵 / シェルツールが乗らない構造になる ── 移植コストが高い割に、ハッカソン文脈では「ライブで動く」を見せれば十分
- 後日、別チームメンバが入る・OSS 化するときに分離されている方が動きやすい

---

## 実行スタックの構成要素

### chat-app(port 3100) ── Web 動線のバックエンド

`chat-app/server.js` — Express サーバ。3 つの責務を持つ。

1. **LLM bridge**: `/api/chat` で OpenAI `gpt-4o-mini` を直接呼ぶ。
   `SOUL.md` を system prompt として load し、Tsumu の声色(あかり調)で応答させる。
2. **オンチェーンツール起動**: `/api/tool/{record-session,lantern-submit,seal-seed,gift-create}` が各 `tsumu_*.sh` を `execFile` する。シェルが `sui client call` 等を叩いて TX を発行。
3. **可視化 + identity**: `/api/state`(TOKU 残高 / pulse / pool)、`/api/sui/stats`(events feed + diaspora)、`/api/identity/*`(Discord ↔ Sui の bind を file-backed で管理)、`/tide`(集合徳→寄付の三輪可視化)。

### claim-app(port 3000) ── 共通受領フロー

`claim-app/server.js` — claim ページ専用 Express。Web 動線 / Discord 動線どちらからも、ギフト URL を踏めばここに着く。
- `/claim/:id?code=...` → 静的 HTML(`public/claim.html`)
- `/api/escrow/:id` → `sui client object` でエスクロー詳細取得
- `/api/claim` → `tsumu_gift_claim_to.sh` を実行 → モック zkLogin で fresh address を生成 → claim 完了後、chat-app に onboard token を発行依頼

### OpenClaw + openclaw/skills/tsumu/ ── Discord 動線の中核

OpenClaw 2026.4.29(npm global on Node 22.22.2、`~/.openclaw/`) がローカル daemon として常駐し、Discord channel plugin で discord.com に outbound で接続する。Discord で bot にメンションが届くと、`tsumu` skill が呼ばれる。

Skill 構成:
- `SKILL.md` — 何ができるかの宣言
- `SOUL.md` — あかり調の人格(chat-app と共有)
- `HEARTBEAT.md` — 30分毎の proactive トリガ
- `tools/` — 6 シェルスクリプト(chat-app と同じ実体を呼ぶ)
- `config.env` — オブジェクト ID 群

**Discord 動線で OpenClaw が果たす役割**:
1. Discord ユーザーの自然言語を受ける(「今日疲れた」「友達に渡したい」等)
2. SOUL.md に従ってあかり調で応答
3. 必要に応じて `tools/` を呼び、オンチェーン操作を実行
4. **応答に Tsumu の各リンク(toku-site のページ / claim URL / 自分の徳の Sui Explorer URL 等)を含めて提示する** ← OpenClaw が「ハブ」として機能

### move/tsumu/

7 モジュール(toku / session / garden / gift / timelock / lantern / pulse)。Sui Testnet に v1 publish 済み、v2 で `gift::claim_to` を追加 upgrade 済み。

---

## 設計判断ログ

### 判断 1: 2 動線並行設計(Web は OpenAI 直接、Discord は OpenClaw)

**選択**: 同じ Skill 資産(`SOUL.md` + `tools/`)を 2 つの surface で再利用する。
- **Web 動線**: chat-app の `/api/chat` は OpenAI を直接呼ぶ(自前 thin bridge)
- **Discord 動線**: OpenClaw daemon が Discord channel plugin 経由で待ち受け、`tsumu` skill 経由で OpenAI を呼ぶ

両方とも同じ `tools/` を実行して同じ on-chain 効果を出す。

**理由**:
- **Web 側**: ブラウザのデモは「画面共有でその場で動かす」が目的。レイヤを増やすと故障点が増えるので、最短経路の OpenAI 直叩きが妥当
- **Discord 側**: 「メッセージング・アプリ標準対応」「Heartbeat」「Markdown memory」「sui-agent-wallet 既存」という OpenClaw 本来の強みを活かす場面。Web 側で OpenClaw を経由する必要はないが、Discord 側では **OpenClaw でなければ実装が膨大になる**(channel 多重化・session 永続化・skill ホットリロード等)
- Skill 資産(`SOUL.md` / `tools/`)を **両方が共有**するため、人格・on-chain 振る舞い・将来の機能追加が二重実装にならない

**トレードオフ**:
- ✓ ハッカソン提出物は Web も Discord も両方デモ可能
- ✓ 「OpenClaw を本来の用途で使っている」と素直に言える
- ✓ どちらかが調子悪い当日でも片方で押し通せる(リスク分散)
- ✗ ペルソナや tool 仕様の更新は 2 surface 両方の動作確認が必要

### 判断 2: OpenClaw はローカル only(tunnel 不要)

**選択**: OpenClaw gateway を tunnel(ngrok / cloudflared)で公開しない。インバウンド接続をローカルに通す経路は作らない。

**理由**:
- **Discord 動線の通信方向は outbound**: ローカル OpenClaw daemon が discord.com への WebSocket gateway を貼り、Discord 側から push される events を受ける。よってローカル側にインバウンドポートは不要
- **Web 動線も画面共有でデモする**前提で、ローカル :3100 / :3000 をブラウザから直接叩く。tunnel 経由のリモート公開は提出物の範囲外
- tunnel を立てると、デモ中に URL 切替・タイムアウト等の事故ポイントが増える

**結果として**: ハッカソン提出物の公開面は **toku-site(Vercel 静的)だけ**。実行系は全部ローカルで、デモ中に画面共有 + Discord 経由のリモートアクセスが共存する。

### 判断 3: toku-site は完全静的、サーバ関数なし

**選択**: `toku-site` には Vercel Serverless Function を置かない。`OPENAI_API_KEY` は env var として登録済みだが、現時点では使う場所がない。

**理由**:
- 必要だったのは「ピッチ資料の公開」であって「サイトから対話できること」ではない
- 後で「ひとこと Tsumu に聞いてみる」インタラクションを追加するなら、`api/chat.js` を 1 ファイル足すだけ。env var はその時のために予約

**今後の拡張ポイント**:
- `api/chat.js` を作って `process.env.OPENAI_API_KEY` を使い、`SOUL.md` 同等の system prompt で短い対話を返す
- 入力欄を `index.html` に追加 → fetch('/api/chat', ...)

### 判断 4: 決済は将来の Sui ネイティブ実装、本日は decoupled モック

**選択**: `lantern_buy` 系の課金フローは省略。代わりに `lantern_submit`(投稿)だけを残し、UI 上の表現は「将来 Sui ネイティブ決済を組み込む」とする。

**理由**:
- 元計画は x402(Base Sepolia → Sui)だったが、設計判断としてシンプルさ優先で削除(commit `5d7defb`)。
- ハッカソン審査の論点は「集合徳の三輪が成立するか」であって「具体的な決済手段」ではない。
- decoupled モックにすることで、後日 Sui ネイティブ・USDC・x402 の何にでも差し替えられる。

### 判断 5: Discord 動線が本線、OpenClaw が「リンクのハブ」

**選択**: Discord 上で Tsumu bot にメンションするとあかりが応答し、必要なら **toku-site のページ URL / claim URL / 自分の徳の Explorer URL 等を提示する**ことで、OpenClaw が「ユーザーを Tsumu の各サーフェスに案内するハブ」として機能する。claim 完了後の「Discord に招き入れる」CTA(commit `c2f316c`)→ Discord で初対面 → OpenClaw が次の体験(座/灯火/ギフト)に誘導、という連鎖。

**理由**:
- Discord は **「メッセージング・アプリで agent をホストする」OpenClaw の本来用途**にぴったり
- OpenClaw の Heartbeat(30分毎の能動トリガ)は、**朝の「今日の色は?」声がけ**を無料で実装できる ── これは Web 動線では再現できない非対称な価値
- Web 動線(chat-app)は能動的に開かないと使えないが、Discord は **DM が届くだけで Tsumu に再会できる**。Day 14 通知のような長期 UX の実装が現実的になる
- リンク提示は OpenClaw の応答に URL 文字列を埋めるだけで成立(複雑な認証連携不要)

**実装の現状**:
- OpenClaw 本体はローカルに 2026.4.29 で構築済み
- `tsumu` skill 構造(`SOUL.md` / `tools/` / `HEARTBEAT.md`)は完成
- Discord channel plugin 接続と bot token bind がこれからの作業

---

## デプロイ・運用メモ

### toku-site の更新フロー

```bash
cd ~/Documents/toku-site

# slides を更新したら再レンダ
npx -y @marp-team/marp-cli slides/tsumu-pitch.md      --html -o pitch.html      --allow-local-files
npx -y @marp-team/marp-cli slides/tsumu-pitch-2min.md --html -o pitch-2min.html --allow-local-files
npx -y @marp-team/marp-cli slides/tsumu-pitch-story.md --html -o pitch-story.html --allow-local-files

git add -A && git commit -m "update pitch" && git push
# Vercel が自動デプロイ
```

### ローカルスタック起動

```bash
# 1. 環境変数(API キー等)
source ~/.tsumu/env

# 2. claim-app(:3000)を別ターミナルで
cd ~/Documents/toku-wo-tsumu/claim-app && npm start

# 3. chat-app(:3100)を別ターミナルで
cd ~/Documents/toku-wo-tsumu/chat-app && npm start

# 4. オンチェーン疎通確認
~/Documents/toku-wo-tsumu/scripts/demo-runner.sh
```

### デモ画面構成(Plan B として確実に動く)

| 画面 | 内容 |
|---|---|
| 左 | ターミナル(`scripts/demo-runner.sh` の出力) |
| 中 | Sui Explorer(TOKU mint / Session NFT / Lantern submit ライブ反映) |
| 右 | claim webpage(ギフト受領のブラウザ UI) |

ナレーション(`slides/presentation-script.md`)で「あかりの 30 日」を語りながら、各ステップが対応する on-chain TX として通る様子を見せる。

---

## 残タスク

### 必須(Discord 動線完成まで)
- [ ] **OpenClaw に Tsumu skill を bind**(`~/.openclaw/workspace/skills/tsumu/` に symlink、または `openclaw/skills/tsumu/` を直接マウント)
- [ ] **Discord channel を有効化**(`channels.discord.enabled: true` + `DISCORD_BOT_TOKEN` を service-env 経由で daemon に渡す)
- [ ] **Discord bot を test server に invite** → メンションで agent が応答するか確認
- [ ] **リンク提示テスト**: bot に「ギフトを送りたい」と言って、claim URL が正しく返るか
- [ ] **API キーの旧キー revoke 確認**(セッション中漏洩した旧 OpenAI / Discord Bot Token が OpenAI ダッシュボード / Discord Developer Portal で無効化されているか)

### 提出物の仕上げ
- [ ] **デモ録画**(QuickTime + 4 画面分割: ターミナル / Sui Explorer / Discord / claim webpage)→ `~/Documents/toku-site/assets/demo.mp4` に置き、`index.html` のプレースホルダを `<video controls>` に差し替え
- [ ] **スクリーンショット**(chat / claim / Explorer / Discord 会話)を `assets/` に
- [ ] **スライドの Discord 動線パートを更新**(現状 Web 動線中心に書かれているなら、判断 1 の 2 動線並行を反映)

### 任意拡張(時間あれば)
- [ ] **toku-site に「ひとこと聞く」追加** — `api/chat.js` Serverless で OpenAI を呼ぶ(env var `OPENAI_API_KEY` 設定済み)
- [ ] **Heartbeat の実装** — `HEARTBEAT.md` を OpenClaw が 30 分毎に読み、朝の声がけを Discord DM で送る

---

## OpenClaw 動作の既知の注意点

セッション中に経験した OpenClaw 関連の不安定挙動を、再発した場合の対処として記録しておく。

### 1. `agent --local` で fetch-timeout が起きる場合

**症状**: `openclaw infer model run --local` は PONG を返すのに、`openclaw agent --local --agent main` だと `[fetch-timeout] fetch timeout reached; aborting operation` で落ちる。

**原因**: daemon 側の heartbeat embedded run が以前のセッションファイル(`~/.openclaw/agents/main/sessions/<UUID>.jsonl`)を `state=processing` のまま握り続け、新規 CLI run が同じ session に書き込もうとして lock 競合 → 10秒のロック待ちタイムアウト → embedded run が前進できず、内側の fetch watchdog が hang を検知して abort。

**対処**:
```bash
launchctl bootout gui/501/ai.openclaw.gateway
mkdir -p ~/.openclaw/_quarantine/sessions-$(date +%s)
mv ~/.openclaw/agents/main/sessions/* ~/.openclaw/_quarantine/sessions-$(date +%s)/
launchctl bootstrap gui/501 ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### 2. API キーが daemon に届かない場合

**症状**: `openclaw secrets audit` では `~/.openclaw/.env` を認識しているのに、daemon プロセス env に `OPENAI_API_KEY` が無い。

**原因**: LaunchAgent の env 注入経路は `~/.openclaw/service-env/ai.openclaw.gateway.env` のみで、ここに API キーは入らない設計。`~/.openclaw/.env` は daemon に渡されない。

**対処**: env wrapper script を編集して `.env` を source させる:
```sh
# ~/.openclaw/service-env/ai.openclaw.gateway-env-wrapper.sh
#!/bin/sh
set -eu
env_file="$1"
shift
if [ -f "$env_file" ]; then . "$env_file"; fi
if [ -f "$HOME/.openclaw/.env" ]; then
  set -a
  . "$HOME/.openclaw/.env"
  set +a
fi
exec "$@"
```

### 3. Node 複数バージョン時の install path 不整合

**症状**: `openclaw doctor` が "Gateway service entrypoint does not match the current install" と警告。daemon が古い Node install path を指している。

**原因**: 過去に別の Node 版で openclaw を install していた残骸が LaunchAgent plist に残る。

**対処**: `openclaw doctor --fix` で entrypoint を再生成。または LaunchAgent plist(`~/Library/LaunchAgents/ai.openclaw.gateway.plist`)を直接確認し、`<string>/Users/uni/tools/node-vXX...</string>` が現行版を指していることを確認。

---

## ファイル / リポジトリ早見表

| 場所 | 内容 |
|---|---|
| `~/Documents/toku-wo-tsumu/` | 実装本体(このリポジトリ) |
| `~/Documents/toku-site/` | プレゼン静的サイト |
| `~/.openclaw/` | OpenClaw ローカル状態(本日リセット済み、ハッカソン提出には不要) |
| `~/.tsumu/env` | API キー集約(chmod 600) |
| `~/tools/node-v22.22.2-darwin-arm64/` | OpenClaw が稼働する唯一の Node 環境 |
| `~/tools/sui-testnet-v1.71.0/sui` | Sui CLI(エージェント鍵を保持) |

---

## 参照

- `01-why-now.md` ── なぜ、今、瞑想か(大義)
- `02-design.md` ── 設計原則・ペルソナ・体験設計
- `03-architecture.md` ── 当初の技術アーキテクチャ
- `04-economy.md` ── TOKU トークン経済と寄付の仕組み
- `05-mvp.md` ── 12時間 MVP スコープとデモ脚本
- `06-setup-discord.md` ── Discord Bot セットアップ手順
- **`07-design-decisions.md` ── 本ドキュメント**

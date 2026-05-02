# 09. 活動ログ — 2026-05-02 午後〜夕方

> ハンドオフドキュメント [`08-handoff-2026-05-02.md`](08-handoff-2026-05-02.md)
> (14:50 時点)からの **継続作業ログ**。
> ハッカソン提出に向けて実装・統合・公開・整理を進めた記録。

---

## TL;DR

午後〜夕方で完了:

- **2 分版ピッチスライド** 作成 → GitHub Pages + Vercel に公開
- **claim-app の SDK 移植**(Vercel から直接 on-chain 書き込み可能に)
- **tide-app を新規構築 → chat-app に統合**(Vercel プロジェクト 4 → 3 に整理)
- **OpenClaw skill 群完成**(tools 2 個 + lectures 4 個、活性化前のハンドオフ完備)
- **UI motion 強化**(金バースト、count-up、Sui Explorer hero CTA)
- **デモ動画スライド** 追加 + スライド順序最適化(Cover → Architecture → Demo → 物語)
- **ハッカソン提出フォーム** の各セクション記入完了

未着手 / 別チーム引き継ぎ:
- **OpenClaw × Discord 活性化**(`activation team` へ playbook 経由でハンドオフ)
- 本物の `zkLogin` / `Sponsored Tx` / `Tide DAO Move 実装`(2nd / 3rd Wave 予定)

---

## 時系列(主要マイルストーン)

### 1. ピッチスライド作成

- `slides/tsumu-pitch-2min.md`(Marp 8 枚版)
- `docs/index.html`(自前 HTML deck、矢印キー / クリック / フルスクリーン操作)
- ストーリー骨格:あかりの 30 日(Cover → Day 0 → Day 1 LIVE → Day 14 → Day 30 → 輪は広がる → 締め)
- カバーは「ペルソナ」と明示してサイドカード化(過度の固有名詞を避ける)
- "そうして、輪は広がる" スライドは **左右二輪 + 統合文** で集合徳の経済を可視化

### 2. GitHub Pages 有効化

- `gh` CLI を `~/tools/gh/bin/` に手動インストール(brew 不在環境のため tarball 直接)
- 認証 → `gh api repos/kou-uni/toku/pages -X POST -f source[branch]=main -f source[path]=/docs`
- 公開:**https://kou-uni.github.io/toku/**

### 3. Vercel deploy(slides)

- `vercel` CLI 53.1.0 を npm install
- GitHub OAuth で `okayu` として認証(team `unis-projects-9a80993d`)
- 既存 `toku` プロジェクトに link → `vercel deploy --prod`
- SSO Protection を API で無効化(`PATCH /v9/projects/{id} ssoProtection: null`)
- 公開:**https://toku-lac.vercel.app/**

### 4. claim-app の SDK 移植

shell out (`sui client ...`) を **`@mysten/sui` SDK** に全面書換、Vercel 上で agent が直接署名できる構成へ。

#### 解決したつまずき
- **`@mysten/sui` v2 で `SuiClient` → `SuiJsonRpcClient` に rename** されており初回 import 失敗 → **v1.45 に固定**
- **MintAuthority の version 競合**:連続 tx で SDK 内部リゾルバが古い ref を返す
  - 対処: 3 オペレーション(claim_to + sender bonus mint + recipient bonus mint)を **単一 PTB にまとめて atomic 実行**
  - さらに `tx.objectRef(freshOwnedRef(...))` で MintAuthority 参照を**明示的に最新版**で渡す
- Agent 秘密鍵:`TSUMU_AGENT_PRIVATE_KEY_HEX` として Vercel 暗号化 env に格納
- `lib/sui.js` + `lib/tsumu.js` に切り出し、`server.js` をスリム化
- `api/index.js` で Express app を Vercel Serverless にラップ(後に individual handler に再構造化)

E2E 検証成功 — claim TX:
**https://suiscan.xyz/testnet/tx/aSmRBAXJB5Zpoi7mYWyzRPpxbwBpKaYp7x3WmdPnvXv**
(Vercel 単独で escrow → claim → recipient +2 TOKU、sender +1 TOKU の全フロー)

### 5. tide-app 新規構築 → chat-app に統合

#### 構築フェーズ
- `tide-app/` ディレクトリ新設、Express + serverless wrapper パターン
- `lib/sui.js` で read-only Sui RPC ヘルパ
- `?addr=<sui_addr>` で **個人パネル**(TOKU 残高 live + 直近 7 種の活動)
- `?ticket=<id>` で **OpenClaw 連携バッジ**
- Vercel に `tsumu-tide` 別プロジェクトとしてデプロイ → **https://tsumu-tide.vercel.app/**

#### 統合フェーズ(別チャットの handoff doc を読み込んだ後の判断)
- chat-app に既に `/tide` と `/api/tide/state` が存在(他チャットで実装済)
- **両方稼働は重複** → A 案(chat-app に統合)を実行:
  - `getActorSummary` + `isValidSuiAddr` を `chat-app/api/_lib/sui-rpc.js` に移植
  - `chat-app/api/tide/state.js` に `?addr=` `?ticket=` 対応追加
  - `chat-app/public/tide.html` に me-card + ticket-badge HTML 追加
  - `chat-app/public/tide.css` に対応する styles 追加
  - `tide-app/` ディレクトリ git rm
  - **`tsumu-tide` Vercel プロジェクト DELETE**(API 経由)
- canonical URL 確定:**https://tsumu-chat.vercel.app/tide**

### 6. OpenClaw skill 整備

未活性で **活性化準備完了** のまま、調教チームへ引き渡せる状態を構築。

#### 新規 tool(2 個)
| ファイル | 役割 |
|---|---|
| `tools/tsumu_tide_share.sh` | Tide URL 発行(off-chain、ticket ID 付与) |
| `tools/tsumu_tide_guard.sh` | Tide 提案前の pre-flight ガード(bash で if/then 化、6 ケーステスト済) |

#### 新規 lecture(4 個)
| ファイル | 役割 |
|---|---|
| `lectures/00-HANDOFF-PLAYBOOK.md` | **入口ドキュメント**。全体図 + 環境準備 + DoD 7 件テスト + ロールバック |
| `lectures/tide-sharing.md` | Tide 共有の判断と例文(SOUL.md 準拠の口調) |
| `lectures/tide-sharing-flow.md` | Tide フローの全体見取り図 |
| `lectures/tide-sharing-skill-draft.md` | `SKILL.md` / `HEARTBEAT.md` の活性化パッチ完成形 |

**設計上の特徴**:
- L1 哲学(SOUL.md)+ L2 判断ルール(lecture)+ L3 ガードスクリプト の **3 層矯正機構**
- ガードは bash で実装 → モデル温度依存をなくし「絶対停止」を保証
- SKILL.md / SOUL.md / HEARTBEAT.md は **一切触らない**(調教チーム判断で activate)

### 7. UI motion 強化(ステージ映え)

#### claim-app `/claim/:id` 成功画面
- ✦ チェックマーク:**scale + 微回転** ポップイン(cubic-bezier overshoot)
- 金色の **波紋エフェクト**(2 重 staggered ripple)
- 背景全体に **金色放射バースト**(1.2s)
- `+N TOKU` 数字を **0 から count-up**(900ms ease-out cubic)
- **「↗ Sui Explorer」hero CTA** を最上部に配置(金グラデ + 永続呼吸 + ホバーで halo 拡大)

#### chat-app `/tide` ページ
- `me-card`:**スライドダウン + bouncy + shimmer + 数字 count-up + ambient pulse**
- pool USDC:**0 から count-up**(初回)、**金色フラッシュ**(更新時)

### 8. デモ動画スライド追加

- ユーザー提供の Google Drive デモ動画(`1jiRLtvx...`)を `<iframe>` で埋込
- 金枠 + 呼吸ハロで強調
- `▶ Google Drive で開く` フォールバックリンク併設
- 当初 slide 0(deck 先頭)に配置 → 後に再配置

### 9. スライド順序最終化

ユーザーの判断で次の順序に:

| # | スライド | 役割 |
|---|---|---|
| **01** | Cover | ペルソナ + Tsumu 紹介 |
| **02** | Architecture | `/architecture` Mermaid 俯瞰図(iframe) |
| **03** | Demo Video | Google Drive 動画(iframe) |
| 04 | Why Now | 「AIが考える時代…」 |
| 05 | Day 0 | 受け取る |
| 06 | Day 1 LIVE | 朝の3分(黒背景) |
| 07 | Day 14 | 自分の言葉が誰かを灯した |
| 08 | Day 30 | 友達に渡す |
| 09 | そうして、輪は広がる | 二輪統合 |
| 10 | 締め | 加速器を作った者は… |

意図:**Cover → Architecture → Demo → narrative** の順で、聴衆が「誰 → 何 → 動く → 物語」を辿れる。

### 10. ハッカソン提出フォーム記入

各フィールドに対して回答テキストを準備:

- **About this team** — 「初めてのハッカソン、ソロ参加」+ プロジェクト概要
- **Tagline**(100 word 以内) — 「Tsumu(積)は、AI時代に立ち止まるための AI エージェント」 + Sui × OpenClaw + 反投機経済
- **About**(7 セクション) — What it does / Problem / Challenges / Tech / How / Learned / What's next
- **Updates in this Wave** — 約 3 倍ボリューム版、Sui の特性 + OpenClaw 連携 + 「急がない App」コンセプト
- **2nd Wave / 3rd Wave** — Discord 活性化 → 本物 zkLogin → Sponsored Tx / Tide DAO 実装 → NPO 提携
- **GitHub or Website** — `https://github.com/kou-uni/toku`
- **Application Form URL** — `https://tsumu-chat.vercel.app/tide`(触れる入口)
- **Deliverable URL** — `https://github.com/kou-uni/toku`
- **Tags** — `Move` / `@mysten/sui` / `OpenClaw`
- **Build with** — `Sui` / `Sui Move` / `zkLogin` / `OpenClaw` / `@mysten/sui SDK` / `Vercel` / `OpenAI` / `Discord` / `PTB` / `Sponsored Tx`
- **Product Category** — `AI Agent` / `Wellness` / `SocialFi`
- **Application Guidelines** — 「ご指導求む」謙虚 tone、SOUL.md の世界観そのまま

---

## 最終的に公開された URL 一覧

| URL | 役割 | 状態 |
|---|---|---|
| https://github.com/kou-uni/toku | Repo | ✓ |
| https://kou-uni.github.io/toku/ | Pitch deck(GitHub Pages) | ✓ |
| https://toku-lac.vercel.app/ | Pitch deck(Vercel)| ✓ |
| https://toku-site.vercel.app/ | プレゼン LP(別 repo)| ✓(別チャットで構築済)|
| https://tsumu-chat.vercel.app/ | Chat UI(Tsumu agent UI)| ✓ |
| https://tsumu-chat.vercel.app/tide | Tide ページ(集合徳)| ✓ |
| https://tsumu-claim.vercel.app/ | Claim webpage(ペイフォワード受領) | ✓ |
| (旧)https://tsumu-tide.vercel.app/ | 統合のため削除 | 🗑 404 |

---

## Vercel プロジェクト構成(整理後)

| プロジェクト | URL | Root | 環境変数 |
|---|---|---|---|
| `toku` | toku-lac.vercel.app | `/` | (なし) |
| `toku-site` | toku-site.vercel.app | `/`(別 repo)| `OPENAI_API_KEY` |
| `tsumu-chat` | tsumu-chat.vercel.app | `chat-app/` | `OPENAI_API_KEY` |
| `tsumu-claim` | tsumu-claim.vercel.app | `claim-app/` | `TSUMU_AGENT_PRIVATE_KEY_HEX` |

---

## アーキテクチャ整理 — このセッションの判断

1. **tide-app は重複 → chat-app に統合** — Vercel プロジェクト 4 → 3
2. **OpenClaw 接続は activation team へハンドオフ** — 当日中の安定動作リスクを避け、playbook で次の作業者に渡せる状態に
3. **slides の Vercel と GitHub Pages を同期** — `docs/index.html` を共通ソースに、両方が同じ deck を配信
4. **デモ動画 → 第 3 スライド配置** — 文脈(Cover + Architecture)を先に渡してから動画で実体を見せる流れ

---

## 既知のオープン項目(次のセッション以降)

### 直近(2nd Wave)
- **OpenClaw × Discord 活性化**(`00-HANDOFF-PLAYBOOK.md` を 1 周読んでから Patch 1 適用)
- **本物の zkLogin** へ移行(`@mysten/zklogin`)
- **Sponsored Transaction** 実装(`@mysten/enoki`)
- **Day 14 灯火還流通知**(Sui event watcher で `LanternDrawn` 購読)

### 中期(3rd Wave)
- **Tide DAO 投票の Move 実装**(現在は表示のみ)
- **寄付候補先 NPO との実提携**
- **LINE 公式アカウント対応**
- **学術提携**(灯火 reflection コーパス提供)

### セキュリティ追跡(継続)
- 旧 OPENAI_API_KEY / DISCORD_BOT_TOKEN の **revoke 完了確認**(handoff doc 08 参照)
- 新キーは Vercel と `~/.tsumu/env` に再配置済

---

## 関連ドキュメント

| ファイル | 役割 |
|---|---|
| [`08-handoff-2026-05-02.md`](08-handoff-2026-05-02.md) | 午前〜14:50 のログ(本ドキュメントの前段) |
| [`07-design-decisions.md`](07-design-decisions.md) | 設計判断記録 |
| [`03-architecture.md`](03-architecture.md) | システム全体のアーキテクチャ |
| [`05-mvp.md`](05-mvp.md) | MVP スコープと当初計画 |
| [`openclaw/skills/tsumu/lectures/00-HANDOFF-PLAYBOOK.md`](../openclaw/skills/tsumu/lectures/00-HANDOFF-PLAYBOOK.md) | 調教チーム向け活性化手順 |

---

> 最終更新: 2026-05-02(午後〜夕方)
> このドキュメントを読んでから次のセッションを開始すれば、続きから作業できます。

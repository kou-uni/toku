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

## Vercel operational info(再デプロイ・トラブル対応用)

| 項目 | 値 |
|---|---|
| Team slug | `unis-projects-9a80993d` |
| Team ID | `team_g5UjP54q1r7a6JjuvoLb9Bra` |
| Vercel CLI account | `okayu` |
| Vercel auth token | `~/Library/Application Support/com.vercel.cli/auth.json` |

### プロジェクト ID 一覧

| プロジェクト | Vercel project ID | 主な root | 主な env |
|---|---|---|---|
| `toku` | `prj_Jw2fLraU4smXkjr8MVzxXCDJU3wL` | `/`(`docs/` を `outputDirectory`) | (なし) |
| `tsumu-chat` | `prj_U8XA5iFCDpSRmi2AyHmwdYk8GTNT` | `chat-app/` | `OPENAI_API_KEY` |
| `tsumu-claim` | `prj_5faZ2aEMw4LysYsBtr6gpAbcBQNn` | `claim-app/` | `TSUMU_AGENT_PRIVATE_KEY_HEX` |
| `toku-site` | `prj_s9MzRaFJ3678AaUuXGegXFy0HYUD` | `/`(別 repo `kou-uni/toku-site`) | `OPENAI_API_KEY` |

### 共通操作

```bash
# manual deploy(対象 app の root から)
cd chat-app && vercel deploy --prod --yes
cd claim-app && vercel deploy --prod --yes
vercel deploy --prod --yes   # repo root の場合は toku プロジェクト

# SSO Protection 無効化(初回 deploy 直後の必要作業)
VERCEL_TOKEN=$(python3 -c "import json; print(json.load(open('/Users/uni/Library/Application Support/com.vercel.cli/auth.json'))['token'])")
TEAM_ID="team_g5UjP54q1r7a6JjuvoLb9Bra"
PROJECT_ID="<上記表から>"
curl -s -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

### GitHub 連携の有無

- どのプロジェクトも **明示的な GitHub 連携設定はしていない**(linked プロジェクト経由のみ)
- → main に push しても **自動 deploy はされない**、毎回 `vercel deploy --prod --yes` が必要
- 必要なら Vercel Dashboard から GitHub 接続を追加(後続作業者の判断)

---

## 並行編集された箇所(別チャットの作業)

本セッション中、別チャットでも作業が走っており、以下が並行して編集されました。
**統合済みなので動作はしている**が、競合防止のため記録:

| ファイル | 変更内容 | 由来 |
|---|---|---|
| `claim-app/vercel.json` | per-route handler 方式に書換(Express 全包みから) | 別チャット |
| `claim-app/public/claim.html` | `tide-cta-hero` ブロック追加(✦ の直下、Tide サイトへ誘導) | 別チャット |
| `claim-app/public/claim.html` | identity onboard-token モーダル追加(coming-soon dialog 内) | 別チャット |
| `claim-app/public/style.css` | 上記に対応する styles 追加 | 別チャット |
| `docs/index.html` | top-right の `アーキテクチャ →` ピル(`.top-link`)追加 | 別チャット |
| `docs/architecture.html` | Mermaid 俯瞰図ページ新規作成 | 別チャット |

**注意点(次のセッションで触る時):**
- `claim-app/vercel.json` は **rewrites を `/claim/:id → /claim.html` に統合**してあるので、API ルートと static ルートの両方が動く構成。Express 全包みパターンに戻さない
- `claim.html` の onboard-token ブロックは `chat-app/api/identity/*` と連動。chat-app 側の変更時に reciprocity を確認

---

## ピン留めしたツール / SDK バージョン(再現性のため)

| 項目 | バージョン | 備考 |
|---|---|---|
| Node.js | `v22.22.2-darwin-arm64` | `~/tools/node-v22.22.2-darwin-arm64/` |
| Sui CLI | `1.71.0` | `~/tools/sui-testnet-v1.71.0/` |
| `gh` CLI | `2.92.0` | `~/tools/gh/bin/gh`(brew 不在のため tarball 直接 install)|
| Vercel CLI | `53.1.0` | npm global、Node 22 配下 |
| `@mysten/sui` | **`1.45.2`** | **v2 で `SuiClient` → `SuiJsonRpcClient` に rename されたため v1 固定** |
| `express` | `^4.21.2` | claim-app, chat-app, (旧)tide-app |
| `openai` | `^4.76.0` | chat-app(`gpt-4o-mini`) |
| Mermaid | `10` | architecture.html(CDN ESM) |
| Marp | `@marp-team/marp-cli` 系 | スライドソース(2 分版) |

---

## 単独成果物としての `docs/architecture.html`

スライドの slide 2 に iframe 埋込しているが、**単独 URL でも公開**されている:

- 公開 URL: **https://toku-lac.vercel.app/architecture**
- ソース: [`docs/architecture.html`](architecture.html)
- 中身: Mermaid 10 で **Tsumu の俯瞰図**(課題 → Tsumu → OpenClaw × Sui → 集合徳の三輪)
- 依存:CDN(`https://cdn.jsdelivr.net/npm/mermaid@10/...`)経由でクライアント側レンダリング
- レイアウト:横長 1800px max、横幅 98vw、フォントサイズ 22px(プロジェクタ視認性向上)

別 chat 経由で生まれた成果物だが、現在 deck の核 1 枚として組み込み済。

---

## 現在の Sui Testnet 状態(2026-05-02 18:30 頃)

| 項目 | 値 |
|---|---|
| Agent address | `0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac` |
| Agent SUI 残高 | **約 1.51 SUI**(本セッション開始時 1.6 SUI から微減、十分余裕あり)|
| Agent TOKU 残高 | **81 TOKU**(handoff doc 08 時点 75 → +6:本セッション中の各種テスト分)|
| MintAuthority 現バージョン | `848296944`(`0x328d3b30`)|
| MintAuthority digest | `C35Dz2w2ADge8kHCo4m8MKmbaDzTT3kgtmLJEVRX1vfU` |

→ ハッカソンデモで使い切る心配なし。残り **数十 TX 分** の余裕。

---

## 命名・トーンの判断記録

このセッションで行った微調整(将来の意思決定のため):

| Before | After | 理由 |
|---|---|---|
| Cover の主役名「あかり、21歳の30日」 | 「ペルソナ」+ サイドカード化 | 固有名詞が唐突、デザイン装置として明示 |
| Day 0 footer:「『ウォレット作りました』とは絶対に言われない」 | 「ウォレットを意識しないままに、Sui ウォレットが伝播していく」 | 否定文 → 肯定の機構説明、Sui mass-adoption 訴求 |
| 旧 tagline:長文版 | 短文版 + plain text(no markdown) | フォーム制約 + 切れ味重視 |
| About this team:長文 | 「初めてのハッカソンです」+ 5 行短文 | 謙虚 tone を冒頭で明示 |
| Application Guidelines:中立 tone | 「ご指導ください」謙虚 tone | 「下から行く」要望に対応 |

---

## ローカル成果物(リポジトリ外)

| ファイル | 場所 | 用途 |
|---|---|---|
| `slides/Tsumu Pitch.webloc` | repo 内、git ignored(`*.webloc`)| macOS Finder からダブルクリックでブラウザ起動 |
| ローカル demo gift JSON | `/tmp/gift_*.json` | `tsumu_gift_create.sh` のテスト出力(揮発)|
| OpenClaw config | `~/.openclaw/.env`, `~/.openclaw/workspace/` | gitignore 配下、env 改修済 |
| Sui keystore | `~/.sui/sui_config/sui.keystore` | Ed25519 1 鍵、agent 専用 |
| Tsumu env | `~/.tsumu/env` | OPENAI / DISCORD トークン rotate 後 |

---

## セキュリティ確認状況(継続項目)

handoff doc 08 で flag した旧キーの revoke 確認:

| キー種類 | 値の prefix | 旧キー無効化 | 確認方法 |
|---|---|---|---|
| OpenAI API Key | `sk-proj-Dcg...8A` | **❓ 未確認** | OpenAI Dashboard で disable されているか目視確認要 |
| Discord Bot Token | (handoff doc 参照) | **❓ 未確認** | Discord Developer Portal で reset 確認要 |

**新キー** は Vercel(Production env)と `~/.tsumu/env` に配置済。次のセッション初頭で revoke 確認をおすすめ。

---

## 関連ドキュメント

| ファイル | 役割 |
|---|---|
| [`08-handoff-2026-05-02.md`](08-handoff-2026-05-02.md) | 午前〜14:50 のログ(本ドキュメントの前段) |
| [`07-design-decisions.md`](07-design-decisions.md) | 設計判断記録 |
| [`10-hackathon-submission-2026-05-02.md`](10-hackathon-submission-2026-05-02.md) | 提出フォーム回答全文アーカイブ |
| [`03-architecture.md`](03-architecture.md) | システム全体のアーキテクチャ |
| [`05-mvp.md`](05-mvp.md) | MVP スコープと当初計画 |
| [`architecture.html`](architecture.html) | Mermaid 俯瞰図 |
| [`openclaw/skills/tsumu/lectures/00-HANDOFF-PLAYBOOK.md`](../openclaw/skills/tsumu/lectures/00-HANDOFF-PLAYBOOK.md) | 調教チーム向け活性化手順 |

---

> 最終更新: 2026-05-02(夕方追記版)
> このドキュメントを読んでから次のセッションを開始すれば、続きから作業できます。

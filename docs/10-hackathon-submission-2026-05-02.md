# 10. ハッカソン提出フォーム回答アーカイブ — 2026-05-02

> 日本 Web3/AI ハッカソン(Sui 協賛、`clawathon` × OpenClaw × Sui)への提出フィールド回答を、後日 / 別大会 / 来年の自分が再利用できるよう全文アーカイブしたもの。
>
> 提出当時の状態を凍結保存。フィールド名は提出フォームの英語ラベルそのまま。

---

## URL 振り分けまとめ

| フィールド | URL | 役割 |
|---|---|---|
| GitHub or Website | `https://github.com/kou-uni/toku` | リポジトリ |
| Application Form URL | `https://tsumu-chat.vercel.app/tide` | 触れる入口 |
| Deliverable URL | `https://github.com/kou-uni/toku` | 提出物本体 |

→ 「**読む**」場所(GitHub)と「**触る**」場所(Tide)で重複なし。

---

## About this team

```markdown
# はじめてのハッカソンです

ソロ参加です。

**OpenClaw**(local-first AI エージェント gateway)と **Sui**(zkLogin + Object-centric)を組み合わせて、**「立ち止まるための AI エージェント」Tsumu(積)** を作りました。

> AI が考える時代に、自分自身を考える時間を取り戻す。
> 加速の時代に、止まる体験を Web3 で形にしたい。

未熟ながら、ご指導いただけると嬉しいです。
```

---

## Tagline(100 word 以内)

```
Tsumu(積)は、AI時代に「立ち止まる」ためのAIエージェント。

Discordで1日3分、AIと座る。記録はSui objectとして永続所有、徳は持つと減り、渡すと満ちる(回向の経済)。

OpenClaw × Suiの組み合わせで、Web3という単語に出会わずにオンチェーン体験を届けます。

加速の時代に、止まる体験をWeb3で形にしました。
```

---

## About(7 セクション)

```markdown
## What it does

**Tsumu(積)** は、AI 時代に「立ち止まる」ための AI エージェント。
Discord で 1 日 3 分、ユーザーと静かに対話する。

- 座った時間は **Sui object として永続所有**(Session NFT / 個人の坐の庭)
- 報酬の **TOKU coin** は **持つと月 1% 減り、渡すと満ちる**(回向の経済)
- 受け取った友達は **Google ログインだけでウォレット生成**(zkLogin、Web3 を意識しない)
- 集まった USDC は四半期ごとに **DAO 投票で現実の寄付** へ(子ども食堂・心のサポート・山寺)
- ペイフォワードの仕組み自体が配布構造になっている

## The problem it solves

**AI が加速の時代を生んだ今、「立ち止まる」場所が消えている。**

- 複数の AI エージェントに振り回される **エージェント疲労**(新しい burnout)
- 既存の瞑想アプリは命令口調で挫折させる
- Web3 の UX は seed phrase / gas / approval で普通の人を弾く
- 「もっと速く、もっと多く」しか語らない AI 業界

→ **AI が我々を加速させた以上、AI が我々を止めなければならない。**
日本の禅・茶道・回向の文脈から、その実装は出るべきだと考えました。

## Challenges I ran into

- **MintAuthority の version 競合**:連続 tx で SDK キャッシュが古い ref を返す。**3 mint を 1 PTB にまとめ + `tx.objectRef(freshOwnedRef(...))` で明示渡し** で解決
- **Vercel で `sui` CLI が動かない**:bash shell-out 経路を全て **`@mysten/sui` SDK 直接呼び出し**に書き換え。Agent 秘密鍵は Vercel 暗号化 env で管理
- **OpenClaw daemon の fetch-timeout**:heartbeat session が jsonl ロックを保持。session 退避 + 再起動で対処
- **`@mysten/sui` v2 の API 破壊的変更**:`SuiClient` → `SuiJsonRpcClient` で初回 import が失敗 → v1.45 に固定
- **Sui の速さを「止まる体験」に使う矛盾の表現**:UX とコピーで一貫させる作業

## Technologies I used

- **Sui Testnet** — Move 7 モジュール(`toku` / `session` / `garden` / `gift` / `timelock` / `lantern` / `pulse`)
- **Programmable Transaction Block (PTB)** — claim + 2 mint をアトミック実行
- **zkLogin**(モック実装、本番は `@mysten/zklogin`)
- **Sponsored Transaction**(構想)
- **OpenClaw** — local-first AI エージェント gateway(Markdown ベースの Skill)
- **@mysten/sui v1.45 SDK** — Vercel Functions 上で agent 署名
- **Vercel Serverless**(3 プロジェクト構成)+ **Express**
- **OpenAI `gpt-4o-mini`**(SOUL.md を system prompt に注入)
- **Discord Bot** — channel adapter

## How we built it

1. **概念設計**:大義 → ペルソナ → 集合徳の三輪 → 経済設計を `docs/` に固める
2. **Move package**:7 モジュール → Sui Testnet に publish + upgrade
3. **claim webpage**:モック zkLogin で「Google ログイン → ウォレット生成 → TOKU 受領」フロー
4. **chat-app + Tide ページ**:OpenAI チャット UI + Sui RPC ライブ取得の集合徳可視化
5. **Vercel 化**:`sui client` shell-out を SDK に全面書換、3 プロジェクト deploy
6. **OpenClaw skill 準備**:9 個の shell tool + 4 つの lecture 文書 + 活性化パッチ
7. **UI 演出**:金色バースト・count-up・ripple、ステージで「動いた!」が即伝わる作り

設計の中心にある約束 ── **比較しない / 強要しない / 邪魔しない / 隠さない** ── を SOUL.md で言語化、機能の合否判断にも使った。

## What we learned

- **Sui の object-centric model は「意味あるアーティファクトを永続所有させる体験」と相性が抜群**
- **速さは、何をのせるかで意味が変わる**。高速チェーンを「止まる体験」に使う逆張りが可能
- **`SOUL.md` の「やってはいけない」リストは、機能リストと同じくらい重要**。LLM の暴走をテキスト 1 枚で抑える
- **モック実装でも、設計が正しければ世界観は伝わる**
- **単一 PTB は複数 tx より圧倒的に堅牢**(アトミック + race 解消 + 速い)
- **ハッカソン提出物は「触れる」ことが全て**。ピッチ動画より URL を叩いて on-chain TX が見える方が強い

## What's next for Tsumu(積)

### 直近(2nd Wave)
- **OpenClaw × Discord 活性化**(playbook 経由)
- **本物の zkLogin 統合**(`@mysten/zklogin`)
- **Sponsored Transaction の実運用**(`@mysten/enoki`)
- **Day 14「灯火還流」通知**(Sui event watcher で `LanternDrawn` を購読)

### 中期(3rd Wave)
- **Tide DAO 投票の Move 実装**(現在は表示のみ)
- **寄付候補先 NPO との実提携**(第 1 四半期に本物の寄付 TX)
- **LINE 公式アカウント**(OpenClaw の LINE adapter)
- **学術提携**(京都大学・東京大学のメンタルヘルス研究へ匿名 reflection 提供)

### 長期構想
- **NFC お守り**:神社で受領できる物理デバイス
- **多言語展開**:灯火 reflection の機械翻訳でグローバル流通

> **加速の時代に、止まる場所を作る。**
```

---

## Updates in this Wave

```markdown
## このウェーブで作ったもの

> **AI 時代に「立ち止まる」ためのエージェント** を、OpenClaw × Sui で形にしました。
> 速いブロックチェーンを「**急がないアプリ**」に使う、というコンセプトの実装です。

### 完成した成果物

- **Sui Move package**(7モジュール:`toku` / `session` / `garden` / `gift` / `timelock` / `lantern` / `pulse`)を Testnet に publish
- **Tide ページ** — 集合の徳プールを Sui RPC から実取得して可視化、`?addr=` で個人パネル
  → https://tsumu-chat.vercel.app/tide
- **Claim webpage** — Vercel Functions が `@mysten/sui` SDK で直接 on-chain 書き込み(モック zkLogin)
  → https://tsumu-claim.vercel.app
- **プレゼンサイト**(2分版 / 22枚版 / Story 版)
  → https://toku-site.vercel.app
- **OpenClaw skill** — Discord 連携用の shell tool 9 個 + 引き継ぎ playbook

### Sui の特性をどう活かしたか

このアプリは **Sui の以下 3 つの特性が無いと成立しません**:

- **zkLogin** — Google ログインだけでウォレット生成、seed phrase が一切表に出ない
- **Sponsored Transaction**(構想) — ガス代を dApp が肩代わり、徳のやり取りに金銭的摩擦が無い
- **Object-centric model** — Session NFT / Garden / Seed / Gift / Lantern が独立 object として永続所有

### OpenClaw との掛け合わせ — 話しかけやすさをチェーンに繋ぐ

OpenClaw は Discord / LINE 等メッセージングアプリに常駐できる local-first AI gateway。
Markdown ベースで Tsumu の人格(SOUL.md)を組み込み、Sui ツール群を呼び出させる構造。

- 専用アプリ不要、普段の Discord で話すだけ
- Heartbeat(30 分毎 proactive trigger)で「朝の声がけ」が自然に成立
- 会話 → shell tool 起動 → Sui 書き込みまでが一つのメッセージで完結

### あえて「急がない」アプリにした理由

Sui のコア価値は速さですが、Tsumu はその速さを「止まる体験」に使います:

- 1 日 3 分のみ、push は 1 日最大 3 回まで、深夜帯は能動声がけ禁止
- TOKU は持つと月 1% decay、流すと満ちる(回向の経済)
- ランキング無し、Streak 表示無し、達成圧無し

> Speed is for stopping. Gas-less is for grace.

### E2E オンチェーン検証済み

claim TX: https://suiscan.xyz/testnet/tx/aSmRBAXJB5Zpoi7mYWyzRPpxbwBpKaYp7x3WmdPnvXv
コード: https://github.com/kou-uni/toku
```

---

## Milestone — 2nd Wave

```markdown
## 2nd Wave で作るもの — Discord 活性化 + UX を「本物」に

### 1. OpenClaw × Discord 活性化(最優先)
本ウェーブで完成させた Skill / Tool / 引き継ぎ playbook をもとに Discord bot として実稼働。
- 朝の声がけ → 3 分の座 → record_session → on-chain TOKU mint
- 「○○ に渡したい」 → ガード判定 → gift_create で claim_url 発行
- 「○○ に教えたい」 → ガード判定 → tide_share で Tide URL 発行
までが、自然な会話の中で完結する状態へ。

### 2. 本物の zkLogin への移行
現在 claim webpage はモック zkLogin で動作。`@mysten/zklogin` で Google JWT → 決定的アドレスに置き換え、本物の「Google ログイン = 自分のウォレット」体験を実装。

### 3. Sponsored Transaction の実運用
現状は agent keypair が代理署名。`@mysten/enoki` を使って zkLogin signer + sponsor signer の dual-signature モデルへ。ユーザーが完全にガス代を意識しない状態に。

### 4. Day 14「灯火還流」通知
Sui event watcher で `LanternDrawn` event を購読、自分の言葉が誰かに draw された時に proactive 通知。「自分の言葉が、誰かの朝に届いた」という Tsumu のコア感情を実装。

### 完了基準
- Discord で実ユーザーが claim → 座 → 渡しまで通せる
- 全 TX が真の zkLogin recipient address に着地している
- ユーザーが gas について一度も意識しない
```

---

## Milestone — 3rd Wave

```markdown
## 3rd Wave で作るもの — 集合徳の経済を社会に接続する

### 1. Tide DAO 投票の Move 実装
現在 Tide ページの寄付候補・票数は表示用 mock。Move で:
- TidePool shared object に USDC 流入を蓄積
- Proposal object として候補を on-chain 登録
- TOKU holder の vote 関数(decay 重み付き、最近積んだ TOKU ほど発言力)
- 四半期締切で distribute 関数 → 寄付額が確定的に分配
これらを実装し、本物の DAO 経済として稼働させる。

### 2. 寄付候補先 NPO との実提携
現在の候補(子ども食堂 / 心のサポート / 山寺維持)は世界観として置いてある段階。**第 1 四半期の実寄付** に向けて NPO と契約・送金フローを整備。

### 3. LINE 公式アカウント対応
OpenClaw は標準で LINE 対応。Discord で固めた tsumu skill を LINE channel adapter に移植、日本のマス層(あかり層)が無理なく辿り着ける入口を作る。

### 4. 学術提携
匿名化された灯火 reflection コーパスを、京都大学・東京大学のメンタルヘルス / 心理学研究に提供できる仕組みへ。Tsumu 内で「研究提供に同意する」オプトインを設計。

### 5. 物理デバイス(構想)
NFC お守り(神社で受領できる、Tsumu の object と紐付くフィジカル)。Web3 を意識せず徳を持ち歩ける、最も日常的なオンチェーン体験へ。

### この Wave のゴール
**「Tsumu はネタではなく、本当に世界に徳を届ける装置である」と、第 1 四半期 Tide レポートで証明する。**
```

---

## Application Guidelines

```markdown
## このプロジェクトに関心を持っていただいた方へ

初めてのハッカソン参戦です。ソロで「とりあえず動くもの」までは形にしてみたものの、未熟な部分・伸び代だらけだと自覚しています。

**触ってみての率直なご意見・ご指導を、ぜひいただきたいです。**

### まず触ってみていただける方へ

- **プレゼン**(5 分): https://toku-site.vercel.app
- **Tide ページ**(集合の徳の可視化、live data): https://tsumu-chat.vercel.app/tide
- **コード**: https://github.com/kou-uni/toku

特に Tide ページを 1 分だけ眺めていただけると、目指しているものが伝わりやすいかもしれません。

### こんな方からのご指導が、特にありがたいです

- **Sui** の設計に詳しい方:「ここの実装はこうした方が良い」を教えてくださる方
- **OpenClaw / エージェント設計** のベテランの方
- **仏教・瞑想・回向の文脈** に詳しい方(プロダクトの根本思想に関わるので)
- **子ども食堂・メンタルヘルス NPO** の方(Tide 寄付候補先としてお話を伺いたいです)
- 同じく「**投機ではない Web3**」を考えている方

### ご連絡方法

- GitHub Issues: https://github.com/kou-uni/toku/issues
- ハッカソンプラットフォームのメッセージ機能経由

返信は数日いただくことがありますが、いただいた声は必ず読みます。
未熟な点、お手柔らかにご指導いただけると嬉しいです。何卒よろしくお願いいたします。
```

---

## Tags(max 10)

提出フォームに入れた tag(順序通り):

```
Move
@mysten/sui
OpenClaw
```

絞り込みの理由:**smart contract 層 / SDK 層 / agent 層** の 3 層に綺麗に分かれて、重複なくスタックの全貌が見える組み合わせ。

---

## Build with(max 10、infrastructure 中心)

```
Sui
Sui Move
zkLogin
Programmable Transaction Block (PTB)
Sponsored Transaction
OpenClaw
@mysten/sui SDK
Vercel
OpenAI
Discord
```

---

## Product Category(max 3)

```
AI Agent
Wellness
SocialFi
```

3 つとも **既存カテゴリ単体には存在しないユニークな組み合わせ**で、「これは何ポジ?」と審査員に印象付ける効果を狙った。

---

## 提出時の判断記録

### なぜ tagline を短くしたか
最初は長文版を準備したが、**100 word 制限の中で「触りたい」を作る方が大事**との判断。要素を 5 つに絞り、最後に「**Speed is for stopping. Gas-less is for grace.**」を入れずプレーン化。

### なぜ "About" の "Challenges" に「12 時間」「ソロ」を書かなかったか
ユーザー判断で「**12 時間で作ったぜ的なアピールは要らない**」となり削除。**技術と思想に軸を置く**ことを優先。

### なぜ Application Guidelines を謙虚 tone に倒したか
ユーザー判断で「**下から行く感じ**」を選択。Tsumu の SOUL.md(命令しない・強要しない)と一貫させ、メタ・コミュニケーションも世界観に沿わせた。

### なぜ Application Form URL を Tide にしたか
"Application = アプリ本体" と解釈、判断:
- claim ページは fresh gift 必要 → 一見さんは触れない
- chat-app `/` は説明ないと迷う
- **Tide ページは 5 秒で世界観が伝わる、live data でアニメ動く**
→ Tide に決定。

---

## 関連ドキュメント

| ファイル | 役割 |
|---|---|
| [`09-activity-log-2026-05-02-pm.md`](09-activity-log-2026-05-02-pm.md) | 本セッションの活動ログ |
| [`08-handoff-2026-05-02.md`](08-handoff-2026-05-02.md) | 前段ハンドオフ |
| [`README.md`](../README.md) | プロジェクト概要 |

---

> 提出日: 2026-05-02
> このアーカイブは「次の大会 / 来年の自分 / プロジェクトの再提出」で参照する用途。
> 内容を修正する場合は、このファイル末尾に追記し、上書きしないこと(履歴保持のため)。

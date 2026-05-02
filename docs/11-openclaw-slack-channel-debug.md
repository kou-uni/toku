# 09. OpenClaw × Slack / Discord Channel 統合デバッグ知見

> 2026-05-02 のセッションで Tsumu の Slack 連携を立ち上げる過程で**約 2 時間溶かした**末に得た知見の統合ドキュメント。
> 「設定 1 行に辿り着くまで」の道のりを、**重要度順**に整理する。
> 同じスタック(OpenClaw 2026.4.x + Slack channel / Discord guild channel)を使う未来の自分・他者が **5 分で本命対処に辿り着けるよう**に書く。

---

## TL;DR

**OpenClaw を Slack channel(または Discord guild channel)で動かす時、最初に必ずこれを設定する**:

```json
"messages": {
  "groupChat": { "visibleReplies": "automatic" }
}
```

これが**唯一の "agent が黙る → 喋る" を flip させる本命設定**。残りはすべて品質改善で、ここを設定しない限り何をやっても agent は public に返事をしない。

---

## 重要度ランキング(★が多いほど重要)

| Rank | 対処 | 効果 | 重要度 |
|---|---|---|---|
| **1** | `messages.groupChat.visibleReplies: "automatic"` | **沈黙を解除する本命** | ★★★★★ |
| **2** | 汚染セッションのアーカイブ | 過去の NO_REPLY パターンの支配を断つ | ★★★★ |
| **3** | Slack に `reactions:write` / `reactions:read` scope を追加 | 👀 リアクション機能の前提 | ★★★ |
| **4** | `messages.ackReaction` / `ackReactionScope` 等を設定 | 「読んだ」UX を即座に返す | ★★★ |
| **5** | `plugins.entries` で重い bundled plugin を明示 disable | event loop block を 16s → 5s に削減 | ★★ |
| **6** | IDENTITY.md / SKILL.md で agent の応答フォーマットを厳密化 | 返信のビジーさ解消 | ★★ |
| **7** | `OPENCLAW_LOG_LEVEL=debug` で verbose ログ ON | デバッグ可視性の前提 | ★★ |

---

## ★★★★★ Rank 1 — `visibleReplies: "automatic"` (本命)

### 何が起きるか

OpenClaw のデフォルトでは、**group chat / channel(Slack channel, Discord guild channel など)** で agent が生成した text reply が**サイレントに suppress される**。DM では問題なく動くが、channel では agent が完璧な返信を生成しても**ユーザーには何も届かない**。

### コードレベルの真因

`source-reply-delivery-mode.js`:

```js
if (chatType === "group" || chatType === "channel") 
    return cfg.messages?.groupChat?.visibleReplies === "automatic" 
        ? "automatic" 
        : "message_tool_only";  // ← デフォルト
```

- `"message_tool_only"` = agent が `message(action=send)` ツールを明示的に呼ばない限り、text reply は public に出ない
- 設計意図: 企業 Slack に bot が常駐していて、@ が飛ぶたびに長文を投下するとノイズが酷くなる、という想定での「**speak only when told**」モデル
- DM(1対1)では最初から会話だけが目的なので suppress なし → DM/channel 非対称が生まれる

### 症状

- `gateway.log` には `outcome=completed` と表示される(嘘ではない、agent 処理は完了している)
- Slack provider の `chat.postMessage` は**呼ばれない**(エラーではなく、call そのものが起きない)
- 真の suppress 理由は `/tmp/openclaw/openclaw-<date>.log`(verbose log)にだけ:
  ```
  Delivery suppressed by sourceReplyDeliveryMode: message_tool_only 
  for session ... — agent will still process the message
  ```

### 対処

`~/.openclaw/openclaw.json` に:

```json
{
  "messages": {
    "groupChat": {
      "visibleReplies": "automatic"
    }
  }
}
```

これだけで group chat / channel でも DM と同じく自動で reply が public 投稿される。

### なぜ気付くのが難しかったか

1. **gateway.log が "成功" と表示し続ける** — ユーザー体験では失敗だが、システム視点では完了
2. **API レベルのエラーが出ない** — `chat.postMessage` が呼ばれないだけ、エラーは「起きていない」
3. **真の suppress 理由は別ファイルに分離** — `/tmp/openclaw/openclaw-<date>.log` の verbose ログを見ないと分からない
4. **赤いニシンが多すぎる**(後述)

---

## ★★★★ Rank 2 — 汚染セッションのアーカイブ

### 何が起きるか

LLM agent は **2 つの命令源** を持つ:

| 命令源 | 例 | 重み(小モデル) |
|---|---|---|
| **System prompt(明示ルール)** | IDENTITY.md / SKILL.md | 弱 |
| **会話履歴(暗黙の判例)** | 過去の自分の応答パターン | 強 |

これらが衝突した時、**小さいモデル(gpt-4o-mini など)ほど判例に引っ張られる**。

### 具体的な症状

例: IDENTITY.md に「挨拶には1行返す」を後から追加。しかし過去のセッション履歴に「hi → NO_REPLY」が 16 回蓄積されている状態だと、新しい「hi」にもモデルは NO_REPLY を返し続ける。

> モデル「過去にこのユーザーが `hi` と言った時、私は `NO_REPLY` と答えてきた。今回も同じだろう」
> ← system prompt の新ルールを **in-context learning による先例追従が上書きする**

### 対処

汚染されたセッションファイルを `.archived/` に退避:

```bash
SESS_DIR=~/.openclaw/agents/<agentId>/sessions
ARCHIVE=$SESS_DIR/.archived
mkdir -p "$ARCHIVE"
mv "$SESS_DIR/<sessionId>.jsonl" "$ARCHIVE/"
mv "$SESS_DIR/<sessionId>.trajectory.jsonl" "$ARCHIVE/"
```

→ 次の inbound メッセージで会話履歴ゼロの新セッションが作られ、純粋に IDENTITY.md ルールだけで動く。

### 教訓

- agent の挙動を大きく変えたい時、**prompt を書き直すだけでは不十分**な場合がある
- 「ルール変えたのに従わない」時は、まず履歴を疑い、必要ならセッションリセット
- 強いモデル(GPT-4o, Claude Opus 等)に切り替えるのも代替策(指示優先度が高くなる)
- **デモやリリース前は新しい session で動作確認**しないと、本番で挙動が違うリスク

---

## ★★★ Rank 3 — Slack scope の追加(reactions など)

### 罠の本質

Slack の bot scope は**超細粒度**。各機能ごとに別の scope が必要で、**「○○ ができたから△△ もできるはず」は通用しない**。

例:
- `chat:write` だけで「投稿 OK / リアクション NG」が成立する
- `channels:read` を持っていても `conversations:read` は別

### Tsumu 用に必要な scope セット

```
app_mentions:read       # メンション受信
chat:write              # 投稿
reactions:write         # 👀 リアクション付与
reactions:read          # 完了後にリアクション剥がす
channels:history        # チャンネル履歴
channels:read           # チャンネル情報
groups:history          # プライベートチャンネル履歴
im:write, im:history, im:read   # DM
users:read              # ユーザー情報
```

### scope 不足の見つけ方

直接 curl で API を叩く:

```bash
BOT="xoxb-..."
curl -s -X POST https://slack.com/api/reactions.add \
  -H "Authorization: Bearer $BOT" \
  -H "Content-Type: application/json" \
  -d '{"channel":"C...","timestamp":"...","name":"eyes"}'
```

`{"ok":false, "error":"missing_scope", "needed":"reactions:write", ...}` が返れば足りない scope が判明する。

### 追加手順

1. https://api.slack.com/apps → アプリを選択
2. **OAuth & Permissions** → Bot Token Scopes に追加
3. 画面上部の「Reinstall your app」を実行(scope の追加には reinstall 必須)
4. token は通常そのまま使える(reinstall でも変わらない)

---

## ★★★ Rank 4 — Reaction(👀)を即座に返す UX

### なぜ重要か

agent 処理は数秒〜数十秒かかる。その間ユーザーは「**読まれているのか?**」と不安になる。Slack の reaction 機能で受信時に 👀 を即座に付ける = "read receipt" として機能する。

### 設定

```json
{
  "messages": {
    "ackReaction": "eyes",
    "ackReactionScope": "all",
    "removeAckAfterReply": true,
    "statusReactions": { "enabled": true }
  }
}
```

| キー | 意味 |
|---|---|
| `ackReaction` | 受信時に付ける emoji 名(空文字で無効化) |
| `ackReactionScope` | 範囲: `"group-mentions" / "group-all" / "direct" / "all" / "off" / "none"` |
| `removeAckAfterReply` | 返信完了後に剥がすか(チャンネルが綺麗になる) |
| `statusReactions.enabled` | 処理中に絵文字を thinking → tool → done と遷移させる |

### 注意

これらの設定は **Rank 3(reactions:write scope)が満たされていることが前提**。scope なしで設定だけ入れても、verbose ログに `slack ack cleanup failed ... missing_scope` が出続けるだけで動かない。

---

## ★★ Rank 5 — bundled plugin の重さ問題

### 何が起きるか

OpenClaw は 60+ 個の bundled plugin を持ち、**全部 `enabledByDefault: true`**。何も設定しないと:

- `qqbot`(中国 QQ ボット)が `silk-wasm`、`mpg123-decoder` 等の重いネイティブ依存を遅延 install
- agent 処理中にイベントループを **16 秒ブロック**
- Slack ping timeout(15 秒)を超えて socket disconnect → 返信送信時にソケット死亡

### 対処

`plugins.entries` で明示 disable:

```json
{
  "plugins": {
    "entries": {
      "openai":         { "enabled": true  },
      "qqbot":          { "enabled": false },
      "talk-voice":     { "enabled": false },
      "phone-control":  { "enabled": false },
      "device-pair":    { "enabled": false },
      "bonjour":        { "enabled": false },
      "acpx":           { "enabled": false },
      "google-meet":    { "enabled": false },
      "memory-core":    { "enabled": false },
      "browser":        { "enabled": false },
      "xai":            { "enabled": false }
    }
  }
}
```

### 効果

| 指標 | Before | After |
|---|---|---|
| 起動 plugin 数 | 8 | 2 |
| 起動時間 | 4.6s | 1.4s |
| event loop max delay (測定値) | 16,819 ms | 5,520 ms |

---

## ★★ Rank 6 — agent 応答フォーマットの厳密化

### 問題

agent(特に gpt-4o-mini)は、ルールを書いても **訓練データの文化を持ち込む**:

- 「こちらがあります...」のような前置き
- 「他にお手伝いできることがあれば教えてください」のような結び
- markdown link 記法(Slack なら生 URL の方が自動展開で綺麗)

### 対処方針

IDENTITY.md / SKILL.md に **「禁止事項」と「良い例 / 悪い例」を明示**:

```markdown
**返信フォーマット(厳守、超ミニマル)**:

<添える短い1行(命令形・感嘆符・絵文字なし)>
<URL をそのまま生で>

**禁止事項**:
- 「○○してみますか?」のような疑問形(ユーザーは既に意図を述べている)
- 「こちらのリンクを使ってみてください:」のような前置き
- 「他にお手伝いできることがあれば...」のような結び
- markdown link 記法 `[テキスト](URL)`(生 URL のままでよい)

**良い例**: 「渡してみてください\nhttps://...」
**悪い例**: 「こちらがあります。リンクはこちら: [先輩へのリンク](https://...) 他に...」
```

### 教訓

「短く返して」だけでは効かない。**何が "短い" かを具体例で示す**。LLM は規範よりも例から学ぶ。

---

## ★★ Rank 7 — verbose ログの ON 化

### 必要性

通常の `gateway.log` だけでは沈黙の suppress 理由が見えない。**verbose ログを ON にしないと、Rank 1 の本命原因に辿り着けない**。

### 設定

`~/.openclaw/service-env/ai.openclaw.gateway.env` に:

```bash
export OPENCLAW_LOG_LEVEL='debug'
```

→ daemon 再起動で有効化。

### ログの場所

| ファイル | 内容 |
|---|---|
| `~/.openclaw/logs/gateway.log` | 通常ログ(`outcome=completed` レベル) |
| `~/.openclaw/logs/gateway.err.log` | エラー / 警告 / liveness / disconnect |
| `/tmp/openclaw/openclaw-<date>.log` | **verbose / debug の本命** |
| `~/.openclaw/agents/<id>/sessions/<sid>.jsonl` | セッション会話ログ |
| `~/.openclaw/agents/<id>/sessions/<sid>.trajectory.jsonl` | trajectory(prompt / completion / tool 詳細) |

### 沈黙の本命を grep する一発コマンド

```bash
grep -iE "suppress|delivery suppressed|silent|message_tool_only" \
     /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

---

## デバッグ手順(沈黙したらこれを順に)

```
1. trajectory で agent が text を生成しているか確認
   → 生成していない: agent prompt / model 問題
   → 生成している: 次へ
   
2. verbose log を grep "suppress" / "delivery"
   → "Delivery suppressed by sourceReplyDeliveryMode: message_tool_only" → Rank 1
   → 何も出ない: 次へ
   
3. 直接 curl で API を叩く
   - auth.test → token / scope 確認
   - chat.postMessage → 投稿経路確認
   - reactions.add → reaction scope 確認
   → curl で失敗: scope / token 問題(Rank 3)
   → curl で成功: framework 内部問題、source 読み込み
   
4. event loop liveness を確認
   → eventLoopDelayMaxMs > 15000ms: Rank 5(plugin 重さ)
   
5. assistantTexts で NO_REPLY 多発
   → Rank 2(セッション履歴汚染)
```

---

## よくある赤いニシン(red herring)

これらは**実害はあったが、本命の沈黙の主因ではなかった**。最初に見つけたものを root cause と決め打ちすると遠回りする。

| 症状 | 真の原因 | 本命との関係 |
|---|---|---|
| Slack socket disconnect / ping timeout | event loop block(Rank 5)、reconnect 後は復旧 | 副次的、reply は最初から呼ばれていない |
| `missing_scope` for `conversations:read` | bot に channel 一覧取得権限がないだけ | 投稿には影響なし |
| `NO_REPLY` トークン | agent が一部のシナリオで自発的に出す silent reply marker | 全シナリオの本命ではない |
| qqbot 重い install | 確かに event loop ブロックの実害あり | 直しても reply は来ない(Rank 1 が本命) |
| webchat タブが event loop ブロック | 確かに block 要因 | 直しても reply は来ない |

→ 教訓: **「もっともらしい原因」が複数並んだ時、最初に見つけたものが root cause とは限らない。末端症状(ユーザーから見て沈黙)から各層を逆向きに辿る**。

---

## メタ知見(プロジェクトを超えて再利用可能)

### 1. デフォルト挙動の前提は文化依存

OpenClaw のデフォルトは「**企業 Slack で AI bot が静かに座っている**」ユースケースを想定。デモ用 channel で公開して見せる Tsumu の用途は逆向き。**フレームワークのデフォルトはそのフレームワークが想定する文化を前提にしている** — 自分のユースケースが違うなら、デフォルトを疑う。

### 2. 多層システムの障害は層をまたぐ

```
LLM(text 生成) ✓
  ↓
trajectory ログ ✓ (assistantTexts に正しい text が入っている)
  ↓
dispatch 層 ✗ ← ここで suppressDelivery=true
  ↓
slack provider ✗ (呼ばれない)
  ↓
chat.postMessage API ✗ (呼ばれない)
```

各層単独では「成功した」「呼ばれていない」と見えるだけ。**末端症状から各層を逆向きにトレース**する手法が必要。

### 3. verbose ログは保険ではなく本命

通常ログ(INFO レベル)では `outcome=completed` のように「成功」と出る部分が、verbose ログ(DEBUG)では `Delivery suppressed by ...` と本当の理由を吐く。**新しいフレームワークを採用する時、最初に "詳細ログはどこに出るか" を把握**する。

### 4. 会話履歴は第二の system prompt

LLM agent は明示ルールと暗黙の判例の 2 つの命令源を持つ。小さいモデルほど判例優先。**「ルール変えたのに従わない」時は履歴を疑う**。

### 5. fine-grained scope モデルは組み合わせ爆発

「○○ ができたから△△ もできるはず」は通用しない。Slack に限らず Discord/Google API でも同じ。**機能ごとに scope を直接 curl で確認**するのが最速。

### 6. 直接 API 叩いて層を切り分ける

フレームワーク経由で動かない時、`curl` で API を直接叩くのが最強の切り分けツール:
- 直接 OK / framework 経由 NG → framework 内部問題
- 直接 NG → token / scope / API 側の問題

これで「どの層で詰まっているか」が一発で確定する。

### 7. デモ前は新しいセッションで動作確認

開発中いじったセッションと、本番ユーザーが見る新規セッションで挙動が変わることがある(Rank 2 の判例追従)。**リリース前は必ずクリーンな状態でリハーサル**。

---

## 完成形 `openclaw.json` 抜粋(コピペ用)

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "openai/gpt-4o-mini" },
      "skipBootstrap": true,
      "contextInjection": "always",
      "skills": ["tsumu"]
    }
  },
  "messages": {
    "groupChat": {
      "visibleReplies": "automatic"
    },
    "ackReaction": "eyes",
    "ackReactionScope": "all",
    "removeAckAfterReply": true,
    "statusReactions": {
      "enabled": true
    }
  },
  "plugins": {
    "entries": {
      "openai":         { "enabled": true  },
      "qqbot":          { "enabled": false },
      "talk-voice":     { "enabled": false },
      "phone-control":  { "enabled": false },
      "device-pair":    { "enabled": false },
      "bonjour":        { "enabled": false },
      "acpx":           { "enabled": false },
      "google-meet":    { "enabled": false },
      "memory-core":    { "enabled": false },
      "browser":        { "enabled": false },
      "xai":            { "enabled": false }
    }
  },
  "channels": {
    "slack": {
      "enabled": true,
      "botToken": "xoxb-...",
      "appToken": "xapp-...",
      "groupPolicy": "allowlist",
      "dmPolicy": "open",
      "channels": {
        "C0XXXXXXXXX": {
          "requireMention": true,
          "enabled": true
        }
      }
    }
  }
}
```

`~/.openclaw/service-env/ai.openclaw.gateway.env`:

```bash
export OPENCLAW_LOG_LEVEL='debug'
export OPENCLAW_SKIP_CLAUDE_KEYCHAIN='1'
```

---

## まとめ:1 つだけ持ち帰るなら

> **OpenClaw を group chat / channel で動かす時は、最初に `messages.groupChat.visibleReplies: "automatic"` を設定する。**
>
> これだけで「動くか・動かないか」が決まる。残りの対処はすべて**動いた上での品質改善**。

今回の 2 時間は **この 1 行に辿り着くまでの探偵作業**だった。次同じスタックを使う時は、このドキュメントから始めれば 5 分で済む。

---

## 関連リンク

- 実装中の Tsumu プロジェクト全体: [README.md](../README.md)
- セッション内ハンドオフ資料: [08-handoff-2026-05-02.md](08-handoff-2026-05-02.md)
- OpenClaw 公式: https://docs.openclaw.ai/
- 当該デバッグセッション日時: 2026-05-02

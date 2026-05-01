# 06. Discord セットアップ手順

> Telegram から Discord に切替えました。OpenClaw に Discord bot を接続するために、
> ユーザーがブラウザで実行する手動ステップを記録します。

---

## ① Discord Developer Portal で Bot を作る(5分)

1. https://discord.com/developers/applications を開く
2. 右上の **"New Application"** をクリック
3. アプリケーション名: `Tsumu` (任意の名前)
4. 作成後、左メニュー **"Bot"** を開く
5. **"Reset Token"** ボタンを押して Bot Token を生成
   - 生成された Bot Token を**コピー**(後で OpenClaw に渡す)
   - ⚠️ 一度しか表示されない。控えること
6. 同じ Bot ページで以下を **必ず ON** にする:
   - **MESSAGE CONTENT INTENT** ← 必須(メッセージ本文を読むため)
   - **SERVER MEMBERS INTENT**
   - **PRESENCE INTENT** (任意)

## ② テスト用サーバーに Bot を招待(3分)

1. 左メニュー **"OAuth2"** → **"URL Generator"**
2. **SCOPES** で `bot` をチェック
3. **BOT PERMISSIONS** で以下をチェック:
   - `Send Messages`
   - `Read Message History`
   - `View Channels`
   - `Embed Links`
4. 生成された URL の最下部のリンクを開く
5. 自分の Discord で「テスト用サーバー」を作成する(なければ)
   - Discord アプリ左下「+」→「自分用」→ 適当な名前
6. Bot をそのサーバーに招待する

## ③ チャネル ID を控える(1分)

1. Discord アプリの「ユーザー設定」→ **"Advanced"** → **"Developer Mode"** ON
2. テスト用サーバーで Bot と話したいチャンネルを右クリック → **"Copy Channel ID"**
3. このチャネル ID も後で必要

## ④ OpenClaw の onboard ウィザードに渡す情報

ユーザーが戻ったら、ターミナルでこのコマンドを実行する:

```bash
source ~/.tsumu/env
openclaw onboard --install-daemon
```

ウィザードが順番に聞いてくるので、以下を入力:

| 質問 | 回答 |
|---|---|
| LLM provider | **OpenAI** |
| Model | `gpt-4o-mini` (推奨、安い) または `gpt-4o` |
| API key | `$OPENAI_API_KEY`(自動的に検出されるはず、なければ貼り付け) |
| Channel | **Discord** |
| Discord Bot Token | (①でコピーしたもの) |
| Workspace path | `/Users/uni/Documents/toku-wo-tsumu/openclaw/workspace` (新規作成) |

## ⑤ Tsumu Skill の workspace に Skill フォルダをリンク

OpenClaw の workspace に skills をリンク:

```bash
mkdir -p /Users/uni/Documents/toku-wo-tsumu/openclaw/workspace/.agents/skills
ln -s /Users/uni/Documents/toku-wo-tsumu/openclaw/skills/tsumu \
      /Users/uni/Documents/toku-wo-tsumu/openclaw/workspace/.agents/skills/tsumu
```

OpenClaw は `<workspace>/.agents/skills` を skill 検索パスに含めます。

## ⑥ Gateway 起動

```bash
openclaw gateway --port 18789 --verbose
```

別ターミナルで:

```bash
openclaw dashboard
```

→ ブラウザでローカルダッシュボードが開く

## ⑦ 動作確認

Discord で Bot にメンション + メッセージ:
```
@Tsumu こんにちは
```

OpenClaw の LLM(OpenAI)が SOUL.md を読み込んで、Tsumu のトーンで返事する。

---

## トラブルシュート

- **Bot がオンラインにならない**: Bot Token が正しく入力されているか、MESSAGE CONTENT INTENT が ON か確認
- **Bot が反応しない**: `openclaw doctor` で diagnose
- **OpenAI エラー**: `$OPENAI_API_KEY` が export されているか確認、`echo ${OPENAI_API_KEY:0:10}` で前 10 文字だけ確認
- **Skill が認識されない**: workspace の `.agents/skills/tsumu` シンボリックリンクが正しいか確認、`openclaw gateway restart`

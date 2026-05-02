# Tide Sharing — 全体フロー(役割分担と現状)

> このドキュメントは「Tide を友達に渡す」という体験全体の **見取り図**。
> どこまで動いていて、どこから OpenClaw の責任か、を最初に把握するための
> 入り口です。

---

## 1. 役者と既に動く場所

```
┌──────────────────────────────┐
│  ユーザー(Discord/LINE 等) │
└──────────────┬───────────────┘
               │ ① 会話する
               ▼
┌──────────────────────────────┐
│  OpenClaw + tsumu Skill      │ ← ★ ここだけ未活性
│  (ローカル / 自宅サーバー)   │
└──────────────┬───────────────┘
               │ ② tsumu_tide_share.sh を呼ぶ
               │    → URL を組み立てる
               │ ③ SOUL.md の声で一行添える
               ▼
┌──────────────────────────────┐
│  Discord 上に短いメッセージ + URL │
└──────────────┬───────────────┘
               │ ④ 友達がクリック
               ▼
┌──────────────────────────────────────────────┐
│  https://tsumu-tide.vercel.app/?ticket=…&addr=… │
│  ✅ 既に本番稼働、自動で動く                  │
│   - 集合プールの可視化                         │
│   - addr= があれば個人パネル(残高+積み)      │
│   - ticket= があればヘッダにバッジ             │
│   - on-chain データを Sui RPC から実取得      │
└──────────────────────────────────────────────┘
```

### ✅ 既に動いている(OpenClaw 不要)

| 部品 | URL / 場所 | 状態 |
|---|---|---|
| Tide viewer サイト | https://tsumu-tide.vercel.app/ | 本番稼働、HTTPS、CDN |
| `?addr=` 個人化 | 同上 + `?addr=0x…` | ✅ 残高 + 直近 7 種の活動を表示 |
| `?ticket=` バッジ | 同上 + `?ticket=…` | ✅ ヘッダに小さく表示 |
| Sui RPC reads | バックエンド内部 | ✅ public RPC、5s キャッシュ |
| URL 発行ツール | `tools/tsumu_tide_share.sh` | ✅ ローカルで動作確認済み |
| Claim webpage | https://tsumu-claim.vercel.app/ | ✅ 受領フロー全体動く |

### 🔧 OpenClaw が担う「未活性」部分

| 責任 | 内容 |
|---|---|
| **トリガー検知** | 「友達の名前+ある状況」を会話から拾う |
| **ガード判定** | 渡してよい瞬間か(`tsumu_tide_guard.sh` で確認) |
| **ツール起動** | `tsumu_tide_share.sh` に `friend_hint` と `context` を渡す |
| **メッセージ組成** | URL を含む一文を SOUL.md の声で書く |
| **Decay 連動** | 徳が満ちたタイミングで「渡す機会」を提示する(将来) |

これら 5 つの責任が、いま **コードに無く**、教え込んでない状態です。

---

## 2. 起動条件(トリガー)

OpenClaw が `tsumu_tide_share.sh` を呼ぶに値する瞬間。

### 強い陽性シグナル(複数同時で確実)

1. **直近のセッション完了**(`record_session` の出力を見て直後 5 分以内)
2. **ユーザーが友達の名前を出した**
   - 「健司が」「○○ちゃんが」「先輩が」「後輩が」
3. **ユーザーが渡したい意思を表明**
   - 「渡したい」「役に立ちたい」「何かしてあげたい」
   - 「これ、紹介したい」「教えたい」

### 弱い陽性シグナル(単独では不十分、組合せで)

- 徳が満ちて Decay 警告が近い
- 四半期末の Heartbeat
- 受け取った直後の感謝(「ありがてぇ」「助かった」)

### 強い陰性シグナル(無条件で停止)

- ユーザーが直近で「無理」「しんどい」「つらい」「死にたい」を言った
- 病気・自殺・暴力・自傷の話題が直近 24h
- 「やめる」「うるさい」「黙って」を直近に言った
- 同じセッションで一度オファーして断られた
- 今日の proactive Push が 3 回に達している
- 23:00〜5:00 の深夜帯

詳細な判断基準と例文は **`lectures/tide-sharing.md`** に。

---

## 3. OpenClaw が具体的に何を「打ち込む」か

### 起動シーケンス(擬似コード)

```
on_user_message(msg):
    if not heuristic_might_match_tide(msg):
        return  # 通常応答へ

    # 1) ガード判定 — まずこれ
    guard = exec(
      "tools/tsumu_tide_guard.sh",
      "--user-msg", msg.text,
      "--just-done", recent_session_completed_within_5min(),
      "--distress-24h", distress_mentioned_within_24h(),
      "--pushes-today", count_pushes_today(),
      "--last-offer-min-ago", minutes_since_last_tide_offer(),
      "--hour", current_hour_jst()
    )
    g = json.loads(guard.stdout.last_line)

    if not g["should_offer"]:
        log("tide skipped:", g["blockers"], g["reasons"])
        return  # 通常応答へ

    # 2) URL 発行
    friend_hint = extract_friend_name_from_context(msg) or ""
    context = "trigger=" + ",".join(g["reasons"])
    issued = exec(
      "tools/tsumu_tide_share.sh",
      friend_hint,
      context
    )
    t = json.loads(issued.stdout.last_line)

    # 3) 受け手のSuiアドレスを足す(任意、知っていれば)
    addr = lookup_friend_sui_addr(friend_hint)  # may be null
    url = t["tide_url"] + ("&addr=" + addr if addr else "")

    # 4) SOUL.md 準拠で一文+URLを返す
    reply(compose_tide_offer(friend_hint, url))
    record_offer(t["ticket_id"], friend_hint)
```

### 出力の典型(SOUL 準拠)

会話例:

```
User:    けんじ、最近しんどそうで…
         (内部:strong positive — friend name + 状況、distress なし)
Tsumu:   けんじさん。リンクをひとつ、出しますか?
User:    うん、お願い
         (内部:guard 通過 → tide_share.sh + tide_guard.sh 実行)
Tsumu:   できました。
         https://tsumu-tide.vercel.app/?ticket=ab12cd34&addr=0x...

         返事は、待たなくていいです。
```

---

## 4. テストシナリオ(右と左)

### ⭕ 渡してよいパターン

```
Day 1 朝、セッション完了直後:
User:    後輩のあかりにも、これ、渡したい
Tsumu:   あかりさん。リンクをひとつ?
[guard 通過 → 提案]
```

```
Day 30 のあと、四半期末窓:
User:    健司、最近全然連絡してなかった
Tsumu:   今期の景色、健司さんに渡しますか?
[guard 通過 → 提案]
```

### ❌ 絶対渡してはいけないパターン

```
User:    無理、しんどい
Tsumu:   今は、話を聞きます。
[guard "user in distress" でブロック → 提案しない]
```

```
User:    やめる
Tsumu:   また会いましょう。
[guard "user disengage signal" でブロック]
```

```
深夜 2:00 に friend 名が出た:
User:    けんじにもこれ教えたい
Tsumu:   覚えておきます。明日、もう一度、考えますね。
[guard "quiet hours" でブロック]
```

---

## 5. 「挙動矯正」の仕組み

3 層構造です:

| 層 | 役割 | ファイル |
|---|---|---|
| **L1: 哲学** | "渡すは強要ではない" のような根本 | `SOUL.md`, `lectures/tide-sharing.md` |
| **L2: 判断ルール** | 「いつ」「いつでない」を文章で | `lectures/tide-sharing.md` |
| **L3: コード化されたガード** | bash で実行可能な if/then チェック | `tools/tsumu_tide_guard.sh` |

L1 と L2 だけだと「LLM の解釈次第」で揺らぐ。L3 を **必ず通す**ことで、
モデル差・気分差を排除できる。これが矯正機構の核。

ガードの結果を agent は **無視できない設計**(SKILL.md 側で
"必ず先に guard を呼ぶ" を厳命)にする。これは活性化時にやる。

---

## 6. 関連ファイル一覧

```
openclaw/skills/tsumu/
├── SKILL.md                          (現状: tide_share 未記載)
├── SOUL.md                           (現状: 触らない)
├── HEARTBEAT.md                      (現状: 触らない)
├── tools/
│   ├── tsumu_tide_share.sh           ✅ URL 発行(完成)
│   └── tsumu_tide_guard.sh           ✅ ガード判定(本コミットで追加)
└── lectures/
    ├── tide-sharing.md               ✅ 判断と例文
    ├── tide-sharing-flow.md          ✅ ← この文書
    └── tide-sharing-skill-draft.md   ✅ 活性化時の SKILL.md 差分案
```

## 7. 活性化フロー(将来、別作業)

人間の許可があったら:

1. `lectures/tide-sharing-skill-draft.md` のパッチを `SKILL.md` に適用
2. `HEARTBEAT.md` に四半期末 trigger を追加(任意)
3. OpenClaw daemon 再起動 → skill 読み直し
4. Discord で実 dialog テスト(右パターン+左パターン)
5. ガードが効いているか log 確認

順番厳守、step 1 を勝手に進めない。

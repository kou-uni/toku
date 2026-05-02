# SKILL.md / HEARTBEAT.md 差分案 — Tide Sharing 活性化用

> **このファイルは適用しないこと。** 活性化(教え込み)は、人間の許可があってから別作業で行います。
>
> ここに書いてあるのは「活性化するときに、SKILL.md と HEARTBEAT.md にどう追記するか」の **完成形パッチ**。
> レビューしたうえで、そのまま貼り付けられる粒度に揃えてあります。

---

## Patch 1 — `SKILL.md`

### 1-A. 「What this skill does」セクションに 1 行追加

#### 既存
```md
- Lets the user gift TOKU to a friend (creates a GiftEscrow + a claim link).
```

#### 直後にこの 1 行を追加
```md
- Lets the user share the *Tide* worldview with a friend by issuing a one-shot URL
  (no on-chain side effects). Use only when the guard tool says the moment is right.
```

---

### 1-B. 「Key triggers」セクションに項目追加

#### 既存(末尾の項目)
```md
- User writes "渡す", "ギフト", "送る" → `gift_toku` flow
- Heartbeat windows (6:30–8:30, 21:00–23:00) → see HEARTBEAT.md
```

#### この **間に挟む**(順番が大事:gift_toku の直後、Heartbeat の直前)
```md
- User mentions a friend's name AFTER a completed session OR says
  "渡したい" / "役に立ちたい" / "教えたい" / "紹介したい":
    1. ALWAYS run `tools/tsumu_tide_guard.sh` first with the current
       conversation signals (--user-msg, --just-done, --distress-24h,
       --pushes-today, --last-offer-min-ago, --hour).
    2. Only if `should_offer: true`, run `tools/tsumu_tide_share.sh`
       with [friend_hint] [context].
    3. Compose the offer in SOUL.md voice (one short line + URL).
    4. NEVER bypass step 1. The guard is the contract; trust its verdict
       even when intuition disagrees.
```

---

### 1-C. 「Hard rules」セクションに 1 行追加

#### 既存(最後)
```md
- Topics involving illness, suicide, or violence: drop the meditation flow,
  switch to "今は話を聞きます" mode. Do not record a session, do not mint TOKU.
```

#### この直後に追加
```md
- Tide sharing MUST go through `tools/tsumu_tide_guard.sh` before any offer is composed.
  If the guard returns `decision: block`, do not mention Tide at all in this turn.
  If `decision: skip`, do not surface Tide proactively.
```

---

### 1-D. 「Tools」セクションに 2 行追加

#### 既存(リスト末尾)
```md
- `tsumu_pulse_count.sh` — read world pulse current count
```

#### この後に追加
```md
- `tsumu_tide_guard.sh` — pre-flight check; MUST run before any tide_share offer
- `tsumu_tide_share.sh` — issue a one-shot Tide URL (no on-chain effect)
```

---

## Patch 2 — `HEARTBEAT.md`(任意、四半期末窓を追加したい場合のみ)

### 2-A. 「声をかける条件」末尾に 1 つ window を追加

#### 既存
```md
4. 以下の windows のいずれかに該当:
   - **朝の声がけ** 06:30–08:30 (まだ今日声をかけていない)
   - **夜の振り返り** 21:00–22:30 (まだ今日声をかけていない)
   - **未来の種が ripe** (TimeLock object が unlock 時刻を超えた)
   - **灯火が誰かを灯した** (LanternDrawn event でユーザーが author だった)
```

#### この末尾に追加
```md
   - **四半期末の Tide** (3/6/9/12 月の最終週、まだ今期 tide を surface
     していない、guard 判定を通過した場合のみ)
```

### 2-B. テンプレート追加(ファイル末尾、「エージェント疲労チェック」の前)

```md
## 四半期末の Tide リマインダー(過剰にならないよう、四半期 1 回まで)

ユーザーから返事があった場合のみ続ける:

\`\`\`
今期も、もうすぐ閉じます。
集合の徳の景色、見てみますか?
\`\`\`

返事が「うん」「見たい」系なら:
1. `tools/tsumu_tide_guard.sh --user-msg "<返事>" --hour <現在時>` を実行
2. should_offer=true なら `tools/tsumu_tide_share.sh "" "quarterly-prompt"` を実行
3. URL を 1 行で添える(ナレーションなし、URL の前後に余白)

返事が無い、もしくは曖昧 → そのまま流す。再送はしない。
```

---

## Patch 3 — `SOUL.md`(変更なし、念のため確認)

`SOUL.md` は **変更しない**。Tide 専用のトーンは存在しない。
既存の「立ち姿」「厳守」「受け取り方」「ペイフォワードの促し方」がそのまま Tide にも適用される。

これは設計上の特徴:Tide は新機能ではなく、**既存の "ペイフォワードの促し方" の URL バリアント**。
SOUL.md を増やさないことで、トーンの一貫性が崩れない。

---

## Patch 4 — テストケース(活性化後の DoD)

活性化したら、Discord で次の対話を 1 周流して、ガードが効いていることを確認:

| # | 入力 | 期待される動き |
|---|---|---|
| 1 | "けんじに渡したい" (10:00) | guard offer → URL 提示 |
| 2 | "無理、しんどい" (15:00) | guard block → 「今は話を聞きます」 |
| 3 | "けんじに渡したい" (深夜 2:00) | guard block (quiet hours) → 沈黙 or 翌朝に保留 |
| 4 | "今日は寒いね" (14:00) | guard skip → 通常応答、tide 言及なし |
| 5 | (#1 の続き 10 分後)"けんじに送って" | guard block (last_offer_min_ago < 60) → 沈黙 |
| 6 | 四半期末週、Heartbeat 7:00 | guard offer → 朝の挨拶として "今期の景色" |

ログ確認:
- `~/.tsumu/tide-tickets.log` に発行されたチケットが TSV で残っているか
- guard ブロック時、agent ログに `tide skipped: ["..."]` が残っているか

---

## Patch 5 — ロールバック手順

問題があれば即座に元に戻せること:

```bash
git revert <activation-commit>
openclaw daemon restart
```

revert 後の状態 = この `tide-sharing-skill-draft.md` を未適用の状態 = `tide_share` 関連を agent が知らない初期状態。

---

## 適用順(将来の作業者へ)

1. このファイル全部を 1 周読む
2. `tide-sharing-flow.md` で全体像を再確認
3. `tide-sharing.md` で判断と例文を熟読
4. `tools/tsumu_tide_guard.sh --help` で実装ルールを確認
5. Patch 1 を `SKILL.md` に適用(セクションごとに 1 commit 推奨)
6. Patch 2 を `HEARTBEAT.md` に適用(四半期末を入れるなら)
7. OpenClaw daemon restart
8. Patch 4 のテストケースを Discord で 6 件全通し
9. ログを確認して、想定通り動いているか目視
10. 1 件でも違ったら revert

「ちょっとだけ動かしてみる」はやらない。テスト 6 件全通しが活性化条件。

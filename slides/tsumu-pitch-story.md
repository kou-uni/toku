---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section {
    background: #fafaf7;
    color: #1a1a1a;
    font-family: -apple-system, "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;
    padding: 64px 96px;
    line-height: 1.7;
  }
  h1 {
    font-weight: 300;
    letter-spacing: 0.08em;
    color: #1a1a1a;
  }
  h2 {
    font-weight: 300;
    letter-spacing: 0.06em;
    color: #555;
  }
  blockquote {
    border-left: 3px solid #b89657;
    color: #555;
    font-style: normal;
    margin: 32px 0;
    padding: 8px 24px;
  }
  .center {
    text-align: center;
  }
  .huge {
    font-size: 96px;
    font-weight: 300;
    letter-spacing: 0.2em;
    color: #1a1a1a;
  }
  .gold {
    color: #b89657;
  }
  .muted {
    color: #888;
  }
  table {
    border-collapse: collapse;
  }
  th, td {
    padding: 8px 16px;
    border-bottom: 1px solid #e8e6df;
    text-align: left;
  }
  section.cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  section.demo-cut {
    background: #1a1a1a;
    color: #fafaf7;
  }
  section.demo-cut h1 {
    color: #fafaf7;
  }
  section.demo-cut .muted {
    color: #888;
  }
---

<!-- _class: cover -->

<div class="huge">積</div>

# Tsumu

## AIと無理なく共生する、静寂のエージェント

<br>

<span class="muted">日本 Web3/AI Hackathon 2026 — Sui 協賛</span>

---

# 1. 世界観と社会的ニーズ

**エージェントとの共生による「前向きな進化」**

現在、複数のAIエージェントが人間の代わりに考え、働く時代になりました。
これまで以上に、人間はエージェントとの共生によって進化していきます。

しかし、ただ「急いで進化する」だけではなく、**落ち着いて自分自身を高める**ための仕組みも不可欠です。

> 加速器を作った者は、ブレーキも作る責任がある。
> AIが我々を加速させた以上、AIと共に立ち止まり、内省する時間を持たなければならない。

Tsumuは、情報を消化して意味に変え、1日3分間「自分自身を高める」ための前向きな進化のエージェントです。

---

# 2. 技術的ニーズ：なぜOpenClawとSuiなのか？

私たちが求めたのは、「日常に溶け込むUX」と「真の所有感」の両立です。

- **OpenClaw (エージェント基盤)**
  - 専用アプリは不要。Discord等の日常のチャットに常駐。
  - プッシュ型で朝の静寂（Heartbeat）を促す、控えめな存在。
- **Sui (ブロックチェーン基盤)**
  - **Web3を一切意識させない**（Seedフレーズの排除・ガス代の肩代わり）。
  - 単なるデータベースではなく、「坐の庭」や「灯火」を**永続的な資産（オブジェクト）**として所有する。

---

# 3. 自然なSuiの普及（マスアダプション）

**「Suiは速い。だからこそ、止まる体験にふさわしい」**

Tsumuのコア体験は、「徳（TOKU）」をギフトとして他者へ渡すことです。

- **zkLogin** と **Sponsored Transactions** をフル活用。
- ユーザーはURLリンクを通じて、大切な友人に「1 TOKU」を贈ります。
- 受け取った友人は、**GoogleログインするだけでSuiウォレットを保有**します。

👉 *「癒やし」のバイラルループを通じて、Suiのウォレットが社会に自然と広がっていきます。*

---

# 4. 具体的な採用技術と工夫点

**あえて「機能」を削ぎ落とすアーキテクチャ**

- **比較しない設計（No Ranking）**
  - 数字の競争ではなく、Suiオブジェクトの成長（庭に苔が生える等）を見せる。
- **引き算の対話**
  - エージェントからの接触は1日最大3回。命令せず、寄り添うだけ。
- **決済モックアップと将来の寄付構想**
  - 将来的には、「灯火（誰かの言葉）」を受け取る際にマイクロペイメントを組み込む構想です（ハッカソンではモックアップとして体験を表現）。
  - 集まった価値は、四半期ごとにDAOを通じて子ども食堂等へ**現実の寄付**として還るエコシステムを目指します。

---

<!-- _class: demo-cut -->

# 5. LIVE DEMO

## 日常のチャットから、ウォレットの成長へ

<br>

<span class="muted">
① Discordにプッシュ型で「おはよう。今、心は何色？」とメッセージが届く。<br>
② チャットで対話することで、1日3分の「瞑想（座）」が深まっていく。<br>
③ 終了後、Web3を意識することなくシームレスにウォレットと連携。<br>
④ テストネット上で「TOKU」トークンが配布（Mint）されたことをSui Explorerで確認。
</span>

---

<!-- _class: cover -->

# まとめ

## 人間がAIエージェントと「無理なく共生」する未来

<br>

AIは単なる「生産性の道具」にとどまりません。
Tsumuは、人間が自分自身を取り戻すための、AIとの新しい付き合い方です。

> **加速の時代に、Suiの速さを使って「止まる場所」を作る。**

ご清聴ありがとうございました。

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

## A wallet that grows from your stillness.

<br>

<span class="muted">日本 Web3/AI Hackathon 2026 — Sui 協賛</span>

---

<!-- _class: cover -->

# AIが、考える時代。

# あなたが、考えなくなる時代。

<br>

> 加速器を作った者は、ブレーキも作る。

---

# 問題: 情報の無限と、意味の枯渇

20年前、情報は希少で、意味は自明だった。
今、情報は無限で、**意味こそが希少**になった。

AI が我々を加速させた以上、
**AI が我々を止めなければならない。**

<br>

<span class="muted">2026年、複数のエージェントが各個人の代理で動いている。
そして、エージェント疲労(Agent Fatigue)という新しい burnout が広がっている。</span>

---

# Tsumu とは

> AIエージェントを用いた**「静寂」のためのエージェント**。

1日3分、あなたの色を聞く。
あなたの言葉を受け取る。
受け取った言葉が、誰かの朝の灯火になる。

そして毎四半期、世界中で積まれた徳が、
**現実の寄付**として社会に還る。

---

# あかり、21歳

<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 32px;">
<div>

- 京都の大学3年、現代美術専攻
- Insta と TikTok を今年やめた
- 「比較の圧で死にそうだった」
- Headspace を入れた、命令口調で消した
- クリプト?「絵が売られてた」程度
- 語彙: 「ありがてぇ」「無理ゲー」「ぴえん」

</div>
<div>

**彼女に必要なもの**

- 馴染みのあるUI(Discord)
- 命令しないトーン
- 完璧でないことを許す存在
- 匿名で誰かを支えた、という小さな誇り
- Web3 という単語に出会わずに、
  ウォレットを持ってしまう経験

</div>
</div>

---

<!-- _class: cover -->

## Day 0

# 受け取る

<br>

先輩からの 1 行のメッセージ。
リンクを開いて、Google ログインだけ。

**気づかないままに、Sui を持つ。**

---

<!-- _class: demo-cut -->

# LIVE DEMO

## Day 0: ギフトリンクで受け取る

<br>

<span class="muted">ステージ上で:
Discord メッセージ → リンク → Google → 受領完了</span>

<br>

`http://localhost:3000/claim/0x...?code=...`

---

<!-- _class: cover -->

## Day 1

# 朝の3分

<br>

布団の中、心の色を一つ。
3分、目を閉じる。

**+1 TOKU。今、世界で 47人と立ちました。**

---

<!-- _class: demo-cut -->

# LIVE DEMO

## Day 1: 朝の3分セッション

<br>

<span class="muted">ステージ上で:
Discord で「やる」 → 3分セッション(30秒に圧縮) →
Sui Explorer に TOKU mint 表示 → World Pulse カウント上昇</span>

---

<!-- _class: cover -->

## Day 3

# 灯火を、ひとつ

<br>

夜2時、課題が終わらない。
「無理」とだけ打つ。

**0.05 USDC で、誰かの言葉が届く。**

---

<!-- _class: demo-cut -->

# LIVE DEMO

## Day 3: 灯火 (x402 / AP2 dance)

<br>

<span class="muted">ステージ上で:
Discord で「灯火ほしい」 →
HTTP 402 Payment Required dance →
AP2 Intent/Cart/Payment Mandate →
誰かの言葉のカードが届く</span>

```
[Tsumu] ある人からの言葉です:
        ──────
        「眠っていい。明日があるって、それだけで救い」
        ──────
```

---

<!-- _class: cover -->

## Day 14

# 自分の言葉が、誰かを灯した

<br>

> 7日前、あなたが流した言葉:
> 「描いてる時、私は呼吸している」
> が、今朝、京都の誰かを灯しました。
> **+1.5 TOKU**

---

<!-- _class: cover -->

## Day 30

# 友達に、渡す

<br>

「これ、しんどい時、座れる。
1 TOKU 渡しとくね」

**配布の連鎖が、はじまる。**

---

<!-- _class: demo-cut -->

# LIVE DEMO

## Day 30: Pay-it-forward(観客参加)

<br>

<span class="muted">ステージ上で:
Discord で「○○に渡したい」 →
QR コード生成 → 会場の1人を指名 →
スマホで読み取り → Google ログイン →
**ウォレットが生まれる**</span>

---

# 集合徳の三輪

<div style="display:grid; grid-template-columns: 1fr; gap: 16px; margin-top: 32px;">
  <div style="text-align: center; font-size: 28px; font-weight: 300;">
    🌊 <span class="gold">Tsumu Tide</span> ── 社会のため(集合)
    <div class="muted" style="font-size: 16px; margin-top: 4px;">四半期に1回、x402 流入を寄付</div>
  </div>
  <div style="text-align: center; font-size: 28px; font-weight: 300;">
    🪷 <span class="gold">Sangha</span> ── 二人のため(対)
    <div class="muted" style="font-size: 16px; margin-top: 4px;">灯火プール、リアルタイムの "気配"</div>
  </div>
  <div style="text-align: center; font-size: 28px; font-weight: 300;">
    🪨 <span class="gold">坐の庭</span> ── 自分のため(個)
    <div class="muted" style="font-size: 16px; margin-top: 4px;">Sui object として永続所有</div>
  </div>
</div>

---

# Tsumu Tide — 四半期レポート(構想)

```
2026年 第二四半期、世界の Tsumu Tide:
─────────────
  座した人:        12,438 人
  灯った言葉:   1,247,109 枚
  集まった善意:    $9,340 (約140万円)
─────────────
  60% 子ども食堂        $5,604
  30% 心のサポートライン $2,802
  10% 山寺維持           $934

あなたが座った 47回が、ここに、確かに、ありました。
```

<br>

<span class="muted">3ヶ月に1回、TOKU holder で寄付先投票。
Decay により、最近積んだ人の発言力が大きい(健全)。</span>

---

# 反投機のトークン経済

通常のトークンエコノミー:
**発行量 ↑ → 1単位の価値 ↓ (インフレ)**

Tsumu:
**発行量 ↑ → 灯火プール ↑ → DAO 寄付 ↑ → 1 TOKU の文化的重み ↑**

<br>

| 内面の動き | トークンの動き |
|---|---|
| 持ちすぎると重くなる | Decay(月 1% 薄れる) |
| 渡すと軽くなる | Pay-forward bonus(送る側に +1) |
| 自分の言葉が誰かに届く嬉しさ | 灯火還流(+1.5) |
| 社会貢献の実感 | Tide DAO 四半期寄付 |

---

# なぜ Sui か

| 特性 | 効果 |
|---|---|
| **zkLogin** | Google ログインで即ウォレット |
| **Sponsored Transactions** | ガス代を dApp が肩代わり |
| **Object-centric model** | 「庭」「灯火」「種」が固有 object |
| **AP2 launch partner** | Mysten × Google 公認の AI 決済 |

<br>

> Speed is for stopping. Gas-less is for grace.
> 速いブロックチェーンは、止まる体験を載せるのに相応しい。

---

# なぜ OpenClaw か

- メッセージング・アプリ標準対応
  (Discord / LINE / Slack / Signal …)
- **Heartbeat**(30分毎の能動トリガ)で朝の声がけ
- Markdown ベースの Skill / Memory(SOUL.md / MEMORY.md)
- **既存 Sui Skill 群**(`sui-agent-wallet`, Suimate公式)

<br>

<span class="muted">Tsumu は OpenClaw の上に、Skill を1つ重ねただけ。
12時間で世に出せた理由はここにある。</span>

---

# アーキテクチャ

```
[Discord]  ←──→  [OpenClaw Gateway]  ←──→  [tsumu Skill]
                                              │
              ┌───────────────────────────────┤
              ▼                               ▼
       [x402 / AP2 Mockup]              [Sui Move]
       Lantern endpoint                 toku / session / garden
       402 → IntentMandate              gift / timelock / lantern
       → CartMandate                    pulse / tide
       → PaymentMandate                       │
                                              ▼
                                       [zkLogin claim webpage]
                                       (Google → ウォレット)
```

<br>

<span class="muted">すべて Sui Testnet 上で稼働中。Package: 0xbb218662…</span>

---

# 設計の中心にある約束

- **比較しない**(No Ranking, No Comparison)
- **強要しない**(命令口調をエージェントから消す)
- **邪魔しない**(push は 1日 3回まで、それも条件付き)
- **隠さない**(全ての徳は Sui object として確認できる)

<br>

<span class="muted">禅の伝統(沈黙、間、対機説法)
茶道の作法(一期一会、間合い)
侘寂(完全でないものへの肯定)
縁起(他者との繋がりの哲学)

これらの血脈を持つ国だけが、AI を「止める道具」として使う発想に、
自然に到達できる。</span>

---

# Roadmap

<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 48px;">
<div>

**Q3 2026**

- LINE 公式チャネル
- 完全な zkLogin + Sponsored Tx
- Sui Payment Kit 統合
- 第1回 Tsumu Tide 寄付投票

</div>
<div>

**2027 以降**

- 学術提携(京都大学・東京大学)
- 灯火の機械翻訳によるグローバル流通
- 多言語展開
- 物理デバイス(NFC お守り)

</div>
</div>

---

<!-- _class: cover -->

<div class="huge">積</div>

# Tsumu

<br>

> AI が世界を加速させた今こそ、
> AI が、あなたを止めてくれる時代でなければならない。

<br>

<span class="muted">github.com/kou-uni/toku</span>

---

<!-- _class: cover -->

## ありがとうございました

<br>

**Q & A**

<br>

<span class="muted">設計・実装: ユーザー本人 + Claude(Anthropic)
協力: OpenClaw, Sui / Mysten Labs</span>

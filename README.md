# Tsumu(積)

> **AIが、考える時代。**
> **あなたが、考えなくなる時代。**
>
> 加速器を作った者は、ブレーキも作る。

**Tsumu** は、AIエージェントを用いた「静寂のためのエージェント」。
1日3分、あなたの色を聞く。あなたの言葉を受け取る。
受け取った言葉は、誰かの朝の灯火になる。

そして毎四半期、世界中で積まれた徳が、現実の寄付として社会に還る。

---

## このプロジェクトの位置づけ

- 日本の Web3/AI ハッカソン提出作(2026年5月)
- Sui 協賛の文脈で、**Sui ブロックチェーンを「速さ」ではなく「止まる体験」のために使う**
- 開発期間: ソロ + AI で 10 時間
- ステータス: ✅ コア機能オンチェーン稼働(Sui Testnet)

## 技術スタック

| 層 | 採用 |
|---|---|
| エージェント基盤 | **OpenClaw**(local-first agent gateway) |
| LLM バックエンド | OpenAI API(`gpt-4o-mini`) |
| ブロックチェーン | **Sui Testnet** (Package: `0xbb218662...`) |
| 決済プロトコル | **AP2** (Sui = launch partner) + **x402 互換エンドポイント** |
| ユーザーUI | **Discord** Bot(将来 LINE 対応 ── OpenClaw が標準対応) |
| 受領フロー | Express + 静的 HTML(モック zkLogin) |

## デプロイ済みオブジェクト(Sui Testnet)

- Package(v1, 型 ID): `0xbb218662a9d57c7098974bd1b687767a5d2dd57fc1cc2599d8dcf71e2e2a7f02`
- Package(v2, 関数呼び出し用): `0xe82b4a3665e6e9aa9c3067366b801f7e4a56e3f2bd1f314bc8d138a5e0582f43`
- World Pulse(shared): `0x5fed66c7f90aa9856e25da762f3851eae65ee9ef3fd516b7658d2d4bf73defc2`
- Lantern Pool(shared): `0x7719d9085533b02bd98177154ba8fd11031a08b3050b59aed6fa6ea3ef5b6ba5`
- Mint Authority(agent所有): `0xee237372e355dfc1508d2e96107c149e0385cf2bb1387a3a2ce7eb4869a4611e`

## ドキュメント

このリポジトリの考え方を読む順:

1. [docs/01-why-now.md](docs/01-why-now.md) ── **なぜ、今、瞑想か(大義)**
2. [docs/02-design.md](docs/02-design.md) ── 設計原則・ペルソナ・体験設計
3. [docs/03-architecture.md](docs/03-architecture.md) ── 技術アーキテクチャ
4. [docs/04-economy.md](docs/04-economy.md) ── TOKU トークン経済と寄付の仕組み
5. [docs/05-mvp.md](docs/05-mvp.md) ── 12時間 MVP スコープとデモ脚本
6. [docs/06-setup-discord.md](docs/06-setup-discord.md) ── Discord Bot セットアップ手順

プレゼンテーション:

- [slides/tsumu-pitch.md](slides/tsumu-pitch.md) ── Marp 形式の pitch deck(22枚)
- [slides/presentation-script.md](slides/presentation-script.md) ── 5分台本 + デモ Cue

スモークテスト:

```bash
scripts/demo-runner.sh   # 全7フローを 2 分でオンチェーン実行
```

## コア体験(あかり、21歳の30日間)

```
Day 0   先輩から1 TOKU をギフト。リンクを開いてGoogle login → ウォレット完成
Day 1   朝の3分、布団の中で。「重い」→「灰」へ色が動く。+1 TOKU
Day 3   夜2時、灯火を1枚受け取る。x402 で7円、誰かの言葉が届く
Day 7   未来の自分への種が開封され、倍のTOKUが返る
Day 14  自分の言葉が、京都の誰かの朝を灯した、と通知が届く ── 涙
Day 30  友達に1 TOKU 渡す。配布の連鎖が始まる
```

## なぜ Sui か

Sui の3つの特性が、この体験を成立させる:

- **zkLogin** ── Google ログインで即ウォレット。seed phrase ゼロ
- **Sponsored Transactions** ── ガス代をdAppが肩代わり。ユーザーは無料
- **Object-centric model** ── 「坐の庭」「灯火」「未来の種」が、それぞれ固有の意味を持つオブジェクト

> Speed is for stopping. Gas-less is for grace.

## なぜ OpenClaw か

- **メッセージング・アプリ標準対応**(Telegram / LINE / Discord 他)── 専用アプリ不要
- **Heartbeat**(30分毎の能動トリガ)── 朝の声がけが標準機能
- **Markdown ベースの Skill / Memory**(SOUL.md / MEMORY.md)── 12h で人格設計可能
- **既存 Sui Skill 群**(`sui-agent-wallet` 等、Suimate 公式)

## 集合徳の三輪

```
       🪷  自分のため  (個)         ← Sui object として永続所有する「坐の庭」
      🪷🪷  二人のため  (対)         ← 灯火プール、匿名 reflection の図書館
     🪷🪷🪷  社会のため  (集合)      ← 四半期ごとの DAO 寄付投票
```

3ヶ月に1回、x402 micropayment で集まった USDC が TOKU holder の投票で寄付される。
**あなたが座った3分が、子ども食堂の食卓を支える。**

## 設計の中心にある約束

- 比較しない(No Ranking)
- 強要しない(命令口調をエージェントから消す)
- 邪魔しない(push は1日3回まで、それも条件付き)
- 隠さない(全ての徳は Sui object として確認できる)

詳細は [docs/02-design.md](docs/02-design.md) を参照。

## ライセンス

未定(ハッカソン提出時に決定)。

## クレジット

設計・実装: ユーザー本人 + Claude(Anthropic)
コラボレーター AI: OpenClaw(エージェント基盤)
ブロックチェーン基盤: Sui / Mysten Labs

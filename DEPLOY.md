# オンライン公開手順（Render）

このアプリはフロント＋API（価格取得・画像取得）が一体の Node サーバーです。  
`Dockerfile` と `render.yaml` を同梱しています。

## 1. GitHub に上げる

```bash
git init
git add .
git commit -m "Initial deploy"
# GitHub でリポジトリ作成後
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Render でデプロイ

1. [Render](https://render.com/) にログイン
2. **New** → **Blueprint**（または **Web Service** → **Deploy from Git repository**）
3. リポジトリを選択
4. `render.yaml` が読み込まれるのでそのまま **Apply**
5. デプロイ完了後、表示された URL（例: `https://pop-kaitori-tool.onrender.com`）にアクセス

### 手動設定する場合

| 項目 | 値 |
|------|-----|
| Runtime | Docker |
| Build Command | （Dockerfile 使用のため空で可） |
| Start Command | （Dockerfile の CMD を使用） |
| 環境変数 `DATA_DIR` | `/app/data` |
| 環境変数 `NODE_ENV` | `production` |

## 3. ローカル本番確認

```bash
npm run build
npm start
```

→ http://localhost:3000

## 補足

- 「最新価格を取得」はバックグラウンドで実行されます（クラウドのタイムアウト対策）
- 初回は同梱の `comparison.json` をコピーして起動します
- 無料プランはスリープ後、初回アクセスが遅くなることがあります
- LAN 内だけで使う場合は従来どおり `npm run dev -- --host` でも可

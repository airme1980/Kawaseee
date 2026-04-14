# Kawasee

シンプルで高速なワンページ為替換算ツールです。JPY / CNY / USD / EUR の 4 通貨間を即座に換算し、最新レートの更新時刻と参考値ディスクレーマーを表示します。

## 特徴
- 金額入力と通貨選択だけで即時換算
- ワンタップで変換元/先を入れ替え
- 4 通貨カードを 2 列で表示し、各カードの金額欄に直接入力
- 入力した通貨を基準に他の 3 通貨の金額欄へ即時反映
- Frankfurter API（失敗時は Open ER API）で取得した最新レートと更新時刻を表示
- レート取得失敗時もユーザーに状況を案内
- モバイル優先のレスポンシブ UI

## 開発・プレビュー
```bash
npm install
npm start
```
ブラウザで `http://localhost:8080` を開くと確認できます。`server.js` は `src/` をそのまま配信する最小 Node サーバーで、Azure App Service Linux/Node 構成に合わせています。

## デプロイ
Azure App Service (Linux, Node) にリポジトリルートをデプロイしてください。`package.json` の `start` スクリプトで `server.js` が起動し、`src/` 配下の静的ファイルを配信します。

GitHub Actions からデプロイする場合は、App Service の publish profile を GitHub Secrets に登録し、`.github/workflows/main_kawaseee.yml` を利用してください。

## 検索エンジン向けファイル
`src/robots.txt` と `src/sitemap.xml` を追加済みです。現在の `sitemap.xml` は `https://kawasee.com/` を本番 URL として記載しています。公開ドメインを変更する場合は、この URL をあわせて更新してください。

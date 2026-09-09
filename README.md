# FF14 Collection Notebook

個人用のローカルコレクショントラッカーです。マウント、ミニオン、オーケストリオン譜、トリプルトライアドカード、エモート、青魔法、髪型、傘/ファッションアクセサリー、魔獣図鑑に対応しています。

## 起動

```powershell
node server.js
```

起動後、ブラウザで表示された URL を開きます。通常は次の URL です。

```text
http://127.0.0.1:4173
```

Windowsでコンソールを出したくない場合は、`start-hidden.vbs` を実行できます。

## データ

- `data/catalog.json`: コレクションのマスターデータ
- `data/user-progress.json`: 取得済み、欲しい、優先度、メモ
- `data/settings.json`: 表示設定
- `data/backups/`: 保存時の自動バックアップ

カタログ更新は FFXIV Collect API の日本語データから各カテゴリの一覧を取得し、`data/catalog.json` だけを更新します。進捗とメモは `data/user-progress.json` に分離しています。

LodestoneのキャラクターURL、またはキャラクターIDを入力して `Lodestone読込` を押すと、公開されているマウント/ミニオン/エモートの所持情報を取得済みに反映します。ゲームクライアントには接続しません。

`画像取込` では、選択中カテゴリのゲーム内スクリーンショットをブラウザ内OCRで解析し、確認した候補だけを取得済みに追加できます。取得済み項目だけを表示した画像を使用してください。画像自体は外部へ送信されませんが、初回解析時はOCRエンジンと言語データをCDNから読み込みます。

`Lodestone取込ツール` では、サイト内の手順に沿ってブックマークレットを登録できます。ログイン後の自分のキャラクターページで1回実行すると、見つかった対応カテゴリを同一サイト内で巡回し、1つの統合JSONへ書き出します。読み込み時はキャラクターIDから取得できるマウント/ミニオン/エモートをIDで照合し、それ以外（魔獣図鑑を含む）はLodestone画面の抽出結果を照合します。ID取得に失敗したカテゴリも画面抽出結果へフォールバックします。ブックマークレットはLodestoneの表示内容を外部送信しません。旧形式のカテゴリ別JSONと統合JSONも引き続き読み込めます。

Web公開版でLodestone読込を使う場合は、Cloudflare Workersの中継URLを `public/data/app-config.json` の `lodestoneProxyUrl` に設定します。ローカル版は従来どおり `server.js` が直接Lodestoneを読み込みます。

一覧では入手種別、バージョン（`2.X`、`3.X` など）、取得状況で絞り込みできます。

## 方針

このアプリはゲームクライアント、メモリ、通信、入力操作には触れません。ブラウザUIとローカルJSON保存だけで動きます。

FFXIV関連素材の権利は SQUARE ENIX に帰属します。

## Web公開版

GitHub Pagesなどの静的ホスティングでは `docs/` フォルダを公開します。

```powershell
npm run build:static
```

Web公開版は `docs/data/catalog.json` のカタログだけを読み込みます。取得済み、欲しい、優先度、メモなどの個人データは各ブラウザの `localStorage` に保存され、GitHubにはアップロードされません。

公開リポジトリには `data/user-progress.json` と `runtime/node.exe` を含めないでください。

Lodestone読込用のWorkerをデプロイする場合:

```powershell
npm run worker:deploy
```

デプロイ後に表示される `https://...workers.dev` のURLを `public/data/app-config.json` に設定し、`npm run build:static` で公開用ファイルを作り直します。

# FF14 Collection Notebook 改善タスクリスト

コードレビュー（2026-07-09 実施）に基づく改善リスト。上から優先度順。
各項目は独立して着手できるように、対象ファイル・現状・修正方針を記載している。

---

## A. 重要（データ保全・肥大化の防止）

### A-1. バックアップの世代管理（ローテーション）を実装する
- **対象**: `server.js` の `atomicWriteJson()`（約292行目〜）
- **現状**: 保存のたびに `data/backups/` へ無条件にコピーを作成する。進捗保存は編集のたび（350msデバウンス後の PUT ごと）に走るため、現在バックアップが **738ファイル / 約305MB** まで肥大化している。カタログ（1ファイル約4.2MB）のバックアップも更新・Lodestone読込のたびに増える。
- **修正方針**:
  - ファイル種別（`catalog` / `user-progress` / `settings`）ごとに保持数の上限（例: 各20世代）を設け、書き込み時に古いものを削除する。
  - 短時間の連続保存で世代を浪費しないよう、「前回バックアップから一定時間（例: 10分）以内なら作らない」等の間引きも検討。
  - 既存の肥大化したバックアップを整理する一括クリーンアップ処理（起動時 or npmスクリプト）も追加する。

### A-2. user-progress.json の空エントリ肥大化を止める
- **対象**: `public/app.js` の `getProgress()`（442行目〜）、`itemsWithProgress()`、`renderStats()`
- **現状**: `getProgress()` が「参照しただけ」で `state.progress.items` にデフォルトエントリ（owned:false, wanted:false, priority:"none", notes:""）を作成・永続化する。描画のたびに全カタログアイテム分が生成されるため、現在 `data/user-progress.json` に **約1,500件の空エントリ**が保存されている（ファイル404KB）。
- **修正方針**:
  - 読み取り用の `getProgress()` は state を変更せず、デフォルト値を返すだけにする（書き込みが必要な操作＝toggleOwned等のときだけエントリを作成）。
  - 保存時（`scheduleSave` / サーバー側 `PUT /api/progress`）に「全項目がデフォルト値のエントリ」を削除（prune）する。
  - 既存ファイルの空エントリも初回読み込み時に掃除するマイグレーションを入れる。

### A-3. ローカルAPIに Origin / Host チェックを追加する（CSRF・DNSリバインディング対策）
- **対象**: `server.js` の `handleApi()` / `requestHandler()`
- **現状**: サーバーは 127.0.0.1 にバインドしているが、状態変更API（`PUT /api/progress`、`POST /api/progress/import` 等）にオリジン検証がない。ブラウザで開いた悪意あるページから `http://127.0.0.1:4173/api/progress` へ PUT を送られると進捗データを全て上書き・破壊できる。
- **修正方針**:
  - `Host` ヘッダーが `127.0.0.1:<port>` / `localhost:<port>` であることを検証する。
  - `Origin` ヘッダーが存在する場合は自オリジンのみ許可し、それ以外は 403 を返す。
  - あわせて `Content-Type: application/json` の確認も追加するとよい。

### A-4. 静的ファイル配信のパストラバーサル判定を厳密化する
- **対象**: `server.js` の `serveStatic()`（1344行目付近）
- **現状**: `filePath.startsWith(publicDir)` で判定しているが、区切り文字を含めていないため、`public` と同じ接頭辞を持つ兄弟ディレクトリ（例: `public-backup`）が理論上一致してしまう。`scripts/preview-static-site.js` にも同じパターンがある。
- **修正方針**: `path.relative(publicDir, filePath)` が `..` で始まらないことを確認する方式、または `filePath === publicDir || filePath.startsWith(publicDir + path.sep)` に変更する（両ファイルとも）。

---

## B. バグ・堅牢性

### B-1. リクエストボディの JSON パース失敗が 500 になる
- **対象**: `server.js` の `handleApi()` 内の各 `JSON.parse(body || "{}")`
- **現状**: 不正なJSONを送ると例外が `requestHandler` まで伝播して 500 が返る。ユーザー入力起因のエラーは 400 が適切。
- **修正方針**: パースを try/catch で包み、失敗時は `400 { error: "Invalid JSON body." }` を返す共通ヘルパー（`parseJsonBody(req)`）にまとめる。

### B-2. `PUT /api/settings` にバリデーションがない
- **対象**: `server.js`（1277行目付近）
- **現状**: `progress` と違い、settings は形式チェックなしで任意のオブジェクトをそのまま保存する。
- **修正方針**: 許可キー（`theme` / `density` / `defaultSort` / `schemaVersion`）のホワイトリスト化と型チェックを行い、未知のキーは破棄する。

### B-3. Lodestone読込のエラーが一律 502 で返る
- **対象**: `server.js` の `/api/lodestone/*/import` ハンドラ
- **現状**: 「キャラクターURLを入力してください」のような入力エラーも 502 で返している。
- **修正方針**: 入力バリデーション系のエラーは 400、Lodestone側の障害は 502 と区別する（エラーオブジェクトに status を持たせて振り分け）。

### B-4. サーバー側 Lodestone取得にリトライがない
- **対象**: `server.js` の `fetchText()`（1030行目付近）
- **現状**: Worker版（`workers/lodestone-proxy/src/index.js` の `fetchText`）には 429/5xx 時のリトライがあるが、サーバー版にはない。ツールチップを並列8本で叩くため 429 に当たりやすい。
- **修正方針**: Worker版と同じリトライ（待機付き最大2回）をサーバー版にも実装する。あわせて並列数を 8→5 に揃えることも検討。

### B-5. デバウンス保存の取りこぼし対策
- **対象**: `public/app.js` の `scheduleSave()`（780行目〜）
- **現状**: 保存は350msのデバウンス後に実行される。直後にタブやサーバーを閉じると最後の編集（メモなど）が失われる。
- **修正方針**: `visibilitychange`（hidden時）/ `pagehide` で未保存分を即時フラッシュする。サーバーモードでは `navigator.sendBeacon` の利用を検討（その場合サーバー側で POST も受ける）。

### B-6. 日本語名ソートにロケール指定がない
- **対象**: `public/app.js` の `sorter()` 内の `localeCompare` 各所
- **現状**: サーバー側（`comparePatchDesc`）は `localeCompare(..., "ja")` だが、フロント側は無指定。環境によって日本語名の並び順が不安定になる。
- **修正方針**: `localeCompare(b, "ja")` に統一する。`Intl.Collator("ja")` を1つ作って使い回すと高速。

### B-7. 終了時に `.ff14cn-server.json` が残る
- **対象**: `server.js` の `main()`
- **現状**: プロセス終了時のクリーンアップがなく、stale なPIDファイルが残る。`start-app.cmd` は古いPIDに対して `Stop-Process` を試みるため、PIDが再利用されていた場合、無関係のプロセスを殺すリスクがある。
- **修正方針**: `SIGINT` / `SIGTERM` / `exit` でファイルを削除する。`start-app.cmd` 側でも、対象PIDのプロセス名が node であることを確認してから停止する。

---

## C. パフォーマンス

### C-1. 検索入力のたびに全グリッドを再構築している
- **対象**: `public/app.js` の `bindEvents()`（searchInput の input イベント）と `renderGrid()`
- **現状**: 1文字入力ごとに数百〜千件超のカードHTMLを `innerHTML` で作り直し、全カードに click リスナーを付け直している。エモートやカードなど件数の多いカテゴリで顕著に重い。
- **修正方針**:
  - 検索入力を150〜250msでデバウンスする。
  - カードごとのリスナーをやめ、`#minionGrid` への**イベントデリゲーション**1本にする。
  - 可能なら大量件数時の逐次描画（IntersectionObserverでの追加読み込み or 仮想リスト）を導入する。

### C-2. カタログ4.2MBを毎回丸ごと読み込んでいる
- **対象**: `data/catalog.json`、`server.js` の `/api/catalog`、`scripts/build-static-site.js`
- **現状**: 全8カテゴリを1ファイルに持ち、起動時に全件パースする。Web公開版（GitHub Pages）でも初回に4.2MBをダウンロードする。
- **修正方針**（段階的でよい）:
  1. カテゴリ別ファイル（`catalog.minion.json` など）に分割し、表示中カテゴリだけ遅延読み込みする。
  2. ローカルサーバーは `Accept-Encoding` に応じた gzip 圧縮、または ETag/If-None-Match での 304 応答を追加する。
  3. `localizeSourceText` 適用済みの不要フィールド（英語 `sourceSummary` と日本語版の重複など）を削って容量を減らす。

### C-3. 優先度変更のたびに詳細パネル全体を再描画してフォーカスが失われる
- **対象**: `public/app.js` の `renderDetail()` と prioritySelect の change ハンドラ
- **現状**: `render()` が走り `<select>` が作り直されるため、キーボード操作の連続変更ができない。
- **修正方針**: 進捗トグル・優先度変更では、詳細パネルは差分更新（クラス切替・件数表示のみ更新）にして DOM を作り直さない。

---

## D. コード品質・保守性

### D-1. `localizeSourceText()` の巨大な正規表現辞書を分離・安全化する
- **対象**: `server.js`（404〜820行目、約350エントリ）
- **現状**:
  - 翻訳辞書がコード内にハードコードされ、適用順序に依存している。
  - `/Level/g`、`/Gil/g`、`/Rank/g`、`/Seals/g`、`/Hard/g` などが**単語境界なし**で置換されるため、英単語の一部を破壊しうる（例: "Gilgamesh" → "ギルgamesh"）。実際にコード末尾には順序依存の副作用を後追い修正するパッチ的置換が複数ある（806〜813行目）。
- **修正方針**:
  - 辞書を `data/localization-ja.json`（または `server/localization.js`）に分離する。
  - 英単語系のパターンは `\b` 付きに統一し、長いフレーズ→短い単語の順に自動ソートして適用する。
  - 変換のスナップショットテスト（代表的な入力→期待出力）を追加してリグレッションを防ぐ。

### D-2. server.js / Worker / app.js 間の重複コードを共通化する
- **対象**: `decodeHtml` / `stripTags` / `mapLimit` / `escapeRegExp` / `extractLodestoneTooltips` / `parseLodestoneTooltip` / `parseCharacterId` / 名前正規化 / パッチ番号処理 が3ファイルにほぼ同一実装で存在する。
- **修正方針**: `shared/` ディレクトリに共通モジュールとして切り出す。Worker（ESM）とサーバー（CJS）両対応が必要なので、`.mjs` + サーバー側も ESM 化（`"type": "module"`）するのが素直。ビルドを増やしたくなければ最低限「サーバーとWorkerのLodestoneパーサーだけでも」一本化する。

### D-3. 未使用コードの削除
- **対象**: `server.js` の `mapMinion()`（834行目）と `refreshMinionCatalog()`（939行目）はどこからも呼ばれていない。
- **修正方針**: 削除する。

### D-4. テスト・Lint・Gitの導入
- **現状**: プロジェクトはGitリポジトリではなく、テスト・Lintも一切ない。
- **修正方針**:
  - `git init` して `.gitignore` 運用を実際に有効化する（現状 `.gitignore` はあるがリポジトリがない）。
  - `node:test` で純粋関数（`normalizeSourceType` / `localizeSourceText` / `parseCharacterId` / `patchNumber` / 名前正規化 / ソート）の単体テストを追加し、`npm test` を用意する。
  - ESLint（またはBiome）を導入する。
- **補足**: `.gitignore` に `workers/lodestone-proxy/.wrangler/` を追加する。

### D-5. ビルド成果物への不要ディレクトリ混入を防ぐ
- **対象**: `scripts/build-static-site.js` の `copyDirectory()`
- **現状**: `public/` 以下を無条件で全コピーするため、空の `public/data/lodestone-snapshots/47703870/` のような個人情報系ディレクトリも `docs/` / `web-publish/` に混入している（現在は空だが、今後ファイルが置かれると公開されるリスクがある）。
- **修正方針**: コピー時に除外リスト（`lodestone-snapshots` など）を設ける。あわせて用途不明の空ディレクトリ `public/data/lodestone-snapshots/` 自体を削除するか、生成している処理がないか確認する。

### D-6. インライン `onerror` ハンドラをやめる
- **対象**: `public/app.js` の `renderGrid()` / `renderDetail()` 内の `<img ... onerror="...">`
- **現状**: インラインイベントハンドラはCSP（Content-Security-Policy）導入の妨げになる。
- **修正方針**: イベントデリゲーション（`error` イベントはバブリングしないため capture フェーズで `addEventListener("error", ..., true)`）に置き換え、あわせて `index.html` に CSP メタタグ（外部接続先を ffxivcollect.com / finalfantasyxiv.com / Worker に限定）を追加する。

### D-7. 外部URLの安全確認
- **対象**: `public/app.js` の `renderDetail()`（reference リンク）
- **現状**: カタログ由来の `reference.url` をそのまま `href` に入れている。カタログは信頼できるAPI由来だが、インポート機能で任意のJSONを読み込めるため `javascript:` URL が混入しうる。
- **修正方針**: `http:`/`https:` で始まるURLのみリンク化する。

---

## E. 機能改善（余裕があれば）

### E-1. 設定（テーマ・表示密度）のUIを実装する、または削除する
- **現状**: `data/settings.json` に `theme: "nocturne"` / `density` があり `PUT /api/settings` も存在するが、フロントに変更UIがなく `defaultSort` 以外は使われていない。READMEには「表示設定」と記載あり。
- **修正方針**: 設定パネル（テーマ切替・密度・既定ソート）を実装するか、使わないなら設定関連コードとREADME記述を削除して整合させる。

### E-2. Lodestone読込に「同期モード」を追加する
- **現状**: 読込は所持アイテムを `owned: true` にするだけで、手動で誤って付けた `owned` を解除する手段が一括ではない。
- **修正方針**: 「Lodestone上に無いものを未取得に戻す」オプション（確認ダイアログ付き）を追加する。未マッチ名（`unmatched`）の一覧をトースト以外の場所（詳細パネルやモーダル）で確認できるようにする。

### E-3. 検索の日本語対応を強化する
- **修正方針**: 検索クエリと対象文字列を `String.prototype.normalize("NFKC")` + カタカナ/ひらがな統一してから比較する。全角英数・半角カナの揺れも吸収できる。

### E-4. カタログ更新の部分失敗への耐性
- **対象**: `server.js` の `refreshCollectionCatalog()`
- **現状**: 8カテゴリを `Promise.all` で取得しており、1カテゴリでも失敗すると全体が失敗する。
- **修正方針**: `Promise.allSettled` で成功したカテゴリだけ更新し、失敗カテゴリは既存データを維持して結果メッセージで通知する。

### E-5. Worker側の保護（キャッシュ・オリジン制限）
- **対象**: `workers/lodestone-proxy/src/index.js`
- **現状**: CORS が `*` で誰でも利用でき、キャッシュもないため、第三者に叩かれると Lodestone への中継負荷とWorker無料枠を消費する。
- **修正方針**:
  - `Access-Control-Allow-Origin` を自分のGitHub Pagesオリジンに限定する（wrangler.toml の vars で設定可能に）。
  - ツールチップ応答を Cache API で一定期間（例: 24時間）キャッシュする。

### E-6. UI細部
- 一覧の表示切替ボタン「5列」はグリッド列数が画面幅で変わるため、「グリッド/リスト」等の表記にする（`public/index.html` 138行目付近）。
- エラートーストの表示が15秒と長い。閉じるボタンを付けるか8秒程度に短縮する（`public/app.js` `showToast`）。
- 進捗の書き出し/読み込みボタンに、読み込み時の「現在の進捗を上書きします」確認ダイアログを追加する。

---

## 補足メモ（Codex向けコンテキスト）

- 構成: 依存ゼロのNode製ローカルサーバー（`server.js`）+ 素のJSフロント（`public/`）。`npm run build:static` で `public/` + `data/catalog.json` を `docs/`（GitHub Pages用）と `web-publish/` にコピーする。Web版は localStorage 保存で、Lodestone読込は FFXIV Collect API → 失敗時 Cloudflare Worker 中継（`workers/lodestone-proxy/`）の順で行う。
- `docs/app.js` 等はビルド成果物なので、**修正は必ず `public/` 側に行い**、`npm run build:static` で再生成すること。
- `data/user-progress.json` と `data/backups/` はユーザーの実データ。テストや動作確認で破壊しないこと。
- 動作確認: `node server.js` → `http://127.0.0.1:4173`。Node 20+ 必須（グローバル `fetch` 使用）。

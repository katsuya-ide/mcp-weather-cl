# 天気アプリ E2E テスト

このディレクトリには、天気アプリのPlaywright E2Eテストが含まれています。

## テストファイル

### `weather-app.spec.ts`
- **UI/UXテスト**: ブラウザでのユーザーインタラクションをテスト
- **機能テスト**:
  - ページの読み込み確認
  - 入力フィールドの動作
  - 天気情報の取得
  - エラーハンドリング
  - レスポンシブデザイン
  - ナビゲーション要素

### `weather-api.spec.ts`
- **APIテスト**: HTTPリクエスト/レスポンスをテスト
- **機能テスト**:
  - 有効な都市名でのAPI呼び出し
  - 無効なリクエストのエラーハンドリング
  - レスポンス時間の確認
  - 同時リクエストの処理
  - CORSヘッダーの確認

## テスト実行方法

### 前提条件
1. プロジェクトをビルドする:
   ```bash
   npm run build
   ```

2. 天気サーバーが利用可能であることを確認する（mock-weather-server.jsなど）

### テスト実行コマンド

#### 全テストを実行
```bash
npm test
```

#### UIモードでテストを実行（インタラクティブ）
```bash
npm run test:ui
```

#### ヘッドモードでテストを実行（ブラウザを表示）
```bash
npm run test:headed
```

#### デバッグモードでテストを実行
```bash
npm run test:debug
```

#### テストレポートを表示
```bash
npm run test:report
```

#### 特定のテストファイルのみ実行
```bash
npx playwright test weather-app.spec.ts
npx playwright test weather-api.spec.ts
```

#### 特定のブラウザでテスト実行
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## テスト設定

### `playwright.config.ts`
- **ベースURL**: `http://localhost:3000`
- **テストディレクトリ**: `./tests`
- **ブラウザ**: Chromium, Firefox, WebKit
- **Webサーバー**: 自動起動（`npm run build && node build/index.js mock-weather-server.js`）

### 環境変数
テストで必要な環境変数がある場合は、`.env`ファイルに設定してください。

## テストケース詳細

### UI テスト (`weather-app.spec.ts`)

1. **ページ読み込みテスト**
   - ページタイトルの確認
   - 主要UI要素の表示確認

2. **入力フィールドテスト**
   - プレースホルダーテキスト
   - 入力値の設定・取得
   - クリア機能

3. **天気情報取得テスト**
   - 有効な都市名での情報取得
   - Enterキーでの実行
   - 複数都市での連続実行

4. **エラーハンドリングテスト**
   - 空の都市名でのアラート表示
   - 無効な都市名での処理

5. **レスポンシブテスト**
   - デスクトップ、タブレット、モバイルサイズでの表示確認

### API テスト (`weather-api.spec.ts`)

1. **正常系テスト**
   - 有効な都市名でのAPIリクエスト
   - レスポンス構造の確認
   - 複数都市での連続リクエスト

2. **異常系テスト**
   - 空の都市名
   - 都市名なし
   - 無効なJSON
   - 存在しない都市名

3. **パフォーマンステスト**
   - レスポンス時間の確認
   - 同時リクエストの処理

4. **ヘッダーテスト**
   - CORSヘッダーの確認
   - Content-Typeヘッダーの確認

## トラブルシューティング

### よくある問題

1. **テストがタイムアウトする**
   - サーバーが正しく起動しているか確認
   - ネットワーク接続を確認
   - `playwright.config.ts`のタイムアウト設定を調整

2. **ブラウザが起動しない**
   - Playwrightブラウザを再インストール: `npx playwright install`

3. **APIテストが失敗する**
   - 天気サーバー（mock-weather-server.js）が正しく動作しているか確認
   - APIエンドポイントのURLが正しいか確認

4. **環境変数エラー**
   - `.env`ファイルが正しく設定されているか確認
   - 必要なAPIキーが設定されているか確認

### デバッグ方法

1. **スクリーンショット付きでテスト実行**
   ```bash
   npx playwright test --headed --screenshot=on
   ```

2. **ビデオ録画付きでテスト実行**
   ```bash
   npx playwright test --headed --video=on
   ```

3. **特定のテストのみデバッグ**
   ```bash
   npx playwright test --debug -g "特定のテスト名"
   ```

## CI/CD での実行

### GitHub Actions

このプロジェクトには、GitHub Actionsでの自動テスト実行が設定されています。

#### 設定ファイル
- `.github/workflows/playwright.yml`: Playwrightテストの自動実行設定

#### トリガー条件
- `main`, `master`, `develop` ブランチへのプッシュ
- 上記ブランチへのプルリクエスト

#### 実行内容
1. **マトリックス戦略**: Node.js 18.x と 20.x で並列実行
2. **依存関係のインストール**: `npm ci`
3. **Playwrightブラウザのインストール**: `npx playwright install --with-deps`
4. **プロジェクトのビルド**: `npm run build`
5. **モックサーバーの作成**: CI専用のモック天気サーバーを動的生成
6. **テスト実行**: `npm test`
7. **レポートのアップロード**: テスト結果とレポートをアーティファクトとして保存
8. **GitHub Pagesへのデプロイ**: メインブランチの場合、テストレポートをGitHub Pagesに公開

#### CI環境での特徴
- **モックサーバー**: 実際の天気APIに依存しない専用モックサーバーを使用
- **環境変数**: `ANTHROPIC_API_KEY=test-key-for-ci` を設定
- **タイムアウト**: 60分のタイムアウト設定
- **リトライ**: CI環境では失敗時に2回まで自動リトライ
- **並列実行制限**: CI環境では1ワーカーで実行（安定性向上）

#### アーティファクト
- **Playwrightレポート**: `playwright-report-node-{version}`
- **テスト結果**: `test-results-node-{version}`
- **保持期間**: 30日間

#### GitHub Pages
メインブランチでのテスト実行後、テストレポートが自動的にGitHub Pagesに公開されます。
- URL: `https://{username}.github.io/{repository-name}/`
- 権限設定: リポジトリの Settings > Pages で GitHub Actions を有効にする必要があります

### 他のCI/CD環境

Jenkins、GitLab CI、Azure DevOpsなどの他のCI/CD環境でテストを実行する場合:

```yaml
# 基本的なステップ
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Build project
  run: npm run build

- name: Set environment variables
  run: echo "ANTHROPIC_API_KEY=test-key" >> $GITHUB_ENV

- name: Run Playwright tests
  run: npm test
  env:
    CI: true
```

#### Docker環境での実行
```dockerfile
FROM mcr.microsoft.com/playwright:v1.53.1-focal

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV CI=true
ENV ANTHROPIC_API_KEY=test-key

CMD ["npm", "test"]
```

## レポート

テスト実行後、以下の場所にレポートが生成されます:
- HTMLレポート: `playwright-report/index.html`
- テスト結果: コンソール出力
- スクリーンショット: `test-results/` ディレクトリ

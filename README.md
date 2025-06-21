# Weather MCP Client

mcp-weatherサーバーと連携して天気予報を表示するWebベースのMCPクライアントです。
AIコーディングエージェントの習熟も兼ねているので、内容については未レビューのもの多く含むため一切の責任を負えません。
ソースコードの中身はもちろん、本Readmeやソースコード内のコメントなどについても参考にとどめていただき、必ずご自身でコードレビュー＆テストいただき内容を理解いただいたうえでご利用ください。
自己責任でのご利用をお願いします。


## 機能

- Webブラウザから都市名を入力して天気情報を取得
- mcp-weatherサーバーとの連携
- レスポンシブなWebインターフェース
- リアルタイムの天気データ表示

## 必要な環境

- Node.js (v18以上)
- TypeScript
- mcp-weatherサーバー
- Anthropic API キー（.envファイルに設定）

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
`.env`ファイルを作成し、Anthropic API キーを設定:
```
ANTHROPIC_API_KEY=your_api_key_here
```

3. プロジェクトのビルド:
```bash
npm run build
```

## 使用方法

### 1. mcp-weatherサーバーの準備

まず、mcp-weatherサーバーを準備してください。例：
```bash
# mcp-weatherサーバーのクローン（例）
git clone https://github.com/modelcontextprotocol/servers.git
cd servers/src/weather
pip install -r requirements.txt
```

### 2. Weather MCP Clientの起動

```bash
node build/index.js <path_to_weather_server_script>
```

例：
```bash
node build/index.js ../mcp-servers/src/weather/server.py
```

### 3. Webアプリケーションの使用

1. ブラウザで `http://localhost:3000` にアクセス
2. 都市名を入力フィールドに入力
3. "Get Weather"ボタンをクリック
4. 天気情報が表示されます

## API エンドポイント

### POST /api/weather

都市の天気情報を取得します。

**リクエスト:**
```json
{
  "city": "Tokyo"
}
```

**レスポンス:**
```json
{
  "city": "Tokyo",
  "temperature": "25°C",
  "humidity": "60%",
  "conditions": "Sunny",
  "description": "Clear skies with gentle breeze"
}
```

## プロジェクト構造

```
mcp-client-typescript/
├── index.html          # Webインターフェース
├── index.ts           # メインのTypeScriptファイル
├── build/
│   └── index.js       # コンパイル済みJavaScript
├── package.json       # プロジェクト設定
├── tsconfig.json      # TypeScript設定
└── .env              # 環境変数（要作成）
```

## 技術仕様

- **フロントエンド**: HTML, CSS (Tailwind), JavaScript
- **バックエンド**: Node.js, TypeScript
- **MCP統合**: @modelcontextprotocol/sdk
- **AI統合**: Anthropic Claude API
- **Webサーバー**: Node.js HTTP server

## トラブルシューティング

### よくある問題

1. **ANTHROPIC_API_KEY is not set**
   - `.env`ファイルにAPIキーが正しく設定されているか確認してください

2. **Failed to connect to MCP weather server**
   - mcp-weatherサーバーのパスが正しいか確認してください
   - サーバーの依存関係がインストールされているか確認してください

3. **Weather tool not found in MCP server**
   - mcp-weatherサーバーが正しく動作しているか確認してください
   - サーバーが天気関連のツールを提供しているか確認してください

## テスト

このプロジェクトには、PlaywrightによるE2Eテストが含まれています。

### テストの実行

```bash
# 全テストを実行
npm test

# UIモードでテストを実行（インタラクティブ）
npm run test:ui

# ヘッドモードでテストを実行（ブラウザを表示）
npm run test:headed

# デバッグモードでテストを実行
npm run test:debug

# テストレポートを表示
npm run test:report
```

### テストファイル

- `tests/weather-app.spec.ts`: UI/UXテスト（ブラウザでのユーザーインタラクション）
- `tests/weather-api.spec.ts`: APIテスト（HTTPリクエスト/レスポンス）

### テスト内容

**UIテスト:**
- ページの読み込み確認
- 入力フィールドの動作
- 天気情報の取得
- エラーハンドリング
- レスポンシブデザイン

**APIテスト:**
- 有効な都市名でのAPI呼び出し
- 無効なリクエストのエラーハンドリング
- レスポンス時間の確認
- 同時リクエストの処理
- CORSヘッダーの確認

詳細については、`tests/README.md`を参照してください。

### GitHub Actions CI/CD

このプロジェクトには、GitHub Actionsによる自動テスト実行が設定されています：

- **トリガー**: `main`, `master`, `develop` ブランチへのプッシュ・プルリクエスト
- **実行環境**: Ubuntu Latest + Node.js 18.x/20.x のマトリックス実行
- **テスト内容**: UI/UXテスト + APIテスト
- **レポート**: GitHub Pagesに自動公開（メインブランチ）
- **アーティファクト**: テスト結果とレポートを30日間保存

設定ファイル: `.github/workflows/playwright.yml`

## 開発

### 開発モードでの実行

```bash
# TypeScriptファイルを監視してビルド
npx tsc --watch

# 別のターミナルでサーバーを起動
node build/index.js <path_to_weather_server>
```

### カスタマイズ

- `index.html`: UIのカスタマイズ
- `index.ts`: サーバーロジックの修正
- ポート番号の変更: `startWebServer()`メソッドの引数を変更

## ライセンス

ISC License

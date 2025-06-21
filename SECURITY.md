# セキュリティガイドライン

## GitHub Actions セキュリティ対策

このプロジェクトでは、GitHub Actionsのログにセキュリティ情報やローカルパスが露出することを防ぐため、以下の対策を実施しています。

### 1. 環境変数の安全な管理

- **GitHub Secrets** を使用してAPIキーを管理
- `::add-mask::` を使用してログ出力時にセンシティブ情報をマスク
- 環境変数は直接ログに出力されないよう注意

```yaml
# 良い例
- name: Run tests
  run: |
    echo "::add-mask::${{ secrets.API_KEY }}"
    npm test
  env:
    API_KEY: ${{ secrets.API_KEY }}

# 悪い例 - APIキーがログに露出する可能性
- name: Run tests
  run: echo "API_KEY=${{ secrets.API_KEY }}" && npm test
```

### 2. ログ出力の制御

- CI環境では `quiet: true` を設定してPlaywrightの詳細ログを抑制
- `NODE_ENV=production` でデバッグ情報を無効化
- `DEBUG=""` で詳細なデバッグログを無効化

### 3. ファイルパスの保護

- 絶対パスの使用を避け、相対パスを使用
- CI環境専用のモックファイルを動的生成
- ローカル環境固有の設定ファイルは `.gitignore` で除外

### 4. アーティファクトの管理

- テストレポートの保存期間を制限（30日）
- 必要最小限の情報のみをアーティファクトに含める
- センシティブ情報を含むファイルはアーティファクトから除外

## ローカル開発時の注意事項

### 1. 環境変数ファイル

`.env` ファイルには実際のAPIキーが含まれているため：

- **絶対にコミットしない**
- `.gitignore` で確実に除外されていることを確認
- チーム共有時は `.env.example` を使用

### 2. ログファイル

- ローカルでのテスト実行時もAPIキーがログに出力されないよう注意
- デバッグ時は環境変数を直接 `console.log` しない

## セキュリティインシデント対応

### APIキーが露出した場合

1. **即座にAPIキーを無効化**
2. **新しいAPIキーを生成**
3. **GitHub Secretsを更新**
4. **露出したログの削除を検討**

### ログ履歴の削除

GitHub Actionsのログに機密情報が含まれている場合：

1. リポジトリの Settings → Actions → General
2. "Fork pull request workflows from outside collaborators" の設定を確認
3. 必要に応じてワークフロー実行履歴を削除

## 定期的なセキュリティチェック

- [ ] `.env` ファイルが `.gitignore` に含まれているか
- [ ] GitHub Secretsが適切に設定されているか
- [ ] ワークフローファイルでセンシティブ情報がマスクされているか
- [ ] ログ出力が適切に制御されているか
- [ ] 不要なアーティファクトが保存されていないか

## 参考資料

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Using encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)

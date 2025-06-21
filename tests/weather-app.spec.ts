import { test, expect } from '@playwright/test';

test.describe('天気アプリ E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前にホームページに移動
    await page.goto('/');
  });

  test('ページが正しく読み込まれる', async ({ page }) => {
    // ページタイトルを確認
    await expect(page).toHaveTitle('Stitch Design');
    
    // ヘッダーのアプリ名を確認
    await expect(page.locator('h2:has-text("Weather App")')).toBeVisible();
    
    // メインタイトルを確認
    await expect(page.locator('h2:has-text("Get Weather Information")')).toBeVisible();
    
    // 入力フィールドが表示されている
    await expect(page.locator('#cityInput')).toBeVisible();
    
    // ボタンが表示されている
    await expect(page.locator('#getWeatherBtn')).toBeVisible();
    
    // 天気情報セクションが表示されている
    await expect(page.locator('h2:has-text("Weather Information")')).toBeVisible();
  });

  test('都市名入力フィールドが正しく動作する', async ({ page }) => {
    const cityInput = page.locator('#cityInput');
    
    // プレースホルダーテキストを確認
    await expect(cityInput).toHaveAttribute('placeholder', 'Enter city name');
    
    // 初期値が空であることを確認
    await expect(cityInput).toHaveValue('');
    
    // テキストを入力
    await cityInput.fill('東京');
    await expect(cityInput).toHaveValue('東京');
    
    // テキストをクリア
    await cityInput.clear();
    await expect(cityInput).toHaveValue('');
  });

  test('天気情報の初期状態を確認', async ({ page }) => {
    // 初期状態では全ての値が "--" になっている
    await expect(page.locator('#temperature')).toHaveText('--');
    await expect(page.locator('#humidity')).toHaveText('--');
    await expect(page.locator('#conditions')).toHaveText('--');
    await expect(page.locator('#description')).toHaveText('--');
  });

  test('空の都市名でボタンをクリックするとアラートが表示される', async ({ page }) => {
    // アラートダイアログをリッスン
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('都市名を入力してください');
      await dialog.accept();
    });
    
    // 空の状態でボタンをクリック
    await page.locator('#getWeatherBtn').click();
  });

  test('有効な都市名で天気情報を取得する', async ({ page }) => {
    const cityInput = page.locator('#cityInput');
    const getWeatherBtn = page.locator('#getWeatherBtn');
    
    // 都市名を入力
    await cityInput.fill('東京');
    
    // ボタンをクリック
    await getWeatherBtn.click();
    
    // ローディング状態を確認（短時間表示される可能性）
    // await expect(page.locator('#temperature')).toHaveText('読み込み中...', { timeout: 1000 });
    
    // 天気情報が更新されるまで待機
    await expect(page.locator('#temperature')).not.toHaveText('--', { timeout: 10000 });
    await expect(page.locator('#temperature')).not.toHaveText('読み込み中...', { timeout: 10000 });
    
    // 天気情報が表示されていることを確認
    const temperature = await page.locator('#temperature').textContent();
    const humidity = await page.locator('#humidity').textContent();
    const conditions = await page.locator('#conditions').textContent();
    const description = await page.locator('#description').textContent();
    
    // 値が更新されていることを確認（"--" や "読み込み中..." ではない）
    expect(temperature).not.toBe('--');
    expect(temperature).not.toBe('読み込み中...');
    expect(humidity).not.toBe('--');
    expect(conditions).not.toBe('--');
    expect(description).not.toBe('--');
    
    console.log('取得した天気情報:', {
      temperature,
      humidity,
      conditions,
      description
    });
  });

  test('Enterキーで天気情報を取得する', async ({ page }) => {
    const cityInput = page.locator('#cityInput');
    
    // 都市名を入力
    await cityInput.fill('大阪');
    
    // Enterキーを押す
    await cityInput.press('Enter');
    
    // 天気情報が更新されるまで待機
    await expect(page.locator('#temperature')).not.toHaveText('--', { timeout: 10000 });
    
    // 天気情報が表示されていることを確認
    const temperature = await page.locator('#temperature').textContent();
    expect(temperature).not.toBe('--');
    expect(temperature).not.toBe('読み込み中...');
  });

  test('複数の都市で連続して天気情報を取得する', async ({ page }) => {
    const cityInput = page.locator('#cityInput');
    const getWeatherBtn = page.locator('#getWeatherBtn');
    
    const cities = ['東京', '大阪', '名古屋'];
    
    for (const city of cities) {
      // 都市名を入力
      await cityInput.clear();
      await cityInput.fill(city);
      
      // ボタンをクリック
      await getWeatherBtn.click();
      
      // 天気情報が更新されるまで待機
      await expect(page.locator('#temperature')).not.toHaveText('--', { timeout: 10000 });
      await expect(page.locator('#temperature')).not.toHaveText('読み込み中...', { timeout: 10000 });
      
      // 天気情報が表示されていることを確認
      const temperature = await page.locator('#temperature').textContent();
      expect(temperature).not.toBe('--');
      
      console.log(`${city}の天気情報取得完了: ${temperature}`);
      
      // 次のテストのために少し待機
      await page.waitForTimeout(1000);
    }
  });

  test('無効な都市名でエラーハンドリングを確認', async ({ page }) => {
    const cityInput = page.locator('#cityInput');
    const getWeatherBtn = page.locator('#getWeatherBtn');
    
    // 存在しない都市名を入力
    await cityInput.fill('存在しない都市名12345');
    
    // ボタンをクリック
    await getWeatherBtn.click();
    
    // エラー状態またはデフォルト値が表示されることを確認
    // （実装によってはエラーメッセージが表示される場合もある）
    await page.waitForTimeout(5000);
    
    const temperature = await page.locator('#temperature').textContent();
    const description = await page.locator('#description').textContent();
    
    // エラー状態かデフォルト値が表示されていることを確認
    expect(temperature === 'エラー' || temperature === '--').toBeTruthy();
    
    console.log('無効な都市名での結果:', {
      temperature,
      description
    });
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // デスクトップサイズでの表示確認
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('#cityInput')).toBeVisible();
    await expect(page.locator('#getWeatherBtn')).toBeVisible();
    
    // タブレットサイズでの表示確認
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('#cityInput')).toBeVisible();
    await expect(page.locator('#getWeatherBtn')).toBeVisible();
    
    // モバイルサイズでの表示確認
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#cityInput')).toBeVisible();
    await expect(page.locator('#getWeatherBtn')).toBeVisible();
  });

  test('ナビゲーションメニューの確認', async ({ page }) => {
    // ナビゲーションリンクが表示されている
    await expect(page.locator('a:has-text("Home")')).toBeVisible();
    await expect(page.locator('a:has-text("About")')).toBeVisible();
    await expect(page.locator('a:has-text("Contact")')).toBeVisible();
    
    // 通知ボタンが表示されている
    await expect(page.locator('button:has([data-icon="Bell"])')).toBeVisible();
    
    // プロフィール画像が表示されている
    await expect(page.locator('div[style*="background-image"]')).toBeVisible();
  });
});

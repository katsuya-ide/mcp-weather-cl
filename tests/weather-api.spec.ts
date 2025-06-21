import { test, expect } from '@playwright/test';

test.describe('天気API E2E テスト', () => {
  const baseURL = 'http://localhost:3000';

  test('天気API - 有効な都市名でリクエスト', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {
        city: '東京'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // レスポンスの構造を確認
    expect(data).toHaveProperty('city');
    expect(data).toHaveProperty('temperature');
    expect(data).toHaveProperty('humidity');
    expect(data).toHaveProperty('conditions');
    expect(data).toHaveProperty('description');
    
    // 値が適切に設定されていることを確認
    expect(data.city).toBe('東京');
    expect(data.temperature).not.toBe('--');
    expect(data.humidity).not.toBe('--');
    expect(data.conditions).not.toBe('--');
    expect(data.description).not.toBe('--');
    
    console.log('東京の天気データ:', data);
  });

  test('天気API - 複数の都市でリクエスト', async ({ request }) => {
    const cities = ['東京', '大阪', '名古屋', '福岡', '札幌'];
    
    for (const city of cities) {
      const response = await request.post(`${baseURL}/api/weather`, {
        data: {
          city: city
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      expect(data.city).toBe(city);
      expect(data.temperature).not.toBe('--');
      expect(data.conditions).not.toBe('--');
      
      console.log(`${city}の天気データ:`, {
        temperature: data.temperature,
        conditions: data.conditions,
        humidity: data.humidity
      });
    }
  });

  test('天気API - 空の都市名でリクエスト', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {
        city: ''
      }
    });

    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('City name is required');
  });

  test('天気API - 都市名なしでリクエスト', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {}
    });

    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('City name is required');
  });

  test('天気API - 無効なJSONでリクエスト', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: 'invalid json'
    });

    expect(response.status()).toBe(500);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('天気API - 存在しない都市名でリクエスト', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {
        city: '存在しない都市名12345'
      }
    });

    // ステータスコードは200または500のいずれかになる可能性がある
    // （実装によってエラーハンドリングが異なる）
    expect([200, 500]).toContain(response.status());
    
    const data = await response.json();
    
    if (response.status() === 500) {
      expect(data).toHaveProperty('error');
    } else {
      // 200の場合、デフォルト値またはエラー状態が返される
      expect(data).toHaveProperty('city');
    }
    
    console.log('存在しない都市名での結果:', data);
  });

  test('天気API - レスポンス時間の確認', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {
        city: '東京'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.status()).toBe(200);
    
    // レスポンス時間が10秒以内であることを確認
    expect(responseTime).toBeLessThan(10000);
    
    console.log(`レスポンス時間: ${responseTime}ms`);
  });

  test('天気API - 同時リクエストの処理', async ({ request }) => {
    const cities = ['東京', '大阪', '名古屋'];
    
    // 同時に複数のリクエストを送信
    const promises = cities.map(city => 
      request.post(`${baseURL}/api/weather`, {
        data: { city }
      })
    );
    
    const responses = await Promise.all(promises);
    
    // すべてのレスポンスが成功していることを確認
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const city = cities[i];
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.city).toBe(city);
      expect(data.temperature).not.toBe('--');
      
      console.log(`同時リクエスト - ${city}:`, data.temperature);
    }
  });

  test('天気API - CORS ヘッダーの確認', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {
        city: '東京'
      }
    });

    expect(response.status()).toBe(200);
    
    // CORS ヘッダーが設定されていることを確認
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('*');
    expect(headers['access-control-allow-methods']).toContain('POST');
    expect(headers['access-control-allow-headers']).toContain('Content-Type');
  });

  test('天気API - Content-Type ヘッダーの確認', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/weather`, {
      data: {
        city: '東京'
      }
    });

    expect(response.status()).toBe(200);
    
    // Content-Type ヘッダーが正しく設定されていることを確認
    const headers = response.headers();
    expect(headers['content-type']).toContain('application/json');
    expect(headers['content-type']).toContain('charset=utf-8');
  });
});

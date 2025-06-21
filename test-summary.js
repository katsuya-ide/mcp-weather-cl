// 要約機能のテスト

function estimatePrecipitation(conditions) {
  console.log(`Testing precipitation for: "${conditions}"`);
  
  if (conditions.includes('雨') || conditions.includes('雷')) {
    return '80%';
  } else if (conditions.includes('曇') && conditions.includes('雨')) {
    return '60%';
  } else if (conditions.includes('曇')) {
    return '30%';
  } else if (conditions.includes('晴')) {
    return '10%';
  }
  return '--';
}

function summarizeDescription(fullText, cityText) {
  console.log(`Testing summary for city: "${cityText}"`);
  
  const lines = fullText.split('\n');
  let title = '';
  let todayWeather = '';
  let todayTemp = '';
  
  // タイトルと今日の天気情報を抽出
  for (const line of lines) {
    if (line.includes('の天気')) {
      title = line.split('の天気')[0];
      console.log(`Found title: "${title}"`);
    }
    if (line.includes('今日:')) {
      const nextLineIndex = lines.indexOf(line) + 1;
      if (nextLineIndex < lines.length) {
        const weatherLine = lines[nextLineIndex];
        if (weatherLine.includes('天気:')) {
          todayWeather = weatherLine.replace('天気:', '').trim();
          console.log(`Found today weather: "${todayWeather}"`);
        }
      }
    }
    if (line.includes('最高気温:')) {
      const tempMatch = line.match(/最高気温:\s*(\d+)℃/);
      if (tempMatch) {
        todayTemp = tempMatch[1] + '℃';
        console.log(`Found today temp: "${todayTemp}"`);
      }
    }
  }

  // 要約文を作成（100文字以内）
  let summary = `${title || cityText}の今日の天気は${todayWeather || '不明'}`;
  if (todayTemp !== '') {
    summary += `、最高気温${todayTemp}`;
  }
  summary += 'の予報です。';

  console.log(`Generated summary (${summary.length} chars): "${summary}"`);

  // 100文字を超える場合は切り詰め
  if (summary.length > 100) {
    summary = summary.substring(0, 97) + '...';
    console.log(`Truncated summary: "${summary}"`);
  }

  return summary;
}

// テストデータ
const testConditions = "晴時々曇";
const testText = `東京都 東京 の天気
発表時刻: 2025/06/15 17:00:00

概況:
　低気圧が三陸沖を東北東へ進んでおり、低気圧からのびる前線が関東甲信地方を通過しています。

予報:
今日:
天気: 曇り
最高気温: 35℃
詳細: くもり　所により　夜のはじめ頃　まで　雨　で　雷を伴い　激しく　降る
---
明日:
天気: 曇のち時々晴
最高気温: 29℃
最低気温: 23℃
---`;

console.log("=== Testing Precipitation Estimation ===");
const precipitation = estimatePrecipitation(testConditions);
console.log(`Result: ${precipitation}`);

console.log("\n=== Testing Description Summary ===");
const summary = summarizeDescription(testText, "東京の天気を教えて");
console.log(`Final result: ${summary}`);

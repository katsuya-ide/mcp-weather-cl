import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// 地域データのインターフェース
class CityDataLoader {
  constructor() {
    this.cityDataCache = [];
  }

  async loadCityData() {
    try {
      const response = await fetch('https://weather.tsukumijima.net/primary_area.xml');
      const xmlText = await response.text();
      
      this.cityDataCache = this.parseXMLCityData(xmlText);
      console.log(`Loaded ${this.cityDataCache.length} cities from XML`);
    } catch (error) {
      console.error('Failed to load city data from XML:', error);
      this.cityDataCache = this.getFallbackCityData();
      console.log('Using fallback city data');
    }
  }

  parseXMLCityData(xmlText) {
    const cities = [];
    const prefRegex = /<pref title="([^"]+)">/g;
    const cityRegex = /<city title="([^"]+)" id="([^"]+)"/g;
    
    let currentPrefecture = '';
    const lines = xmlText.split('\n');
    
    for (const line of lines) {
      const prefMatch = prefRegex.exec(line);
      if (prefMatch) {
        currentPrefecture = this.decodeHtmlEntities(prefMatch[1]);
        prefRegex.lastIndex = 0;
        continue;
      }
      
      const cityMatch = cityRegex.exec(line);
      if (cityMatch && currentPrefecture) {
        const cityName = this.decodeHtmlEntities(cityMatch[1]);
        const cityId = cityMatch[2];
        
        cities.push({
          name: cityName,
          id: cityId,
          prefecture: currentPrefecture
        });
        cityRegex.lastIndex = 0;
      }
    }
    
    return cities;
  }

  decodeHtmlEntities(text) {
    const entities = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  getFallbackCityData() {
    return [
      { name: '札幌', id: '016010', prefecture: '北海道' },
      { name: '仙台', id: '040010', prefecture: '宮城県' },
      { name: '東京', id: '130010', prefecture: '東京都' },
      { name: '横浜', id: '140010', prefecture: '神奈川県' },
      { name: '名古屋', id: '230010', prefecture: '愛知県' },
      { name: '大阪', id: '270000', prefecture: '大阪府' },
      { name: '神戸', id: '280010', prefecture: '兵庫県' },
      { name: '広島', id: '340010', prefecture: '広島県' },
      { name: '福岡', id: '400010', prefecture: '福岡県' },
      { name: '久留米', id: '400040', prefecture: '福岡県' },
      { name: '那覇', id: '471010', prefecture: '沖縄県' }
    ];
  }

  findCityByName(cityText) {
    const normalizedInput = cityText.toLowerCase().replace(/[市県府都区]/g, '');
    
    for (const city of this.cityDataCache) {
      if (city.name.toLowerCase() === normalizedInput || 
          city.name.toLowerCase().includes(normalizedInput) ||
          normalizedInput.includes(city.name.toLowerCase())) {
        return city;
      }
    }
    
    for (const city of this.cityDataCache) {
      if (city.name.includes(normalizedInput) || 
          normalizedInput.includes(city.name)) {
        return city;
      }
    }
    
    return null;
  }
}

async function testCityLookupAndWeather() {
  const cityLoader = new CityDataLoader();
  await cityLoader.loadCityData();
  
  const client = new Client({ name: "weather-test-client", version: "1.0.0" });
  
  try {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["D:/AI/Projects/mcp-weather/build/index.js"],
    });
    
    await client.connect(transport);
    console.log("Connected to weather MCP server");
    
    // テスト用の都市名
    const testCities = [
      "東京の天気を教えて",
      "大阪",
      "久留米市の天気",
      "札幌の明日の天気は？",
      "横浜"
    ];
    
    for (const cityText of testCities) {
      console.log(`\n=== テスト: "${cityText}" ===`);
      
      // 都市名から地域IDを検索
      const cityData = cityLoader.findCityByName(cityText);
      if (cityData) {
        console.log(`Found: ${cityData.name} (${cityData.prefecture}) -> ${cityData.id}`);
        
        try {
          const result = await client.callTool({
            name: "get-forecast",
            arguments: { regionId: cityData.id }
          });
          
          if (Array.isArray(result.content) && result.content.length > 0) {
            const forecastText = result.content[0].text;
            
            // 簡単な解析
            const lines = forecastText.split('\n');
            let temperature = '--';
            let conditions = '--';
            
            for (const line of lines) {
              if (line.includes('最高気温:')) {
                const tempMatch = line.match(/最高気温:\s*(\d+)℃/);
                if (tempMatch) temperature = tempMatch[1] + '℃';
              }
              if (line.includes('天気:')) {
                const weatherMatch = line.match(/天気:\s*(.+)/);
                if (weatherMatch) conditions = weatherMatch[1].trim();
              }
            }
            
            console.log(`気温: ${temperature}, 天気: ${conditions}`);
          }
        } catch (error) {
          console.error(`Weather API error: ${error.message}`);
        }
      } else {
        console.log("City not found in database");
      }
    }
    
    await client.close();
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testCityLookupAndWeather();

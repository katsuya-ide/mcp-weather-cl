import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

import dotenv from "dotenv";

dotenv.config(); // load environment variables from .env

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

// 地域データのインターフェース
interface CityData {
  name: string;
  id: string;
  prefecture: string;
}

class WeatherMCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private server: http.Server | null = null;
  private cityDataCache: CityData[] = [];

  constructor() {
    // Initialize Anthropic client and MCP client
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "weather-mcp-client", version: "1.0.0" });
  }

  async loadCityData(): Promise<void> {
    /**
     * XMLから都市データを読み込む
     */
    try {
      const response = await fetch('https://weather.tsukumijima.net/primary_area.xml');
      const xmlText = await response.text();
      
      // XMLをパースして都市データを抽出
      this.cityDataCache = this.parseXMLCityData(xmlText);
      console.log(`Loaded ${this.cityDataCache.length} cities from XML`);
    } catch (error) {
      console.error('Failed to load city data from XML:', error);
      // フォールバック: 主要都市のハードコードデータ
      this.cityDataCache = this.getFallbackCityData();
      console.log('Using fallback city data');
    }
  }

  parseXMLCityData(xmlText: string): CityData[] {
    /**
     * XMLテキストから都市データを抽出
     */
    const cities: CityData[] = [];
    
    // 正規表現でprefとcityタグを抽出
    const prefRegex = /<pref title="([^"]+)">/g;
    const cityRegex = /<city title="([^"]+)" id="([^"]+)"/g;
    
    let currentPrefecture = '';
    const lines = xmlText.split('\n');
    
    for (const line of lines) {
      // 県名を抽出
      const prefMatch = prefRegex.exec(line);
      if (prefMatch) {
        currentPrefecture = this.decodeHtmlEntities(prefMatch[1]);
        prefRegex.lastIndex = 0; // リセット
        continue;
      }
      
      // 都市名とIDを抽出
      const cityMatch = cityRegex.exec(line);
      if (cityMatch && currentPrefecture) {
        const cityName = this.decodeHtmlEntities(cityMatch[1]);
        const cityId = cityMatch[2];
        
        cities.push({
          name: cityName,
          id: cityId,
          prefecture: currentPrefecture
        });
        cityRegex.lastIndex = 0; // リセット
      }
    }
    
    return cities;
  }

  decodeHtmlEntities(text: string): string {
    /**
     * HTMLエンティティをデコード（簡易版）
     */
    const entities: { [key: string]: string } = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  getFallbackCityData(): CityData[] {
    /**
     * フォールバック用の主要都市データ
     */
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

  async connectToWeatherServer(serverScriptPath: string) {
    /**
     * Connect to the MCP weather server
     */
    try {
      // Determine script type and appropriate command
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;

      // Initialize transport and connect to server
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      await this.mcp.connect(this.transport);

      // List available tools
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });
      console.log(
        "Connected to weather server with tools:",
        this.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log("Failed to connect to MCP weather server: ", e);
      throw e;
    }
  }

  findCityByName(cityText: string): CityData | null {
    /**
     * 都市名から都市データを検索
     */
    const normalizedInput = cityText.toLowerCase().replace(/[市県府都区]/g, '');
    
    // 完全一致を優先
    for (const city of this.cityDataCache) {
      if (city.name.toLowerCase() === normalizedInput || 
          city.name.toLowerCase().includes(normalizedInput) ||
          normalizedInput.includes(city.name.toLowerCase())) {
        return city;
      }
    }
    
    // 部分一致
    for (const city of this.cityDataCache) {
      if (city.name.includes(normalizedInput) || 
          normalizedInput.includes(city.name)) {
        return city;
      }
    }
    
    return null;
  }

  async findRegionIdWithLLM(cityText: string): Promise<string | null> {
    /**
     * LLMを使用して都市名から地域IDを推定する
     */
    try {
      // 利用可能な都市リストを作成
      const cityList = this.cityDataCache.slice(0, 50).map(city => 
        `${city.name}(${city.prefecture}): ${city.id}`
      ).join('\n');

      const prompt = `以下の都市名または文章から、日本の気象庁の地域IDを推定してください。

入力: "${cityText}"

利用可能な地域ID（一部）:
${cityList}

回答は地域IDの6桁の数字のみを返してください。該当する地域が見つからない場合は「UNKNOWN」と返してください。`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const result = response.content[0];
      if (result.type === "text") {
        const regionId = result.text.trim();
        if (regionId !== "UNKNOWN" && /^\d{6}$/.test(regionId)) {
          return regionId;
        }
      }
    } catch (error) {
      console.error("LLM lookup failed:", error);
    }
    
    return null;
  }

  async getRegionId(cityText: string): Promise<string | null> {
    /**
     * 都市名から地域IDを取得する
     */
    // まず都市データから検索
    const cityData = this.findCityByName(cityText);
    if (cityData) {
      console.log(`Found city: ${cityData.name} (${cityData.prefecture}) -> ${cityData.id}`);
      return cityData.id;
    }
    
    // LLMを使用して推定
    console.log(`City not found in database, using LLM for: ${cityText}`);
    return await this.findRegionIdWithLLM(cityText);
  }

  async getWeatherData(cityText: string) {
    /**
     * 都市名から天気データを取得する
     */
    try {
      // 地域IDを取得
      const regionId = await this.getRegionId(cityText);
      if (!regionId) {
        throw new Error(`地域ID が見つかりません: ${cityText}`);
      }

      console.log(`Using region ID ${regionId} for city: ${cityText}`);

      // get-forecast ツールを呼び出す
      const result = await this.mcp.callTool({
        name: "get-forecast",
        arguments: { regionId: regionId }
      });

      // 結果を解析
      let forecastText = "";
      if (Array.isArray(result.content) && result.content.length > 0) {
        forecastText = result.content[0].text;
      } else if (typeof result.content === 'string') {
        forecastText = result.content;
      } else {
        throw new Error("Invalid forecast data received");
      }

      return this.parseForecastData(forecastText, cityText);

    } catch (error) {
      console.error("Error getting weather data:", error);
      throw error;
    }
  }

  parseForecastData(forecastText: string, cityText: string) {
    /**
     * 天気予報テキストを解析してWebページ用のデータに変換
     */
    const lines = forecastText.split('\n');
    let temperature = '--';
    let conditions = '--';
    let precipitation = '--';
    let description = forecastText;

    // 今日の天気情報を抽出
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 気温情報を抽出
      if (line.includes('最高気温:')) {
        const tempMatch = line.match(/最高気温:\s*(\d+)℃/);
        if (tempMatch) {
          temperature = tempMatch[1] + '℃';
        }
      }
      
      // 天気情報を抽出
      if (line.includes('天気:')) {
        const weatherMatch = line.match(/天気:\s*(.+)/);
        if (weatherMatch) {
          conditions = weatherMatch[1].trim();
        }
      }
    }

    // 降水確率を推定（天気から）
    precipitation = this.estimatePrecipitation(conditions);

    // 説明文を要約
    const summarizedDescription = this.summarizeDescription(forecastText, cityText);

    return {
      city: cityText,
      temperature: temperature,
      humidity: precipitation, // 降水確率に変更
      conditions: conditions,
      description: summarizedDescription
    };
  }

  estimatePrecipitation(conditions: string): string {
    /**
     * 天気から降水確率を推定
     */
    console.log(`Estimating precipitation for: "${conditions}"`);
    
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

  summarizeDescription(fullText: string, cityText: string): string {
    /**
     * 天気予報の説明文を100文字程度に要約
     */
    const lines = fullText.split('\n');
    let title = '';
    let todayWeather = '';
    let todayTemp = '';
    
    // タイトルと今日の天気情報を抽出
    for (const line of lines) {
      if (line.includes('の天気')) {
        title = line.split('の天気')[0];
      }
      if (line.includes('今日:')) {
        const nextLineIndex = lines.indexOf(line) + 1;
        if (nextLineIndex < lines.length) {
          const weatherLine = lines[nextLineIndex];
          if (weatherLine.includes('天気:')) {
            todayWeather = weatherLine.replace('天気:', '').trim();
          }
        }
      }
      if (line.includes('最高気温:')) {
        const tempMatch = line.match(/最高気温:\s*(\d+)℃/);
        if (tempMatch) {
          todayTemp = tempMatch[1] + '℃';
        }
      }
    }

    // 要約文を作成（100文字以内）
    let summary = `${title || cityText}の今日の天気は${todayWeather || '不明'}`;
    if (todayTemp !== '') {
      summary += `、最高気温${todayTemp}`;
    }
    summary += 'の予報です。';

    // 100文字を超える場合は切り詰め
    if (summary.length > 100) {
      summary = summary.substring(0, 97) + '...';
    }

    return summary;
  }

  startWebServer(port: number = 3000) {
    /**
     * Start the web server to serve the HTML interface
     */
    this.server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname;

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Serve the HTML file
      if (pathname === '/' || pathname === '/index.html') {
        try {
          const htmlContent = fs.readFileSync('index.html', 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(htmlContent);
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('HTML file not found');
        }
        return;
      }

      // Weather API endpoint
      if (pathname === '/api/weather' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { city } = JSON.parse(body);
            if (!city) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'City name is required' }));
              return;
            }

            const weatherData = await this.getWeatherData(city);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(weatherData));

          } catch (error) {
            console.error('Weather API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
              error: 'Failed to get weather data',
              message: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
        });
        return;
      }

      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    });

    this.server.listen(port, () => {
      console.log(`Weather MCP Client server running at http://localhost:${port}`);
      console.log(`Open your browser and navigate to http://localhost:${port} to use the weather app`);
    });
  }

  async cleanup() {
    /**
     * Clean up resources
     */
    if (this.server) {
      this.server.close();
    }
    if (this.mcp) {
      await this.mcp.close();
    }
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node build/index.js <path_to_weather_server_script>");
    console.log("Example: node build/index.js D:/AI/Projects/mcp-weather/build/index.js");
    return;
  }

  const weatherClient = new WeatherMCPClient();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await weatherClient.cleanup();
    process.exit(0);
  });

  try {
    // Load city data from XML
    await weatherClient.loadCityData();
    
    // Connect to the weather MCP server
    await weatherClient.connectToWeatherServer(process.argv[2]);
    
    // Start the web server
    weatherClient.startWebServer(3000);
    
  } catch (error) {
    console.error("Failed to start weather client:", error);
    await weatherClient.cleanup();
    process.exit(1);
  }
}

main();

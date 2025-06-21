import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testWeatherForecast() {
  const client = new Client({ name: "weather-test-client", version: "1.0.0" });
  
  try {
    // Connect to the weather MCP server
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["D:/AI/Projects/mcp-weather/build/index.js"],
    });
    
    await client.connect(transport);
    console.log("Connected to weather MCP server");
    
    // List available tools
    const toolsResult = await client.listTools();
    console.log("Available tools:", toolsResult.tools.map(t => t.name));
    
    // Test with different region IDs
    const regionIds = [
      "400040", // 久留米市（福岡県）
      "130010", // 東京都東京
      "270000", // 大阪府
      "140010", // 横浜（神奈川県）
    ];
    
    for (const regionId of regionIds) {
      console.log(`\n=== 地域ID: ${regionId} の天気予報 ===`);
      
      try {
        const result = await client.callTool({
          name: "get-forecast",
          arguments: { regionId: regionId }
        });
        
        if (Array.isArray(result.content) && result.content.length > 0) {
          console.log(result.content[0].text);
        } else {
          console.log("No forecast data received");
        }
      } catch (error) {
        console.error(`Error getting forecast for region ${regionId}:`, error.message);
      }
    }
    
    await client.close();
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testWeatherForecast();

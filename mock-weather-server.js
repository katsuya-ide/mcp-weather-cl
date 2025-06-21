#!/usr/bin/env node

/**
 * Mock MCP Weather Server for testing purposes
 * This simulates a basic weather server that provides weather information
 */

import readline from 'readline';

class MockWeatherServer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Mock weather data for different cities
    this.weatherData = {
      'tokyo': {
        temperature: '22°C',
        humidity: '65%',
        conditions: 'Partly Cloudy',
        description: 'Partly cloudy with occasional sunshine. Light breeze from the east.'
      },
      'osaka': {
        temperature: '24°C',
        humidity: '70%',
        conditions: 'Cloudy',
        description: 'Overcast skies with high humidity. No precipitation expected.'
      },
      'kyoto': {
        temperature: '20°C',
        humidity: '60%',
        conditions: 'Sunny',
        description: 'Clear sunny skies with comfortable temperature and low humidity.'
      },
      'new york': {
        temperature: '18°C',
        humidity: '55%',
        conditions: 'Rainy',
        description: 'Light rain with cool temperatures. Umbrella recommended.'
      },
      'london': {
        temperature: '15°C',
        humidity: '80%',
        conditions: 'Foggy',
        description: 'Dense fog with high humidity. Visibility is limited.'
      },
      'paris': {
        temperature: '19°C',
        humidity: '58%',
        conditions: 'Sunny',
        description: 'Beautiful sunny day with mild temperatures and gentle breeze.'
      }
    };
  }

  getWeatherForCity(city) {
    const cityKey = city.toLowerCase().trim();
    const weather = this.weatherData[cityKey];
    
    if (weather) {
      return {
        city: city,
        ...weather,
        timestamp: new Date().toISOString()
      };
    } else {
      // Return generic weather for unknown cities
      return {
        city: city,
        temperature: '20°C',
        humidity: '50%',
        conditions: 'Unknown',
        description: `Weather information for ${city} is not available in our database.`,
        timestamp: new Date().toISOString()
      };
    }
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id: id,
      result: result
    };
    console.log(JSON.stringify(response));
  }

  sendError(id, error) {
    const response = {
      jsonrpc: '2.0',
      id: id,
      error: {
        code: -1,
        message: error
      }
    };
    console.log(JSON.stringify(response));
  }

  handleRequest(request) {
    try {
      const req = JSON.parse(request);
      
      switch (req.method) {
        case 'initialize':
          this.sendResponse(req.id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'mock-weather-server',
              version: '1.0.0'
            }
          });
          break;

        case 'tools/list':
          this.sendResponse(req.id, {
            tools: [
              {
                name: 'get_weather',
                description: 'Get current weather information for a city',
                inputSchema: {
                  type: 'object',
                  properties: {
                    city: {
                      type: 'string',
                      description: 'The name of the city to get weather for'
                    }
                  },
                  required: ['city']
                }
              }
            ]
          });
          break;

        case 'tools/call':
          if (req.params.name === 'get_weather') {
            const city = req.params.arguments.city;
            const weatherData = this.getWeatherForCity(city);
            
            this.sendResponse(req.id, {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(weatherData)
                }
              ]
            });
          } else {
            this.sendError(req.id, `Unknown tool: ${req.params.name}`);
          }
          break;

        default:
          this.sendError(req.id, `Unknown method: ${req.method}`);
      }
    } catch (error) {
      this.sendError(null, `Invalid JSON: ${error.message}`);
    }
  }

  start() {
    // Send server info on startup
    process.stderr.write('Mock Weather Server started\n');
    
    this.rl.on('line', (line) => {
      if (line.trim()) {
        this.handleRequest(line);
      }
    });

    this.rl.on('close', () => {
      process.exit(0);
    });
  }
}

// Start the mock server
const server = new MockWeatherServer();
server.start();

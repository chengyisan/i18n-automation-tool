import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as scanHardcoded from './tools/scanHardcoded.js'
import * as validateSetup from './tools/validateSetup.js'
import * as generateReport from './tools/generateReport.js'
import * as checkReactive from './tools/checkReactive.js'
import * as checkQuality from './tools/checkQuality.js'
import * as checkLayout from './tools/checkLayout.js'
import * as initConfig from './tools/initConfig.js'

/** 创建并配置 MCP Server 实例 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'i18n-automation-tool',
    version: '0.1.0',
  })

  // 注册所有 tools
  server.tool(scanHardcoded.schema.name, scanHardcoded.schema.description, scanHardcoded.schema.inputSchema, scanHardcoded.handler)
  server.tool(validateSetup.schema.name, validateSetup.schema.description, validateSetup.schema.inputSchema, validateSetup.handler)
  server.tool(generateReport.schema.name, generateReport.schema.description, generateReport.schema.inputSchema, generateReport.handler)
  server.tool(checkReactive.schema.name, checkReactive.schema.description, checkReactive.schema.inputSchema, checkReactive.handler)
  server.tool(checkQuality.schema.name, checkQuality.schema.description, checkQuality.schema.inputSchema, checkQuality.handler)
  server.tool(checkLayout.schema.name, checkLayout.schema.description, checkLayout.schema.inputSchema, checkLayout.handler)
  server.tool(initConfig.schema.name, initConfig.schema.description, initConfig.schema.inputSchema, initConfig.handler)

  return server
}

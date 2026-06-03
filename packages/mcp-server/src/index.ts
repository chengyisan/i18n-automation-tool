#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.js'

async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error: Error) => {
  process.stderr.write(`MCP Server 启动失败: ${error.message}\n`)
  process.exit(1)
})

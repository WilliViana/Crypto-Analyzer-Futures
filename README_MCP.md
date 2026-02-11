# Configuração do Servidor MCP Firecrawl

Este projeto inclui uma configuração pré-definida para o servidor MCP do Firecrawl.

## Instalação

### Claude Desktop ou Cline/Roo-Code (VS Code)

1. Abra o arquivo de configuração do seu cliente MCP.
    * **Claude Desktop:** `Em Settings > Developer > Edit Config`
    * **VS Code (Cline/Roo-Code):** Geralmente acessível através das configurações da extensão em "MCP Servers" ou editando o arquivo de configurações JSON da extensão.

2. Copie o conteúdo do arquivo `firecrawl_mcp_config.json` localizado na raiz deste projeto.

3. Cole dentro da chave `"mcpServers"` do seu arquivo de configuração (ou mescle com os servidores existentes).

### Exemplo de Configuração Completa

Se você já tiver outros servidores, seu arquivo deve ficar parecido com este:

```json
{
  "mcpServers": {
    "seu-outro-servidor": { ... },
    "firecrawl": {
      "command": "npx",
      "args": [
        "-y",
        "firecrawl-mcp"
      ],
      "env": {
        "FIRECRAWL_API_KEY": "fc-24a0a5070a8b446b98e148e8765b8b89"
      }
    }
  }
}
```

1. Reinicie seu cliente MCP para aplicar as alterações.

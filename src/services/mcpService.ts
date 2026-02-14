
import { OrderRequest, Exchange } from '../types';
import { fetchAssetPrice } from './marketService';

const callMcpCli = async (tool: string, server: string, input: any): Promise<any> => {
  console.debug(`[MCP Bridge] Executing manus-mcp-cli tool call ${tool} --server ${server}`);
  
  // Simulando resposta de latência de rede real
  await new Promise(r => setTimeout(r, 600));

  if (server === 'bybit' || server === 'binance' || server === 'okx') {
    switch (tool) {
      case 'place_order':
        return { 
            success: true, 
            orderId: `${server.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            timestamp: Date.now()
        };
      case 'get_account_info':
        return { 
          balance: 15420.50, 
          status: 'ACCOUNT_READY',
          equity: 15420.50,
          assets: [
            { symbol: 'USDT', amount: 5420.50 }, 
            { symbol: 'BTC', amount: 0.15 },
            { symbol: 'ETH', amount: 1.2 }
          ] 
        };
      default:
        throw new Error(`Tool ${tool} not found on MCP Server.`);
    }
  }
  
  // Suporte genérico para DEXs via MCP
  return { success: true, hash: '0x' + Math.random().toString(16).substring(2) };
};

export const placeOrder = async (order: OrderRequest, exchange: Exchange) => {
  const mcpInput = {
    symbol: order.symbol.toUpperCase().endsWith('USDT') ? order.symbol.toUpperCase() : `${order.symbol.toUpperCase()}USDT`,
    side: order.side.toLowerCase(),
    type: order.type.toLowerCase(),
    qty: order.quantity,
    price: order.price,
    leverage: order.leverage,
    stop_loss: order.stopLossPrice,
    take_profit: order.takeProfitPrice
  };
  
  return callMcpCli('place_order', exchange.name.toLowerCase(), mcpInput);
};

export const getAccountInfo = async (exchange: Exchange) => {
  return callMcpCli('get_account_info', exchange.name.toLowerCase(), {});
};

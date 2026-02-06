
import { Language, StrategyType } from '../types';

export const translations = {
  pt: {
    sidebar: {
      dashboard: 'Visão Geral',
      strategies: 'Motor Algorítmico',
      wallet: 'Carteira Real',
      analysis: 'Análise de Fluxo',
      backtest: 'Backtest',
      history: 'Historial',
      logs: 'Auditoria',
      settings: 'Ajustes API',
      admin: 'Admin',
      role: 'Trader HFT'
    },
    header: {
      status_live: 'MOTOR ATIVO',
      status_offline: 'SISTEMA EM ESPERA',
      latency: 'Latência',
      start: 'INICIAR ALGORITMOS',
      stop: 'PARAR EXECUÇÃO',
      ai_insight: 'Insight IA'
    },
    trade_history: {
      title: 'Histórico de Trades',
      desc: 'Registro completo de ordens enviadas via API.',
      col_symbol: 'Símbolo',
      col_side: 'Lado',
      col_entry: 'Entrada',
      col_exit: 'Saída',
      col_amount: 'Quant.',
      col_pnl: 'PnL ($)',
      col_status: 'Status',
      col_time: 'Data/Hora',
      col_strategy: 'Estratégia',
      export: 'Exportar CSV',
      search_placeholder: 'Buscar por símbolo...'
    },
    login: {
      welcome: 'Bem-vindo ao CAP v10',
      subtitle: 'Autentique-se para acessar o motor de trading HFT',
      email: 'Email',
      phone: 'Telefone',
      password: 'Senha',
      remember: 'Manter conectado',
      signin: 'Entrar no Terminal',
      forgot: 'Esqueceu a senha?',
      no_account: 'Não tem uma conta? Criar conta',
      demo_admin: 'Demo: admin@crypto.com / admin123',
      or_continue: 'Ou continue com',
      google_login: 'Login com Google',
      features: {
        t1: 'Execução Alpha Predator',
        d1: 'Scalping agressivo com alavancagem de 70x',
        t2: 'Análise de Liquidez 1m',
        d2: 'Monitoramento de liquidações em tempo real',
        t3: 'Confluência de Fibonacci',
        d3: 'Algoritmos avançados de retração e volume'
      }
    },
    dashboard: {
      metrics: {
        total_balance: 'Saldo Total',
        active_pnl: 'PnL em Aberto',
        win_rate: 'Taxa de Acerto',
        profit_factor: 'Fator de Lucro',
        gross: 'Lucro Bruto'
      },
      recent_trades: 'Trades por Perfil',
      no_trades: 'Nenhum trade nas últimas 24h.',
      equity_curve: 'Desempenho da Sessão',
      assets: 'Ativos Conectados',
      entry: 'Entrada',
      exit: 'Saída',
      profit: 'Lucro'
    },
    strategy_card: {
      conf: 'Confiança',
      lev: 'Alav.',
      capital: 'Capital',
      win_rate: 'Win Rate',
      trades: 'Ordens',
      active_pos: 'Posição Ativa',
      scanning: 'Sincronizando...',
      next_scan: 'Prox. scan em',
      edit: 'Ajustar Parâmetros',
      create_new: 'Criar Estratégia',
      analyze_btn: 'Auditoria IA',
      legend_btn: 'Guia de Fluxogramas',
      investment: 'Investimento (USD)',
      leverage: 'Alavancagem',
      select_profile: 'Perfil Seleccionado',
      profit_potential: 'Profit Estimado',
      loss_potential: 'Stop Estimado',
      market_data_title: 'Dados de Mercado em Tempo Real',
      execution_guide: 'Guia de Execução Estratégica'
    },
    terminal: {
      title: 'TERMINAL DE EXECUÇÃO HFT',
      init: 'Carregando bibliotecas matemáticas...',
      paused: 'Status: DESLIGADO',
      running: 'Status: EXECUTANDO ESTRATEGIAS',
      connection: 'Conexão segura estabelecida.',
      ai_req: 'Processando sinais com Gemini...',
      ai_done: 'Sinais validados com sucesso.',
      error_no_exchange: 'ERRO: Nenhuma API conectada.'
    },
    chatbot: {
      title: 'Analista Gemini 1.5 Pro',
      placeholder: 'Solicitar análise técnica...',
      initial: 'Olá. Estou monitorando os desvios de preço. Em que posso ajudar?',
      thinking: 'Analisando fluxos...',
      error: 'Erro de conexão com a rede neural.'
    },
    wallet: {
      title: 'Gestão de Capital Real',
      total_balance: 'Patrimônio Líquido',
      daily_pnl: 'PnL 24h',
      win_rate: 'Win Rate Real',
      profit_factor: 'Drawdown Máx.',
      assets: 'Alocação por Moeda',
      recent_activity: 'Performance da Sessão',
      equity_curve: 'Curva de Patrimônio',
      holdings_table: 'Posições Ativas em CEX',
      col_asset: 'Ativo',
      col_price: 'Preço Médio',
      col_curr_price: 'Preço Atual',
      col_amount: 'Posição',
      col_value: 'Valor (USD)',
      col_pnl: 'P&L',
      col_alloc: 'Alocação'
    },
    exchange_manager: {
      title: 'Gestão de Corretoras',
      cex_tab: 'CEX (Centralizadas)',
      dex_tab: 'DEX (Descentralizadas)',
      connect: 'Conectar',
      disconnect: 'Desconectar'
    },
    advanced_analytics: {
      depth_title: 'Profundidade de Mercado',
      health_title: 'Saúde do Ativo',
      ls_title: 'Long/Short Ratio',
      corr_title: 'Correlações de Mercado'
    },
    admin: {
      title: 'Painel de Controle Admin',
      kill_switch: 'KILL SWITCH TOTAL',
      cpu: 'Carga de CPU',
      memory: 'Memória RAM',
      active_sessions: 'Sessões Ativas',
      api_status: 'Status da API',
      users: 'Gestão de Usuários',
      user_table: {
        user: 'Usuário',
        role: 'Cargo',
        status: 'Status',
        last_login: 'Último Login',
        actions: 'Ações'
      },
      config: 'Configurações do Sistema',
      maintenance: 'Modo Manutenção',
      security: 'Criptografia Militar'
    },
    ai_modes: {
      technical_title: 'Análise Técnica Pro',
      news_title: 'Sentimento e Notícias',
      deep_title: 'Análise Profunda CoT'
    },
    chart: {
      bubble_map: 'Mapa de Calor de Bolhas'
    },
    edit_modal: {
      title: 'Ajustar Perfil',
      name_label: 'Nome do Perfil'
    }
  },
  en: {
    sidebar: {
      dashboard: 'Overview',
      strategies: 'Algo Engine',
      wallet: 'Real Wallet',
      analysis: 'Flow Analysis',
      backtest: 'Backtesting',
      history: 'History',
      logs: 'Audit Logs',
      settings: 'API Settings',
      admin: 'Admin',
      role: 'HFT Trader'
    },
    header: {
      status_live: 'ENGINE ACTIVE',
      status_offline: 'SYSTEM STANDBY',
      latency: 'Latency',
      start: 'START ALGORITHMS',
      stop: 'STOP EXECUTION',
      ai_insight: 'AI Insight'
    },
    trade_history: {
      title: 'Trade History',
      desc: 'Complete record of API executed orders.',
      col_symbol: 'Symbol',
      col_side: 'Side',
      col_entry: 'Entry',
      col_exit: 'Exit',
      col_amount: 'Amount',
      col_pnl: 'PnL ($)',
      col_status: 'Status',
      col_time: 'Time',
      col_strategy: 'Strategy',
      export: 'Export CSV',
      search_placeholder: 'Search by symbol...'
    },
    login: {
      welcome: 'Welcome to CAP v10',
      subtitle: 'Authenticate to access the HFT trading engine',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      remember: 'Keep signed in',
      signin: 'Enter Terminal',
      forgot: 'Forgot password?',
      no_account: 'No account? Create one',
      demo_admin: 'Demo: admin@crypto.com / admin123',
      or_continue: 'Or continue with',
      google_login: 'Sign in with Google',
      features: {
        t1: 'Alpha Predator Execution',
        d1: 'Aggressive scalping with 70x leverage',
        t2: '1m Liquidity Scan',
        d2: 'Real-time liquidation monitoring',
        t3: 'Fibonacci Confluence',
        d3: 'Advanced volume and retracement algorithms'
      }
    },
    dashboard: {
      metrics: {
        total_balance: 'Total Balance',
        active_pnl: 'Open PnL',
        win_rate: 'Win Rate',
        profit_factor: 'Profit Factor',
        gross: 'Gross Profit'
      },
      recent_trades: 'Trades by Profile',
      no_trades: 'No trades in the last 24h.',
      equity_curve: 'Session Performance',
      assets: 'Connected Assets',
      entry: 'Entry',
      exit: 'Exit',
      profit: 'Profit'
    },
    strategy_card: {
      conf: 'Confidence',
      lev: 'Lev.',
      capital: 'Capital',
      win_rate: 'Win Rate',
      trades: 'Orders',
      active_pos: 'Active Pos',
      scanning: 'Syncing...',
      next_scan: 'Next scan in',
      edit: 'Adjust Params',
      create_new: 'Create Strategy',
      analyze_btn: 'AI Audit',
      legend_btn: 'Flowchart Guide',
      investment: 'Investment (USD)',
      leverage: 'Leverage',
      select_profile: 'Selected Profile',
      profit_potential: 'Est. Profit',
      loss_potential: 'Est. Stop',
      market_data_title: 'Real-Time Market Data',
      execution_guide: 'Strategic Execution Guide'
    },
    terminal: {
      title: 'HFT EXECUTION TERMINAL',
      init: 'Loading math libraries...',
      paused: 'Status: OFF',
      running: 'Status: RUNNING STRATEGIES',
      connection: 'Secure connection established.',
      ai_req: 'Processing signals with Gemini...',
      ai_done: 'Signals validated successfully.',
      error_no_exchange: 'ERROR: No API connected.'
    },
    chatbot: {
      title: 'Gemini 1.5 Pro Analyst',
      placeholder: 'Request technical analysis...',
      initial: 'Hello. I am monitoring price deviations. How can I help?',
      thinking: 'Analyzing flows...',
      error: 'Neural network connection error.'
    },
    wallet: {
      title: 'Real Fund Management',
      total_balance: 'Net Asset Value',
      daily_pnl: '24h P&L',
      win_rate: 'Real Win Rate',
      profit_factor: 'Max Drawdown',
      assets: 'Asset Allocation',
      recent_activity: 'Session Activity',
      equity_curve: 'Equity Curve',
      holdings_table: 'Active CEX Positions',
      col_asset: 'Asset',
      col_price: 'Avg Entry',
      col_curr_price: 'Current Price',
      col_amount: 'Size',
      col_value: 'Value (USD)',
      col_pnl: 'P&L',
      col_alloc: 'Alloc %'
    },
    exchange_manager: {
      title: 'Exchange Management',
      cex_tab: 'CEX (Centralized)',
      dex_tab: 'DEX (Decentralized)',
      connect: 'Connect',
      disconnect: 'Disconnect'
    },
    advanced_analytics: {
      depth_title: 'Market Depth',
      health_title: 'Asset Health',
      ls_title: 'Long/Short Ratio',
      corr_title: 'Market Correlations'
    },
    admin: {
      title: 'Admin Control Panel',
      kill_switch: 'TOTAL KILL SWITCH',
      cpu: 'CPU Load',
      memory: 'RAM Usage',
      active_sessions: 'Active Sessions',
      api_status: 'API Status',
      users: 'User Management',
      user_table: {
        user: 'User',
        role: 'Role',
        status: 'Status',
        last_login: 'Last Login',
        actions: 'Actions'
      },
      config: 'System Configuration',
      maintenance: 'Maintenance Mode',
      security: 'Military Grade Encryption'
    },
    ai_modes: {
      technical_title: 'Technical Analysis Pro',
      news_title: 'Sentiment & News',
      deep_title: 'Deep CoT Analysis'
    },
    chart: {
      bubble_map: 'Bubble Heat Map'
    },
    edit_modal: {
      title: 'Adjust Profile',
      name_label: 'Profile Name'
    }
  },
  es: {
    sidebar: {
      dashboard: 'Visión General',
      strategies: 'Motor Alguito',
      wallet: 'Cartera Real',
      analysis: 'Análisis de Flujo',
      backtest: 'Backtesting',
      history: 'Historial',
      logs: 'Auditoría',
      settings: 'Ajustes API',
      admin: 'Admin',
      role: 'Trader HFT'
    },
    header: {
      status_live: 'MOTOR ACTIVO',
      status_offline: 'SISTEMA EM ESPERA',
      latency: 'Latencia',
      start: 'INICIAR ALGORITMOS',
      stop: 'PARAR EJECUCIÓN',
      ai_insight: 'Insight IA'
    },
    trade_history: {
      title: 'Historial de Operaciones',
      desc: 'Registro completo de órdenes via API.',
      col_symbol: 'Símbolo',
      col_side: 'Lado',
      col_entry: 'Entrada',
      col_exit: 'Salida',
      col_amount: 'Cant.',
      col_pnl: 'PnL ($)',
      col_status: 'Estado',
      col_time: 'Hora',
      col_strategy: 'Estrategia',
      export: 'Exportar CSV',
      search_placeholder: 'Buscar por símbolo...'
    },
    login: {
      welcome: 'Bienvenido a CAP v10',
      subtitle: 'Autentícate para acceder al motor HFT',
      email: 'Correo',
      phone: 'Teléfono',
      password: 'Clave',
      remember: 'Recordar sesión',
      signin: 'Entrar al Terminal',
      forgot: '¿Olvidaste la clave?',
      no_account: '¿No tienes cuenta? Crear cuenta',
      demo_admin: 'Demo: admin@crypto.com / admin123',
      or_continue: 'O continúa con',
      google_login: 'Login con Google',
      features: {
        t1: 'Ejecución Alpha Predator',
        d1: 'Scalping agressivo con apalancamiento 70x',
        t2: 'Análisis de Liquidez 1m',
        d2: 'Monitoreo de liquidaciones em tempo real',
        t3: 'Confluencia de Fibonacci',
        d3: 'Algoritmos avanzados de volumen'
      }
    },
    dashboard: {
      metrics: {
        total_balance: 'Saldo Total',
        active_pnl: 'PnL Abierto',
        win_rate: 'Tasa de Acierto',
        profit_factor: 'Factor de Lucro',
        gross: 'Lucro Bruto'
      },
      recent_trades: 'Trades por Perfil',
      no_trades: 'Sin operaciones hoy.',
      equity_curve: 'Desempeño Sesión',
      assets: 'Activos Conectados',
      entry: 'Entrada',
      exit: 'Salida',
      profit: 'Lucro'
    },
    strategy_card: {
      conf: 'Confianza',
      lev: 'Apal.',
      capital: 'Capital',
      win_rate: 'Win Rate',
      trades: 'Órdenes',
      active_pos: 'Posición Ativa',
      scanning: 'Sincronizando...',
      next_scan: 'Prox. scan em',
      edit: 'Ajustar Parâmetros',
      create_new: 'Nueva Estrategia',
      analyze_btn: 'Auditoría IA',
      legend_btn: 'Guía de Flujos',
      investment: 'Inversión (USD)',
      leverage: 'Apalancamiento',
      select_profile: 'Perfil Seleccionado',
      profit_potential: 'Profit Est.',
      loss_potential: 'Stop Est.',
      market_data_title: 'Datos de Mercado en Tiempo Real',
      execution_guide: 'Guía de Ejecución Estratégica'
    },
    terminal: {
      title: 'TERMINAL DE EJECUCIÓN HFT',
      init: 'Cargando librerías matemáticas...',
      paused: 'Status: APAGADO',
      running: 'Status: EJECUTANDO ESTRATEGIAS',
      connection: 'Conexión segura establecida.',
      ai_req: 'Procesando señales con Gemini...',
      ai_done: 'Señales validadas.',
      error_no_exchange: 'ERROR: Sin API conectada.'
    },
    chatbot: {
      title: 'Analista Gemini 1.5 Pro',
      placeholder: 'Solicitar análise técnica...',
      initial: 'Hola. Monitorizando desviaciones de precio. ¿Cómo puedo ayudar?',
      thinking: 'Analizando flujos...',
      error: 'Error de conexión.'
    },
    wallet: {
      title: 'Gestión de Fondos Reales',
      total_balance: 'Patrimonio Neto',
      daily_pnl: 'PnL 24h',
      win_rate: 'Tasa Acierto Real',
      profit_factor: 'Drawdown Máx.',
      assets: 'Asignación por Moneda',
      recent_activity: 'Actividad de Sesión',
      equity_curve: 'Curva de Equidad',
      holdings_table: 'Posiciones CEX Activas',
      col_asset: 'Ativo',
      col_price: 'Precio Promedio',
      col_curr_price: 'Precio Actual',
      col_amount: 'Tamaño',
      col_value: 'Valor (USD)',
      col_pnl: 'P&L',
      col_alloc: 'Asignación'
    },
    exchange_manager: {
      title: 'Gestão de Exchanges',
      cex_tab: 'CEX (Centralizados)',
      dex_tab: 'DEX (Descentralizados)',
      connect: 'Conectar',
      disconnect: 'Desconectar'
    },
    advanced_analytics: {
      depth_title: 'Profundidade de Mercado',
      health_title: 'Salud del Activo',
      ls_title: 'Ratio Long/Short',
      corr_title: 'Correlaciones de Mercado'
    },
    admin: {
      title: 'Panel de Control Admin',
      kill_switch: 'INTERRUPTOR TOTAL',
      cpu: 'Carga de CPU',
      memory: 'Uso de RAM',
      active_sessions: 'Sesiones Activas',
      api_status: 'Estado de API',
      users: 'Gestión de Usuarios',
      user_table: {
        user: 'Usuario',
        role: 'Rol',
        status: 'Estado',
        last_login: 'Último Login',
        actions: 'Acciones'
      },
      config: 'Configuración del Sistema',
      maintenance: 'Modo Mantenimiento',
      security: 'Cifrado Militar'
    },
    ai_modes: {
      technical_title: 'Análisis Técnico Pro',
      news_title: 'Sentimiento e Noticias',
      deep_title: 'Análisis Profundo CoT'
    },
    chart: {
      bubble_map: 'Mapa de Calor de Burbujas'
    },
    edit_modal: {
      title: 'Ajustar Perfil',
      name_label: 'Nombre del Perfil'
    }
  }
};

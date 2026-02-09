export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            auth_audit: {
                Row: {
                    created_at: string | null
                    event: string
                    id: string
                    ip: string | null
                    meta: Json | null
                    user_agent: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    event: string
                    id: string
                    ip?: string | null
                    meta?: Json | null
                    user_agent?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    event?: string
                    id?: string
                    ip?: string | null
                    meta?: Json | null
                    user_agent?: string | null
                    user_id?: string | null
                }
                Relationships: []
            }
            exchanges: {
                Row: {
                    api_key: string | null
                    api_secret: string | null
                    created_at: string | null
                    id: string
                    is_testnet: boolean | null
                    name: string | null
                    status: string | null
                    type: string | null
                    user_id: string | null
                }
                Insert: {
                    api_key?: string | null
                    api_secret?: string | null
                    created_at?: string | null
                    id?: string
                    is_testnet?: boolean | null
                    name?: string | null
                    status?: string | null
                    type?: string | null
                    user_id?: string | null
                }
                Update: {
                    api_key?: string | null
                    api_secret?: string | null
                    created_at?: string | null
                    id?: string
                    is_testnet?: boolean | null
                    name?: string | null
                    status?: string | null
                    type?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "exchanges_user_fk"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            positions: {
                Row: {
                    avg_price: number | null
                    created_at: string
                    id: string
                    qty: number
                    real_pnl: boolean | null
                    symbol: string
                    user_id: string
                }
                Insert: {
                    avg_price?: number | null
                    created_at?: string
                    id?: string
                    qty?: number
                    real_pnl?: boolean | null
                    symbol: string
                    user_id: string
                }
                Update: {
                    avg_price?: number | null
                    created_at?: string
                    id?: string
                    qty?: number
                    real_pnl?: boolean | null
                    symbol?: string
                    user_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    created_at: string
                    email: string | null
                    full_name: string | null
                    id: string
                    role: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id: string
                    role?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    role?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            strategies: {
                Row: {
                    active: boolean | null
                    capital: number | null
                    confidence_threshold: number | null
                    config: Json | null
                    description: string | null
                    id: string
                    leverage: number | null
                    max_drawdown: number | null
                    name: string
                    risk_level: string | null
                    settings: Json | null
                    stop_loss: number | null
                    take_profit: number | null
                    type_id: string | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    capital?: number | null
                    confidence_threshold?: number | null
                    config?: Json | null
                    description?: string | null
                    id?: string
                    leverage?: number | null
                    max_drawdown?: number | null
                    name: string
                    risk_level?: string | null
                    settings?: Json | null
                    stop_loss?: number | null
                    take_profit?: number | null
                    type_id?: string | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    capital?: number | null
                    confidence_threshold?: number | null
                    config?: Json | null
                    description?: string | null
                    id?: string
                    leverage?: number | null
                    max_drawdown?: number | null
                    name?: string
                    risk_level?: string | null
                    settings?: Json | null
                    stop_loss?: number | null
                    take_profit?: number | null
                    type_id?: string | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "strategies_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            trade_logs: {
                Row: {
                    amount: number
                    client_order_id: string | null
                    created_at: string | null
                    entry_price: number
                    exchange_id: string
                    id: string
                    pnl: number | null
                    side: string
                    status: string | null
                    strategy_id: string | null
                    strategy_name: string | null
                    symbol: string
                    user_id: string
                }
                Insert: {
                    amount: number
                    client_order_id?: string | null
                    created_at?: string | null
                    entry_price: number
                    exchange_id: string
                    id?: string
                    pnl?: number | null
                    side: string
                    status?: string | null
                    strategy_id?: string | null
                    strategy_name?: string | null
                    symbol: string
                    user_id: string
                }
                Update: {
                    amount?: number
                    client_order_id?: string | null
                    created_at?: string | null
                    entry_price?: number
                    exchange_id?: string
                    id?: string
                    pnl?: number | null
                    side?: string
                    status?: string | null
                    strategy_id?: string | null
                    strategy_name?: string | null
                    symbol?: string
                    user_id?: string
                }
                Relationships: []
            }
            trades: {
                Row: {
                    amount: number | null
                    closed_at: string | null
                    created_at: string
                    entry_price: number | null
                    exit_price: number | null
                    id: string
                    opened_at: string | null
                    pnl: number | null
                    side: string
                    status: string | null
                    strategy_id: string | null
                    symbol: string
                    user_id: string
                }
                Insert: {
                    amount?: number | null
                    closed_at?: string | null
                    created_at?: string
                    entry_price?: number | null
                    exit_price?: number | null
                    id?: string
                    opened_at?: string | null
                    pnl?: number | null
                    side: string
                    status?: string | null
                    strategy_id?: string | null
                    symbol: string
                    user_id: string
                }
                Update: {
                    amount?: number | null
                    closed_at?: string | null
                    created_at?: string
                    entry_price?: number | null
                    exit_price?: number | null
                    id?: string
                    opened_at?: string | null
                    pnl?: number | null
                    side?: string
                    status?: string | null
                    strategy_id?: string | null
                    symbol?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "trades_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_settings: {
                Row: {
                    is_running: boolean | null
                    selected_pairs: string[] | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    is_running?: boolean | null
                    selected_pairs?: string[] | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    is_running?: boolean | null
                    selected_pairs?: string[] | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            is_admin_user: { Args: Record<string, never>; Returns: boolean }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type Profile = Tables<'profiles'>
export type Strategy = Tables<'strategies'>
export type Trade = Tables<'trades'>
export type TradeLog = Tables<'trade_logs'>
export type Exchange = Tables<'exchanges'>
export type Position = Tables<'positions'>
export type UserSettings = Tables<'user_settings'>
export type AuthAudit = Tables<'auth_audit'>

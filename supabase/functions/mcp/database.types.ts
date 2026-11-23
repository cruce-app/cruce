
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "invite_attempts": {
                  Row: {
                    "attempted_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "attempted_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invites": {
                  Row: {
                    "code": string,"created_by": string,"expires_at": string,"ledger_id": string,"redeemed_at": string | null,"redeemed_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_by": string,"expires_at"?: string,"ledger_id": string,"redeemed_at"?: string | null,"redeemed_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_by"?: string,"expires_at"?: string,"ledger_id"?: string,"redeemed_at"?: string | null,"redeemed_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_ledger_id_fkey"
      columns: ["ledger_id"]
isOneToOne: false
      referencedRelation: "ledgers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_redeemed_by_fkey"
      columns: ["redeemed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ledger_members": {
                  Row: {
                    "avatar_color": Database["public"]['Enums']["avatar_color"],"joined_at": string,"ledger_id": string,"tike_variant": Database["public"]['Enums']["tike_variant"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_color": Database["public"]['Enums']["avatar_color"],"joined_at"?: string,"ledger_id": string,"tike_variant": Database["public"]['Enums']["tike_variant"],"user_id": string
                  }
                  Update: {
                    "avatar_color"?: Database["public"]['Enums']["avatar_color"],"joined_at"?: string,"ledger_id"?: string,"tike_variant"?: Database["public"]['Enums']["tike_variant"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_members_ledger_id_fkey"
      columns: ["ledger_id"]
isOneToOne: false
      referencedRelation: "ledgers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ledgers": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"created_at": string,"created_by": string,"currency": string,"default_other_percent": number,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"created_by": string,"currency"?: string,"default_other_percent"?: number,"id"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"created_by"?: string,"currency"?: string,"default_other_percent"?: number,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledgers_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledgers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"movements": {
                  Row: {
                    "amount": number,"category": Database["public"]['Enums']["movement_category"],"concept": string,"created_at": string,"created_by": string,"deleted_at": string | null,"id": string,"kind": Database["public"]['Enums']["movement_kind"],"ledger_id": string,"occurred_at": string,"other_share_percent": number,"owed_by_other": number | null,"payer_id": string,"payment_method": string | null,"split_type": Database["public"]['Enums']["split_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category"?: Database["public"]['Enums']["movement_category"],"concept": string,"created_at"?: string,"created_by"?: string,"deleted_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["movement_kind"],"ledger_id": string,"occurred_at"?: string,"other_share_percent"?: number,"owed_by_other"?: never,"payer_id": string,"payment_method"?: string | null,"split_type"?: Database["public"]['Enums']["split_type"],"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"category"?: Database["public"]['Enums']["movement_category"],"concept"?: string,"created_at"?: string,"created_by"?: string,"deleted_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["movement_kind"],"ledger_id"?: string,"occurred_at"?: string,"other_share_percent"?: number,"owed_by_other"?: never,"payer_id"?: string,"payment_method"?: string | null,"split_type"?: Database["public"]['Enums']["split_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_ledger_id_fkey"
      columns: ["ledger_id"]
isOneToOne: false
      referencedRelation: "ledgers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movements_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"parche_activity": {
                  Row: {
                    "actor_id": string | null,"amount": number | null,"concept": string | null,"created_at": string,"expense_id": string | null,"id": string,"kind": Database["public"]['Enums']["parche_activity_kind"],"other_participant_id": string | null,"parche_id": string,"participant_id": string | null,"payment_id": string | null,"recorded_by_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"amount"?: number | null,"concept"?: string | null,"created_at"?: string,"expense_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["parche_activity_kind"],"other_participant_id"?: string | null,"parche_id": string,"participant_id"?: string | null,"payment_id"?: string | null,"recorded_by_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"amount"?: number | null,"concept"?: string | null,"created_at"?: string,"expense_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["parche_activity_kind"],"other_participant_id"?: string | null,"parche_id"?: string,"participant_id"?: string | null,"payment_id"?: string | null,"recorded_by_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_activity_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_activity_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "parche_expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_activity_other_participant_id_fkey"
      columns: ["other_participant_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_activity_parche_id_fkey"
      columns: ["parche_id"]
isOneToOne: false
      referencedRelation: "parches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_activity_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_activity_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "parche_payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_activity_recorded_by_id_fkey"
      columns: ["recorded_by_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["id"]
    }
                  ]
                },"parche_cruce_transfers": {
                  Row: {
                    "amount": number,"created_at": string,"from_id": string,"id": string,"movement_id": string | null,"parche_id": string,"proposed_by": string | null,"responded_at": string | null,"status": string,"to_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"from_id": string,"id"?: string,"movement_id"?: string | null,"parche_id": string,"proposed_by"?: string | null,"responded_at"?: string | null,"status"?: string,"to_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"from_id"?: string,"id"?: string,"movement_id"?: string | null,"parche_id"?: string,"proposed_by"?: string | null,"responded_at"?: string | null,"status"?: string,"to_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_cruce_transfers_movement_id_fkey"
      columns: ["movement_id"]
isOneToOne: false
      referencedRelation: "movements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_cruce_transfers_parche_id_fkey"
      columns: ["parche_id"]
isOneToOne: false
      referencedRelation: "parches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transfer_from_in_parche"
      columns: ["parche_id","from_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    },{
      foreignKeyName: "transfer_proposed_by_in_parche"
      columns: ["parche_id","proposed_by"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    },{
      foreignKeyName: "transfer_to_in_parche"
      columns: ["parche_id","to_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    }
                  ]
                },"parche_expense_items": {
                  Row: {
                    "amount": number,"expense_id": string,"id": string,"name": string | null,"participant_ids": (string)[],"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"expense_id": string,"id"?: string,"name"?: string | null,"participant_ids": (string)[],"position": number
                  }
                  Update: {
                    "amount"?: number,"expense_id"?: string,"id"?: string,"name"?: string | null,"participant_ids"?: (string)[],"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_expense_items_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "parche_expenses"
      referencedColumns: ["id"]
    }
                  ]
                },"parche_expense_payers": {
                  Row: {
                    "amount": number,"expense_id": string,"participant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"expense_id": string,"participant_id": string
                  }
                  Update: {
                    "amount"?: number,"expense_id"?: string,"participant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_expense_payers_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "parche_expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_expense_payers_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["id"]
    }
                  ]
                },"parche_expense_shares": {
                  Row: {
                    "amount": number,"expense_id": string,"input": number | null,"participant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"expense_id": string,"input"?: number | null,"participant_id": string
                  }
                  Update: {
                    "amount"?: number,"expense_id"?: string,"input"?: number | null,"participant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_expense_shares_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "parche_expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parche_expense_shares_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["id"]
    }
                  ]
                },"parche_expenses": {
                  Row: {
                    "amount": number,"base_amount": number,"concept": string,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"id": string,"parche_id": string,"recorded_by": string,"spent_on": string,"split_method": Database["public"]['Enums']["parche_split_method"],"tip_percent": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"base_amount": number,"concept": string,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"id"?: string,"parche_id": string,"recorded_by": string,"spent_on"?: string,"split_method": Database["public"]['Enums']["parche_split_method"],"tip_percent"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"base_amount"?: number,"concept"?: string,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"id"?: string,"parche_id"?: string,"recorded_by"?: string,"spent_on"?: string,"split_method"?: Database["public"]['Enums']["parche_split_method"],"tip_percent"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deleted_by_in_parche"
      columns: ["parche_id","deleted_by"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    },{
      foreignKeyName: "parche_expenses_parche_id_fkey"
      columns: ["parche_id"]
isOneToOne: false
      referencedRelation: "parches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recorded_by_in_parche"
      columns: ["parche_id","recorded_by"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    },{
      foreignKeyName: "updated_by_in_parche"
      columns: ["parche_id","updated_by"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    }
                  ]
                },"parche_participants": {
                  Row: {
                    "account_deleted_at": string | null,"avatar_color": Database["public"]['Enums']["person_color"],"claim_code": string | null,"claimed_code": string | null,"display_name": string,"id": string,"joined_at": string,"last_seen_at": string | null,"parche_id": string,"user_id": string | null,"participant_payment": Json | null,"participant_username": string | null
                  }
                  ComputedFields: "participant_payment" | "participant_username"
                  Insert: {
                    "account_deleted_at"?: string | null,"avatar_color": Database["public"]['Enums']["person_color"],"claim_code"?: string | null,"claimed_code"?: string | null,"display_name": string,"id"?: string,"joined_at"?: string,"last_seen_at"?: string | null,"parche_id": string,"user_id"?: string | null
                  }
                  Update: {
                    "account_deleted_at"?: string | null,"avatar_color"?: Database["public"]['Enums']["person_color"],"claim_code"?: string | null,"claimed_code"?: string | null,"display_name"?: string,"id"?: string,"joined_at"?: string,"last_seen_at"?: string | null,"parche_id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_participants_parche_id_fkey"
      columns: ["parche_id"]
isOneToOne: false
      referencedRelation: "parches"
      referencedColumns: ["id"]
    }
                  ]
                },"parche_payments": {
                  Row: {
                    "amount": number,"confirmed_at": string | null,"created_at": string,"from_id": string,"id": string,"parche_id": string,"recorded_by": string,"to_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"confirmed_at"?: string | null,"created_at"?: string,"from_id": string,"id"?: string,"parche_id": string,"recorded_by": string,"to_id": string
                  }
                  Update: {
                    "amount"?: number,"confirmed_at"?: string | null,"created_at"?: string,"from_id"?: string,"id"?: string,"parche_id"?: string,"recorded_by"?: string,"to_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parche_payments_parche_id_fkey"
      columns: ["parche_id"]
isOneToOne: false
      referencedRelation: "parches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_from_in_parche"
      columns: ["parche_id","from_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    },{
      foreignKeyName: "payment_recorded_by_in_parche"
      columns: ["parche_id","recorded_by"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    },{
      foreignKeyName: "payment_to_in_parche"
      columns: ["parche_id","to_id"]
isOneToOne: false
      referencedRelation: "parche_participants"
      referencedColumns: ["parche_id","id"]
    }
                  ]
                },"parches": {
                  Row: {
                    "closed_at": string | null,"code": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"status": Database["public"]['Enums']["parche_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"code": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"status"?: Database["public"]['Enums']["parche_status"]
                  }
                  Update: {
                    "closed_at"?: string | null,"code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"status"?: Database["public"]['Enums']["parche_status"]
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_color": Database["public"]['Enums']["person_color"] | null,"created_at": string,"deleted_at": string | null,"display_name": string,"id": string,"payment_handle": string | null,"payment_kind": string | null,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_color"?: Database["public"]['Enums']["person_color"] | null,"created_at"?: string,"deleted_at"?: string | null,"display_name": string,"id": string,"payment_handle"?: string | null,"payment_kind"?: string | null,"username"?: string | null
                  }
                  Update: {
                    "avatar_color"?: Database["public"]['Enums']["person_color"] | null,"created_at"?: string,"deleted_at"?: string | null,"display_name"?: string,"id"?: string,"payment_handle"?: string | null,"payment_kind"?: string | null,"username"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "ledger_balances": {
                  Row: {
                    "ledger_id": string,"net": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "ledger_members_ledger_id_fkey"
      columns: ["ledger_id"]
isOneToOne: false
      referencedRelation: "ledgers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_parche_cruce_transfer":
{ Args: { "p_id": string }; Returns: {
              "amount": number,
"created_at": string,
"from_id": string,
"id": string,
"movement_id": string | null,
"parche_id": string,
"proposed_by": string | null,
"responded_at": string | null,
"status": string,
"to_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "parche_cruce_transfers"
        isOneToOne: true
        isSetofReturn: false
      } },
"add_parche_participant":
{ Args: { "p_display_name": string,"p_id"?: string,"p_parche": string }; Returns: {
              "account_deleted_at": string | null,
"avatar_color": Database["public"]['Enums']["person_color"],
"claim_code": string | null,
"claimed_code": string | null,
"display_name": string,
"id": string,
"joined_at": string,
"last_seen_at": string | null,
"parche_id": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "parche_participants"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_invite":
{ Args: { "p_code": string,"p_lock": boolean }; Returns: Json
                           },
"check_username":
{ Args: { "p_username": string }; Returns: Json
                           },
"claim_parche_place":
{ Args: { "p_code": string }; Returns: string
                           },
"cleanup_expired_invites":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"close_cruce":
{ Args: { "p_ledger": string }; Returns: string
                           },
"close_parche":
{ Args: { "p_id": string }; Returns: undefined
                           },
"code_attempts_exhausted":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"code_error":
{ Args: { "p_error": string }; Returns: Json
                           },
"confirm_parche_payment":
{ Args: { "p_id": string }; Returns: {
              "amount": number,
"confirmed_at": string | null,
"created_at": string,
"from_id": string,
"id": string,
"parche_id": string,
"recorded_by": string,
"to_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "parche_payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_ledger_with_invite":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"create_parche":
{ Args: { "p_display_name"?: string,"p_id"?: string,"p_name": string }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"delete_parche_expense":
{ Args: { "p_id": string }; Returns: undefined
                           },
"generate_parche_code":
{ Args: { "p_prefix": string }; Returns: string
                           },
"is_ledger_member":
{ Args: { "p_ledger": string }; Returns: boolean
                           },
"is_parche_member":
{ Args: { "p_parche": string }; Returns: boolean
                           },
"join_parche":
{ Args: { "p_code": string,"p_display_name"?: string }; Returns: string
                           },
"legacy_avatar_color":
{ Args: { "p_user": string }; Returns: Database["public"]['Enums']["person_color"]
                           },
"mark_parche_seen":
{ Args: { "p_id": string }; Returns: undefined
                           },
"move_parche_debt_to_cruce":
{ Args: { "p_other": string,"p_parche": string }; Returns: {
              "amount": number,
"created_at": string,
"from_id": string,
"id": string,
"movement_id": string | null,
"parche_id": string,
"proposed_by": string | null,
"responded_at": string | null,
"status": string,
"to_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "parche_cruce_transfers"
        isOneToOne: true
        isSetofReturn: false
      } },
"my_cruces":
{ Args: Record<PropertyKey, never>; Returns: {
              "closed_at": string,"default_other_percent": number,"ledger_id": string,"linked_at": string,"my_avatar": string,"my_color": string,"my_tike": string,"my_username": string,"partner_avatar": string,"partner_color": string,"partner_deleted": boolean,"partner_id": string,"partner_name": string,"partner_payment_handle": string,"partner_payment_kind": string,"partner_tike": string,"partner_username": string
            }[]
                           },
"my_parche_participant_id":
{ Args: { "p_parche": string }; Returns: string
                           },
"next_parche_color":
{ Args: { "p_parche": string }; Returns: Database["public"]['Enums']["person_color"]
                           },
"normalize_username":
{ Args: { "p_username": string }; Returns: string
                           },
"parche_balances":
{ Args: { "p_parche": string }; Returns: {
              "net": number,"participant_id": string,"position": number
            }[]
                           },
"parche_direct_debt":
{ Args: { "p_from": string,"p_parche": string,"p_to": string }; Returns: number
                           },
"parche_expense_snapshot":
{ Args: { "p_expense": string }; Returns: Json
                           },
"parche_settlement_plan":
{ Args: { "p_parche": string }; Returns: {
              "amount": number,"from_id": string,"to_id": string
            }[]
                           },
"parche_summary":
{ Args: { "p_parche": string }; Returns: Json
                           },
"participant_payment":
{ Args: { "p_participant": Omit<Database["public"]['Tables']["parche_participants"]['Row'], Database["public"]['Tables']["parche_participants"]['ComputedFields']> }; Returns: Json
                           },
"participant_username":
{ Args: { "p_participant": Omit<Database["public"]['Tables']["parche_participants"]['Row'], Database["public"]['Tables']["parche_participants"]['ComputedFields']> }; Returns: string
                           },
"preview_invite":
{ Args: { "p_code": string }; Returns: Json
                           },
"preview_parche_code":
{ Args: { "p_code": string }; Returns: Json
                           },
"propose_parche_debt_to_cruce":
{ Args: { "p_other": string,"p_parche": string }; Returns: {
              "amount": number,
"created_at": string,
"from_id": string,
"id": string,
"movement_id": string | null,
"parche_id": string,
"proposed_by": string | null,
"responded_at": string | null,
"status": string,
"to_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "parche_cruce_transfers"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_parche_payment":
{ Args: { "p_amount": number,"p_from_id": string,"p_id": string,"p_parche_id": string,"p_to_id": string }; Returns: {
              "amount": number,
"confirmed_at": string | null,
"created_at": string,
"from_id": string,
"id": string,
"parche_id": string,
"recorded_by": string,
"to_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "parche_payments"
        isOneToOne: true
        isSetofReturn: false
      } },
"redeem_invite":
{ Args: { "p_code": string }; Returns: Json
                           },
"reject_parche_cruce_transfer":
{ Args: { "p_id": string }; Returns: {
              "amount": number,
"created_at": string,
"from_id": string,
"id": string,
"movement_id": string | null,
"parche_id": string,
"proposed_by": string | null,
"responded_at": string | null,
"status": string,
"to_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "parche_cruce_transfers"
        isOneToOne: true
        isSetofReturn: false
      } },
"require_open_parche":
{ Args: { "p_parche": string }; Returns: undefined
                           },
"require_session":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"save_parche_expense":
{ Args: { "p_amount": number,"p_base_amount": number,"p_concept": string,"p_id": string,"p_items"?: Json,"p_parche_id": string,"p_payers": Json,"p_shares": Json,"p_spent_on": string,"p_split_method": string,"p_tip_percent": number }; Returns: string
                           },
"set_username":
{ Args: { "p_username": string }; Returns: Json
                           },
"shared_open_ledger":
{ Args: { "p_other": string,"p_user": string }; Returns: string
                           },
"username_error":
{ Args: { "p_error": string }; Returns: Json
                           },
"username_suggestion":
{ Args: { "p_exclude"?: string,"p_name": string }; Returns: string
                           }
          }
          Enums: {
            "avatar_color": "yellow"|"violet","movement_category": "comida"|"mercado"|"transporte"|"hogar"|"ocio"|"prestamo"|"otro","movement_kind": "expense"|"settlement","parche_activity_kind": "parcheCreated"|"expenseCreated"|"expenseEdited"|"expenseDeleted"|"paymentRecorded"|"paymentConfirmed"|"participantAdded"|"participantJoined"|"placeClaimed"|"parcheClosed"|"debtMovedToCruce"|"debtProposedToCruce"|"debtRejectedForCruce","parche_split_method": "equal"|"items"|"shares"|"percentage","parche_status": "open"|"closed","person_color": "yellow"|"violet"|"green"|"peach"|"pink"|"lime","split_type": "equal"|"percentage"|"full_other","tike_variant": "rosa"|"verde"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "avatar_color": ["yellow", "violet"],"movement_category": ["comida", "mercado", "transporte", "hogar", "ocio", "prestamo", "otro"],"movement_kind": ["expense", "settlement"],"parche_activity_kind": ["parcheCreated", "expenseCreated", "expenseEdited", "expenseDeleted", "paymentRecorded", "paymentConfirmed", "participantAdded", "participantJoined", "placeClaimed", "parcheClosed", "debtMovedToCruce", "debtProposedToCruce", "debtRejectedForCruce"],"parche_split_method": ["equal", "items", "shares", "percentage"],"parche_status": ["open", "closed"],"person_color": ["yellow", "violet", "green", "peach", "pink", "lime"],"split_type": ["equal", "percentage", "full_other"],"tike_variant": ["rosa", "verde"]
          }
        }
} as const

/** Supabase database types for Charlotte eFoil commerce schema. */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_description: string | null;
          description: string | null;
          product_type: string;
          base_price_cents: number;
          compare_at_price_cents: number | null;
          is_active: boolean;
          is_configurable: boolean;
          specs: Json | null;
          features: Json | null;
          whats_included: Json | null;
          faqs: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          slug: string;
          name: string;
          product_type: string;
          base_price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "product_media";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_option_groups_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "product_option_groups";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "compatibility_rules_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "compatibility_rules";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "recommended_products_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "recommended_products";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["product_id"];
          },
        ];
      };
      product_categories: {
        Row: {
          product_id: string;
          category_id: string;
        };
        Insert: {
          product_id: string;
          category_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_media: {
        Row: {
          id: string;
          product_id: string;
          media_type: string;
          url: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["product_media"]["Row"]> & {
          product_id: string;
          media_type: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_media"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          name: string;
          price_cents: number;
          compare_at_price_cents: number | null;
          is_default: boolean;
          is_active: boolean;
          attributes: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["product_variants"]["Row"]> & {
          product_id: string;
          sku: string;
          name: string;
          price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_groups: {
        Row: {
          id: string;
          product_id: string;
          slug: string;
          name: string;
          description: string | null;
          is_required: boolean;
          min_selections: number;
          max_selections: number;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["product_option_groups"]["Row"]> & {
          product_id: string;
          slug: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_option_groups"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_option_values_option_group_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "product_option_values";
            referencedColumns: ["option_group_id"];
          },
        ];
      };
      product_option_values: {
        Row: {
          id: string;
          option_group_id: string;
          slug: string;
          label: string;
          description: string | null;
          price_delta_cents: number;
          image_url: string | null;
          is_default: boolean;
          sort_order: number;
          metadata: Json | null;
        };
        Insert: Partial<Database["public"]["Tables"]["product_option_values"]["Row"]> & {
          option_group_id: string;
          slug: string;
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_option_values"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_group_id_fkey";
            columns: ["option_group_id"];
            isOneToOne: false;
            referencedRelation: "product_option_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      compatibility_rules: {
        Row: {
          id: string;
          product_id: string;
          source_option_value_id: string;
          target_option_group_id: string;
          allowed_option_value_ids: string[];
          rule_type: string;
        };
        Insert: Partial<Database["public"]["Tables"]["compatibility_rules"]["Row"]> & {
          product_id: string;
          source_option_value_id: string;
          target_option_group_id: string;
          allowed_option_value_ids: string[];
          rule_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["compatibility_rules"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "compatibility_rules_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          id: string;
          product_variant_id: string;
          quantity_available: number;
          quantity_reserved: number;
          low_stock_threshold: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory"]["Row"]> & {
          product_variant_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory"]["Insert"]>;
        Relationships: [];
      };
      recommended_products: {
        Row: {
          id: string;
          product_id: string;
          recommended_product_id: string;
          sort_order: number;
          label: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recommended_products"]["Row"]> & {
          product_id: string;
          recommended_product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["recommended_products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recommended_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommended_products_recommended_product_id_fkey";
            columns: ["recommended_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          address_type: string;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default: boolean;
        };
        Insert: {
          id?: string;
          customer_id: string;
          address_type: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          is_default?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["addresses"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          shipping_address_id: string | null;
          billing_address_id: string | null;
          status: string;
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          discount_cents: number;
          total_cents: number;
          special_requests: string | null;
          preferred_delivery_method: string | null;
          dealer_notes_customer: string | null;
          billing_same_as_shipping: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id: string;
          shipping_address_id?: string | null;
          billing_address_id?: string | null;
          status?: string;
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          discount_cents?: number;
          total_cents: number;
          special_requests?: string | null;
          preferred_delivery_method?: string | null;
          dealer_notes_customer?: string | null;
          billing_same_as_shipping?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_variant_id: string | null;
          sku: string;
          name: string;
          quantity: number;
          unit_price_cents: number;
          line_total_cents: number;
          configuration: Json;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_variant_id?: string | null;
          sku: string;
          name: string;
          quantity: number;
          unit_price_cents: number;
          line_total_cents: number;
          configuration: Json;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          order_id: string;
          invoice_number: string;
          status: string;
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          discount_cents: number;
          total_cents: number;
          pdf_url: string | null;
          pdf_storage_path: string | null;
          issued_at: string | null;
          due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          invoice_number: string;
          status?: string;
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          discount_cents?: number;
          total_cents: number;
          pdf_url?: string | null;
          pdf_storage_path?: string | null;
          issued_at?: string | null;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          order_item_id: string | null;
          description: string;
          quantity: number;
          unit_price_cents: number;
          line_total_cents: number;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          order_item_id?: string | null;
          description: string;
          quantity: number;
          unit_price_cents: number;
          line_total_cents: number;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Insert"]>;
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          from_status: string | null;
          to_status: string;
          notes: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_status?: string | null;
          to_status: string;
          notes?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_status_history"]["Insert"]>;
        Relationships: [];
      };
      dealer_notes: {
        Row: {
          id: string;
          order_id: string;
          note: string;
          is_internal: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          note: string;
          is_internal?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["dealer_notes"]["Insert"]>;
        Relationships: [];
      };
      payment_instructions: {
        Row: {
          id: string;
          title: string;
          body: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["payment_instructions"]["Insert"]>;
        Relationships: [];
      };
      store_settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: Partial<Database["public"]["Tables"]["store_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_invoice_number: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

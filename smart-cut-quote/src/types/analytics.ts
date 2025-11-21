/**
 * Customer Analytics Type Definitions
 * For tracking customer behavior, conversion rates, and revenue metrics
 */

import { Client } from './quote';

// Time period filter options
export type AnalyticsPeriod = '30_days' | '3_months' | '6_months' | 'all_time';

// Client search result
export interface ClientSearchResult {
  id: string;
  name: string;
  company: string;
  phone: string;
  totalQuotes: number;
}

// Timeline data point for charts
export interface TimelineDataPoint {
  month: string; // Format: "2025-01"
  revenue: number;
  quotesAccepted: number;
  quotesRejected: number;
  quotesCompleted: number;
}

// Comprehensive customer analytics data
export interface CustomerAnalytics {
  client: {
    id: string;
    name: string;
    company: string;
    phone: string;
  };

  period: {
    from: Date;
    to: Date;
    label: AnalyticsPeriod;
  };

  quotes: {
    total: number;
    sent: number;
    accepted: number;
    rejected: number;
    inProduction: number;
    completed: number;
  };

  financial: {
    completedRevenue: number;      // Total revenue from completed orders
    inProductionValue: number;      // Value of orders in production
    averageOrderValue: number;      // Avg value of completed orders
    conversionRate: number;         // % of sent quotes that were accepted
  };

  timeline: TimelineDataPoint[];
}

// Raw database row for analytics query
export interface AnalyticsRow {
  client_id: string;
  company_name: string;
  phone: string;
  total_quotes: number;
  sent: number;
  accepted: number;
  rejected: number;
  in_production: number;
  completed: number;
  completed_revenue: number;
  in_production_value: number;
  avg_order_value: number;
}

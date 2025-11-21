/**
 * Analytics Repository
 * Customer analytics and business intelligence queries
 */

import { query } from './connection';
import type {
  CustomerAnalytics,
  ClientSearchResult,
  TimelineDataPoint,
  AnalyticsPeriod,
  AnalyticsRow,
} from '../../types/analytics';

/**
 * Search clients by phone number
 * Returns matching clients with their total quote count
 */
export async function searchClientsByPhone(phoneQuery: string): Promise<ClientSearchResult[]> {
  const sql = `
    SELECT
      c.id,
      c.company_name,
      c.phone,
      COUNT(q.id) as total_quotes
    FROM clients c
    LEFT JOIN quotes q ON q.client_id = c.id AND q.deleted = 0
    WHERE c.phone LIKE ?
    GROUP BY c.id
    ORDER BY c.company_name ASC
    LIMIT 10
  `;

  const results = await query<any>(sql, [`${phoneQuery}%`]);

  return results.map((row) => ({
    id: row.id,
    name: row.company_name,
    company: row.company_name || '',
    phone: row.phone,
    totalQuotes: row.total_quotes || 0,
  }));
}

/**
 * Get comprehensive customer analytics for a specific client
 * Includes quote statistics, financial metrics, and conversion rates
 */
export async function getCustomerAnalytics(
  clientId: string,
  periodDays?: number // 30, 90, 180, or null for all time
): Promise<CustomerAnalytics | null> {
  // Build date filter
  const dateFilter = periodDays
    ? `AND q.created_at >= datetime('now', '-${periodDays} days')`
    : '';

  // Main analytics query
  const sql = `
    SELECT
      c.id as client_id,
      c.company_name,
      c.phone,

      -- Quote counts
      COUNT(q.id) as total_quotes,
      SUM(CASE WHEN q.status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN q.status = 'accepted' THEN 1 ELSE 0 END) as accepted,
      SUM(CASE WHEN q.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN q.production_status = 'in_production' THEN 1 ELSE 0 END) as in_production,
      SUM(CASE WHEN q.production_status = 'completed' THEN 1 ELSE 0 END) as completed,

      -- Financial metrics
      COALESCE(SUM(CASE WHEN q.production_status = 'completed' THEN q.total ELSE 0 END), 0) as completed_revenue,
      COALESCE(SUM(CASE WHEN q.production_status = 'in_production' THEN q.total ELSE 0 END), 0) as in_production_value,
      COALESCE(AVG(CASE WHEN q.production_status = 'completed' THEN q.total END), 0) as avg_order_value

    FROM clients c
    LEFT JOIN quotes q ON q.client_id = c.id AND q.deleted = 0 ${dateFilter}
    WHERE c.id = ?
    GROUP BY c.id
  `;

  const results = await query<AnalyticsRow>(sql, [clientId]);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];

  // Calculate period dates
  const to = new Date();
  const from = periodDays
    ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
    : new Date(0); // Epoch for all time

  const periodLabel: AnalyticsPeriod =
    periodDays === 30 ? '30_days' :
    periodDays === 90 ? '3_months' :
    periodDays === 180 ? '6_months' :
    'all_time';

  // Get timeline data
  const timeline = await getCustomerTimeline(clientId, periodDays);

  // Calculate conversion rate
  const totalSent = row.sent + row.accepted + row.rejected;
  const conversionRate = totalSent > 0
    ? (row.accepted / totalSent) * 100
    : 0;

  return {
    client: {
      id: row.client_id,
      name: row.company_name,
      company: row.company_name || '',
      phone: row.phone,
    },
    period: {
      from,
      to,
      label: periodLabel,
    },
    quotes: {
      total: row.total_quotes,
      sent: row.sent,
      accepted: row.accepted,
      rejected: row.rejected,
      inProduction: row.in_production,
      completed: row.completed,
    },
    financial: {
      completedRevenue: row.completed_revenue,
      inProductionValue: row.in_production_value,
      averageOrderValue: row.avg_order_value,
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
    },
    timeline,
  };
}

/**
 * Get timeline data for customer analytics charts
 * Returns monthly aggregated data for revenue and quote counts
 */
export async function getCustomerTimeline(
  clientId: string,
  periodDays?: number
): Promise<TimelineDataPoint[]> {
  const dateFilter = periodDays
    ? `AND created_at >= datetime('now', '-${periodDays} days')`
    : '';

  const sql = `
    SELECT
      strftime('%Y-%m', created_at) as month,
      COALESCE(SUM(CASE WHEN production_status = 'completed' THEN total ELSE 0 END), 0) as revenue,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as quotes_accepted,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as quotes_rejected,
      SUM(CASE WHEN production_status = 'completed' THEN 1 ELSE 0 END) as quotes_completed
    FROM quotes
    WHERE client_id = ? ${dateFilter} AND deleted = 0
    GROUP BY month
    ORDER BY month ASC
  `;

  const results = await query<any>(sql, [clientId]);

  return results.map((row) => ({
    month: row.month,
    revenue: row.revenue || 0,
    quotesAccepted: row.quotes_accepted || 0,
    quotesRejected: row.quotes_rejected || 0,
    quotesCompleted: row.quotes_completed || 0,
  }));
}

/**
 * Get all clients sorted by total revenue (for leaderboard/top clients)
 */
export async function getTopClientsByRevenue(limit: number = 10): Promise<any[]> {
  const sql = `
    SELECT
      c.id,
      c.company_name,
      c.phone,
      COUNT(q.id) as total_quotes,
      COALESCE(SUM(CASE WHEN q.production_status = 'completed' THEN q.total ELSE 0 END), 0) as total_revenue
    FROM clients c
    LEFT JOIN quotes q ON q.client_id = c.id AND q.deleted = 0
    GROUP BY c.id
    ORDER BY total_revenue DESC
    LIMIT ?
  `;

  return query<any>(sql, [limit]);
}

export default {
  searchClientsByPhone,
  getCustomerAnalytics,
  getCustomerTimeline,
  getTopClientsByRevenue,
};

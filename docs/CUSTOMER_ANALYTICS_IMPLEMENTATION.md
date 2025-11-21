# Customer Analytics & Production Tracking Implementation

## 📋 Overview

Implementation of comprehensive customer analytics system with production workflow tracking for Smart Cut Quote application.

**Implementation Date:** January 2025
**Status:** ✅ Phase 1-3 Completed, 🔄 Phase 4-5 In Progress

---

## 🎯 Features Implemented

### 1. Production Workflow Tracking
- **Quote Status Management**: Draft → Sent → Accepted → Rejected
- **Production Status Tracking**: In Production → Completed
- **Timeline Recording**: Production start/completion timestamps
- **Soft Delete**: Archive quotes without permanent deletion

### 2. Customer Analytics
- **Phone Search**: Quick client lookup by phone number
- **Conversion Metrics**: Quote acceptance rates, revenue tracking
- **Timeline Charts**: Monthly revenue and quote trends
- **Period Filtering**: 30 days, 3 months, 6 months, all time

### 3. Dashboard Enhancements
- **Draft Quotes Section**: Recent drafts (limit 50)
- **Active Quotes Section**: Priority-sorted active quotes (limit 100)
  - Priority 1: Accepted waiting for production
  - Priority 2: In production
  - Priority 3: Sent (waiting client)
  - Priority 4: Rejected
  - Priority 5: Completed

---

## 📁 Files Created/Modified

### Phase 1: Database Migration ✅

#### Created Files:
- `src-tauri/migrations/006_add_production_tracking.sql`

#### Modified Files:
- `src-tauri/src/lib.rs` (lines 50-55)

**Migration Schema:**
```sql
ALTER TABLE quotes ADD COLUMN production_status TEXT;
ALTER TABLE quotes ADD COLUMN production_started_at TEXT;
ALTER TABLE quotes ADD COLUMN production_completed_at TEXT;
ALTER TABLE quotes ADD COLUMN deleted INTEGER DEFAULT 0;
ALTER TABLE quotes ADD COLUMN deleted_at TEXT;

CREATE INDEX idx_quotes_production_status ON quotes(production_status);
CREATE INDEX idx_quotes_status_production ON quotes(status, production_status);
CREATE INDEX idx_quotes_deleted ON quotes(deleted) WHERE deleted = 0;
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_quotes_active ON quotes(status, production_status, deleted, updated_at);
```

---

### Phase 2: Type Definitions ✅

#### Created Files:
- `src/types/analytics.ts`

#### Modified Files:
- `src/types/quote.ts` (lines 89-123)

**New Types:**
```typescript
// Quote Status
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

// Production Status
type ProductionStatus = 'in_production' | 'completed' | null;

// Analytics Period
type AnalyticsPeriod = '30_days' | '3_months' | '6_months' | 'all_time';

interface CustomerAnalytics {
  client: { id, name, company, phone };
  period: { from, to, label };
  quotes: { total, sent, accepted, rejected, inProduction, completed };
  financial: { completedRevenue, inProductionValue, averageOrderValue, conversionRate };
  timeline: TimelineDataPoint[];
}
```

---

### Phase 3: Repository Functions ✅

#### Created Files:
- `src/services/database/analyticsRepository.ts`

#### Modified Files:
- `src/services/database/quoteRepository.ts` (lines 268-396)

**Quote Repository - New Functions:**
```typescript
// Production Management
startProduction(quoteId: string): Promise<void>
completeProduction(quoteId: string): Promise<void>

// Dashboard Queries
getDraftQuotes(limit?: number): Promise<Quote[]>
getActiveQuotes(limit?: number): Promise<Quote[]>

// Soft Delete
softDeleteQuote(quoteId: string): Promise<void>
restoreQuote(quoteId: string): Promise<void>
```

**Analytics Repository - Functions:**
```typescript
// Client Search
searchClientsByPhone(phoneQuery: string): Promise<ClientSearchResult[]>

// Customer Analytics
getCustomerAnalytics(clientId: string, periodDays?: number): Promise<CustomerAnalytics | null>
getCustomerTimeline(clientId: string, periodDays?: number): Promise<TimelineDataPoint[]>

// Leaderboard
getTopClientsByRevenue(limit?: number): Promise<any[]>
```

---

### Phase 4: UI Components 🔄 (In Progress)

#### Files to Modify:
- `src/components/Dashboard/QuoteGrid.tsx`
- `src/components/Dashboard/CustomerAnalytics.tsx` (new)
- `src/pages/Dashboard.tsx`

**Status Color Mapping:**
```typescript
const STATUS_CONFIG = {
  draft: { color: '#gray', bgColor: '#f5f5f5' },
  sent: { color: '#9e9e9e', bgColor: '#fafafa' },
  accepted: { color: '#4caf50', bgColor: '#e8f5e9' },  // Green
  rejected: { color: '#f44336', bgColor: '#ffebee' },  // Red
};

const PRODUCTION_CONFIG = {
  null: { color: '#gray' },
  in_production: { color: '#ff9800', bgColor: '#fff3e0' },  // Orange
  completed: { color: '#2196f3', bgColor: '#e3f2fd' },      // Blue
};
```

**Action Buttons Logic:**
```typescript
// Sent quotes: [Accept] [Reject]
if (quote.status === 'sent') {
  <Button onClick={() => handleAccept(quote.id)}>Accept</Button>
  <Button onClick={() => handleReject(quote.id)}>Reject</Button>
}

// Accepted, not in production: [Start Production]
if (quote.status === 'accepted' && !quote.productionStatus) {
  <Button onClick={() => handleStartProduction(quote.id)}>
    Start Production
  </Button>
}

// In production: [Mark Completed]
if (quote.productionStatus === 'in_production') {
  <Button onClick={() => handleCompleteProduction(quote.id)}>
    Mark Completed
  </Button>
}
```

---

### Phase 5: Export Service 📝 (Pending)

#### Files to Create:
- `src/services/exportService.ts`

**Planned Functions:**
```typescript
exportCustomerData(clientId: string, period: AnalyticsPeriod): Promise<void>
exportQuotesToCSV(quotes: Quote[]): Promise<void>
```

---

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ QUOTE LIFECYCLE                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. DRAFT (nháp)                                       │
│     └─> Sale soạn báo giá                              │
│                                                         │
│  2. SENT (đã gửi)                                      │
│     └─> Sale gửi cho khách, chờ phản hồi              │
│                                                         │
│  3a. ACCEPTED (chấp nhận)                              │
│      └─> Khách đồng ý                                  │
│          └─> PRODUCTION: null                          │
│              [Button: Start Production]                │
│                                                         │
│  3b. REJECTED (từ chối)                                │
│      └─> Khách không cắt                               │
│          └─> End (chỉ dùng cho analytics)              │
│                                                         │
│  4. IN_PRODUCTION (đang sản xuất)                      │
│     └─> Production team đang làm                       │
│         [Button: Mark Completed]                       │
│                                                         │
│  5. COMPLETED (hoàn thành)                             │
│     └─> Đã giao hàng                                   │
│         └─> Tính vào revenue                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ DASHBOARD                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section 1: DRAFT QUOTES                            │ │
│ │ Query: status = 'draft' AND deleted = 0            │ │
│ │ Sort: updated_at DESC                               │ │
│ │ Limit: 50 (scrollable)                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section 2: ACTIVE QUOTES (Priority Sorted)         │ │
│ │                                                      │ │
│ │ Priority Order:                                     │ │
│ │ 1. ✅ Accepted (green) - Chờ sản xuất             │ │
│ │ 2. 🟧 In Production (orange) - Đang sản xuất      │ │
│ │ 3. 📧 Sent (gray) - Chờ khách                     │ │
│ │ 4. ❌ Rejected (red) - Khách từ chối              │ │
│ │ 5. 🔵 Completed (blue) - Đã hoàn thành            │ │
│ │                                                      │ │
│ │ Limit: 100 (scrollable)                            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section 3: CUSTOMER ANALYTICS                       │ │
│ │                                                      │ │
│ │ 🔍 Search by Phone: [0909______]                   │ │
│ │                                                      │ │
│ │ Filter: [30 days] [3 months] [6 months] [All time]│ │
│ │                                                      │ │
│ │ Stats Cards:                                        │ │
│ │ ┌──────────┬──────────┬──────────┬──────────┐      │ │
│ │ │ Total    │ Accepted │ Rejected │Completed │      │ │
│ │ │ Quotes   │          │          │          │      │ │
│ │ │   100    │    45    │    30    │    35    │      │ │
│ │ │          │  (45%)   │  (30%)   │  (35%)   │      │ │
│ │ └──────────┴──────────┴──────────┴──────────┘      │ │
│ │                                                      │ │
│ │ 💰 Revenue: $239,560 | Avg: $6,844 | Conv: 45%    │ │
│ │                                                      │ │
│ │ 📈 [Revenue Trend Chart]                           │ │
│ │ 📊 [Quote Distribution Chart]                      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Queries

### Get Draft Quotes
```sql
SELECT * FROM quotes
WHERE status = 'draft' AND deleted = 0
ORDER BY updated_at DESC
LIMIT 50;
```

### Get Active Quotes (Priority Sorted)
```sql
SELECT * FROM quotes
WHERE status IN ('sent', 'accepted', 'rejected')
  AND deleted = 0
ORDER BY
  CASE WHEN status = 'accepted' AND production_status IS NULL THEN 1
       WHEN production_status = 'in_production' THEN 2
       WHEN status = 'sent' THEN 3
       WHEN status = 'rejected' THEN 4
       WHEN production_status = 'completed' THEN 5
       ELSE 6 END,
  updated_at DESC
LIMIT 100;
```

### Customer Analytics
```sql
SELECT
  c.id, c.name, c.company, c.phone,
  COUNT(q.id) as total_quotes,
  SUM(CASE WHEN q.status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN q.status = 'accepted' THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN q.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  SUM(CASE WHEN q.production_status = 'in_production' THEN 1 ELSE 0 END) as in_production,
  SUM(CASE WHEN q.production_status = 'completed' THEN 1 ELSE 0 END) as completed,
  COALESCE(SUM(CASE WHEN q.production_status = 'completed' THEN q.total_amount ELSE 0 END), 0) as completed_revenue,
  COALESCE(SUM(CASE WHEN q.production_status = 'in_production' THEN q.total_amount ELSE 0 END), 0) as in_production_value,
  COALESCE(AVG(CASE WHEN q.production_status = 'completed' THEN q.total_amount END), 0) as avg_order_value
FROM clients c
LEFT JOIN quotes q ON q.client_id = c.id AND q.deleted = 0
WHERE c.id = ?
  AND q.created_at >= datetime('now', '-90 days')  -- Example: 3 months
GROUP BY c.id;
```

### Customer Timeline
```sql
SELECT
  strftime('%Y-%m', created_at) as month,
  COALESCE(SUM(CASE WHEN production_status = 'completed' THEN total_amount ELSE 0 END), 0) as revenue,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as quotes_accepted,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as quotes_rejected,
  SUM(CASE WHEN production_status = 'completed' THEN 1 ELSE 0 END) as quotes_completed
FROM quotes
WHERE client_id = ?
  AND deleted = 0
GROUP BY month
ORDER BY month ASC;
```

---

## 🔧 Testing Migration

### Delete Old Database (Force Fresh Migration)
```bash
# Kill running app
taskkill /F /IM smart-cut-quote.exe

# Delete database files
rm -f "$APPDATA/com.smart-cut-quote.app/smart_cut_quote.db"*

# Restart app (migration will run automatically)
npm run tauri dev
```

### Verify Migration
```sql
-- Check new columns exist
PRAGMA table_info(quotes);

-- Check indexes
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='quotes';

-- Test query
SELECT id, status, production_status, deleted FROM quotes LIMIT 5;
```

---

## 📈 Performance Considerations

### Database Size Estimates
```
Assumptions:
- Average quote size: ~10KB (with JSON data)
- Target capacity: 10,000,000 quotes

Storage Calculation:
- 10,000 quotes   = ~100 MB
- 100,000 quotes  = ~1 GB
- 1,000,000 quotes = ~10 GB
- 10,000,000 quotes = ~100 GB (recommended limit for SQLite)
```

### Index Strategy
- **Primary indexes**: Quote status, production status, deleted flag
- **Composite index**: Active quotes query optimization
- **Phone index**: Fast client search
- **Timeline index**: Efficient date-based queries

### Archive Strategy
```typescript
// Soft delete quotes older than 2 years
async function archiveOldQuotes() {
  const sql = `
    UPDATE quotes
    SET deleted = 1, deleted_at = datetime('now')
    WHERE production_status = 'completed'
      AND updated_at < datetime('now', '-2 years')
      AND deleted = 0
  `;
  await execute(sql);
}
```

---

## 🚀 Next Steps

### Phase 4: UI Components (In Progress)
- [ ] Update QuoteGrid with status colors and action buttons
- [ ] Create CustomerAnalytics component
- [ ] Update Dashboard layout with 3 sections

### Phase 5: Export Service (Pending)
- [ ] CSV export for customer data
- [ ] PDF export for analytics reports
- [ ] Archive management UI

### Future Enhancements
- [ ] Email notifications for status changes
- [ ] Automated follow-up reminders
- [ ] Advanced reporting dashboard
- [ ] Multi-user support with permissions

---

## 📝 Notes

- All timestamps use SQLite datetime('now') for consistency
- Soft delete preserves data for analytics while hiding from UI
- Conversion rate = (accepted quotes / total sent quotes) * 100
- Priority sorting ensures urgent quotes appear first
- Phone search uses LIKE with % wildcard for partial matching

---

**Last Updated:** January 2025
**Author:** Claude Code
**Status:** Backend Complete ✅, Frontend In Progress 🔄

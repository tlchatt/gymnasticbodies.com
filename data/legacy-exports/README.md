# Legacy Exports

Exported June 1, 2026 from the legacy WordPress/WooCommerce platform. Used to cross-reference historical purchases and subscriptions against the current Neon DB for user segment classification.

## Files

| File | Source | Rows | Key Fields |
|---|---|---|---|
| `wp_users.csv` | WordPress `wp_users` table | ~34,369 | `ID`, `user_email`, `user_registered`, `display_name` |
| `wc_customer_lookup.csv` | WooCommerce `wp_wc_customer_lookup` | ~19,162 | `customer_id`, `user_id`, `email`, `date_last_active`, `date_registered` |
| `wc_order_stats.csv` | WooCommerce `wp_wc_order_stats` | ~62,690 | `order_id`, `customer_id`, `date_created`, `total_sales`, `net_total`, `status` |
| `wc_order_product_lookup.csv` | WooCommerce `wp_wc_order_product_lookup` | ~62,734 | `order_id`, `product_id`, `customer_id`, `date_created`, `product_net_revenue` — **header is on row 2, row 1 is blank** |
| `wc_payment_retries.csv` | WooCommerce `wp_wcs_payment_retries` | ~12,302 | `retry_id`, `order_id`, `status`, `date_gmt` — subscription payment retry log |
| `authnet_transactions.csv` | Authorize.net transaction export | ~338 | `Transaction ID`, `Email`, `Customer ID`, `Settlement Amount`, `Settlement Date/Time`, `Transaction Status`, `Recurring Billing Transaction` |

## Join Strategy

To look up a user's purchase history:
1. Match `wp_users.user_email` → `wc_customer_lookup.email` → get `customer_id`
2. Join `customer_id` → `wc_order_stats.customer_id` → get `order_id` + `status` + `total_sales`
3. Join `order_id` → `wc_order_product_lookup.order_id` → get individual products purchased

For Auth.net verification:
- Match on `authnet_transactions.Email` + `Customer ID` (maps to `user_setting.autorize_customer_id`)
- `Recurring Billing Transaction = true` → subscription charge; `false` → one-time charge

## Purpose

These files are the source of truth for determining whether users in the `active_expired` / N/A-renewal bucket are legitimate one-time purchasers (segment: `purchased`) or lapsed subscribers (segment: `lapsed`). The current Neon DB has incomplete import data for many legacy users — these exports fill that gap.

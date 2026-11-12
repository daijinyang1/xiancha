package com.xiancha.dto;

import java.util.List;

/**
 * GET /api/scan/stats 的返回。
 *
 * <p>除 last7Days 外都是整表聚合；last7Days 由 SQL 的 generate_series 补齐 7 天（含 0 次的那天）。
 */
public record ScanStatsResult(
        long total,
        long today,
        int avgScore,
        long highCount,
        long midCount,
        long lowCount,
        List<ScanDayPoint> last7Days
) {
}

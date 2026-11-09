package com.xiancha.dto;

import java.util.Map;

/** GET /api/stats 的返回：总数 + 规则按坑型/等级、案例按坑型的分布。 */
public record StatsResult(
        long rules,
        long traps,
        long certs,
        Map<String, Long> byType,
        Map<String, Long> byLevel,
        Map<String, Long> trapsByType
) {
}

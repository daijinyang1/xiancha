package com.xiancha.dto;

/** GET /api/health 的返回：服务是否活着 + 数据库探活 + 三类数据量。 */
public record HealthResult(
        String status,
        boolean db,
        long rules,
        long traps,
        long certs,
        long uptimeSec,
        String version
) {
}

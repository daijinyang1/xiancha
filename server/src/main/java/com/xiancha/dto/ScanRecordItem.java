package com.xiancha.dto;

import java.time.Instant;

/**
 * GET /api/scan/history 的一条记录。
 *
 * <p>只含计数与分数，不含原文（scan_log 只存 text_hash）。
 * createdAt 用 Instant，Jackson 输出成 ISO8601 带 Z 的字符串，前端按本地时区显示。
 */
public record ScanRecordItem(
        long id,
        Instant createdAt,
        int sentenceHits,
        int ruleHits,
        int score,
        String level
) {
}

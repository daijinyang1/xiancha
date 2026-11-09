package com.xiancha.dto;

import java.util.List;

/** POST /api/scan 的返回。 */
public record ScanResult(
        int score,
        String level,
        int sentenceCount,
        int ruleCount,
        List<ScanHit> hits,
        long elapsedMs
) {
}

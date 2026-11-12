package com.xiancha.dto;

/** 近 7 天里的一天：日期（YYYY-MM-DD）+ 扫描次数 + 当天平均分。 */
public record ScanDayPoint(
        String date,
        long count,
        int avgScore
) {
}

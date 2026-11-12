package com.xiancha.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.xiancha.dto.ScanDayPoint;
import com.xiancha.dto.ScanRecordItem;
import com.xiancha.dto.ScanStatsResult;
import com.xiancha.repository.ScanLogRepository;

/**
 * 扫描历史与统计。
 *
 * <p>所有聚合都交给 PostgreSQL 算（见 ScanLogRepository 的原生 SQL），
 * 这里只做「列 → DTO」的搬运与分档推导，不把整表读进内存。
 */
@Service
public class ScanHistoryService {

    /** 历史记录默认条数与上限，避免被 ?limit=9999999 打爆。 */
    public static final int DEFAULT_LIMIT = 20;
    public static final int MAX_LIMIT = 200;

    /** 分档阈值：与前端 useApi 的 scoreToLevel / scoreThreshold 完全一致。 */
    private static final int HIGH_SCORE = 40;
    private static final int MID_SCORE = 15;

    private final ScanLogRepository scanLogRepository;

    public ScanHistoryService(ScanLogRepository scanLogRepository) {
        this.scanLogRepository = scanLogRepository;
    }

    /** score → 中文档位：>=40 高 / >=15 中 / 其余 低。 */
    public static String levelOf(int score) {
        if (score >= HIGH_SCORE) {
            return "高";
        }
        if (score >= MID_SCORE) {
            return "中";
        }
        return "低";
    }

    /** GET /api/scan/history?limit=20 —— 按 created_at DESC。 */
    @Transactional(readOnly = true)
    public List<ScanRecordItem> history(int limit) {
        int n = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        List<Object[]> rows = scanLogRepository.findRecent(n);
        List<ScanRecordItem> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            long id = ((Number) r[0]).longValue();
            Instant createdAt = toInstant(r[1]);
            int sentenceHits = ((Number) r[2]).intValue();
            int ruleHits = ((Number) r[3]).intValue();
            int score = ((Number) r[4]).intValue();
            out.add(new ScanRecordItem(id, createdAt, sentenceHits, ruleHits, score, levelOf(score)));
        }
        return out;
    }

    /** GET /api/scan/stats —— 整表聚合 + 近 7 天按天聚合。 */
    @Transactional(readOnly = true)
    public ScanStatsResult stats() {
        long total = 0;
        long today = 0;
        int avgScore = 0;
        long high = 0;
        long mid = 0;
        long low = 0;
        List<Object[]> rows = scanLogRepository.summarize();
        if (rows != null && !rows.isEmpty()) {
            Object[] s = rows.get(0);
            if (s != null && s.length >= 6) {
                total = ((Number) s[0]).longValue();
                today = ((Number) s[1]).longValue();
                avgScore = ((Number) s[2]).intValue();
                high = ((Number) s[3]).longValue();
                mid = ((Number) s[4]).longValue();
                low = ((Number) s[5]).longValue();
            }
        }

        List<ScanDayPoint> last7 = new ArrayList<>(7);
        for (Object[] r : scanLogRepository.last7Days()) {
            String date = String.valueOf(r[0]);
            long cnt = ((Number) r[1]).longValue();
            int avg = ((Number) r[2]).intValue();
            last7.add(new ScanDayPoint(date, cnt, avg));
        }
        return new ScanStatsResult(total, today, avgScore, high, mid, low, last7);
    }

    /** JDBC 可能给回 Instant / OffsetDateTime / Timestamp，统一转成 Instant。 */
    private static Instant toInstant(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Instant i) {
            return i;
        }
        if (v instanceof OffsetDateTime odt) {
            return odt.toInstant();
        }
        if (v instanceof java.sql.Timestamp ts) {
            return ts.toInstant();
        }
        if (v instanceof java.time.LocalDateTime ldt) {
            return ldt.atZone(ZoneId.systemDefault()).toInstant();
        }
        return Instant.parse(String.valueOf(v));
    }
}

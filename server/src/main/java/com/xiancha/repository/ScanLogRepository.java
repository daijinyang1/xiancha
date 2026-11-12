package com.xiancha.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.xiancha.entity.ScanLog;

/**
 * 扫描记录仓储。
 *
 * <p>统计口径一律下推给 PostgreSQL 聚合（count / avg / filter / generate_series），
 * 不把全表拉到 Java 里再算——记录会一直长，Java 侧算不准也扛不住。
 */
public interface ScanLogRepository extends JpaRepository<ScanLog, Long> {

    /**
     * 最近 N 条扫描记录（按时间倒序）。
     * 返回列：id, created_at, sentence_hits, rule_hits, score。
     */
    @Query(value = """
            SELECT id, created_at, sentence_hits, rule_hits, score
            FROM scan_log
            ORDER BY created_at DESC, id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findRecent(@Param("limit") int limit);

    /**
     * 整表汇总：总次数、今日次数、平均分、高/中/低三档次数。
     * 返回一行六列：total, today, avg_score, high_count, mid_count, low_count。
     * 用 List 接：原生查询即使只有一行也得按行列表取，直接声明成 Object[] 会映射失败。
     * 分档口径与前端一致：>=40 高 / >=15 中 / 其余 低。
     * today 用 date_trunc('day', now())，按数据库会话时区（Asia/Shanghai）切日。
     */
    @Query(value = """
            SELECT count(*)                                                             AS total,
                   count(*) FILTER (WHERE created_at >= date_trunc('day', now()))       AS today,
                   coalesce(round(avg(score)), 0)                                       AS avg_score,
                   count(*) FILTER (WHERE score >= 40)                                  AS high_count,
                   count(*) FILTER (WHERE score >= 15 AND score < 40)                   AS mid_count,
                   count(*) FILTER (WHERE score < 15)                                   AS low_count
            FROM scan_log
            """, nativeQuery = true)
    List<Object[]> summarize();

    /**
     * 近 7 天每天的次数与平均分。用 generate_series 补齐 7 天，
     * 没有记录的那天也返回一行（count=0，avgScore=0），前端画柱状图不用自己补零。
     * 返回列：date(YYYY-MM-DD), count, avg_score。
     */
    @Query(value = """
            SELECT to_char(d.day, 'YYYY-MM-DD')                  AS date,
                   count(s.id)                                   AS cnt,
                   coalesce(round(avg(s.score)), 0)              AS avg_score
            FROM generate_series(
                     date_trunc('day', now()) - interval '6 days',
                     date_trunc('day', now()),
                     interval '1 day'
                 ) AS d(day)
            LEFT JOIN scan_log s
                   ON s.created_at >= d.day
                  AND s.created_at <  d.day + interval '1 day'
            GROUP BY d.day
            ORDER BY d.day
            """, nativeQuery = true)
    List<Object[]> last7Days();
}

package com.xiancha.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.xiancha.dto.ScanHit;
import com.xiancha.dto.ScanResult;
import com.xiancha.entity.Rule;
import com.xiancha.entity.ScanLog;
import com.xiancha.repository.RuleRepository;
import com.xiancha.repository.ScanLogRepository;

/**
 * 合同扫描引擎。
 *
 * <p>流程：把 63 条规则的 regex_source 预编译成 Pattern（启动时编译一次，常驻缓存），
 * 对输入文本逐条 find 记下每个命中位置；再按「句子」合并——同一句命中多条规则时合成一个 hit。
 * 打分：每句取最高等级权重（高 3 / 中 2 / 低 1）× 10 累加，封顶 100。
 */
@Service
public class ScanService {

    private static final Logger log = LoggerFactory.getLogger(ScanService.class);

    /** 分句符：。！？ 与换行。命中位置先扩到所在句的边界，再按句合并。 */
    private static final String SENTENCE_DELIMS = "。！？\n\r";

    /** 单条规则在一段文本里最多记多少次命中，防止「空匹配 + 超长文本」把内存打满。 */
    private static final int MAX_MATCHES_PER_RULE = 500;

    private final RuleRepository ruleRepository;
    private final ScanLogRepository scanLogRepository;

    /** 编译后的规则缓存，规则表没变就一直复用。 */
    private volatile List<CompiledRule> compiled;

    public ScanService(RuleRepository ruleRepository, ScanLogRepository scanLogRepository) {
        this.ruleRepository = ruleRepository;
        this.scanLogRepository = scanLogRepository;
    }

    /** 已编译的规则：规则本体 + 编译好的 Pattern。 */
    private record CompiledRule(Rule rule, Pattern pattern) {
    }

    /** 取（必要时重建）规则缓存。 */
    private List<CompiledRule> compiledRules() {
        List<CompiledRule> cache = this.compiled;
        if (cache != null) {
            return cache;
        }
        synchronized (this) {
            if (this.compiled != null) {
                return this.compiled;
            }
            List<Rule> rules = ruleRepository.findAllByOrderByIdAsc();
            List<CompiledRule> list = new ArrayList<>(rules.size());
            int ok = 0;
            for (Rule r : rules) {
                String src = r.getRegexSource();
                if (src == null || src.isBlank()) {
                    continue;
                }
                try {
                    Pattern p = Pattern.compile(src, flagsOf(r.getRegexFlags()));
                    list.add(new CompiledRule(r, p));
                    ok++;
                } catch (PatternSyntaxException e) {
                    log.warn("规则 {} 的正则无法编译，已跳过：{}", r.getId(), e.getDescription());
                }
            }
            this.compiled = List.copyOf(list);
            log.info("扫描引擎就绪：{} 条规则已编译（共 {} 条）", ok, rules.size());
            return this.compiled;
        }
    }

    /** 重新编译规则缓存（规则表变更后调用）。 */
    public synchronized void reload() {
        this.compiled = null;
    }

    private static int flagsOf(String flags) {
        int f = 0;
        if (flags == null) {
            return 0;
        }
        for (char c : flags.toCharArray()) {
            switch (c) {
                case 'i' -> f |= Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
                case 'm' -> f |= Pattern.MULTILINE;
                case 's' -> f |= Pattern.DOTALL;
                case 'u' -> f |= Pattern.UNICODE_CASE;
                default -> { /* 其余标志忽略 */ }
            }
        }
        return f;
    }

    /** 等级权重：高 3 / 中 2 / 低 1。 */
    public static int levelWeight(String level) {
        if ("高".equals(level)) {
            return 3;
        }
        if ("中".equals(level)) {
            return 2;
        }
        return 1;
    }

    /** 分数 → 风险档位：>=70 high，>=40 medium，其余 low。 */
    public static String levelOfScore(int score) {
        if (score >= 70) {
            return "high";
        }
        if (score >= 40) {
            return "medium";
        }
        return "low";
    }

    /**
     * 找到 index 所在句子的区间，返回 [start, end)：向前后扩到分句符为止，句末标点算进句内，
     * 并去掉首尾空白（start/end 随之收紧，保证 text.substring(start, end) 就是返回的 sentence）。
     */
    static int[] sentenceSpan(String text, int index) {
        int n = text.length();
        int i = Math.min(Math.max(index, 0), n);
        int start = i;
        while (start > 0 && SENTENCE_DELIMS.indexOf(text.charAt(start - 1)) < 0) {
            start--;
        }
        int end = i;
        while (end < n && SENTENCE_DELIMS.indexOf(text.charAt(end)) < 0) {
            end++;
        }
        if (end < n) {
            end++; // 句末标点归属本句
        }
        while (start < end && Character.isWhitespace(text.charAt(start))) {
            start++;
        }
        while (end > start && Character.isWhitespace(text.charAt(end - 1))) {
            end--;
        }
        return new int[] { start, end };
    }

    /** 按句子合并用的中间对象。 */
    private static final class HitBuilder {
        private final int start;
        private final int end;
        private final Map<String, Rule> rules = new LinkedHashMap<>();

        HitBuilder(int start, int end) {
            this.start = start;
            this.end = end;
        }

        void add(Rule r) {
            rules.putIfAbsent(r.getId(), r);
        }
    }

    /** 扫描一段文本。 */
    @Transactional
    public ScanResult scan(String text) {
        long t0 = System.nanoTime();
        String src = text == null ? "" : text;

        Map<Long, HitBuilder> bySentence = new LinkedHashMap<>();
        for (CompiledRule cr : compiledRules()) {
            Matcher m = cr.pattern().matcher(src);
            int guard = 0;
            while (guard++ < MAX_MATCHES_PER_RULE && m.find()) {
                if (m.end() <= m.start()) {
                    continue; // 空匹配直接跳过（JS 侧同样处理）
                }
                int[] span = sentenceSpan(src, m.start());
                if (span[1] <= span[0]) {
                    continue;
                }
                long key = ((long) span[0] << 32) | (span[1] & 0xffffffffL);
                bySentence.computeIfAbsent(key, k -> new HitBuilder(span[0], span[1])).add(cr.rule());
            }
        }

        List<ScanHit> hits = new ArrayList<>(bySentence.size());
        Set<String> hitRuleIds = new LinkedHashSet<>();
        int score = 0;
        for (HitBuilder b : bySentence.values()) {
            List<Rule> sorted = new ArrayList<>(b.rules.values());
            sorted.sort(Comparator
                    .comparingInt((Rule r) -> -levelWeight(r.getLevel()))
                    .thenComparing(Rule::getId));
            String sentenceLevel = sorted.get(0).getLevel();
            score += levelWeight(sentenceLevel) * 10;
            for (Rule r : sorted) {
                hitRuleIds.add(r.getId());
            }
            List<ScanHit.HitRule> hitRules = sorted.stream()
                    .map(r -> new ScanHit.HitRule(r.getId(), r.getAsk(), r.getName(), r.getLevel()))
                    .toList();
            hits.add(new ScanHit(src.substring(b.start, b.end), b.start, b.end, sentenceLevel, hitRules));
        }

        hits.sort(Comparator
                .comparingInt((ScanHit h) -> -levelWeight(h.level()))
                .thenComparingInt(ScanHit::start));

        int finalScore = Math.min(100, score);
        String level = levelOfScore(finalScore);
        long elapsedMs = Math.max(0L, (System.nanoTime() - t0) / 1_000_000L);

        ScanResult result = new ScanResult(finalScore, level, hits.size(), hitRuleIds.size(), hits, elapsedMs);
        saveLog(src, result);
        return result;
    }

    /** 记一条扫描日志；失败不影响接口返回。 */
    private void saveLog(String text, ScanResult r) {
        try {
            ScanLog logRow = new ScanLog();
            logRow.setCreatedAt(java.time.Instant.now());
            logRow.setTextHash(sha256(text));
            logRow.setSentenceHits(r.sentenceCount());
            logRow.setRuleHits(r.ruleCount());
            logRow.setScore(r.score());
            scanLogRepository.save(logRow);
        } catch (Exception e) {
            ScanService.log.warn("扫描日志写入失败（不影响结果返回）：{}", e.getMessage());
        }
    }

    static String sha256(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return null;
        }
    }
}

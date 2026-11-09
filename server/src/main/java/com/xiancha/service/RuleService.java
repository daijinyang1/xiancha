package com.xiancha.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.xiancha.dto.RuleDetail;
import com.xiancha.entity.Rule;
import com.xiancha.repository.RuleRepository;

/** 规则词条查询：列表（可按坑型 / 等级 / 关键词过滤）与单词条详情。 */
@Service
public class RuleService {

    private final RuleRepository ruleRepository;

    public RuleService(RuleRepository ruleRepository) {
        this.ruleRepository = ruleRepository;
    }

    /** GET /api/rules?type=&level=&q=；q 搜 ask / name / why / law（也顺带搜 id 与 fix）。 */
    @Transactional(readOnly = true)
    public List<Rule> list(String type, String level, String q) {
        List<Rule> all = ruleRepository.findAllByOrderByIdAsc();
        String t = trimToNull(type);
        String l = trimToNull(level);
        String kw = trimToNull(q);
        String kwLower = kw == null ? null : kw.toLowerCase(Locale.ROOT);

        List<Rule> out = new ArrayList<>();
        for (Rule r : all) {
            if (t != null && !t.equals(r.getType())) {
                continue;
            }
            if (l != null && !l.equals(r.getLevel())) {
                continue;
            }
            if (kwLower != null && !matches(r, kwLower)) {
                continue;
            }
            out.add(r);
        }
        return out;
    }

    private static boolean matches(Rule r, String kwLower) {
        return contains(r.getId(), kwLower)
                || contains(r.getAsk(), kwLower)
                || contains(r.getName(), kwLower)
                || contains(r.getWhy(), kwLower)
                || contains(r.getLaw(), kwLower)
                || contains(r.getFix(), kwLower)
                || contains(r.getVerdict(), kwLower)
                || contains(r.getType(), kwLower);
    }

    private static boolean contains(String haystack, String kwLower) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(kwLower);
    }

    /** GET /api/rules/{id}；附带同坑型（同 type）的其他规则。找不到返回 null。 */
    @Transactional(readOnly = true)
    public RuleDetail detail(String id) {
        String key = id == null ? "" : id.trim().toUpperCase(Locale.ROOT);
        return ruleRepository.findById(key)
                .map(r -> {
                    List<Rule> sameType = ruleRepository.findByTypeOrderByIdAsc(r.getType());
                    List<Rule> siblings = sameType.stream()
                            .filter(x -> !x.getId().equals(r.getId()))
                            .toList();
                    return RuleDetail.of(r, siblings);
                })
                .orElse(null);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}

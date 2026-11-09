package com.xiancha.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.xiancha.dto.StatsResult;
import com.xiancha.entity.Rule;
import com.xiancha.entity.Trap;
import com.xiancha.repository.CertRepository;
import com.xiancha.repository.RuleRepository;
import com.xiancha.repository.TrapRepository;

/** 汇总统计：给首页 KPI 与筛选徽章用。 */
@Service
public class StatsService {

    private final RuleRepository ruleRepository;
    private final TrapRepository trapRepository;
    private final CertRepository certRepository;

    public StatsService(RuleRepository ruleRepository, TrapRepository trapRepository, CertRepository certRepository) {
        this.ruleRepository = ruleRepository;
        this.trapRepository = trapRepository;
        this.certRepository = certRepository;
    }

    @Transactional(readOnly = true)
    public StatsResult stats() {
        List<Rule> rules = ruleRepository.findAllByOrderByIdAsc();
        List<Trap> traps = trapRepository.findAllByOrderByIdAsc();

        Map<String, Long> byType = new LinkedHashMap<>();
        for (String t : Constants.RULE_TYPES) {
            byType.put(t, 0L);
        }
        Map<String, Long> byLevel = new LinkedHashMap<>();
        for (String l : Constants.LEVELS) {
            byLevel.put(l, 0L);
        }
        for (Rule r : rules) {
            if (r.getType() != null) {
                byType.merge(r.getType(), 1L, Long::sum);
            }
            if (r.getLevel() != null) {
                byLevel.merge(r.getLevel(), 1L, Long::sum);
            }
        }

        Map<String, Long> trapsByType = new LinkedHashMap<>();
        for (String t : Constants.RULE_TYPES) {
            trapsByType.put(t, 0L);
        }
        for (Trap t : traps) {
            if (t.getType() != null) {
                trapsByType.merge(t.getType(), 1L, Long::sum);
            }
        }

        return new StatsResult(rules.size(), traps.size(), certRepository.count(), byType, byLevel, trapsByType);
    }
}

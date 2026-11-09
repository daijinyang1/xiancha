package com.xiancha.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.xiancha.dto.RuleDetail;
import com.xiancha.dto.TrapDetail;
import com.xiancha.entity.Rule;
import com.xiancha.entity.Trap;
import com.xiancha.repository.RuleRepository;
import com.xiancha.repository.TrapRepository;

/** 避坑案例查询：列表（可按坑型过滤）与单案例详情（含同坑型规则链）。 */
@Service
public class TrapService {

    private final TrapRepository trapRepository;
    private final RuleRepository ruleRepository;

    public TrapService(TrapRepository trapRepository, RuleRepository ruleRepository) {
        this.trapRepository = trapRepository;
        this.ruleRepository = ruleRepository;
    }

    @Transactional(readOnly = true)
    public List<Trap> list(String type) {
        String t = type == null ? null : type.trim();
        if (t == null || t.isEmpty()) {
            return trapRepository.findAllByOrderByIdAsc();
        }
        return trapRepository.findByTypeOrderByIdAsc(t);
    }

    /** GET /api/traps/{id}：案例 + 同坑型的规则链。找不到返回 null。 */
    @Transactional(readOnly = true)
    public TrapDetail detail(String id) {
        String key = id == null ? "" : id.trim().toUpperCase(java.util.Locale.ROOT);
        return trapRepository.findById(key)
                .map(t -> {
                    List<Rule> sameType = ruleRepository.findByTypeOrderByIdAsc(t.getType());
                    List<RuleDetail.RelatedRule> chain = sameType.stream()
                            .map(r -> new RuleDetail.RelatedRule(
                                    r.getId(), r.getAsk(), r.getName(), r.getLevel(), r.getType()))
                            .toList();
                    return TrapDetail.of(t, chain);
                })
                .orElse(null);
    }
}

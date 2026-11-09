package com.xiancha.dto;

import java.util.List;

import com.xiancha.entity.Trap;

/**
 * 单案例详情：案例字段平铺在顶层，另外补同坑型的规则链：
 * relatedRuleIds（规则 id 列表）与 ruleChain（带问句的精简信息）。
 */
public record TrapDetail(
        String id,
        String title,
        String type,
        String level,
        String scene,
        List<String> signals,
        String consequence,
        String advice,
        String source,
        List<String> relatedRuleIds,
        List<RuleDetail.RelatedRule> ruleChain
) {
    public static TrapDetail of(Trap t, List<RuleDetail.RelatedRule> chain) {
        return new TrapDetail(
                t.getId(), t.getTitle(), t.getType(), t.getLevel(), t.getScene(),
                t.getSignals(), t.getConsequence(), t.getAdvice(), t.getSource(),
                chain.stream().map(RuleDetail.RelatedRule::id).toList(),
                chain);
    }
}

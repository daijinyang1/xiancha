package com.xiancha.dto;

import java.util.List;

import com.xiancha.entity.Rule;

/**
 * 单词条详情：规则本体字段全部平铺在顶层（前端直接当 Rule 用），
 * 另外补两组同坑型信息：siblings（其他规则 id 列表）与 relatedRules（带问句的精简信息）。
 */
public record RuleDetail(
        String id,
        String ask,
        String verdict,
        String name,
        String type,
        String level,
        String regexSource,
        String regexFlags,
        String why,
        String law,
        String fix,
        List<String> siblings,
        List<RelatedRule> relatedRules
) {
    /** 同坑型规则的精简信息，扫描结果与详情页共用。 */
    public record RelatedRule(String id, String ask, String name, String level, String type) {
    }

    public static RuleDetail of(Rule r, List<Rule> sameType) {
        List<RelatedRule> related = sameType.stream()
                .map(x -> new RelatedRule(x.getId(), x.getAsk(), x.getName(), x.getLevel(), x.getType()))
                .toList();
        List<String> ids = sameType.stream().map(Rule::getId).toList();
        return new RuleDetail(
                r.getId(), r.getAsk(), r.getVerdict(), r.getName(), r.getType(), r.getLevel(),
                r.getRegexSource(), r.getRegexFlags(), r.getWhy(), r.getLaw(), r.getFix(),
                ids, related);
    }
}

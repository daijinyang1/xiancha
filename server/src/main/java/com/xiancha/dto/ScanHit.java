package com.xiancha.dto;

import java.util.List;

/** 一个命中句子；rules 是该句命中的规则，已按等级从高到低排序。 */
public record ScanHit(
        String sentence,
        int start,
        int end,
        String level,
        List<HitRule> rules
) {
    public record HitRule(String id, String ask, String name, String level) {
    }
}

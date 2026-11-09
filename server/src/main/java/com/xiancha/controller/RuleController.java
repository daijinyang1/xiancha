package com.xiancha.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.dto.RuleDetail;
import com.xiancha.entity.Rule;
import com.xiancha.service.RuleService;

/** 规则词条接口。 */
@RestController
@RequestMapping("/api/rules")
public class RuleController {

    private final RuleService ruleService;

    public RuleController(RuleService ruleService) {
        this.ruleService = ruleService;
    }

    /** GET /api/rules?type=&level=&q= */
    @GetMapping
    public List<Rule> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String q) {
        return ruleService.list(type, level, q);
    }

    /** GET /api/rules/{id}：单词条 + 同坑型其他规则 id。 */
    @GetMapping("/{id}")
    public ResponseEntity<RuleDetail> detail(@PathVariable String id) {
        RuleDetail detail = ruleService.detail(id);
        return detail == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(detail);
    }
}

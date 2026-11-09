package com.xiancha.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.dto.StatsResult;
import com.xiancha.service.StatsService;

/** 汇总统计接口。 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /** GET /api/stats -> { rules, traps, certs, byType, byLevel } */
    @GetMapping
    public StatsResult stats() {
        return statsService.stats();
    }
}

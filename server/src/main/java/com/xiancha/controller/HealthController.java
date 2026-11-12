package com.xiancha.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.dto.HealthResult;
import com.xiancha.service.HealthService;

/** 健康检查接口：前端用它判断「后端在不在、库通不通」。 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    /** GET /api/health -> { status, db, rules, traps, certs, uptimeSec, version } */
    @GetMapping
    public HealthResult health() {
        return healthService.health();
    }
}

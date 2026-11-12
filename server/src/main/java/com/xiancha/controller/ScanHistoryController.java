package com.xiancha.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.dto.ScanRecordItem;
import com.xiancha.dto.ScanStatsResult;
import com.xiancha.service.ScanHistoryService;

/**
 * 扫描历史与统计接口。
 *
 * <p>与 ScanController 共用 /api/scan 前缀：那个负责 POST 扫描，这里负责两个 GET 子路径。
 */
@RestController
@RequestMapping("/api/scan")
public class ScanHistoryController {

    private final ScanHistoryService scanHistoryService;

    public ScanHistoryController(ScanHistoryService scanHistoryService) {
        this.scanHistoryService = scanHistoryService;
    }

    /** GET /api/scan/history?limit=20 -> 最近扫描记录（created_at DESC） */
    @GetMapping("/history")
    public List<ScanRecordItem> history(
            @RequestParam(name = "limit", required = false, defaultValue = "20") int limit) {
        return scanHistoryService.history(limit);
    }

    /** GET /api/scan/stats -> { total, today, avgScore, highCount, midCount, lowCount, last7Days[] } */
    @GetMapping("/stats")
    public ScanStatsResult stats() {
        return scanHistoryService.stats();
    }
}

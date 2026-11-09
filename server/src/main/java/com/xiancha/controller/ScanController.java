package com.xiancha.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.dto.ScanRequest;
import com.xiancha.dto.ScanResult;
import com.xiancha.service.ScanService;

import jakarta.validation.Valid;

/** 合同扫描接口。 */
@RestController
@RequestMapping("/api/scan")
public class ScanController {

    private final ScanService scanService;

    public ScanController(ScanService scanService) {
        this.scanService = scanService;
    }

    /** POST /api/scan  body: { "text": "……" } */
    @PostMapping
    public ScanResult scan(@Valid @RequestBody ScanRequest request) {
        return scanService.scan(request == null ? "" : request.text());
    }
}

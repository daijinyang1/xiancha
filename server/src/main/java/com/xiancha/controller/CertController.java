package com.xiancha.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.entity.Cert;
import com.xiancha.service.CertService;

/** 考证日历接口。 */
@RestController
@RequestMapping("/api/certs")
public class CertController {

    private final CertService certService;

    public CertController(CertService certService) {
        this.certService = certService;
    }

    /** GET /api/certs */
    @GetMapping
    public List<Cert> list() {
        return certService.list();
    }
}

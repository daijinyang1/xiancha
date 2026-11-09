package com.xiancha.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.xiancha.dto.TrapDetail;
import com.xiancha.entity.Trap;
import com.xiancha.service.TrapService;

/** 避坑案例接口。 */
@RestController
@RequestMapping("/api/traps")
public class TrapController {

    private final TrapService trapService;

    public TrapController(TrapService trapService) {
        this.trapService = trapService;
    }

    /** GET /api/traps?type= */
    @GetMapping
    public List<Trap> list(@RequestParam(required = false) String type) {
        return trapService.list(type);
    }

    /** GET /api/traps/{id}：单案例 + 同坑型规则链。 */
    @GetMapping("/{id}")
    public ResponseEntity<TrapDetail> detail(@PathVariable String id) {
        TrapDetail detail = trapService.detail(id);
        return detail == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(detail);
    }
}

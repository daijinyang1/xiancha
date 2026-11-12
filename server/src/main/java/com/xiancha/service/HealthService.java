package com.xiancha.service;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.xiancha.dto.HealthResult;
import com.xiancha.repository.CertRepository;
import com.xiancha.repository.RuleRepository;
import com.xiancha.repository.TrapRepository;

/**
 * 服务健康检查。
 *
 * <p>db 字段用三次 count 顺带探活：能拿到数字就说明连接池和数据库都通，
 * 拿到异常则 db=false、三类计数归零，接口本身仍返回 200，方便前端区分「服务挂了」和「库挂了」。
 */
@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    /** 进程启动时间，用来算 uptimeSec。 */
    private static final Instant STARTED_AT = Instant.now();

    /** 版本号与 pom 的 project.version 对齐；打 jar 时由 spring-boot-maven-plugin 写入 Implementation-Version。 */
    private static final String VERSION = resolveVersion();

    private final RuleRepository ruleRepository;
    private final TrapRepository trapRepository;
    private final CertRepository certRepository;

    public HealthService(RuleRepository ruleRepository, TrapRepository trapRepository, CertRepository certRepository) {
        this.ruleRepository = ruleRepository;
        this.trapRepository = trapRepository;
        this.certRepository = certRepository;
    }

    public HealthResult health() {
        boolean db;
        long rules = 0;
        long traps = 0;
        long certs = 0;
        try {
            rules = ruleRepository.count();
            traps = trapRepository.count();
            certs = certRepository.count();
            db = true;
        } catch (Exception e) {
            log.warn("数据库探活失败：{}", e.getMessage());
            db = false;
        }
        long uptime = Math.max(0L, Instant.now().getEpochSecond() - STARTED_AT.getEpochSecond());
        return new HealthResult(db ? "ok" : "degraded", db, rules, traps, certs, uptime, VERSION);
    }

    private static String resolveVersion() {
        try {
            String v = HealthService.class.getPackage().getImplementationVersion();
            return v == null || v.isBlank() ? "1.0.0" : v;
        } catch (Exception e) {
            return "1.0.0";
        }
    }
}

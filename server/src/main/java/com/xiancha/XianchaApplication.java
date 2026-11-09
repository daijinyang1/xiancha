package com.xiancha;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 先查 · 后端服务入口。
 * 端口 8080，数据源 PostgreSQL 18.1（库 xiancha），Flyway 启动时自动迁移。
 */
@SpringBootApplication
public class XianchaApplication {

    public static void main(String[] args) {
        SpringApplication.run(XianchaApplication.class, args);
    }
}

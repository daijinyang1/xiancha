package com.xiancha.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.xiancha.entity.ScanLog;

public interface ScanLogRepository extends JpaRepository<ScanLog, Long> {
}

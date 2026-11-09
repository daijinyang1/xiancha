package com.xiancha.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.xiancha.entity.Rule;

public interface RuleRepository extends JpaRepository<Rule, String>, JpaSpecificationExecutor<Rule> {

    List<Rule> findByTypeOrderByIdAsc(String type);

    List<Rule> findAllByOrderByIdAsc();
}

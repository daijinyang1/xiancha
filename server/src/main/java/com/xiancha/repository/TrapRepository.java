package com.xiancha.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.xiancha.entity.Trap;

public interface TrapRepository extends JpaRepository<Trap, String> {

    List<Trap> findByTypeOrderByIdAsc(String type);

    List<Trap> findAllByOrderByIdAsc();
}

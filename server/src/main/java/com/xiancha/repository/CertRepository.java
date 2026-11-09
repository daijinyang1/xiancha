package com.xiancha.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.xiancha.entity.Cert;

public interface CertRepository extends JpaRepository<Cert, String> {

    List<Cert> findAllByOrderByIdAsc();
}

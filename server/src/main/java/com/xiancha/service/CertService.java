package com.xiancha.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.xiancha.entity.Cert;
import com.xiancha.repository.CertRepository;

/** 考证日历。 */
@Service
public class CertService {

    private final CertRepository certRepository;

    public CertService(CertRepository certRepository) {
        this.certRepository = certRepository;
    }

    @Transactional(readOnly = true)
    public List<Cert> list() {
        return certRepository.findAllByOrderByIdAsc();
    }
}

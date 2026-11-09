package com.xiancha.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 扫描记录：只存哈希与计数，不存原文。 */
@Entity
@Table(name = "scan_log")
public class ScanLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "text_hash", length = 64)
    private String textHash;

    @Column(name = "sentence_hits", nullable = false)
    private int sentenceHits;

    @Column(name = "rule_hits", nullable = false)
    private int ruleHits;

    @Column(name = "score", nullable = false)
    private int score;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getTextHash() { return textHash; }
    public void setTextHash(String textHash) { this.textHash = textHash; }
    public int getSentenceHits() { return sentenceHits; }
    public void setSentenceHits(int sentenceHits) { this.sentenceHits = sentenceHits; }
    public int getRuleHits() { return ruleHits; }
    public void setRuleHits(int ruleHits) { this.ruleHits = ruleHits; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
}

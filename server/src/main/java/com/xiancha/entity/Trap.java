package com.xiancha.entity;

import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 避坑案例（对应 db/traps.json 的 12 条）。 */
@Entity
@Table(name = "trap")
public class Trap {

    @Id
    @Column(name = "id", length = 8, nullable = false)
    private String id;

    @Column(name = "title", length = 400)
    private String title;

    @Column(name = "type", length = 32)
    private String type;

    @Column(name = "level", length = 4)
    private String level;

    @Column(name = "scene", columnDefinition = "text")
    private String scene;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "signals", columnDefinition = "text[]")
    private List<String> signals;

    @Column(name = "consequence", columnDefinition = "text")
    private String consequence;

    @Column(name = "advice", columnDefinition = "text")
    private String advice;

    @Column(name = "source", columnDefinition = "text")
    private String source;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getScene() { return scene; }
    public void setScene(String scene) { this.scene = scene; }
    public List<String> getSignals() { return signals; }
    public void setSignals(List<String> signals) { this.signals = signals; }
    public String getConsequence() { return consequence; }
    public void setConsequence(String consequence) { this.consequence = consequence; }
    public String getAdvice() { return advice; }
    public void setAdvice(String advice) { this.advice = advice; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}

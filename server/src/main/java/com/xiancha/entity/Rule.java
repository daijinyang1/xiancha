package com.xiancha.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 规则词条（对应 db/rules.json 的 63 条）。 */
@Entity
@Table(name = "rule")
public class Rule {

    @Id
    @Column(name = "id", length = 8, nullable = false)
    private String id;

    @Column(name = "ask", length = 200)
    private String ask;

    @Column(name = "verdict", length = 400)
    private String verdict;

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "type", length = 32)
    private String type;

    @Column(name = "level", length = 4)
    private String level;

    @Column(name = "regex_source", columnDefinition = "text")
    private String regexSource;

    @Column(name = "regex_flags", length = 8)
    private String regexFlags;

    @Column(name = "why", columnDefinition = "text")
    private String why;

    @Column(name = "law", columnDefinition = "text")
    private String law;

    @Column(name = "fix", columnDefinition = "text")
    private String fix;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAsk() { return ask; }
    public void setAsk(String ask) { this.ask = ask; }
    public String getVerdict() { return verdict; }
    public void setVerdict(String verdict) { this.verdict = verdict; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getRegexSource() { return regexSource; }
    public void setRegexSource(String regexSource) { this.regexSource = regexSource; }
    public String getRegexFlags() { return regexFlags; }
    public void setRegexFlags(String regexFlags) { this.regexFlags = regexFlags; }
    public String getWhy() { return why; }
    public void setWhy(String why) { this.why = why; }
    public String getLaw() { return law; }
    public void setLaw(String law) { this.law = law; }
    public String getFix() { return fix; }
    public void setFix(String fix) { this.fix = fix; }
}

package com.xiancha.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 考证日历（对应 db/certs.json 的 6 个证书）。 */
@Entity
@Table(name = "cert")
public class Cert {

    @Id
    @Column(name = "id", length = 8, nullable = false)
    private String id;

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "level", length = 32)
    private String level;

    @Column(name = "fit", columnDefinition = "text")
    private String fit;

    @Column(name = "signup", columnDefinition = "text")
    private String signup;

    @Column(name = "exam", columnDefinition = "text")
    private String exam;

    @Column(name = "fee", columnDefinition = "text")
    private String fee;

    @Column(name = "official", columnDefinition = "text")
    private String official;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "signup_url", columnDefinition = "text")
    private String signupUrl;

    @Column(name = "exam_date", columnDefinition = "text")
    private String examDate;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getFit() { return fit; }
    public void setFit(String fit) { this.fit = fit; }
    public String getSignup() { return signup; }
    public void setSignup(String signup) { this.signup = signup; }
    public String getExam() { return exam; }
    public void setExam(String exam) { this.exam = exam; }
    public String getFee() { return fee; }
    public void setFee(String fee) { this.fee = fee; }
    public String getOfficial() { return official; }
    public void setOfficial(String official) { this.official = official; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getSignupUrl() { return signupUrl; }
    public void setSignupUrl(String signupUrl) { this.signupUrl = signupUrl; }
    public String getExamDate() { return examDate; }
    public void setExamDate(String examDate) { this.examDate = examDate; }
}

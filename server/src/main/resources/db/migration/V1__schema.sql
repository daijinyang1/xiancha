-- 先查 · V1 建表
-- 4 张表：rule（63 条规则词条）/ trap（12 条避坑案例）/ cert（6 个考证）/ scan_log（扫描记录）

CREATE TABLE IF NOT EXISTS rule (
    id           varchar(8)  PRIMARY KEY,
    ask          varchar(200),
    verdict      varchar(400),
    name         varchar(200),
    type         varchar(32),
    level        varchar(4),
    regex_source text,
    regex_flags  varchar(8),
    why          text,
    law          text,
    fix          text
);

COMMENT ON TABLE  rule              IS '规则词条：学生真会问的一句话 + 判定 + 正则 + 法律依据';
COMMENT ON COLUMN rule.ask          IS '学生真会问的那句话（页面 h1）';
COMMENT ON COLUMN rule.verdict      IS '一句判定，带法条号';
COMMENT ON COLUMN rule.type         IS '坑型（8 类）：押金类/培训贷/无薪试岗/违约金/社保/加班/合同文本/离职';
COMMENT ON COLUMN rule.level        IS '风险等级：高/中/低';
COMMENT ON COLUMN rule.regex_source IS '正则源码，服务端编译成 Pattern 做扫描';
COMMENT ON COLUMN rule.regex_flags  IS '正则标志，通常为空';

CREATE INDEX IF NOT EXISTS idx_rule_type  ON rule (type);
CREATE INDEX IF NOT EXISTS idx_rule_level ON rule (level);

CREATE TABLE IF NOT EXISTS trap (
    id          varchar(8) PRIMARY KEY,
    title       varchar(400),
    type        varchar(32),
    level       varchar(4),
    scene       text,
    signals     text[],
    consequence text,
    advice      text,
    source      text
);

COMMENT ON TABLE  trap           IS '避坑案例：真实场景脱敏改写';
COMMENT ON COLUMN trap.scene     IS '案情经过';
COMMENT ON COLUMN trap.signals   IS '可识别的信号点（数组）';
COMMENT ON COLUMN trap.source    IS '案例来源说明（脱敏改写）';

CREATE INDEX IF NOT EXISTS idx_trap_type ON trap (type);

CREATE TABLE IF NOT EXISTS cert (
    id         varchar(8) PRIMARY KEY,
    name       varchar(200),
    level      varchar(32),
    fit        text,
    signup     text,
    exam       text,
    fee        text,
    official   text,
    note       text,
    signup_url text,
    exam_date  text
);

COMMENT ON TABLE  cert         IS '考证日历：6 个适合大专生考的低门槛证书';
COMMENT ON COLUMN cert.fit     IS '适合谁考';
COMMENT ON COLUMN cert.official IS '主管机构';

CREATE TABLE IF NOT EXISTS scan_log (
    id            bigserial    PRIMARY KEY,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    text_hash     varchar(64),
    sentence_hits int          NOT NULL DEFAULT 0,
    rule_hits     int          NOT NULL DEFAULT 0,
    score         int          NOT NULL DEFAULT 0
);

COMMENT ON TABLE  scan_log              IS '扫描记录（只存哈希与计数，不存原文）';
COMMENT ON COLUMN scan_log.text_hash    IS '输入文本的 SHA-256，用于统计与去重';
COMMENT ON COLUMN scan_log.sentence_hits IS '命中句子数';
COMMENT ON COLUMN scan_log.rule_hits    IS '命中规则条数';

CREATE INDEX IF NOT EXISTS idx_scan_log_created ON scan_log (created_at DESC);

package com.xiancha.service;

import java.util.List;

/** 项目里反复用到的固定枚举（与契约里的 8 类坑型、3 个等级一致）。 */
public final class Constants {

    public static final List<String> RULE_TYPES = List.of(
            "押金类", "培训贷", "无薪试岗", "违约金", "社保", "加班", "合同文本", "离职");

    public static final List<String> LEVELS = List.of("高", "中", "低");

    private Constants() {
    }
}

package com.xiancha.dto;

import jakarta.validation.constraints.Size;

/** POST /api/scan 的入参。 */
public record ScanRequest(
        @Size(max = 50000, message = "文本过长，最多 50000 个字符")
        String text
) {
}

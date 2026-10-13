package com.example.crm.web;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** RFC 4180 CSV: comma separated, CRLF line ends, quotes doubled, UTF-8 (the caller encodes it, with no BOM). */
public final class CsvWriter {
    public static final String CONTENT_TYPE = "text/csv; charset=utf-8";

    /** One CSV cell. A number is written as is, so a negative value stays a number instead of being defused as a formula. */
    public record Value(String text, boolean number) {
        public static Value text(String text) {
            return new Value(text, false);
        }

        /** Money uses two decimals and a dot, so the file reads the same on every machine. */
        public static Value number(BigDecimal value) {
            return new Value(value.setScale(2, RoundingMode.HALF_UP).toPlainString(), true);
        }

        public static Value number(long value) {
            return new Value(Long.toString(value), true);
        }
    }

    private CsvWriter() {}

    public static String write(List<String> headers, List<List<Value>> rows) {
        StringBuilder out = new StringBuilder();
        appendLine(out, headers.stream().map(CsvWriter::cell).toList());
        for (List<Value> row : rows) {
            List<String> cells = new ArrayList<>();
            for (Value v : row) {
                cells.add(v.number() ? v.text() : cell(v.text()));
            }
            appendLine(out, cells);
        }
        return out.toString();
    }

    /**
     * Quotes a text cell when it needs it. Text that starts with = + - @ or a tab or carriage return gets a leading
     * apostrophe, so a spreadsheet shows it as text instead of running it as a formula.
     */
    public static String cell(String value) {
        String text = value;
        if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        boolean needsQuotes = text.chars().anyMatch(c -> c == ',' || c == '"' || c == '\r' || c == '\n')
                || !text.equals(value);
        return needsQuotes ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
    }

    private static void appendLine(StringBuilder out, List<String> cells) {
        out.append(String.join(",", cells)).append("\r\n");
    }
}

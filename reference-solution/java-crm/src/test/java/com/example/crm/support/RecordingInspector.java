package com.example.crm.support;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.hibernate.resource.jdbc.spi.StatementInspector;

/** Records every SQL statement Hibernate sends, so a test can prove an aggregate is computed by MySQL. */
public class RecordingInspector implements StatementInspector {
    private static final List<String> SQL = new CopyOnWriteArrayList<>();

    @Override
    public String inspect(String sql) {
        SQL.add(sql);
        return sql;
    }

    public static void clear() {
        SQL.clear();
    }

    public static List<String> statements() {
        return List.copyOf(SQL);
    }
}

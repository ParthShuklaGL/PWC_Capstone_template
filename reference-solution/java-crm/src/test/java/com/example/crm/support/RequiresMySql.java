package com.example.crm.support;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

/**
 * Skips (does not fail) a test class when no MySQL server is configured, like the .NET tests do. Registered with
 * ExtendWith on the shared base class, which subclasses inherit; the check runs before Spring tries to start.
 */
public class RequiresMySql implements ExecutionCondition {
    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        String url = System.getenv(TestDb.ENV_URL);
        return url == null || url.isBlank()
                ? ConditionEvaluationResult.disabled("Set " + TestDb.ENV_URL + " to a MySQL server that may create databases.")
                : ConditionEvaluationResult.enabled("MySQL configured");
    }
}

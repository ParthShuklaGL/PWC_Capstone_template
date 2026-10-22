package com.nimbussales.crm.service;

/** Builds the next business reference (A-0031, C-00151, D-00033) from the last one issued. */
final class References {

    private References() {
    }

    static String next(String prefix, int digits, String last) {
        int number = 0;
        if (last != null && last.length() > 2) {
            try {
                number = Integer.parseInt(last.substring(2));
            } catch (NumberFormatException ignored) {
                number = 0;
            }
        }
        return String.format("%s-%0" + digits + "d", prefix, number + 1);
    }
}

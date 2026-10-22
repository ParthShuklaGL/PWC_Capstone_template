package com.nimbussales.crm.service;

/** An uploaded lead file that cannot be read at all. Answers 400 IMPORT_FORMAT_INVALID. */
public class ImportFormatException extends RuntimeException {

    public ImportFormatException(String message) {
        super(message);
    }
}

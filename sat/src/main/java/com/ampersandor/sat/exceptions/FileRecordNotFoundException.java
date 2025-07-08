package com.ampersandor.sat.exceptions;

public class FileRecordNotFoundException extends RuntimeException {
    private static final String MESSAGE = "File record not found with id: %d";

    public FileRecordNotFoundException(Long id) {
        super(String.format(MESSAGE, id));
    }
}

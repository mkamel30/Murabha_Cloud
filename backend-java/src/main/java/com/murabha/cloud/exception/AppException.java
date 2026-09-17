package com.murabha.cloud.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

public class AppException extends RuntimeException {
    public AppException(String message) {
        super(message);
    }
}
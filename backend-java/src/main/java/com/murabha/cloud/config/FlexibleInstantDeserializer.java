package com.murabha.cloud.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

public class FlexibleInstantDeserializer extends JsonDeserializer<Instant> {

    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        text = text.trim();
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(text).atStartOfDay(ZoneId.systemDefault()).toInstant();
            } catch (DateTimeParseException ex) {
                throw new IOException("Unable to parse Instant from string: " + text, ex);
            }
        }
    }
}

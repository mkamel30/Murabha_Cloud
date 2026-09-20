package com.murabha.cloud;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MurabhaCloudApplication {

    public static void main(String[] args) {
        SpringApplication.run(MurabhaCloudApplication.class, args);
    }
}
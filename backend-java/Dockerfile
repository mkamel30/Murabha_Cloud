# Stage 1: Build Application with Maven
FROM maven:3.9.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy pom.xml first for efficient dependency caching
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source code and package application
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Lightweight JRE Runtime Image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Add unprivileged user for security
RUN addgroup -S murabha && adduser -S murabha -G murabha

COPY --from=builder /app/target/murabha-cloud-backend-*.jar app.jar

USER murabha

EXPOSE 3000 3008

ENV SPRING_PROFILES_ACTIVE=staging
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3008/api/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

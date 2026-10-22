# syntax=docker/dockerfile:1
# Builds and runs the API. Used by compose.yaml; settings come from environment variables.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/nimbus-crm-api-*.jar app.jar
EXPOSE 5080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# ---------- Build Stage ----------
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

COPY src ./src
RUN ./mvnw package -DskipTests


# ---------- Runtime Stage ----------
FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

CMD ["java", "-jar", "app.jar"]

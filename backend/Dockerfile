FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY mvnw .
COPY pom.xml .
COPY .mvn .mvn
COPY src src

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests
RUN chmod 755 target/backend-0.0.1-SNAPSHOT.jar

CMD ["java", "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]

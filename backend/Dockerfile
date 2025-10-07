FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . .

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

RUN chmod +x target/backend-0.0.1-SNAPSHOT.jar

CMD ["java", "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]

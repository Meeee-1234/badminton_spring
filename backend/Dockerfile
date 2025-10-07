FROM eclipse-temurin:21-jdk

WORKDIR /app

# copy ไฟล์สำหรับ build
COPY mvnw .
COPY pom.xml .
COPY .mvn .mvn
COPY src src

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# ใช้ absolute path ไปเลย
CMD ["java", "-jar", "/app/target/backend-0.0.1-SNAPSHOT.jar"]

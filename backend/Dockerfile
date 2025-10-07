FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY mvnw .
COPY pom.xml .
COPY .mvn .mvn
COPY src src

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# ✅ สำคัญ: ให้สิทธิ์กับ JAR (แม้จะไม่รันตรง ๆ แต่ให้แน่ใจว่า read ได้)
RUN chmod 755 target/backend-0.0.1-SNAPSHOT.jar

# ✅ ชัดเจน: สั่งให้ Java เป็นคนรัน JAR
CMD ["java", "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]

FROM eclipse-temurin:21-jdk

WORKDIR /app

# ก๊อปไฟล์ที่จำเป็น
COPY mvnw .
COPY pom.xml .
COPY .mvn .mvn
COPY src src

# ให้สิทธิ์รัน mvnw
RUN chmod +x mvnw

# Build JAR
RUN ./mvnw clean package -DskipTests

# ✅ ให้สิทธิ์กับ JAR (optional)
RUN chmod 755 target/backend-0.0.1-SNAPSHOT.jar

# ✅ รันด้วย java -jar
CMD ["java", "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]

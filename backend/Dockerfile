FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY mvnw .
COPY pom.xml .
COPY .mvn .mvn
COPY src src

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# 🔑 ไม่ต้อง chmod jar เป็น executable เพราะเราไม่ได้ exec มันตรง ๆ
# RUN chmod 755 target/backend-0.0.1-SNAPSHOT.jar   ❌ เอาออกได้

# ✅ ใช้ java -jar ชัดเจน
CMD ["java", "-jar", "/app/target/backend-0.0.1-SNAPSHOT.jar"]

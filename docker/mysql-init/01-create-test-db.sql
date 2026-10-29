-- Runs once, when the data volume is first created.
-- indent_dev is created by MYSQL_DATABASE. The test database is created here.
CREATE DATABASE IF NOT EXISTS indent_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

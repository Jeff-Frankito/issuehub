CREATE DATABASE IF NOT EXISTS issuehub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
  
  CREATE USER IF NOT EXISTS 'issuehub_user'@'%' IDENTIFIED BY 'password';
  
  GRANT ALL PRIVILEGES ON issuehub.* TO 'issuehub_user'@'%';
  
  FLUSH PRIVILEGES;
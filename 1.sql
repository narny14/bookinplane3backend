CREATE TABLE cartbillets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateurs_id INT NOT NULL,
  flight_id INT NOT NULL,
  airline INT,
  departure VARCHAR(50),
  arrival VARCHAR(50),
  from_location VARCHAR(150),
  to_location VARCHAR(150),
  price DECIMAL(10,2),
  date DATETIME,
  class_text VARCHAR(50),
  code VARCHAR(100),
  seat VARCHAR(10),
  payment_method VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

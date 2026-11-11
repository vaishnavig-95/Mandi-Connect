-- Mandi Connect schema (Azure SQL / SQL Server). Run each GO-separated batch in order.
DROP TABLE IF EXISTS audit_logs, transport_bookings, bids, listings, daily_prices, crops, users, districts;
GO
CREATE TABLE districts (
  district_id INT IDENTITY PRIMARY KEY,
  name NVARCHAR(60) NOT NULL UNIQUE,
  state NVARCHAR(60) NOT NULL);
CREATE TABLE users (
  user_id INT IDENTITY PRIMARY KEY,
  full_name NVARCHAR(80) NOT NULL,
  email NVARCHAR(120) NOT NULL UNIQUE,
  password_hash NVARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('farmer','trader','officer','admin')),
  district_id INT NOT NULL REFERENCES districts(district_id),
  is_verified BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
CREATE TABLE crops (
  crop_id INT IDENTITY PRIMARY KEY,
  name NVARCHAR(60) NOT NULL UNIQUE,
  season VARCHAR(10) NOT NULL CHECK (season IN ('Kharif','Rabi','Zaid')));
CREATE TABLE listings (
  listing_id INT IDENTITY PRIMARY KEY,
  farmer_id INT NOT NULL REFERENCES users(user_id),
  crop_id INT NOT NULL REFERENCES crops(crop_id),
  quantity_kg DECIMAL(10,2) NOT NULL CHECK (quantity_kg > 0),
  grade CHAR(1) NOT NULL CHECK (grade IN ('A','B','C')),
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),   -- Rs per quintal
  photo_url NVARCHAR(300) NULL,                               -- Blob Storage URL
  closing_time DATETIME2 NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Sold','Closed')),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
CREATE TABLE bids (
  bid_id INT IDENTITY PRIMARY KEY,
  listing_id INT NOT NULL REFERENCES listings(listing_id),
  trader_id INT NOT NULL REFERENCES users(user_id),
  bid_amount DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
  bid_time DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  status VARCHAR(10) NOT NULL DEFAULT 'Placed' CHECK (status IN ('Placed','Won','Rejected')));
CREATE TABLE daily_prices (
  price_id INT IDENTITY PRIMARY KEY,
  crop_id INT NOT NULL REFERENCES crops(crop_id),
  district_id INT NOT NULL REFERENCES districts(district_id),
  price_date DATE NOT NULL,
  modal_price DECIMAL(10,2) NOT NULL CHECK (modal_price > 0),
  entered_by INT NOT NULL REFERENCES users(user_id),
  CONSTRAINT UQ_price_day UNIQUE (crop_id, district_id, price_date));
CREATE TABLE transport_bookings (
  booking_id INT IDENTITY PRIMARY KEY,
  listing_id INT NOT NULL UNIQUE REFERENCES listings(listing_id),
  trader_id INT NOT NULL REFERENCES users(user_id),
  pickup_date DATE NOT NULL,
  vehicle_type VARCHAR(20) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(10) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending','Paid')));
CREATE TABLE audit_logs (
  log_id BIGINT IDENTITY PRIMARY KEY,
  user_id INT NULL REFERENCES users(user_id),
  action VARCHAR(40) NOT NULL,
  details NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
GO
CREATE INDEX IX_listings_crop_closing ON listings(crop_id, closing_time) INCLUDE (status);
CREATE INDEX IX_bids_listing_amount ON bids(listing_id, bid_amount DESC);
CREATE INDEX IX_prices_date ON daily_prices(price_date);
GO
CREATE OR ALTER VIEW vw_active_listings AS
SELECT l.listing_id, u.full_name AS farmer_name, c.name AS crop, l.quantity_kg, l.grade,
       l.base_price, l.closing_time, MAX(b.bid_amount) AS highest_bid, COUNT(b.bid_id) AS bid_count
FROM listings l
JOIN users u ON u.user_id = l.farmer_id
JOIN crops c ON c.crop_id = l.crop_id
LEFT JOIN bids b ON b.listing_id = l.listing_id
WHERE l.status = 'Open'
GROUP BY l.listing_id, u.full_name, c.name, l.quantity_kg, l.grade, l.base_price, l.closing_time;
GO
CREATE OR ALTER PROCEDURE sp_close_listing @listing_id INT AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;      -- any error rolls back everything
  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM listings WITH (UPDLOCK) WHERE listing_id = @listing_id AND status = 'Open')
  BEGIN ROLLBACK; RETURN; END
  DECLARE @winner INT;
  SELECT TOP 1 @winner = b.bid_id FROM bids b JOIN listings l ON l.listing_id = b.listing_id
  WHERE b.listing_id = @listing_id AND b.bid_amount >= l.base_price
  ORDER BY b.bid_amount DESC, b.bid_time ASC;          -- earliest bid wins a tie
  IF @winner IS NOT NULL
  BEGIN
    UPDATE bids SET status = 'Won' WHERE bid_id = @winner;
    UPDATE bids SET status = 'Rejected' WHERE listing_id = @listing_id AND bid_id <> @winner;
    UPDATE listings SET status = 'Sold' WHERE listing_id = @listing_id;
  END
  ELSE UPDATE listings SET status = 'Closed' WHERE listing_id = @listing_id;
  INSERT INTO audit_logs(user_id, action, details)
  VALUES (NULL, 'LISTING_CLOSED', CONCAT('listing ', @listing_id, ', winning bid ', ISNULL(CAST(@winner AS VARCHAR(10)), 'none')));
  COMMIT TRANSACTION;
END
GO

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 09, 2026 at 12:03 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wh_queue_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `zone` varchar(10) NOT NULL,
  `booking_date` date NOT NULL,
  `time_slot` varchar(20) NOT NULL,
  `status` enum('confirmed','pending_approval','rejected') DEFAULT 'pending_approval',
  `booking_type` enum('normal','insert') DEFAULT 'normal',
  `lat` varchar(50) DEFAULT NULL,
  `lng` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tech_status` enum('waiting','accepted','completed') DEFAULT 'waiting',
  `photo_proof` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `customer_name`, `phone`, `zone`, `booking_date`, `time_slot`, `status`, `booking_type`, `lat`, `lng`, `created_at`, `tech_status`, `photo_proof`) VALUES
(1, 'd', 'd', 'A', '2026-01-09', '09:00-11:00', 'confirmed', 'normal', '17.965792231028', '102.62029563372', '2026-01-09 09:54:03', 'completed', '1767953621_iphone-17-pro-finish-select-cosmicorange-202509_AV2.jfif'),
(2, 'ົປ', 'ປໄ', 'A', '2026-01-09', '09:00-11:00', 'confirmed', 'normal', '17.966', '102.613', '2026-01-09 09:58:05', 'waiting', NULL),
(3, 'ju6', '76y', 'A', '2026-01-09', '09:00-11:00', 'confirmed', 'normal', '17.961518451315', '102.63354490128', '2026-01-09 10:21:59', 'accepted', NULL),
(4, 'jg', 'gj', 'A', '2026-01-09', '15:00-17:00', 'confirmed', 'normal', '17.961518451315', '102.63354490128', '2026-01-09 10:25:47', 'waiting', NULL),
(5, 'ຜ', 'ຜ', 'A', '2026-01-09', '11:00-13:00', 'confirmed', 'normal', '17.966', '102.613', '2026-01-09 10:31:23', 'waiting', NULL),
(6, 'ປຜ', 'ຜປ', 'A', '2026-01-09', '09:00-11:00', 'confirmed', 'insert', '17.966', '102.613', '2026-01-09 10:32:36', 'waiting', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `slot_configs`
--

CREATE TABLE `slot_configs` (
  `id` int(11) NOT NULL,
  `zone` varchar(10) NOT NULL,
  `time_slot` varchar(20) NOT NULL,
  `max_limit` int(11) DEFAULT 3
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `slot_configs`
--

INSERT INTO `slot_configs` (`id`, `zone`, `time_slot`, `max_limit`) VALUES
(1, 'A', '09:00-11:00', 3),
(2, 'A', '11:00-13:00', 3),
(3, 'A', '13:00-15:00', 3),
(4, 'A', '15:00-17:00', 3),
(5, 'A', '17:00-19:00', 3);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `slot_configs`
--
ALTER TABLE `slot_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `zone_time` (`zone`,`time_slot`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `slot_configs`
--
ALTER TABLE `slot_configs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

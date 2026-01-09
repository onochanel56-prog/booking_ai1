<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: *");
header("Content-Type: application/json");

$conn = new mysqli("localhost", "root", "", "wh_queue_db");
$method = $_SERVER['REQUEST_METHOD'];

// GET
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    // 1. ດຶງ Slots (Sales & Admin Manager)
    if ($action === 'get_slots') {
        $date = $_GET['date'];
        $zone = $_GET['zone'];
        $all_slots = ["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00"];
        $response = [];
        foreach ($all_slots as $slot) {
            // ດຶງ Limit ທີ່ Admin ຕັ້ງໄວ້
            $limit_res = $conn->query("SELECT max_limit FROM slot_configs WHERE zone='$zone' AND time_slot='$slot'");
            $max_limit = ($limit_res->num_rows > 0) ? $limit_res->fetch_assoc()['max_limit'] : 3;

            // ນັບຈຳນວນຈອງ
            $booked = $conn->query("SELECT COUNT(*) as total FROM bookings WHERE zone='$zone' AND booking_date='$date' AND time_slot='$slot' AND booking_type='normal' AND status != 'rejected'")->fetch_assoc()['total'];
            $is_full = $booked >= $max_limit;
            $response[] = ["time" => $slot, "booked" => $booked, "limit" => $max_limit, "is_full" => $is_full, "text" => $is_full ? "❌ ເຕັມ" : "ຫວ່າງ"];
        }
        echo json_encode($response);
        exit;
    }

    // 2. ດຶງຂໍ້ມູນ 7 ວັນຂ້າງໜ້າ (Forecast)
    if ($action === 'get_forecast') {
        $data = [];
        for ($i = 0; $i < 7; $i++) {
            $d = date('Y-m-d', strtotime("+$i days"));
            $row = ['date' => $d, 'zones' => [], 'total' => 0];
            
            foreach (['A', 'B', 'C', 'D', 'E'] as $z) {
                // ນັບຈຳນວນຈອງໃນແຕ່ລະ Zone ຂອງວັນນັ້ນ
                $count = $conn->query("SELECT COUNT(*) as c FROM bookings WHERE booking_date='$d' AND zone='$z' AND status != 'rejected'")->fetch_assoc()['c'];
                $row['zones'][$z] = $count;
                $row['total'] += $count;
            }
            $data[] = $row;
        }
        echo json_encode($data);
        exit;
    }

    // 3. ດຶງ Booking ທັງໝົດ
    $sql = "SELECT * FROM bookings ORDER BY booking_date DESC, time_slot ASC";
    $result = $conn->query($sql);
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}

// POST
if ($method === 'POST') {
    // 1. Admin ອັບເດດ Slot Limit
    if (isset($_POST['action']) && $_POST['action'] === 'update_slot') {
        $zone = $_POST['zone'];
        $slot = $_POST['time_slot'];
        $limit = $_POST['max_limit'];
        
        // ກວດສອບວ່າມີ Config ແລ້ວບໍ່? ຖ້າບໍ່ມີໃຫ້ Insert, ຖ້າມີໃຫ້ Update
        $check = $conn->query("SELECT * FROM slot_configs WHERE zone='$zone' AND time_slot='$slot'");
        if ($check->num_rows > 0) {
            $conn->query("UPDATE slot_configs SET max_limit=$limit WHERE zone='$zone' AND time_slot='$slot'");
        } else {
            $conn->query("INSERT INTO slot_configs (zone, time_slot, max_limit) VALUES ('$zone', '$slot', $limit)");
        }
        echo json_encode(["status" => "success"]);
        exit;
    }

    // 2. Tech Actions (Accept/Complete)
    if (isset($_POST['action']) && ($_POST['action'] === 'accept_job' || $_POST['action'] === 'complete_job')) {
        $id = $_POST['id'];
        $status = $_POST['action'] === 'accept_job' ? 'accepted' : 'completed';
        $sql = "UPDATE bookings SET tech_status='$status'";
        
        if ($_POST['action'] === 'complete_job' && isset($_FILES['photo'])) {
            $target_dir = "uploads/";
            $filename = time() . "_" . basename($_FILES["photo"]["name"]);
            move_uploaded_file($_FILES["photo"]["tmp_name"], $target_dir . $filename);
            $sql .= ", photo_proof='$filename'";
        }
        $conn->query("$sql WHERE id=$id");
        echo json_encode(["status" => "success"]);
        exit;
    }

    // 3. Sales Booking
    $input = json_decode(file_get_contents("php://input"), true);
    if($input) {
        $name = $input['name']; $phone = $input['phone']; $zone = $input['zone'];
        $date = $input['date']; $slot = $input['time_slot']; $type = $input['type'];
        $lat = $input['lat'] ?? ''; $lng = $input['lng'] ?? '';
        $sql = "INSERT INTO bookings (customer_name, phone, zone, booking_date, time_slot, booking_type, status, lat, lng) 
                VALUES ('$name', '$phone', '$zone', '$date', '$slot', '$type', 'pending_approval', '$lat', '$lng')";
        if ($conn->query($sql)) echo json_encode(["status" => "success", "msg" => "ສົ່ງຄຳຮ້ອງສຳເລັດ"]);
    }
}

// PUT
if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'];
    $status = ($data['action'] === 'approve') ? 'confirmed' : 'rejected';
    $conn->query("UPDATE bookings SET status='$status' WHERE id=$id");
    echo json_encode(["status" => "success"]);
}
?>